---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Paste a thread, get a record, see "you may have decided this already", save, search and export — offline**
  Becomes usable: The full core journey in demo mode: extract from an example or pasted thread, red/amber related-decision banner, edit, save to the JSON log, search, view, delete, copy/download ADR Markdown.
  Why now: Contains the unique kernel (the related-decision check) and the whole core loop; everything else builds on it.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Extraction`, `prd.md > Related-decision check`, `prd.md > Decision log`, `prd.md > Export`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Extractor — src/extract.js`, `spec.md > Similarity — src/similar.js`, `spec.md > Store — src/store.js`, `spec.md > ADR renderer — src/adr.js`, `spec.md > Server — server.js`, `spec.md > UI — public/`
  Build: Built before this checklist existed (see Revisions).
  Verify (mechanical): `npm test` — 12 passing (extractor, similarity, ADR, API flow, Claude fallback); UI previously driven end to end in headless Chrome.
  Learner check: Run `npm start`, open http://localhost:3000, pick "Webhook retries: Kafka or SQS?", press Extract decision, and check that the red banner points at the SQS decision; save it, then search "sqs" in the Decision log.
  Commit: `Decided: decision records from team threads, with an already-decided check` (ff9ab99)

- [x] **2. Claude extraction returns schema-guaranteed JSON**
  Becomes usable: In Claude mode the record comes back guaranteed to match the decision schema. Refusals and truncated replies fall back to demo mode with the amber notice, instead of failing silently on a parse error.
  Why now: The only planned behavior not yet built, and the learner's Claude API learning focus.
  PRD ref: `prd.md > Extraction`, `prd.md > States and Boundaries` (Claude error / timeout)
  Spec ref: `spec.md > Claude client — src/claude.js`, `spec.md > External Services and Dependencies`, `spec.md > Important Failure Modes`, `spec.md > Decisions and Open Issues`
  Build: Replace the prompt-only JSON instruction + `parseJsonObject` brace-scraping with `output_config.format` json_schema (`DECISION_SCHEMA`, `additionalProperties: false`, all keys required); `JSON.parse` the text block directly; throw on `stop_reason` `refusal` / `max_tokens`; `max_tokens: 16000`. Update tests.
  Verify (mechanical): `npm test` passes, with tests asserting the request body carries the schema, a structured response is parsed into a `source: 'claude'` record, and refusal / max_tokens responses fall back to demo mode with a warning. If a key is available: one live `POST /api/extract` of the Webhook retries example returns `source: 'claude'`.
  Learner check: With `ANTHROPIC_API_KEY` set, run `npm start`, check the badge says Claude, extract the Webhook retries example, and check that the fields are filled in sensibly and there's no amber fallback notice.
  Commit: `Use structured outputs for Claude extraction` (677e77b). Mocked tests and the smoke test pass. The live Claude check is pending: no `ANTHROPIC_API_KEY` in the build shell, so the learner tries it at the hands-on session.

## Hands-on Checkpoints

- [ ] Early usable behavior explored — shared with the final-review session (the build has one remaining slice)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence:
Route and stops:
Edit outcome:
Reflection:
Activity mode:

## Revisions

- Earlier layer-by-layer steps (extractor, similarity, ADR, store + API, Claude client, UI) merged into slice 1 as already-built work. The code existed before the planning interview; the learner reviewed and approved scope, PRD and spec afterwards, and the tests confirm the journey works.
- The old items "Try Claude mode with a real key" and "Ship" were folded into slice 2's verification and `6-ship` respectively.
- Added slice 2 (structured outputs). `4-spec` found that brace-scraping JSON from the reply could silently drop into demo mode, and that forced tool use returns 400 on `claude-sonnet-5-5`.
