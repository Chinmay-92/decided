// Renders a decision record as a Markdown ADR (Architecture/Any Decision Record).
// Pure function, shared by the server, the browser (served at /lib/adr.js) and tests.

export function toAdrMarkdown(r) {
  const bullets = (items) => (items && items.length ? items.map((x) => `- ${x}`).join('\n') : '- _None recorded_');
  const actions = r.actions && r.actions.length
    ? r.actions.map((a) => `- [ ] ${a.owner ? `**${a.owner}** — ` : ''}${a.task}`).join('\n')
    : '- _None recorded_';
  return [
    `# ${r.title}`,
    '',
    `- **Status:** ${r.status === 'open' ? 'Open (no decision yet)' : 'Decided'}`,
    `- **Date:** ${r.date}`,
    r.decidedBy ? `- **Decided by:** ${r.decidedBy}` : null,
    r.participants && r.participants.length ? `- **Participants:** ${r.participants.join(', ')}` : null,
    r.tags && r.tags.length ? `- **Tags:** ${r.tags.map((t) => '`' + t + '`').join(' ')}` : null,
    '',
    '## Context',
    '',
    r.context || '_Not recorded_',
    '',
    '## Decision',
    '',
    r.decision || '_No decision has been made yet._',
    '',
    '## Options considered',
    '',
    bullets(r.options),
    '',
    '## Rationale',
    '',
    bullets(r.rationale),
    '',
    '## Actions',
    '',
    actions,
    '',
    '## Open questions',
    '',
    bullets(r.openQuestions),
    '',
  ]
    .filter((line) => line !== null)
    .join('\n');
}

export function adrFilename(r) {
  const slug = String(r.title || 'decision').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  return `${r.date || 'undated'}-${slug || 'decision'}.md`;
}
