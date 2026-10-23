// "Have we decided this before?" — cosine similarity over word counts.
import { tokenize } from './text.js';

function vector(record) {
  const text = [
    record.title, record.title, // title counts double
    record.decision,
    (record.tags || []).join(' '), (record.tags || []).join(' '),
    (record.options || []).join(' '),
    record.context,
  ].join(' ');
  const v = new Map();
  for (const w of tokenize(text)) v.set(w, (v.get(w) || 0) + 1);
  return v;
}

export function similarity(a, b) {
  const va = vector(a);
  const vb = vector(b);
  let dot = 0;
  for (const [w, c] of va) if (vb.has(w)) dot += c * vb.get(w);
  const norm = (v) => Math.sqrt([...v.values()].reduce((s, c) => s + c * c, 0));
  const d = norm(va) * norm(vb);
  return d ? dot / d : 0;
}

export const RELATED_THRESHOLD = 0.18;
export const CONFLICT_THRESHOLD = 0.35;

export function findRelated(record, saved, { limit = 3 } = {}) {
  return saved
    .filter((s) => s.id !== record.id)
    .map((s) => {
      const score = similarity(record, s);
      const shared = [...vector(record).keys()].filter((w) => vector(s).has(w)).slice(0, 6);
      return { id: s.id, title: s.title, date: s.date, decision: s.decision, score: Math.round(score * 100) / 100, level: score >= CONFLICT_THRESHOLD ? 'strong' : 'related', shared };
    })
    .filter((r) => r.score >= RELATED_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
