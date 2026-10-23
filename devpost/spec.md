---
doc: spec
status: draft
---

<!-- Drafted by the coding agent following the Devpost Learn Skill Pack's 4-spec template.
     Re-run `4-spec` in your agent to review the plan and set status: approved. -->

# Decided — Technical Spec

## How This Works, In Plain Language

A tiny Node.js server runs on your laptop. It serves one web page and a handful of API endpoints. When you paste a thread, the server either asks Claude to pull out the decision (if you've given it an API key) or uses a simple rule-based reader that looks for phrases like "let's go with", "I'll" and question marks. It then compares the result with the decisions you've already saved, using word overlap, and tells you if one looks similar. Saved decisions live in one JSON file you can open in any editor.

## The Core Journey Through the System

1. Browser loads `/` → `public/index.html`, `app.js`, `styles.css`; `app.js` calls `GET /api/health` (mode badge) and fetches `/samples/examples.json`.
2. Extract → `POST /api/extract {thread}` → `src/claude.js` (if key) else `src/extract.js` → `normaliseRecord()` → `src/similar.js findRelated()` against `store.list()` → `{record, related, warning}`.
3. The form is filled; the related banner is rendered (implements `prd.md > Related-decision check`).
4. Save → `POST /api/decisions` → `src/store.js save()` writes `data/decisions.json` atomically (tmp file + rename).
5. Log tab → `GET /api/decisions?q=` ; detail → `GET /api/decisions/:id`; delete → `DELETE /api/decisions/:id`.
6. Export → `src/adr.js toAdrMarkdown()` runs in the browser (served as `/lib/adr.js`) — same function the tests use.

## Stack

- **Node.js ≥ 20** (built-in `http`, `fs`, `fetch`, `node:test`) — zero npm dependencies, so `npm start` works straight after cloning. Tradeoff: no framework conveniences (routing, validation).
- **Vanilla HTML/CSS/ES modules** — no build step. Tradeoff: manual DOM code.
- **Anthropic Messages API** (optional), model `claude-sonnet-5-5` (override with `ANTHROPIC_MODEL`). Docs: https://docs.anthropic.com/en/api/messages

## Where It Runs and How Someone Tries It

- `npm start` → http://localhost:3000 (`PORT` to change).
- Optional: `ANTHROPIC_API_KEY=… npm start` for Claude mode.
- Demo: pick "Webhook retries: Kafka or SQS?" → Extract → see the red banner → Save → Decision log → search "sqs".
- Tests: `npm test`. Smoke against a running server: `npm run smoke`.
- No deployment for the POC.

## Look and Feel

CSS custom properties for colours (light + dark via `prefers-color-scheme`), system UI font, monospace for the thread textarea and metadata, navy accent (#1f3a5f), cream background (#f6f3ee). Two-column grid collapsing below 860px.

## Components

### Extractor — `src/extract.js`
Implements `prd.md > Extraction`. Parses messages, finds the last substantive decision cue, options/rationale/actions/questions by regex cues, top repeated words as tags. `normaliseRecord()` coerces any input (heuristic, Claude, browser) into a safe shape.

### Claude client — `src/claude.js`
Implements `prd.md > Extraction` (Claude mode). One `fetch` to `/v1/messages` with a strict JSON-only system prompt; parses the first `{…}` block; 45s timeout. Any error → server falls back to the extractor with a warning.

### Similarity — `src/similar.js`
Implements `prd.md > Related-decision check`. Cosine similarity of word counts (title and tags weighted ×2). ≥ 0.18 related, ≥ 0.35 strong. Returns shared terms for explainability.

### Store — `src/store.js`
Implements `prd.md > Decision log`. JSON file, in-memory cache, atomic writes, seeds from `samples/seed-decisions.json` on first run.

### ADR renderer — `src/adr.js`
Implements `prd.md > Export`. Pure function shared by browser, server and tests.

### Server — `server.js`
Static allow-list (no path traversal), JSON API, 200 KB body limit, error → JSON.

### UI — `public/`
Capture and Log views, detail dialog. Uses `textContent` everywhere (no HTML injection from pasted threads).

## Data Model

```
Decision {
  id, title, status: 'decided'|'open', decision, decidedBy, date (YYYY-MM-DD),
  participants[], context, options[], rationale[], actions[{owner, task}],
  openQuestions[], tags[], source: 'claude'|'demo', createdAt
}
```
Lives in `data/decisions.json` (git-ignored). Updated on save/delete; persists across restarts.

## File Structure

```
server.js              HTTP server + API routes
src/extract.js         demo-mode extractor + normaliseRecord
src/claude.js          Anthropic API client
src/similar.js         related-decision scoring
src/store.js           JSON-file decision log
src/adr.js             Markdown ADR renderer (shared with browser)
src/text.js            tokeniser, stopwords
public/                index.html, app.js, styles.css, favicon.svg
samples/               example threads + seed decisions
test/                  node:test unit + API tests
scripts/smoke.mjs      smoke test against a running server
devpost/               planning docs (scope, prd, spec, checklist)
.claude/skills/        reusable project skill (decision-record)
```

## External Services and Dependencies

- Anthropic Messages API — `POST https://api.anthropic.com/v1/messages`, headers `x-api-key`, `anthropic-version: 2023-06-01`; `max_tokens: 1500`. Key from `ANTHROPIC_API_KEY` env var only. A capture costs roughly one short Sonnet request. Optional.

## Important Failure Modes

1. **Claude unavailable / bad JSON** → fall back to demo extractor, show amber notice.
2. **Thread not in `Name: message` format** → lines treated as one "Unknown" speaker; user edits fields.
3. **Corrupt data file** → server error on load; fix or delete `data/decisions.json` (documented in README).

## What Was Simplified and Why

- Word-overlap similarity instead of embeddings — explainable, offline, good enough to prove the kernel.
- Single-user JSON file instead of a database — a full version needs auth and a shared store.
- Rule-based demo extractor — lets anyone run it with no key; Claude mode handles real-world mess better.

## Decisions and Open Issues

- **Zero dependencies** — chosen so reviewers and teammates can run it instantly. Tradeoff accepted: hand-written routing.
- **Uncertainty**: would word overlap catch real re-debates? Investigated with the seeded examples (strong 0.5+ for the SQS case, 0 for unrelated) and covered by tests; real-world tuning is open.
