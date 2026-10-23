---
doc: scope
status: approved
---

# Decided

A small local web app that turns a messy team chat thread into a clean decision record — and warns you when the team is about to re-debate something it already decided.

## The Unique Kernel

Most "AI meeting summary" tools stop at summarising. Decided keeps a **decision log** and, every time you capture a new thread, checks it against past decisions: *"⚠ You may have decided this already."* The value is memory, not summarising. Remove that check and it is just another summariser.

## Who It's For

A working developer or tech lead on a small product team (5–15 people) who makes architecture and process calls in Slack/Teams threads. Today those decisions live in scroll-back; six months later someone asks "why did we pick SQS?" and nobody can find the thread, so the debate starts again. Writing ADRs by hand is the "right" fix but nobody does it because it takes 20 minutes.

## The Core Loop

1. A thread ends with "let's go with X".
2. Copy the thread, paste it into Decided, press **Extract decision**.
3. Review the pre-filled record (title, decision, who, options, rationale, actions, open questions), fix anything wrong.
4. If Decided flags a related past decision, read it before agreeing.
5. **Save to log** and/or **Copy Markdown** into the repo's `docs/decisions/` folder.

They come back because the log gets more useful the more it holds — every new capture is checked against everything before it.

## Inspiration & Identity

- Architecture Decision Records (Michael Nygard's ADR format) — the output format.
- Tone: calm, practical, "engineering notebook". Navy and cream, monospace accents. No chatbot UI; it's a form you can trust and edit.

## Why This Matters to the Learner

Not stated by the learner. They confirmed the draft's user, kernel and "done" demo as they stand (2026-10-23). The learning goal is the Claude API, and the extraction step (`src/claude.js`) is where that gets practiced.

## What "Working" Looks Like

Paste the example webhook-retries thread → in under a second you see a filled-in decision record **and a red banner** pointing at the June decision "Use SQS for async jobs instead of Kafka" with the shared terms highlighted. Save it, open the Decision log, search "sqs", and both decisions are there; click one and export it as Markdown.

## The POC Boundary

- Paste a thread (plain text, `Name: message` lines, optional timestamps).
- Extract a structured record — with Claude if `ANTHROPIC_API_KEY` is set, otherwise a rule-based demo extractor that works offline.
- Edit every field before saving.
- Related-decision check against the saved log.
- Decision log: list, search, view, edit, delete. Stored in a local JSON file.
- Export as ADR Markdown (copy or download).

## Later

- Slack/Teams slash command or message action ("Save as decision").
- Write ADRs straight into a git repo as a PR.
- Embedding-based similarity instead of word overlap.
- "Superseded by" links between decisions.

## Explicitly Cut

- **User accounts / multi-user sync** — a POC for one person; a shared JSON file in a repo is enough to prove the idea.
- **Direct Slack integration** — OAuth + app review is a day of work and doesn't prove the kernel; copy-paste does.
- **Database** — a JSON file is inspectable and enough for hundreds of decisions.
