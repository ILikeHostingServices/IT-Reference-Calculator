# Cross-agent project documentation

This project gets worked on across Claude Chat (planning), Claude Code (implementation), and Claude Cowork (multi-agent sessions) — work is handed off between them with no shared chat history, so this file plus `README.md` / `CHANGELOG.md` / `MEMORY.md` are the only continuity between sessions.

Keep these current as work happens, not reconstructed later:
- `CLAUDE.md` (this file) — agent-facing: conventions, gotchas, how to build/test/run. Update it whenever something surprising is learned, so the next session doesn't repeat the mistake.
- `README.md` — human-facing: what this project is, setup, usage.
- `CHANGELOG.md` — dated entries (newest first) for meaningful changes, in the spirit of Keep a Changelog.
- `MEMORY.md` (plus a `memory/` folder if it grows) — decisions, open questions, and context worth persisting across sessions, once there's real content worth capturing. Don't scaffold it empty.

If a change lands, update `CHANGELOG.md`. If a convention or gotcha is discovered, update this file. If planning for new work happened in Claude Chat before landing here, fold that context into these files as the first step rather than leaving it stranded in chat scrollback.

# Project notes

- **Stack:** vanilla HTML/CSS/JS, no build step, no dependencies. Scripts load in order via plain `<script>` tags and share the global `window.Calc` namespace; `js/app.js` must load last.
- **Run locally:** `.claude/launch.json` defines `static-server` (`python -m http.server 8931`).
- **Version:** `Calc.VERSION` in `js/version.js`. Bump it (and add a `CHANGELOG.md` entry) on every functional change; the footer shows it.
- **Footer build time is computed at runtime**, not stamped: newest `Last-Modified` across the page's own assets via HEAD requests, formatted in America/New_York as `YYYY-MM-DD HH:MM TZ` (24 hour). Any new stylesheet/script/icon tag is picked up automatically. Do not add a hardcoded date.
- **Footer text is fixed by the owner:** "It will not get any easier than this". Do not add a link to the repo.
- **Storage / RAM tab is live-updating** (input/change listeners, no Calculate button). Size x size and size / size arithmetic was deliberately removed; multiplication is only quantity x size, and ratios live in the Compare tool.
- **Formatting:** no em/en dashes in files you write; dates as YYYY-MM-DD, times 24 hour.
