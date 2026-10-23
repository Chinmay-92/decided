# Devpost submission: Decided

> Draft for **Build With AI: Basics** (learn-ai-basics.devpost.com). Deadline: **Mon 26 Oct 2026, 5:00 pm ET / 21:00 UTC (21:00 GMT; UK clocks go back on 25 Oct)**.
> Nothing has been submitted. Everything below is a draft for you to edit into your own words.

## Human TODO before submitting (in order)

1. [ ] **Run the Devpost Learn Skill Pack. This is mandatory.** The rules require that the project was "built using the Devpost Learn skill pack, as evidenced by the planning docs", and the submission form asks you to confirm it. The agent could not install the pack (fetching and running external code was blocked), so `devpost/scope.md`, `prd.md` and `spec.md` were drafted from the pack's templates **without its interview**. In this folder:
   - `npx skills add challengepost/learn-ai-basics --all -y`
   - In your agent, run `1-start` (it writes `devpost/learner-profile.md`), then `2-scope`, `3-prd` and `4-spec`. Let each one interview you and revise the existing draft, then approve it so `status:` becomes `approved`.
   - Optionally run `5-build` to review `checklist.md` and generate `devpost/app-map.html`, then run `6-ship`.
   - Commit the updated `devpost/` files and the installed skills.
2. [ ] **Personalise.** Rewrite "Why This Matters" in `scope.md` and the Inspiration section below in your own words, and check that the LICENSE copyright name is right.
3. [ ] **Optional: try Claude mode** with `export ANTHROPIC_API_KEY=…; npm start` on a real, anonymised thread, and tick checklist step 7.
4. [ ] **Create a public GitHub repo** and push. Set the license so it appears in the repo's About section (GitHub detects `LICENSE` automatically). The form needs the URL of the license file, e.g. `https://github.com/<you>/decided/blob/main/LICENSE`.
5. [ ] **Record the 1–3 minute demo video** using the script below. Upload it to YouTube or Vimeo as public or unlisted. Don't use copyrighted music.
6. [ ] **Fill in the Devpost form.** Individual; Country: United Kingdom; select the resources you used; answer the AI-cost, confidence and value questions honestly; add the technology-requirement answer (draft below); tick the age and eligibility boxes only if they are true.
7. [ ] Optional: add screenshots (Capture view with the red banner, and the Decision log) to the gallery.

---

## Title
**Decided**

## Tagline
Paste a messy team thread and get a clean decision record. It also tells you when you're about to re-debate something you already settled.

## Inspiration
Every team I've worked on has had the same meeting twice. Someone asks "why are we on SQS and not Kafka?", nobody can find the Slack thread from six months ago, and the debate starts again from scratch. Architecture Decision Records fix this, but writing one by hand takes 20 minutes, so nobody does. The hackathon's own pitch, about AI forgetting decisions you made ten prompts ago, made me realise that teams have the same problem. I wanted writing a decision down to be cheaper than *not* writing it down.

## What it does
- **Paste a thread** from Slack, Teams or email (`Name: message` lines; timestamps are fine).
- **Extract a decision record**: title, decision, who decided, participants, context, options considered, rationale, action items with owners, open questions and tags. Every field is editable, because the AI drafts and you decide.
- **"⚠ You may have decided this already."** Each new record is compared with your decision log. Strong overlaps show a red banner with the earlier decision, its date, a match % and the shared terms.
- **Decision log**: save, search, view, edit and delete.
- **Export** any record as a Markdown ADR (copy or download) for your repo's `docs/decisions/`.
- **Works out of the box**: without an API key, an offline rule-based extractor runs. With `ANTHROPIC_API_KEY`, Claude (`claude-sonnet-5-5`) does the extraction, and it falls back gracefully if the API fails.

**Who it's for:** developers and tech leads on small product teams who make real decisions in chat threads.

## How we built it
- Planned with the **Devpost Learn Skill Pack**: scope, then a PRD, then a technical spec (in `devpost/`), before any code. The scope step forced one sharp idea, *memory of past decisions*, instead of "yet another summariser", and cut Slack integration and accounts.
- Built with **Claude Code**, using a `CLAUDE.md` project memory that records the decisions already made (zero dependencies, demo mode must always work, no `innerHTML` with pasted text). That stopped the agent from re-litigating them.
- **Stack**: Node.js built-ins only (`http`, `fetch`, `node:test`), vanilla HTML/CSS/ES modules, and the optional Anthropic Messages API. There is no build step and nothing to `npm install`.
- The "already decided" check is cosine similarity over topic words, with title and tags weighted, and it shows the shared terms so the match is explainable.
- 12 automated tests (extractor, similarity, Markdown, the full API flow, and mocked Claude success and failure), a smoke script, and an end-to-end click-through in headless Chrome.
- I also wrote a reusable skill, `.claude/skills/decision-record`, that applies the same idea to the coding agent itself: "record this decision" writes an ADR for a choice made mid-session.

## Challenges we ran into
- Making the offline extractor good enough to demo. Small cues matter: "Agreed. Let's go with SQS…" should give *"Use SQS plus a DLQ…"* and not "Agreed."
- Tuning the similarity thresholds so the SQS thread matches strongly and unrelated threads match nothing, and showing *why* something matched.
- Keeping scope to a proof of concept when Slack integration was very tempting.

## Accomplishments that we're proud of
- The "you already decided this" moment works in under a second, offline, on first run.
- No dependencies at all: clone, `npm start`, done.
- Graceful degradation: if Claude is down or no key is set, you still get a useful record.

## What we learned
- Planning documents written *before* code (scope → PRD → spec) made the agent much more predictable. When it drifted, I pointed it at a spec heading.
- A short `CLAUDE.md` listing the decisions already made is the cheapest fix for an agent that repeats mistakes.
- The interesting part of an AI feature is often the non-AI part around it. Here that's the log and the overlap check.

## What's next
- A Slack/Teams message action: "Save as decision".
- Commit ADRs straight to the team repo as a pull request.
- Embedding-based matching and "superseded by" links between decisions.
- A shared team log.

## Built with
`node.js` · `javascript` · `html5` · `css3` · `anthropic-claude-api` · `claude-code` · `devpost-learn-skill-pack`

## Draft answer: "Explain how your project meets the main technology requirement"
*(Rewrite after you have actually run the skills.)* I started from an empty folder and installed the Devpost Learn Skill Pack. `2-scope` interviewed me and cut the idea down to its kernel: a decision log that warns you before you re-debate. `3-prd` defined the core journey, screens and acceptance criteria, and `4-spec` settled a zero-dependency Node stack with an offline demo mode. All three documents are in `devpost/`. The build followed `devpost/checklist.md` step by step, each step tied to a spec heading and verified with tests.

---

## Demo video script (about 2:30)

**0:00–0:15 · Hook** (face or title card)
"Has your team ever had the same argument twice? Six months after choosing SQS, someone asks 'why not Kafka?' and nobody can find the thread. This is Decided."

**0:15–0:35 · The problem** (screen: a messy Slack-style thread)
"Decisions happen in chat. ADRs are the right fix, but nobody writes them because it takes 20 minutes. Decided does it in about 20 seconds."

**0:35–1:20 · Core demo** (screen: `npm start`, then the app)
- "It's one command and no dependencies. The badge says demo mode, so this runs offline with no API key."
- Pick **Webhook retries: Kafka or SQS?** and press **Extract decision**.
- "It found the decision, *Use SQS plus a DLQ for webhook retries*, that Priya made the call, the Kafka alternative, the reasons, Aisha's and Tom's action items, and the open question about telling partners."

**1:20–1:50 · The kernel** (point at the red banner)
"And here's the bit I care about. Decided has checked my decision log, and back in June we already decided to use SQS instead of Kafka. It shows the match and the shared terms. That's the conversation we didn't need to have again."

**1:50–2:15 · Save, search, export**
- Edit the title, press **Save to log**, open **Decision log**, search `sqs`, click the record, then **Copy Markdown**.
- "Every record exports as a Markdown ADR, ready for `docs/decisions` in the repo."

**2:15–2:30 · Claude mode and how it was built** (show `export ANTHROPIC_API_KEY` and the badge changing, or say it)
"With an Anthropic key, Claude does the extraction and handles much messier threads. I planned it with the Devpost Learn Skill Pack: scope, PRD and spec are in the repo, and I built it with Claude Code. Decided: write decisions down once."

*Recording tips:* use a 1280×800 browser window. Delete `data/decisions.json` before recording for a clean seeded state. Keep it under 3 minutes.
