// Claude mode: asks the Anthropic Messages API to extract the decision record.
// Used only when ANTHROPIC_API_KEY is set; any failure falls back to demo mode.
import { normaliseRecord } from './extract.js';

export const DEFAULT_MODEL = 'claude-sonnet-5-5';

const SYSTEM = `You turn messy team chat threads into concise decision records.
Return ONLY a JSON object, no prose, with exactly these keys:
{"title": string (imperative, <= 10 words, e.g. "Use Postgres for the events store"),
 "status": "decided" | "open",
 "decision": string (what was decided, one or two sentences; empty if open),
 "decidedBy": string (person who made or confirmed the call; empty if unclear),
 "participants": string[],
 "context": string (the problem being discussed, 1-2 sentences),
 "options": string[] (alternatives that were considered, short),
 "rationale": string[] (reasons given for the choice, short),
 "actions": {"owner": string, "task": string}[],
 "openQuestions": string[] (things still unresolved),
 "tags": string[] (2-4 lowercase topic keywords)}
Only use information present in the thread. Never invent names, numbers or reasons.`;

export function claudeAvailable(env = process.env) {
  return Boolean(env.ANTHROPIC_API_KEY);
}

export function parseJsonObject(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Claude did not return JSON');
  return JSON.parse(text.slice(start, end + 1));
}

export async function extractWithClaude(thread, { env = process.env, fetchImpl = fetch, today = new Date() } = {}) {
  const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Thread:\n"""\n${thread}\n"""` }],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const parsed = parseJsonObject(text);
  return normaliseRecord({ ...parsed, date: today.toISOString().slice(0, 10), source: 'claude' });
}
