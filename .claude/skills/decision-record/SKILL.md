---
name: decision-record
description: Record a decision made during the current coding session as a Markdown ADR in docs/decisions/, in the same format Decided exports. Use when the user says "record this decision", "write an ADR", "log that we chose X", or after agreeing a non-obvious technical choice (library, data model, trade-off) worth remembering.
---

# decision-record

Coding agents forget decisions made ten prompts ago. This skill writes them down so the next session (and teammates) can find them.

## Steps

1. **Identify the decision.** From the conversation, find: what was decided, the alternatives discussed, the reasons, who decided (the user, unless stated), follow-up actions, and anything still open. If there is no clear decision, ask the user one question: "What did we decide?" — don't invent one.
2. **Check for an existing record.** List `docs/decisions/` (create it if missing) and grep for the key nouns (library names, component names). If a related record exists, show it and ask whether this one **supersedes** it, **amends** it, or is separate.
3. **Write the file** `docs/decisions/YYYY-MM-DD-<kebab-title>.md` using this exact structure (the same as `src/adr.js` in Decided):

   ```markdown
   # <Imperative title, ≤ 10 words>

   - **Status:** Decided            (or "Open (no decision yet)")
   - **Date:** YYYY-MM-DD
   - **Decided by:** <name>
   - **Participants:** <names>
   - **Tags:** `tag` `tag`

   ## Context
   ## Decision
   ## Options considered
   ## Rationale
   ## Actions
   - [ ] **Owner** — task
   ## Open questions
   ```

   If it supersedes another record, add `- **Supersedes:** <filename>` under Date and edit the old record's Status to `Superseded by <filename>`.
4. **Only use facts from the conversation.** Write `_None recorded_` for empty sections rather than guessing.
5. **Show the user the file path and the Decision line** and ask if anything is wrong. Fix it if so.
6. If the project has a `CLAUDE.md` with a "decisions already made" list, offer to add a one-line pointer there.
