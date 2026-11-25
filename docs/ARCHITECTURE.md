ARCHITECTURE.md v1.0.0 (Last Rev: 2026-11-25)

# Architecture

What exists and how the parts connect. Interfaces and conventions belong in `DESIGN.md`, reasons belong in `DECISIONS.md`.

Label non-obvious claims: `[TESTED]`, `[SOURCE]`, `[USER]`, `[ASSUMED]`.

## Overview

A single static page (`index.html`) holds every tool as a `<section class="tool">`. Plain `<script>` tags load logic modules, then per-group UI wiring, then the page shell, all sharing the global `window.Calc` namespace. Every calculation runs in the visitor's browser. On Cloudflare, a small Worker sits in front of the static files to add security headers, a `Last-Modified` header, and the primary-domain redirect. There is no build step and no server-side state.

## Components

| Component | Location In Repo | Responsibility |
|---|---|---|
| Page | `index.html` | Every tool's markup, the header, footer, and search dialog. Script load order. |
| Styles | `css/style.css` | ILHS brand colors, fonts, sizing tokens (pinned to `docs/shared/ilhs-sizing-tokens.css`), layout, print styles. |
| Logic modules | `js/*.js` | Pure calculation code with no DOM access (`Calc.IPv4`, `Calc.IPv6`, `Calc.Net`, `Calc.RAID`, ...). Loaded into Node by `tests/load.js`. |
| UI wiring | `js/ui/core.js`, `js/ui/*.js` | `core.js` has shared helpers (tables, copy buttons, row lists, toasts) and the tool registry; each group file registers its tools with `Calc.UI.register`. |
| Page shell | `js/app.js` | Builds the tool menu from the sections, routes `#tool?field=value`, keeps share links current, Copy Link and Copy Results, search (Ctrl K), footer build time, service worker registration. Loads last. |
| Vendored code | `js/vendor/` | `qrcode.js` (qrcode-generator 2.0.4, MIT) and `eff-wordlist.js` (EFF Large Wordlist, CC BY 3.0 US). |
| Offline support | `sw.js`, `manifest.webmanifest` | Precache of every page file, stale-while-revalidate, install as an app. Cache name follows `Calc.VERSION`. |
| Assets | `assets/` | Fonts with their OFL licenses, ILHS mark, app icons. |
| Worker | `worker/index.js`, `wrangler.jsonc` | Cloudflare Worker: primary-host 301 redirect, security headers and CSP, `Last-Modified` from the deploy time, staging `noindex`. |
| Publish filter | `.assetsignore` | Keeps docs, tests, the Worker source, and config out of the published files. |
| Tests | `tests/` | Node unit and site-integrity tests (`*.test.js`), Worker tests, and browser checks run by hand against `wrangler dev`. |
| CI | `.github/workflows/test.yml`, `.github/dependabot.yml` | Runs `node --test tests/*.test.js` on pull requests and pushes to `staging` and `main`; monthly Actions updates aimed at `staging`. |

## Data Flow

1. The browser requests a path. On Cloudflare the Worker runs first (`run_worker_first`): another hostname gets a 301 to `PRIMARY_HOST`; otherwise the static asset is fetched from the `ASSETS` binding and returned with the security headers.
2. `index.html` loads `js/version.js`, the logic modules, the vendored code, `js/ui/core.js`, the group UI files (each calls `Calc.UI.register`), and finally `js/app.js`.
3. `app.js` builds the menu, runs every tool's `init`, records each tool's starting values, then activates the tool named in the URL hash and applies any shared values.
4. Inputs fire `input` and `change` events; `Calc.UI.live` recalculates and redraws results. `app.js` rewrites the hash (debounced) with the fields that differ from their starting values.
5. Only the DNS Lookup and Email Security tools leave the page: `js/dns.js` queries Cloudflare DNS over HTTPS, with Google as a fallback.
6. The service worker caches every file on first visit, so later visits work offline.

## Dependencies

- Runtime: a modern browser (ES2020: BigInt, optional chaining, `color-mix()` in CSS). No third-party scripts at runtime.
- Network (optional, two tools only): Cloudflare and Google DNS-over-HTTPS JSON APIs.
- Hosting: Cloudflare Workers static assets, built by Workers Builds from `wrangler.jsonc` `[SOURCE]`. Any static web server also works (see `README.md`).
- Development: Node 20 or newer for tests; Wrangler (through `npx`) to run the Worker locally; Playwright and axe-core only for the optional browser checks.

## Constraints

- No build step and no npm dependencies: files are served exactly as committed.
- The Content Security Policy forbids inline scripts and styles, so markup carries no `style="..."` or `on...=` attributes.
- Everything that must not be public goes in `.assetsignore`, because the publish directory is the repository root.
- The ILHS Shared Sizing Spec block in `css/style.css` must match `docs/shared/ilhs-sizing-tokens.css` exactly.
