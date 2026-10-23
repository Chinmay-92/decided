// Demo-mode extractor: a transparent, rule-based reader of a chat thread.
// It needs no network or API key, so the app works out of the box.
// It is deliberately simple: it looks for conversational cues ("let's go with",
// "I'll", "?") rather than trying to understand the text.

import { tokenize, clip, capitalise } from './text.js';

const MESSAGE_RE = /^\s*(?:\[?\d{1,2}[:.]\d{2}(?:\s?[ap]m)?\]?\s*[-–]?\s*)?([A-Z@][\w .'’-]{0,30}?)\s*:\s+(.+)$/i;
const DECISION_RE = /\b(let'?s go with|let'?s use|let'?s do|let'?s stick with|we'?ll go with|we'?ll use|we'?re going with|going with|decided|decision( is|:)|agreed|settled on|final call|ship it with|we'?ll stick with)\b/i;
const OPTION_RE = /\b(option|alternatively|could (also )?(use|try|go with)|what about|how about|versus|vs\.?|or we (could|just)|another approach|instead of)\b/i;
const RATIONALE_RE = /\b(because|since|so that|the reason|cheaper|faster|simpler|safer|easier|already (have|use)|avoids?|reduces?|means we)\b/i;
const ACTION_RE = /\b(i'?ll|i will|i can (take|do|write|pick)|action:|todo:?|can you|could you|will (do|take|handle|write|update|set up|draft))\b/i;
const OPEN_RE = /\b(tbd|not sure|still need to|open question|unclear|we should check|need to confirm|follow up)\b/i;
const NOT_A_SPEAKER = /^(https?|note|re|fwd|subject|todo|action|decision|update)$/i;

export function parseMessages(thread) {
  const messages = [];
  for (const raw of String(thread || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(MESSAGE_RE);
    if (m && !NOT_A_SPEAKER.test(m[1].trim())) {
      messages.push({ speaker: m[1].replace(/^@/, '').trim(), text: m[2].trim() });
    } else if (messages.length) {
      // Continuation of the previous message (multi-line paste).
      messages[messages.length - 1].text += ' ' + line;
    } else {
      messages.push({ speaker: 'Unknown', text: line });
    }
  }
  return messages;
}

function decisionSentence(text) {
  // Prefer the last substantive sentence with a decision cue ("Agreed." alone is too thin).
  const hits = text.split(/(?<=[.!])\s+/).filter((s) => DECISION_RE.test(s));
  const substantive = hits.filter((s) => s.split(/\s+/).length >= 4);
  return substantive.at(-1) || hits.at(-1) || text;
}

const CHOICE_CUE = /^.*?\b(let'?s go with|let'?s use|let'?s stick with|we'?ll go with|we'?ll use|we'?re going with|going with|settled on|ship it with|we'?ll stick with)\b\s*/i;

function titleFromDecision(sentence) {
  const isChoice = CHOICE_CUE.test(sentence); // "let's go with X" -> "Use X"
  let t = sentence
    .replace(CHOICE_CUE, '')
    .replace(/^.*?\b(let'?s do|decided|agreed|decision is|decision:|final call:?)\b\s*(to|on|that|:)?\s*/i, '')
    .replace(/[.!]+$/, '')
    .trim();
  t = t.split(/\s[-–—]\s|,\s|;/)[0].trim();
  if (!t) t = sentence;
  if (isChoice && !/^(use|adopt|keep|switch|move)\b/i.test(t)) t = `Use ${t}`;
  return clip(capitalise(t), 80);
}

function topTags(messages, n = 4) {
  const freq = new Map();
  for (const { text } of messages) {
    for (const w of new Set(tokenize(text))) freq.set(w, (freq.get(w) || 0) + 1);
  }
  return [...freq.entries()]
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([w]) => w);
}

function ownerFor(msg) {
  const mention = msg.text.match(/@([A-Za-z][\w.-]*)/);
  if (/\b(can you|could you)\b/i.test(msg.text) && mention) return mention[1];
  return msg.speaker;
}

export function extractDecision(thread, { today = new Date() } = {}) {
  const messages = parseMessages(thread);
  if (!messages.length) throw new Error('The thread is empty. Paste a conversation first.');

  const participants = [...new Set(messages.map((m) => m.speaker).filter((s) => s !== 'Unknown'))];

  let decisionIdx = -1;
  messages.forEach((m, i) => {
    if (DECISION_RE.test(m.text)) decisionIdx = i; // last decision cue wins
  });
  const decisionMsg = decisionIdx >= 0 ? messages[decisionIdx] : null;
  const sentence = decisionMsg ? decisionSentence(decisionMsg.text) : '';

  const uniq = (arr) => [...new Map(arr.map((x) => [x.toLowerCase(), x])).values()];

  const options = uniq(
    messages.filter((m, i) => i !== decisionIdx && OPTION_RE.test(m.text)).map((m) => clip(`${m.speaker}: ${m.text}`, 140))
  ).slice(0, 5);

  const rationale = uniq(messages.filter((m) => RATIONALE_RE.test(m.text)).map((m) => clip(m.text, 160))).slice(0, 4);

  const actions = messages
    .filter((m) => ACTION_RE.test(m.text) && !/\?$/.test(m.text.trim()) || (/\b(can you|could you)\b/i.test(m.text) && /@\w/.test(m.text)))
    .map((m) => ({ owner: ownerFor(m), task: clip(m.text.replace(/^(action|todo):?\s*/i, ''), 140) }))
    .slice(0, 6);

  const openQuestions = uniq(
    messages
      .filter((m, i) => (m.text.trim().endsWith('?') && (decisionIdx < 0 || i > decisionIdx) && !/\b(can you|could you)\b/i.test(m.text)) || OPEN_RE.test(m.text))
      .map((m) => clip(m.text, 160))
  ).slice(0, 4);

  return normaliseRecord({
    title: decisionMsg ? titleFromDecision(sentence) : clip(capitalise(messages[0].text), 80),
    status: decisionMsg ? 'decided' : 'open',
    decision: decisionMsg ? clip(sentence, 240) : '',
    decidedBy: decisionMsg ? decisionMsg.speaker : '',
    date: today.toISOString().slice(0, 10),
    participants,
    context: clip(messages[0].text, 240),
    options,
    rationale,
    actions,
    openQuestions,
    tags: topTags(messages),
    source: 'demo',
  });
}

// Coerces any record-like object (from the heuristic, Claude, or the UI) into a safe shape.
export function normaliseRecord(r = {}) {
  const str = (v, max = 400) => clip(typeof v === 'string' ? v : v == null ? '' : String(v), max);
  const list = (v, max = 10) => (Array.isArray(v) ? v : typeof v === 'string' && v ? v.split('\n') : []).map((x) => str(x)).filter(Boolean).slice(0, max);
  const actions = (Array.isArray(r.actions) ? r.actions : [])
    .map((a) => (typeof a === 'string' ? { owner: '', task: str(a) } : { owner: str(a?.owner, 60), task: str(a?.task) }))
    .filter((a) => a.task)
    .slice(0, 10);
  return {
    ...(r.id ? { id: str(r.id, 40) } : {}),
    title: str(r.title, 120) || 'Untitled decision',
    status: r.status === 'open' ? 'open' : 'decided',
    decision: str(r.decision, 600),
    decidedBy: str(r.decidedBy, 60),
    date: /^\d{4}-\d{2}-\d{2}$/.test(r.date || '') ? r.date : new Date().toISOString().slice(0, 10),
    participants: list(r.participants, 20),
    context: str(r.context, 800),
    options: list(r.options),
    rationale: list(r.rationale),
    actions,
    openQuestions: list(r.openQuestions),
    tags: list(r.tags, 8).map((t) => t.toLowerCase()),
    source: r.source === 'claude' ? 'claude' : 'demo',
    ...(r.createdAt ? { createdAt: str(r.createdAt, 40) } : {}),
  };
}
