// Shared text helpers: tokenising, stopwords, sentence trimming.

export const STOPWORDS = new Set(
  `a about above after again against all also am an and any are as at be because been before being below
  between both but by can could did do does doing down during each few for from further had has have having
  he her here hers him his how i if in into is it its itself just let lets me more most my no nor not now of
  off on once only or other our ours out over own same she should so some such than that the their theirs
  them then there these they this those through to too under until up very was we were what when where which
  while who whom why will with would you your yours yeah yes ok okay think thing things going go get got
  really maybe still need want like one two use using used make sure good great sounds agree agreed decided
  decision decide lets already fair feels instead also just next week this that we'll i'll it's that's don't can't won't we're i'm you're they're there's`
    .split(/\s+/)
    .filter(Boolean)
);

export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ''))
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

export function clip(text, max = 160) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

export function capitalise(text) {
  const t = String(text || '').trim();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}
