// Claude mode: asks the Anthropic Messages API to extract the decision record.
// Used only when ANTHROPIC_API_KEY is set; any failure falls back to demo mode.
// Structured outputs (output_config.format) guarantee the reply matches DECISION_SCHEMA.
import { normaliseRecord } from './extract.js';

export const DEFAULT_MODEL = 'claude-sonnet-5-5';

const strings = (description) => ({ type: 'array', items: { type: 'string' }, description });

export const DECISION_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Imperative, at most 10 words, e.g. "Use Postgres for the events store"' },
    status: { type: 'string', enum: ['decided', 'open'] },
    decision: { type: 'string', description: 'What was decided, one or two sentences; empty if open' },
    decidedBy: { type: 'string', description: 'Person who made or confirmed the call; empty if unclear' },
    participants: strings('Everyone who spoke in the thread'),
    context: { type: 'string', description: 'The problem being discussed, 1-2 sentences' },
    options: strings('Alternatives that were considered, short'),
    rationale: strings('Reasons given for the choice, short'),
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: { owner: { type: 'string' }, task: { type: 'string' } },
        required: ['owner', 'task'],
        additionalProperties: false,
      },
    },
    openQuestions: strings('Things still unresolved'),
    tags: strings('2-4 lowercase topic keywords'),
  },
  required: ['title', 'status', 'decision', 'decidedBy', 'participants', 'context', 'options', 'rationale', 'actions', 'openQuestions', 'tags'],
  additionalProperties: false,
};

const SYSTEM = `You turn messy team chat threads into concise decision records.
Only use information present in the thread. Never invent names, numbers or reasons.`;

export function claudeAvailable(env = process.env) {
  return Boolean(env.ANTHROPIC_API_KEY);
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
      // Adaptive thinking shares this limit with the JSON, so leave plenty of room.
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { format: { type: 'json_schema', schema: DECISION_SCHEMA } },
      messages: [{ role: 'user', content: `Thread:\n"""\n${thread}\n"""` }],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  // A refused or truncated reply is not guaranteed to match the schema.
  if (data.stop_reason === 'refusal' || data.stop_reason === 'max_tokens') {
    throw new Error(`Claude stopped early (stop_reason: ${data.stop_reason})`);
  }
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const parsed = JSON.parse(text);
  return normaliseRecord({ ...parsed, date: today.toISOString().slice(0, 10), source: 'claude' });
}
