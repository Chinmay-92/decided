# Decided: demo video narration (about 2:30)

First-person narration, one line per beat, grouped by segment. The rendered video uses a synthetic voice
(macOS `say -v Daniel`); re-record in your own voice by reading each line and replacing
`video/seg-<id>.aiff` (for example `video/seg-core.3.aiff`), then re-running `node video/make-video.cjs --keep-audio`.
Each segment's footage is paced to the length of its audio.

<!-- Lines between the markers are parsed by video/make-video.cjs: "segment.beat | text". Each beat is voiced separately
     and its on-screen action starts when its line starts. Hyphenated acronyms (A-D-R, D-L-Q) are only there so the
     synthetic voice spells them out; read them normally. -->
<!-- SEGMENTS:BEGIN -->
hook.1 | Has your team ever had the same argument twice?
hook.2 | Six months after choosing SQS, someone asks "why not Kafka?", and nobody can find the thread.
hook.3 | This is Decided.
problem.1 | Decisions happen in chat.
problem.2 | A-D-Rs are the right fix, but nobody writes them, because it takes twenty minutes.
problem.3 | Decided does it in about twenty seconds.
core.1 | It's one command, and no dependencies.
core.2 | The badge says demo mode, so this runs offline, with no API key.
core.3 | I'll pick the webhook retries example, and press Extract decision.
core.4 | It found the decision: use SQS plus a D-L-Q for webhook retries.
core.5 | That Priya made the call. The Kafka alternative. The reasons.
core.6 | Aisha's and Tom's action items, and the open question about telling partners.
kernel.1 | And here's the bit I care about.
kernel.2 | Decided has checked my decision log, and back in June, we already decided to use SQS instead of Kafka.
kernel.3 | It shows the match, and the shared terms.
kernel.4 | That's the conversation we didn't need to have again.
export.1 | I'll tidy the title, and save it to the log.
export.2 | Then open the decision log, and search for SQS.
export.3 | Open the record, and copy the Markdown.
export.4 | Every record exports as a Markdown A-D-R, ready for docs slash decisions in the repo.
built.1 | With an Anthropic key, Claude does the extraction, and handles much messier threads.
built.2 | I planned it with the Devpost Learn Skill Pack: the scope, P-R-D and spec are in the repo,
built.3 | and I built it with Claude Code.
built.4 | Decided: write decisions down once.
<!-- SEGMENTS:END -->

## Segment guide

| Segment | On screen |
|---|---|
| Hook (0:00) | Title card: the repeated argument, then the "Decided" name |
| Problem | Mock chat thread (generic, no branding) scrolling, then "20 minutes vs 20 seconds" card |
| Core demo | `npm start` terminal, the app with the demo-mode badge, pick **Webhook retries: Kafka or SQS?**, **Extract decision**, record fields highlighted |
| Kernel | The red "⚠ You may have decided this already" banner with the June SQS record, match % and shared terms |
| Save, search, export | Edit the title, **Save to log**, **Decision log**, search `sqs`, open record, **Copy Markdown** |
| Claude mode + how it was built | `export ANTHROPIC_API_KEY` card, repo tree with `devpost/scope.md`, `prd.md`, `spec.md`, end card |
