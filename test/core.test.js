import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractDecision, parseMessages, normaliseRecord } from '../src/extract.js';
import { findRelated, similarity } from '../src/similar.js';
import { toAdrMarkdown, adrFilename } from '../src/adr.js';
import { DECISION_SCHEMA } from '../src/claude.js';

const examples = JSON.parse(readFileSync(new URL('../samples/examples.json', import.meta.url)));
const seed = JSON.parse(readFileSync(new URL('../samples/seed-decisions.json', import.meta.url)));
const today = new Date('2026-10-23T12:00:00Z');

test('parses "Name: message" and timestamped lines, joining continuations', () => {
  const msgs = parseMessages('[09:12] Sam: first\ncontinued here\nLeah: second');
  assert.deepEqual(msgs, [
    { speaker: 'Sam', text: 'first continued here' },
    { speaker: 'Leah', text: 'second' },
  ]);
});

test('extracts the webhook decision with owner actions and open question', () => {
  const r = extractDecision(examples[0].thread, { today });
  assert.equal(r.status, 'decided');
  assert.equal(r.decidedBy, 'Priya');
  assert.match(r.title, /^Use SQS plus a DLQ for webhook retries/);
  assert.deepEqual(r.participants, ['Priya', 'Tom', 'Aisha']);
  assert.ok(r.options.some((o) => /Kafka/.test(o)));
  assert.ok(r.rationale.some((o) => /cheaper/.test(o)));
  assert.deepEqual(r.actions.map((a) => a.owner), ['Aisha', 'Tom']);
  assert.equal(r.openQuestions.length, 1);
  assert.equal(r.date, '2026-10-23');
  assert.ok(r.tags.includes('sqs'));
});

test('assigns "can you @X" requests to the mentioned person', () => {
  const r = extractDecision(examples[1].thread, { today });
  assert.equal(r.decidedBy, 'Sam');
  assert.ok(r.actions.some((a) => a.owner === 'Sam' && /engineering/.test(a.task)));
  assert.ok(r.openQuestions.some((q) => /hotfix/.test(q)));
});

test('marks a thread with no decision as open', () => {
  const r = extractDecision(examples[2].thread, { today });
  assert.equal(r.status, 'open');
  assert.equal(r.decision, '');
  assert.ok(r.openQuestions.length > 0);
});

test('rejects an empty thread', () => {
  assert.throws(() => extractDecision('   '), /empty/);
});

test('normaliseRecord coerces junk into a safe shape', () => {
  const r = normaliseRecord({ title: 42, status: 'weird', actions: ['do it', { owner: 'A', task: '' }], tags: 'X\nY', date: 'nope' });
  assert.equal(r.title, '42');
  assert.equal(r.status, 'decided');
  assert.deepEqual(r.actions, [{ owner: '', task: 'do it' }]);
  assert.deepEqual(r.tags, ['x', 'y']);
  assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/);
});

test('flags the earlier SQS decision as a strong match for the webhook thread', () => {
  const r = extractDecision(examples[0].thread, { today });
  const related = findRelated(r, seed);
  assert.equal(related[0].id, 'seed-001');
  assert.equal(related[0].level, 'strong');
});

test('unrelated topics do not match', () => {
  const r = extractDecision(examples[1].thread, { today });
  assert.deepEqual(findRelated(r, seed), []);
  assert.ok(similarity(seed[0], seed[2]) < 0.18);
});

test('renders ADR markdown and a safe filename', () => {
  const r = extractDecision(examples[0].thread, { today });
  const md = toAdrMarkdown(r);
  assert.match(md, /^# Use SQS/);
  assert.match(md, /## Decision\n\n.*SQS/);
  assert.match(md, /- \[ \] \*\*Aisha\*\* — /);
  assert.match(adrFilename(r), /^2026-10-23-use-sqs-plus-a-dlq[a-z0-9-]*\.md$/);
});

test('decision schema is strict enough for structured outputs', () => {
  const objects = [DECISION_SCHEMA, DECISION_SCHEMA.properties.actions.items];
  for (const o of objects) {
    assert.equal(o.additionalProperties, false);
    assert.deepEqual([...o.required].sort(), Object.keys(o.properties).sort());
  }
});
