// Smoke test against a running server (default http://localhost:3000).
// Usage: npm start (in one terminal), then: npm run smoke
const base = process.env.SMOKE_URL || `http://localhost:${process.env.PORT || 3000}`;
const examples = await (await fetch(`${base}/samples/examples.json`)).json();

const step = async (name, fn) => {
  try {
    const detail = await fn();
    console.log(`PASS  ${name}${detail ? ' — ' + detail : ''}`);
  } catch (err) {
    console.log(`FAIL  ${name} — ${err.message}`);
    process.exitCode = 1;
  }
};
const must = (cond, msg) => { if (!cond) throw new Error(msg); };

await step('home page loads', async () => {
  const res = await fetch(base + '/');
  must(res.ok && (await res.text()).includes('Decided'), `status ${res.status}`);
});
await step('health', async () => {
  const h = await (await fetch(base + '/api/health')).json();
  return `mode=${h.mode}${h.model ? ' model=' + h.model : ''}`;
});
let record;
await step('extract example thread', async () => {
  const res = await fetch(base + '/api/extract', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ thread: examples[0].thread }) });
  const body = await res.json();
  must(res.ok, body.error);
  record = body.record;
  return `"${record.title}" (${record.source}); related: ${body.related.map((r) => `${r.title} [${r.level}]`).join(', ') || 'none'}`;
});
let id;
await step('save to log', async () => {
  const res = await fetch(base + '/api/decisions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(record) });
  const body = await res.json();
  must(res.status === 201, body.error);
  id = body.record.id;
  return `id=${id}`;
});
await step('search finds it', async () => {
  const { decisions } = await (await fetch(`${base}/api/decisions?q=${encodeURIComponent(record.tags[0] || 'sqs')}`)).json();
  must(decisions.some((d) => d.id === id), 'not found');
});
await step('clean up', async () => {
  must((await fetch(`${base}/api/decisions/${id}`, { method: 'DELETE' })).ok, 'delete failed');
});
