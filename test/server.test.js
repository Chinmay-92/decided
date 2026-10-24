import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server.js';

const examples = JSON.parse(readFileSync(new URL('../samples/examples.json', import.meta.url)));
let dir;

async function start(options) {
  const server = createApp(options);
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, init = {}) => {
    const res = await fetch(base + path, { ...init, headers: { 'content-type': 'application/json' }, body: init.body && JSON.stringify(init.body) });
    const type = res.headers.get('content-type') || '';
    return { status: res.status, body: type.includes('json') ? await res.json() : await res.text() };
  };
  return { server, call };
}

before(() => { dir = mkdtempSync(join(tmpdir(), 'decided-')); });
after(() => rmSync(dir, { recursive: true, force: true }));

test('demo mode: full capture -> related -> save -> search -> delete flow', async () => {
  const { server, call } = await start({ env: {}, dataFile: join(dir, 'a.json') });
  try {
    assert.equal((await call('/')).status, 200);
    assert.match((await call('/lib/adr.js')).body, /toAdrMarkdown/);
    assert.equal((await call('/../package.json')).status, 404);
    const ex0 = await call('/samples/examples.json');
    assert.equal(ex0.body[0].name, examples[0].name, 'static JSON served intact');

    const health = await call('/api/health');
    assert.equal(health.body.mode, 'demo');

    const seeded = await call('/api/decisions');
    assert.equal(seeded.body.decisions.length, 3, 'seed decisions loaded on first run');

    assert.equal((await call('/api/extract', { method: 'POST', body: { thread: '' } })).status, 400);

    const ex = await call('/api/extract', { method: 'POST', body: { thread: examples[0].thread } });
    assert.equal(ex.status, 200);
    assert.equal(ex.body.record.source, 'demo');
    assert.equal(ex.body.related[0].level, 'strong');

    const saved = await call('/api/decisions', { method: 'POST', body: ex.body.record });
    assert.equal(saved.status, 201);
    const id = saved.body.record.id;
    assert.ok(id);

    const updated = await call('/api/decisions', { method: 'POST', body: { ...saved.body.record, title: 'Use SQS + DLQ for webhook retries' } });
    assert.equal(updated.body.record.id, id, 'saving again updates in place');

    const search = await call('/api/decisions?q=webhook');
    assert.deepEqual(search.body.decisions.map((d) => d.id), [id]);

    const md = await call('/api/adr', { method: 'POST', body: updated.body.record });
    assert.match(md.body, /^# Use SQS \+ DLQ/);

    assert.equal((await call(`/api/decisions/${id}`, { method: 'DELETE' })).status, 200);
    assert.equal((await call(`/api/decisions/${id}`)).status, 404);
    assert.equal((await call('/api/decisions', { method: 'POST', body: {} })).status, 400);
  } finally {
    server.close();
  }
});

test('claude mode: uses the API response, and falls back to demo mode on failure', async () => {
  const calls = [];
  const okFetch = async (url, init) => {
    calls.push({ url, init });
    const json = { title: 'Use SQS for webhook retries', status: 'decided', decision: 'SQS + DLQ.', decidedBy: 'Priya', participants: ['Priya'], context: 'c', options: ['Kafka'], rationale: ['cheaper'], actions: [{ owner: 'Aisha', task: 'Terraform' }], openQuestions: [], tags: ['sqs'] };
    return new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(json) }] }), { status: 200 });
  };
  const env = { ANTHROPIC_API_KEY: 'test-key-not-real' };
  const a = await start({ env, dataFile: join(dir, 'b.json'), fetchImpl: okFetch });
  try {
    assert.equal((await a.call('/api/health')).body.model, 'claude-sonnet-5-5');
    const res = await a.call('/api/extract', { method: 'POST', body: { thread: examples[0].thread } });
    assert.equal(res.body.record.source, 'claude');
    assert.equal(res.body.record.title, 'Use SQS for webhook retries');
    assert.equal(res.body.warning, null);
    const sent = JSON.parse(calls[0].init.body);
    assert.equal(sent.model, 'claude-sonnet-5-5');
    assert.equal(sent.output_config.format.type, 'json_schema');
    assert.equal(sent.output_config.format.schema.additionalProperties, false);
    assert.equal(sent.max_tokens, 16000);
    assert.equal(calls[0].init.headers['x-api-key'], 'test-key-not-real');
  } finally {
    a.server.close();
  }

  const badFetch = async () => new Response('overloaded', { status: 529 });
  const b = await start({ env, dataFile: join(dir, 'c.json'), fetchImpl: badFetch });
  try {
    const res = await b.call('/api/extract', { method: 'POST', body: { thread: examples[0].thread } });
    assert.equal(res.status, 200);
    assert.equal(res.body.record.source, 'demo');
    assert.match(res.body.warning, /demo mode/);
  } finally {
    b.server.close();
  }

  for (const stop_reason of ['refusal', 'max_tokens']) {
    const stopFetch = async () => new Response(JSON.stringify({ stop_reason, content: [{ type: 'text', text: '{"title":' }] }), { status: 200 });
    const c = await start({ env, dataFile: join(dir, `d-${stop_reason}.json`), fetchImpl: stopFetch });
    try {
      const res = await c.call('/api/extract', { method: 'POST', body: { thread: examples[0].thread } });
      assert.equal(res.body.record.source, 'demo');
      assert.match(res.body.warning, new RegExp(stop_reason));
    } finally {
      c.server.close();
    }
  }
});
