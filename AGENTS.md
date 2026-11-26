AGENTS.md v1.0.1 (Last Rev: 2026-11-25)

# IT-Reference-Calculator - Agent Guide

Free IT calculators and references that run in the browser, published by ILHS at https://calc.ilhs.app.

## Repo Facts

- Type: service (static website plus a Cloudflare Worker that serves it)
- Environment: ILHS (public, open source, MIT)
- Deployed: yes (Cloudflare Workers Builds: `staging` -> calc-staging.ilhs.app, `main` -> calc.ilhs.app)
- Primary Language: JavaScript (vanilla HTML, CSS, and JS; no build step, no npm dependencies)
- Default Branch: main (work branches start from `staging`)

## Read First

1. This file.
2. `docs/ARCHITECTURE.md`: what exists and how it connects.
3. `docs/DECISIONS.md`: what was decided and why. Do not relitigate without new evidence.
4. `docs/DESIGN.md`: interfaces, conventions, and the ILHS brand rules. Read before changing any UI.
5. `docs/ROADMAP.md`: what is planned, open owner questions, and audit suggestions.
6. `docs/RUNBOOK.md` and `docs/DEPLOYMENT.md`: before deploying or touching Cloudflare.
7. `SECURITY.md`: before touching headers, network calls, or data.
8. `CHANGELOG.md`: what changed and when.

A doc that says "Not Applicable: reason" is a valid answer, not a gap.

## Commands

- Run: `python -m http.server 8931` (or `npx --yes serve -l 8931`), then open http://localhost:8931
- Run as Cloudflare serves it: `npx wrangler dev --var PRIMARY_HOST:127.0.0.1` and open http://127.0.0.1:8787
- Test: `node --test tests/*.test.js` (Node 20 or newer; pass the glob, `node --test tests/` fails on Node 22)
- Browser checks: `tests/browser-conformance.js` and `tests/browser-e2e.js` against `wrangler dev` (setup in each file's header)
- Lint: none
- Docs check: the owner's repo standard checker (`repo-check`), run locally by the owner

## Rules

1. No secrets in the repo. Cloudflare deploy tokens live in the Cloudflare dashboard only.
2. No hardcoded hostnames in reusable code. The site's own domain lives in `wrangler.jsonc` (`PRIMARY_HOST`), `index.html` meta tags, `robots.txt`, and `.well-known/security.txt`.
3. Fail closed. If a check, header, or config cannot be confirmed, stop and say why.
4. Query for facts (versions, paths, config values) instead of guessing. Never invent flags, paths, or keys.
5. Do not change Cloudflare or GitHub settings unless explicitly approved. Do not commit or push unless asked.
6. Label non-obvious claims in diagnostics and notes: `[TESTED]`, `[SOURCE]`, `[USER]`, `[ASSUMED]`.
7. Research is not execution. Never describe a change as applied or verified from a plan or dry run.
8. This repository is public: no internal hostnames, IPs, share paths, usernames, or client details.

## Before Ending A Session

1. Add or update the `CHANGELOG.md` entry and bump `Calc.VERSION` in `js/version.js` on any functional change.
2. Bump the header version and date of every file you changed (`/* js/net.js v1.0.0 (Last Rev: YYYY-MM-DD) */`).
3. Record new decisions in `docs/DECISIONS.md` with the reason.
4. Fix any doc your change made stale. Run the tests.

## Repo-Specific Rules

- **Release flow: staging first.** Branch from `staging`, open the pull request into `staging`, merge when checks are green. The owner tests on calc-staging.ilhs.app; only after the owner approves, open a pull request from `staging` into `main`. Never push or force-push `staging` or `main` directly, and never open a change pull request straight into `main`.
- **Merging:** merge commits only (no squash or rebase), as ILHS-Owner, only when every check is green, using the full head commit SHA.
- **Git identity:** `ILHS-Owner <337515992+ILHS-Owner@users.noreply.github.com>` with a `Co-Authored-By` trailer for Claude. `main` was rewritten once (2026-11-12) and `staging` once (2026-11-25, a merge commit re-authored to ILHS-Owner), both owner approved; never rewrite shared history again without explicit approval. The `gh` CLI on the owner's machine defaults to another account: check `gh auth status` and switch to ILHS-Owner before merging.
- **Adding a tool:** follow "Adding A Tool" in `docs/DESIGN.md` (logic module and tests, section in `index.html`, `Calc.UI.register`, `sw.js` ASSETS, version and changelog).
- **Network calls:** only `js/dns.js` talks to the internet. A new host must go into `connect-src` in `worker/index.js` and the tool's `.privacy-note`.
- **No inline scripts or styles** in `index.html` (the CSP forbids them; `tests/site.test.js` checks). Setting `element.style.x` from JS is fine.
- **Footer:** text "It will not get any easier than this" is fixed by the owner; build time is computed at runtime from `Last-Modified`. Do not hardcode a date or add a repo link.
- **Brand:** ILHS palette, tokens, Title Case, 44 px targets, no shadows, emoji, or exclamation marks (details in `docs/DESIGN.md`). Do not spell out ILHS. No sales copy. Contact: info@ilhs.app.
- **Vendored code:** `js/vendor/qrcode.js` and `js/vendor/eff-wordlist.js` are never edited by hand.
- **Formatting:** no em or en dashes in files you write; dates YYYY-MM-DD in US Eastern; times 24 hour.
- **Gotchas:** (a) `sw.js` precaches `./`, never `index.html` (Cloudflare redirects it, and a redirect fails `cache.addAll`). (b) `Calc.UI.renderData` appends; clear the container first. (c) Unicode or line-ending escapes (backslash u2014, backslash r backslash n) written through a script or editor tool can turn them into literal characters; check the saved file. (d) Grid children need `min-width: 0` or a wide table stretches the page on phones. (e) On Windows, `import()` of a path needs `pathToFileURL` (see `tests/worker.test.js`).

## Cross-Agent Notes

Not yet linked to the to-do tracker. The Todo Triage Chat adds the link. Other agents must not edit this section.
