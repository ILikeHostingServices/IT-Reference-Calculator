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
- **Name:** the app is "IT Reference Calculator" (`Calc.APP_NAME`); the GitHub repo is `IT-Reference-Calculator` (renamed from `calculator` on 2026-10-25, old URLs redirect).
- **Resolutions tab** is live-updating like Storage / RAM. Data lives in `GROUPS` in `js/resolution.js`. Marketing ratios are not always exact: ultrawide "21:9" panels reduce to 64:27, 43:18 or 12:5, and 1366x768 is 683:384. Those rows carry `nominal: true`, and the lookup treats anything within `MARKETED_TOLERANCE_PCT` (3%) of a group as a nominal match. Standard groups are at least ~6% apart, so do not raise that tolerance much. 16:10 reduces to 8:5, so compare reduced forms, never the group key string.
- **Deploy:** Cloudflare Workers Builds, Worker name `calculator` (must match `name` in `wrangler.jsonc`). Assets directory is the repo root, so anything that must not be public goes in `.assetsignore`; verify with `npx wrangler dev` and request the path (should 404). Wrangler's "Read N files" count includes ignored files, so do not trust it as the published list. Cloudflare static assets send no `Last-Modified`; `worker/index.js` adds it from `CF_VERSION_METADATA` so the footer build time works. `run_worker_first` is on so the primary-host redirect runs for every request. The sandbox proxy blocks the live domains (calc.ilhs.app, calc.syshost.app), so test with `wrangler dev`.
- **Git identity:** human commits should be authored as `ILHS-Owner <337515992+ILHS-Owner@users.noreply.github.com>`. The first commits were made with a machine-local `APT <abuse@system-notifications.net>` identity that GitHub credited to MVTS-Owner, which is why the owner wanted `main` rewritten (2026-10-29). Check `git log --format='%an <%ae>'` before assuming that rewrite has landed.
- **Formatting:** no em/en dashes in files you write; dates as YYYY-MM-DD, times 24 hour.
