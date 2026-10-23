# CLAUDE.md — Decided

Project memory for coding agents. Read this before changing anything.

## What this is
A zero-dependency Node.js web app: paste a team thread → decision record → related-decision warning → local log → ADR Markdown export.
Plans live in `devpost/` (`scope.md` → `prd.md` → `spec.md` → `checklist.md`). The spec is the source of truth; cite its headings in commits.

## Commands
- `npm start` — http://localhost:3000 (demo mode without `ANTHROPIC_API_KEY`)
- `npm test` — node:test unit + API tests (must stay green)
- `npm run smoke` — hits a running server

## Rules (decisions already made — don't re-litigate)
- **No npm dependencies.** Node built-ins only; no build step for the frontend.
- **Demo mode must always work offline.** Any Claude failure falls back to `src/extract.js` with a visible warning.
- **Every record passes through `normaliseRecord()`** before it is stored or returned.
- **Never use `innerHTML` with user/thread text** — `textContent` / `el()` only.
- API key only from env (`ANTHROPIC_API_KEY`); default model `claude-sonnet-5-5`. Never commit keys or `data/`.
- `src/adr.js` is shared with the browser: keep it a pure ES module with no Node imports.

## Workflow
1. Change the plan (`devpost/spec.md`) first if behaviour changes.
2. Write/adjust a test in `test/`, then the code.
3. Run `npm test`; for UI changes also run the app and click through the Core Journey in `devpost/prd.md`.
4. Small commits, one checklist step each.

## Reusable skill
`.claude/skills/decision-record/` — ask the agent to "record this decision" and it writes an ADR for a decision made in the current coding session into `docs/decisions/`, using the same format as the app.
