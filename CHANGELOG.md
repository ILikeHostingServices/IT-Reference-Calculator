CHANGELOG.md v2.2.0 (Last Rev: 2026-11-25)

# Changelog

Newest first. Versions are Major.Minor.Patch, always three places. Dates are YYYY-MM-DD.

## v2.2.0 - 2026-11-25

### Added
- Wi-Fi QR Code prints as a one-page sign: a heading you choose, the code, the network name, and the password (optional, on by default). Network names over 32 bytes and WPA passwords over 63 characters are now flagged; a 64 digit hex key is accepted.
- IPv6 Subnet shows the address type (global unicast, unique local, link-local, multicast with its scope, documentation, NAT64, 6to4, Teredo, IPv4-mapped, loopback, and more), any embedded IPv4 address, the reverse DNS (ip6.arpa) name, and how many /64 networks a shorter prefix holds. It accepts zone IDs (fe80::1%eth0), square brackets, and dotted IPv4 tails (::ffff:192.0.2.1).
- IPv6 Planner lists subnets with their number and hex subnet ID, and can start at any subnet number (for example subnet 43 of a /48 split into /64s).
- "Run It Yourself" in README.md: run locally, run the tests, and host your own copy on any static web server or your own Cloudflare Worker.
- Standard repository files: AGENTS.md, docs/ARCHITECTURE.md, docs/DESIGN.md, docs/DECISIONS.md, docs/ROADMAP.md, docs/RUNBOOK.md, and .gitattributes (LF line endings).

### Changed
- Form field borders meet the WCAG 1.4.11 non-text contrast minimum of 3:1 in both themes (they were about 1.4:1).
- Printing always uses the light palette, so a page printed from dark mode no longer comes out with light text on white paper. Menus, buttons, and notes are left off printouts.
- On phones, key/value results put the label above the value, so addresses such as 192.168.1.10 no longer break in the middle; data tables keep whole words and scroll instead of splitting words letter by letter.
- CLAUDE.md is now a thin wrapper around AGENTS.md; MEMORY.md was retired (decisions moved to docs/DECISIONS.md, open questions to docs/ROADMAP.md).

### Fixed
- `tests/worker.test.js` failed on Windows (a drive-letter path passed to `import()`); `tests/site.test.js` failed when a Windows checkout mixed line endings.
- A malformed link such as `#%E0` stopped the page from routing (`decodeURIComponent` threw); unknown links now open the first tool.

### Removed
- Unused code: `Calc.Units.convert`, `Calc.UI.fmt`, an unreachable return in `formatBps`, `totalAddressesStr` in IPv6 results, and duplicate change listeners in chmod and Number Bases.

## v2.1.0 - 2026-11-12

### Added
- Staging site setup for the ILHS website baseline: a `staging` branch, a `calculator-staging` Worker in `wrangler.jsonc` (`env.staging`, served at calc-staging.ilhs.app behind Cloudflare Access), and `docs/DEPLOYMENT.md` with the owner's Cloudflare steps. The staging Worker sends `X-Robots-Tag: noindex, nofollow` and a disallow-all `robots.txt`.
- `SECURITY.md` and `/.well-known/security.txt` (expires 2027-11-12), `robots.txt`, `SITE.md`, and an MIT `LICENSE` (owner decision 2026-11-12).
- Dependabot for GitHub Actions, aimed at `staging`.
- `tests/worker.test.js`: every redirect domain 301s to calc.ilhs.app with the path kept, security headers on every response, and staging noindex.

### Changed
- Releases go staging first: pull requests into `staging`, the owner tests on calc-staging.ilhs.app, then `staging` into `main` (see `CLAUDE.md`).
- Previews off on both Workers (ILHS website baseline v1.2.0 rule 13): `docs/DEPLOYMENT.md` now requires turning off non-production branch builds on the live and staging Workers, with a check that no preview links remain; `SITE.md` records the baseline version.
- Tests workflow on `actions/checkout@v7` and `actions/setup-node@v7`, runs on pushes to `staging` too, with a 5 minute limit.
- File header and changelog dates for 2026-11-12 work corrected to US Eastern (they had used the UTC date).

## v2.0.0 - 2026-11-12

### Added
- 20 new tools, grouped in a side menu: Subnet Planner (VLSM and route summarization), IPv4 Toolkit (IP in subnet, range to CIDR, ACL wildcards), IPv6 Planner (prefix splits, EUI-64), MAC Address, Port Reference, DNS Lookup, Email Security (SPF with lookup counting, DKIM, DMARC, MX, MTA-STS, TLS-RPT, BIMI, plus SPF and DMARC builders), Email Header Analyzer, Transfer Time, Backup Storage, Camera / NVR Storage, Uptime / SLA, PoE Budget and UPS Runtime, Time Decoder, Cron Explainer, chmod Permissions, Number Bases, Password and Passphrase Generator, Encode / Decode / Hash, and Wi-Fi QR Code.
- RAID rebuild time and read-error risk; pixel density (PPI) on the Resolutions tool.
- Share links: every tool keeps its inputs in the URL (`#tool?field=value`) with a Copy Link button. Passwords, pasted headers, and encoder input are never put in links.
- Copy Results per tool and a copy button on every result row.
- Search all tools with Ctrl K or /.
- Works offline (service worker) and can be installed as an app (web manifest, icons).
- Unit and site-integrity tests (`node --test tests/*.test.js`) and a GitHub Actions workflow that runs them.
- Security headers from the Worker, matching ilhs.app's policy.
- Feedback line in the footer pointing to info@ilhs.app; link to the SSL Certificate Checker.
- Browser checks for future sessions: `tests/browser-conformance.js` (ILHS sizing conformance and axe-core WCAG 2.2 AA) and `tests/browser-e2e.js`.

### Changed
- ILHS branding: the ilhs.app colors, fonts, header with the ILHS mark, and the ILHS Shared Sizing Spec. The favicon keeps the calculator glyph in ILHS colors.
- Passed the ILHS brand check (Brand Guide section 10) and the Sizing Spec Conformance Checklist: brand palette only (dropped a non-brand green), Title Case UI labels, buttons sized per the spec, every button and link at least 44 x 44 px, tool titles at the 44 px page-title size, example data on example domains and documentation IP ranges, no exclamation marks, no drop shadows, and file headers with versions. No horizontal scroll or clipping at all 22 test sizes plus 320 px in both themes; zoom grows the page at every step; axe-core WCAG 2.2 AA passes on all 25 tools in both themes (added a missing label and keyboard-focusable scrolling tables).
- IPv4, IPv6, and RAID now update as you type (no Calculate buttons), like the rest of the tools.
- RAID disk size defaults to TB (drive label units).
- Code split into logic modules (`js/*.js`) and per-group page wiring (`js/ui/*.js`).

## v1.2.0 - 2026-10-29

### Added
- **Resolutions** tab: pick an aspect ratio to list its standard resolutions with names and use cases, or type a resolution (for example `3440x1440`) to get its exact and decimal aspect ratio, the nearest standard ratio (flagging nominal ratios such as ultrawide "21:9"), orientation, pixel count, and its standard name and use case. Tapping a listed resolution looks it up.
- Cloudflare Workers deploy config: `wrangler.jsonc`, `.assetsignore`, and a small Worker (`worker/index.js`). Fixes the Workers Builds failure "Missing entry-point to Worker script or to assets directory".
- `calc.ilhs.app` is the primary domain: every other custom domain on the Worker 301-redirects to it, keeping path and query (`PRIMARY_HOST` in `wrangler.jsonc`).
- The Worker adds a `Last-Modified` header (the deployed version's upload time), so the footer build time shows on Cloudflare, whose static assets send only an `ETag`.

### Changed
- Rebranded from "IT Calculator" to "IT Reference Calculator" (page title, header, footer, docs) to go with the repository rename from `calculator` to `IT-Reference-Calculator`.

## v1.1.0 - 2026-09-26

### Changed
- Rebuilt the Storage / RAM tab as three live tools (no Calculate button): **Convert a size** (all binary and decimal units side by side, best unit highlighted), **Add it up** (quantity x size line items with presets for common DIMMs and drives), and **Compare two sizes** (left over, percent used, how many fit).
- Unit dropdown groups relabeled "Binary (OS / RAM)" and "Decimal (drive labels)" to explain which to pick.
- Browser tab title shortened to "IT Calculator".
- Footer now reads "It will not get any easier than this" with the app name, version, and build date/time.

### Added
- `favicon.svg` site icon.
- `js/version.js` holding the app version.
- `README.md` and `CHANGELOG.md`.

### Fixed
- The old storage chain calculator multiplied and divided sizes by sizes (e.g. `1 GiB x 1 GiB`), producing meaningless results displayed as bytes.

## v1.0.0 - 2026-09-07

### Added
- Initial release: IPv4/IPv6 subnetting, public DNS resolver tables, RAID/JBOD sizing, and storage/RAM unit math.
