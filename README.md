# Decided

**Turn a messy team thread into a decision record — and catch the debates you've already had.**

Paste a Slack/Teams thread. Decided pulls out the decision, who made it, the options, the reasons, the action items and the open questions as an editable record. Before you save it, it checks your decision log and warns you if the team already decided something similar ("⚠ You may have decided this already"). Save it to the log, search it later, or export it as a Markdown ADR for your repo.

Built for the [Build With AI: Basics](https://learn-ai-basics.devpost.com/) hackathon ([rules](https://learn-ai-basics.devpost.com/rules)) with the Devpost Learn Skill Pack. Planning docs: [`devpost/scope.md`](devpost/scope.md), [`devpost/prd.md`](devpost/prd.md), [`devpost/spec.md`](devpost/spec.md).

## Run it

Requires Node.js 20 or newer. There are no dependencies to install.

```bash
npm start
# open http://localhost:3000
```

By default it runs in **demo mode**: a rule-based extractor that works offline, so nothing leaves your machine. To use Claude for extraction instead:

```bash
export ANTHROPIC_API_KEY=your-key        # never commit this
# optional: export ANTHROPIC_MODEL=claude-sonnet-5-5   (the default)
npm start
```

If the Claude call fails, Decided falls back to demo mode and shows a notice.

### Try it in 30 seconds
1. Under **Try an example**, pick **Webhook retries: Kafka or SQS?** and press **Extract decision**.
2. A red banner says you already decided "Use SQS for async jobs instead of Kafka" in June. That decision is one of the three seeded on first run.
3. Edit anything, press **Save to log**, then open **Decision log** and search `sqs`.
4. Click a record to view it as Markdown, copy it, edit it or delete it.

## Test

```bash
npm test          # 12 unit + API tests (node:test), including mocked Claude success and failure
npm start &       # then, in another terminal:
npm run smoke     # end-to-end smoke test against the running server
```

## How it works

| Piece | File |
|---|---|
| HTTP server and JSON API (no framework) | `server.js` |
| Offline extractor and record normaliser | `src/extract.js` |
| Claude extraction (Anthropic Messages API) | `src/claude.js` |
| Related-decision check (cosine similarity over words) | `src/similar.js` |
| Decision log (JSON file, atomic writes) | `src/store.js` → `data/decisions.json` |
| ADR Markdown renderer, shared with the browser | `src/adr.js` |
| UI (vanilla HTML, CSS and JS) | `public/` |

Data stays in `data/decisions.json`, which git ignores. To reset to the seeded examples, delete that file. Set `DECIDED_DATA_FILE` to keep the log somewhere else, for example in a shared repo.

## Built with a coding agent
- `devpost/`: scope, PRD, spec and build checklist (the Devpost Learn Skill Pack workflow).
- `CLAUDE.md`: project memory for the agent. It lists the commands, the decisions already made and the workflow.
- `.claude/skills/decision-record/`: a reusable skill that has the agent write an ADR for decisions made *during a coding session*, in the same format the app exports.

## License
MIT. See [LICENSE](LICENSE).
