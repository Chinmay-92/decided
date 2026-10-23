---
doc: prd
status: draft
---

<!-- Drafted by the coding agent following the Devpost Learn Skill Pack's 3-prd template.
     Re-run `3-prd` in your agent to do the interview and set status: approved. -->

# Decided — Product Requirements

A local web app for a developer or tech lead that turns a pasted team thread into an editable decision record, warns about overlapping past decisions, and keeps a searchable log (see `scope.md > Who It's For`, `scope.md > The Core Loop`).

## The Core Journey

1. Run `npm start` and open `http://localhost:3000`. The header shows the mode: **Demo mode · no API key** or **Claude · claude-sonnet-5-5**.
2. On the **Capture** tab, paste a thread into the left pane (or choose an example from "Try an example").
3. Press **Extract decision** (or Cmd/Ctrl+Enter). The button reads "Reading the thread…" while it works.
4. The right pane fills with a decision record. If the log contains a similar past decision, a banner appears above it:
   - red "⚠ You may have decided this already" for a strong match;
   - amber "Related past decisions" for a weaker one.
   Each item shows title, date, match % and shared terms; clicking it opens the past record.
5. The user edits any field, then presses **Save to log**. A "✓ Saved to your decision log" confirmation appears and the log count in the tab increases.
6. **Copy Markdown** or **Download .md** exports the record as an ADR.
7. On the **Decision log** tab the user searches, opens a record, and can Edit, Copy Markdown or Delete it.

## Screens and Layout

- **Header**: logo mark, name, tagline; mode badge on the right.
- **Tabs**: Capture | Decision log (count).
- **Capture**: two columns on desktop (thread input left, record right); stacks on narrow screens.
- **Decision log**: search box, then a list of cards (date · decided by, title, decision, status and tag pills).
- **Detail dialog**: the record rendered as Markdown with Edit / Copy Markdown / Delete / Close.

## Look and Feel

Calm "engineering notebook": cream background, white panels, navy accent, monospace for the thread and metadata. Supports dark mode via the OS setting. No chat bubbles — the record is a plain, trustworthy form.

## Features and Behavior

### Extraction
- Recognises `Name: message`, `[09:12] Name: message` and multi-line continuations.
- Fields: title, status (decided/open), decision, decided by, participants, context, options considered, rationale, actions (owner + task), open questions, tags, date.
- With `ANTHROPIC_API_KEY`: Claude extracts the fields. Without it, or if the API fails: the rule-based extractor runs and (on failure) a notice explains the fallback.
- Acceptance: the "Webhook retries" example produces title "Use SQS plus a DLQ for webhook retries", decided by Priya, two actions (Aisha, Tom), one open question.

### Related-decision check
- Compares the new record with every saved record by shared topic words.
- Acceptance: the "Webhook retries" example flags the seeded "Use SQS for async jobs instead of Kafka" decision as a strong match. The "Release cadence" example flags nothing.

### Decision log
- Save (create or update in place), list newest first, search across title/decision/context/tags/people, view, edit, delete with confirmation.
- First run seeds three example past decisions so the check is demonstrable.

### Export
- ADR Markdown: title, status, date, decided by, participants, tags, Context, Decision, Options considered, Rationale, Actions (checkboxes), Open questions.

## States and Boundaries

- **First use**: empty right pane explains what to do; log contains 3 seeded examples.
- **Empty input**: inline error "Paste a conversation first — or pick an example above."
- **No decision in thread**: status "Open — no decision yet", empty decision field.
- **Claude error / timeout**: falls back to demo extraction with a visible amber notice.
- **Persistence**: saved records survive restarts (`data/decisions.json`).
- **Privacy**: in demo mode nothing leaves the machine; in Claude mode the thread is sent to the Anthropic API.

## Product Decisions

- Copy-paste input instead of a Slack integration — proves the kernel with zero setup. (Assumption: users are fine copying a thread.)
- Every extracted field is editable before saving — the AI drafts, the human decides.
- Works fully offline without an API key so judges and new users can try it instantly.

## What We're Building

Capture → extract → related check → edit → save → log/search → export, as described above.

## Deferred From the POC

- Slack/Teams integration (setup cost; copy-paste proves the value).
- Multi-user/shared log (needs auth and hosting).
- Superseded-by links (needs a richer data model).

## Possible Later Enhancements

- Commit ADRs straight to the team repo as a pull request.
- Semantic similarity with embeddings for better matching across different wording.

## Non-Goals

- Not a meeting-notes or transcription tool.
- Not a chat assistant; there is no conversation with the AI.
- No accounts, no cloud storage.

## Open Questions

- Match thresholds (18% related / 35% strong) were tuned on the examples; they can wait for real use.
