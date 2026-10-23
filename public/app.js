import { toAdrMarkdown, adrFilename } from '/lib/adr.js';

const $ = (id) => document.getElementById(id);
let current = null; // the record being edited
let examples = [];

// ---------- helpers ----------
async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const isJson = (res.headers.get('content-type') || '').includes('json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) throw new Error((isJson && data.error) || `Request failed (${res.status})`);
  return data;
}

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  for (const c of children) node.append(c);
  return node;
}

const splitLines = (v) => v.split('\n').map((s) => s.trim()).filter(Boolean);
const splitCommas = (v) => v.split(',').map((s) => s.trim()).filter(Boolean);

function showView(name) {
  for (const btn of document.querySelectorAll('.tabs button')) btn.setAttribute('aria-selected', String(btn.dataset.view === name));
  $('view-capture').hidden = name !== 'capture';
  $('view-log').hidden = name !== 'log';
  if (name === 'log') renderLog();
}

// ---------- form <-> record ----------
function fillForm(r) {
  current = r;
  $('empty').hidden = true;
  $('record').hidden = false;
  $('f-status').value = r.status;
  $('f-date').value = r.date;
  $('f-title').value = r.title;
  $('f-decision').value = r.decision;
  $('f-decidedBy').value = r.decidedBy;
  $('f-participants').value = r.participants.join(', ');
  $('f-context').value = r.context;
  $('f-options').value = r.options.join('\n');
  $('f-rationale').value = r.rationale.join('\n');
  $('f-actions').value = r.actions.map((a) => (a.owner ? `${a.owner}: ${a.task}` : a.task)).join('\n');
  $('f-openQuestions').value = r.openQuestions.join('\n');
  $('f-tags').value = r.tags.join(', ');
  $('f-source').textContent = r.id ? `saved · ${r.source === 'claude' ? 'extracted by Claude' : 'extracted in demo mode'}` : r.source === 'claude' ? 'extracted by Claude' : 'extracted in demo mode';
  $('saved-msg').textContent = '';
}

function readForm() {
  return {
    ...(current?.id ? { id: current.id } : {}),
    source: current?.source || 'demo',
    status: $('f-status').value,
    date: $('f-date').value,
    title: $('f-title').value.trim(),
    decision: $('f-decision').value.trim(),
    decidedBy: $('f-decidedBy').value.trim(),
    participants: splitCommas($('f-participants').value),
    context: $('f-context').value.trim(),
    options: splitLines($('f-options').value),
    rationale: splitLines($('f-rationale').value),
    actions: splitLines($('f-actions').value).map((line) => {
      const m = line.match(/^([^:]{1,40}):\s+(.+)$/);
      return m ? { owner: m[1].trim(), task: m[2].trim() } : { owner: '', task: line };
    }),
    openQuestions: splitLines($('f-openQuestions').value),
    tags: splitCommas($('f-tags').value).map((t) => t.toLowerCase()),
  };
}

// ---------- related decisions ----------
function renderRelated(related) {
  const box = $('related');
  box.replaceChildren();
  if (!related || !related.length) { box.hidden = true; return; }
  const strong = related.some((r) => r.level === 'strong');
  box.className = `related${strong ? ' strong' : ''}`;
  box.append(el('h3', { textContent: strong ? '⚠ You may have decided this already' : 'Related past decisions' }));
  box.append(el('div', { textContent: strong ? 'Check before re-debating — this thread overlaps strongly with an earlier record:' : 'These earlier records share topics with this thread:' }));
  const ul = el('ul');
  for (const r of related) {
    const link = el('a', { href: '#', textContent: r.title });
    link.addEventListener('click', (e) => { e.preventDefault(); openDetail(r.id); });
    ul.append(el('li', {}, link, ` — ${r.date} `, el('span', { className: 'score', textContent: `(match ${Math.round(r.score * 100)}%: ${r.shared.join(', ')})` }), el('br'), el('span', { textContent: r.decision })));
  }
  box.append(ul);
  box.hidden = false;
  box.classList.add('flash');
}

// ---------- capture ----------
async function extract() {
  const thread = $('thread').value;
  $('input-error').hidden = true;
  if (!thread.trim()) {
    $('input-error').textContent = 'Paste a conversation first — or pick an example above.';
    $('input-error').hidden = false;
    return;
  }
  const btn = $('extract');
  btn.disabled = true;
  btn.textContent = 'Reading the thread…';
  try {
    const { record, related, warning } = await api('/api/extract', { method: 'POST', body: { thread } });
    $('warning').textContent = warning || '';
    $('warning').hidden = !warning;
    fillForm(record);
    renderRelated(related);
  } catch (err) {
    $('input-error').textContent = err.message;
    $('input-error').hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Extract decision';
  }
}

async function save(e) {
  e.preventDefault();
  try {
    const { record } = await api('/api/decisions', { method: 'POST', body: readForm() });
    fillForm(record);
    $('saved-msg').textContent = '✓ Saved to your decision log';
    refreshCount();
  } catch (err) {
    $('saved-msg').textContent = err.message;
  }
}

async function copyMarkdown(record) {
  const md = toAdrMarkdown(record);
  try {
    await navigator.clipboard.writeText(md);
    $('saved-msg').textContent = '✓ Markdown copied';
  } catch {
    $('saved-msg').textContent = 'Clipboard blocked — use Download instead';
  }
}

function download(record) {
  const blob = new Blob([toAdrMarkdown(record)], { type: 'text/markdown' });
  const a = el('a', { href: URL.createObjectURL(blob), download: adrFilename(record) });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- log ----------
async function refreshCount() {
  const { decisions } = await api('/api/decisions');
  $('log-count').textContent = decisions.length ? `(${decisions.length})` : '';
}

let searchTimer;
async function renderLog() {
  const { decisions } = await api(`/api/decisions?q=${encodeURIComponent($('search').value)}`);
  const list = $('log-list');
  list.replaceChildren();
  $('log-empty').hidden = decisions.length > 0;
  for (const d of decisions) {
    const pills = el('span');
    pills.append(el('span', { className: `pill ${d.status}`, textContent: d.status }));
    for (const t of d.tags) pills.append(el('span', { className: 'pill', textContent: t }));
    const li = el('li', { tabIndex: 0 },
      el('div', { className: 'meta', textContent: `${d.date}${d.decidedBy ? ' · ' + d.decidedBy : ''}` }),
      el('h3', { textContent: d.title }),
      el('p', { textContent: d.decision || d.context }),
      pills);
    li.addEventListener('click', () => openDetail(d.id));
    li.addEventListener('keydown', (e) => e.key === 'Enter' && openDetail(d.id));
    list.append(li);
  }
}

let detailRecord = null;
async function openDetail(id) {
  const { record } = await api(`/api/decisions/${encodeURIComponent(id)}`);
  detailRecord = record;
  $('detail-md').textContent = toAdrMarkdown(record);
  $('detail').showModal();
}

// ---------- wiring ----------
async function init() {
  const health = await api('/api/health');
  $('mode').textContent = health.mode === 'claude' ? `Claude · ${health.model}` : 'Demo mode · no API key';
  $('mode').classList.toggle('claude', health.mode === 'claude');

  examples = await api('/samples/examples.json');
  for (const [i, ex] of examples.entries()) $('example-select').append(el('option', { value: String(i), textContent: ex.name }));
  $('example-select').addEventListener('change', (e) => {
    const ex = examples[Number(e.target.value)];
    if (ex) $('thread').value = ex.thread;
  });

  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));
  $('extract').addEventListener('click', extract);
  $('thread').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) extract(); });
  $('record').addEventListener('submit', save);
  $('copy').addEventListener('click', () => copyMarkdown(readForm()));
  $('download').addEventListener('click', () => download(readForm()));
  $('search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(renderLog, 150); });

  $('detail-close').addEventListener('click', () => $('detail').close());
  $('detail-copy').addEventListener('click', () => navigator.clipboard.writeText(toAdrMarkdown(detailRecord)).catch(() => {}));
  $('detail-edit').addEventListener('click', () => {
    $('detail').close();
    $('warning').hidden = true;
    $('related').hidden = true;
    fillForm(detailRecord);
    showView('capture');
  });
  $('detail-delete').addEventListener('click', async () => {
    if (!confirm(`Delete “${detailRecord.title}”?`)) return;
    await api(`/api/decisions/${encodeURIComponent(detailRecord.id)}`, { method: 'DELETE' });
    if (current?.id === detailRecord.id) current = { ...current, id: undefined };
    $('detail').close();
    renderLog();
    refreshCount();
  });

  refreshCount();
}

init().catch((err) => {
  $('mode').textContent = 'Server unreachable';
  console.error(err);
});
