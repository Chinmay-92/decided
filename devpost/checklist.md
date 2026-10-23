---
doc: checklist
status: in-progress
---

# Decided — Build Checklist

Each step implements a `spec.md` component and was verified before moving on.

- [x] 1. Extractor (`spec.md > Extractor`) — unit tests on all three example threads.
- [x] 2. Similarity (`spec.md > Similarity`) — SQS thread strongly matches the seeded SQS decision; unrelated thread matches nothing.
- [x] 3. ADR renderer (`spec.md > ADR renderer`) — Markdown + filename tests.
- [x] 4. Store + server API (`spec.md > Store`, `spec.md > Server`) — API test covers extract → save → update → search → delete.
- [x] 5. Claude client + fallback (`spec.md > Claude client`) — tested with a mocked API (success and 529 failure).
- [x] 6. UI (`spec.md > UI`) — driven end-to-end in headless Chrome: example → extract → red banner → save → log → detail dialog → empty-input error.
- [ ] 7. Try Claude mode with a real `ANTHROPIC_API_KEY` on a real (anonymised) thread.
- [ ] 8. Ship: record demo video, push public repo, submit (see `SUBMISSION.md`).
