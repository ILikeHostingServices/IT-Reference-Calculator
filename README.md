README.md v2.2.0 (Last Rev: 2026-11-25)

# IT Reference Calculator

## Overview

Free IT calculators and references from ILHS, live at https://calc.ilhs.app. Everything runs in the browser and works offline once loaded. The only requests that leave the page are the DNS and email checks, which send the name being looked up to Cloudflare's public DNS-over-HTTPS resolver (Google's as a backup); each of those tools says so on screen. You can also run or host your own copy: see [Run It Yourself](#run-it-yourself).

Every tool updates as you type, has **Copy Link** (a link with your inputs, so you can paste it into a ticket) and **Copy Results**, and each result row has its own copy button. **Ctrl K** (or **/**) searches all tools.

| Group | Tools |
| --- | --- |
| Network | IPv4 Subnet; Subnet Planner (VLSM and route summarization); IPv4 Toolkit (is this IP in that subnet, IP range to CIDR blocks, ACL wildcard masks); IPv6 Subnet (address type, embedded IPv4, reverse DNS name); IPv6 Planner (split a prefix with subnet IDs, EUI-64 addresses); MAC Address (formats, vendor prefix, address type); Port Reference (searchable); link to the SSL Certificate Checker |
| DNS And Email | DNS Lookup (any record type, reverse lookups); Email Security (SPF with the 10-lookup count, DKIM, DMARC, MX, MTA-STS, TLS-RPT, BIMI, plus SPF and DMARC record builders); Email Header Analyzer (hop-by-hop path and delays, SPF/DKIM/DMARC results, phishing red flags) |
| Storage And Capacity | RAID / JBOD (with rebuild time and read-error risk); Storage / RAM (unit converter, add it up, compare); Transfer Time (how long, or what speed you need); Backup Storage (GFS repository estimate); Camera / NVR Storage |
| Infrastructure | Uptime / SLA (allowed downtime, availability from downtime, combined availability with redundancy); PoE Budget and UPS Runtime |
| Display | Resolutions by aspect ratio, resolution to aspect ratio, and pixel density (PPI) |
| Utilities | Time Decoder (Unix, Windows FILETIME and Active Directory, ISO); Cron Explainer (plain English plus the next runs in a chosen time zone); chmod Permissions; Number Bases; Password and Passphrase Generator; Encode, Decode, And Hash (Base64, URL, hex, HTML, SHA hashes, JWT); Wi-Fi QR Code (download, or print a sign) |

The look follows the ILHS brand used on ilhs.app: same colors, fonts, header, and the ILHS Shared Sizing Spec.

## Files

Standard files:

- `AGENTS.md`: guide for AI agents and contributors, with the read-first order. Start here before changing anything.
- `CLAUDE.md`: thin wrapper that imports `AGENTS.md`.
- `docs/ARCHITECTURE.md`: components, data flow, dependencies.
- `docs/DESIGN.md`: share links, conventions, adding a tool, and the visual design and brand rules.
- `docs/DECISIONS.md`: decisions with reasoning.
- `docs/ROADMAP.md`: planned work, open questions, and suggestions.
- `docs/RUNBOOK.md`: deploy, verify, roll back, logs.
- `SECURITY.md`: how to report a security problem, and how the site is protected.
- `CHANGELOG.md`: version history.

Repo-specific files:

| Path | Purpose |
| --- | --- |
| `index.html` | Every tool, one `<section class="tool" data-tool="...">` each. The menu, search, and share links are built from these sections. |
| `css/style.css` | All styles. ILHS brand colors and fonts; the sizing token block is pinned to `docs/shared/ilhs-sizing-tokens.css`. |
| `js/*.js` | Logic modules (no DOM): `units`, `ipv4`, `ipv6`, `net`, `ipv6plan`, `mac`, `ports`, `raid`, `storage`, `capacity`, `resolution`, `timefmt`, `cron`, `bits`, `password`, `encode`, `dns`, `emailauth`, `mailheaders`, and `version`. |
| `js/ui/*.js` | Page wiring per tool group (`network`, `dnsmail`, `capacity`, `display`, `utilities`) on top of the shared helpers in `core.js`. |
| `js/app.js` | Page shell: menu, routing (`#tool?field=value`), share links, copy buttons, search, footer build time, offline registration. Loads last. |
| `js/vendor/` | `qrcode.js` (Kazuhiko Arase, MIT) and `eff-wordlist.js` (EFF Large Wordlist, CC BY 3.0 US). |
| `sw.js`, `manifest.webmanifest` | Offline support and "install as an app". |
| `assets/` | ILHS fonts (with their OFL licenses), ILHS mark, app icons. |
| `robots.txt`, `.well-known/security.txt` | Crawler rules and the security contact (both name calc.ilhs.app). |
| `tests/` | Unit, Worker, and site-integrity tests (`node --test tests/*.test.js`), plus browser checks (`browser-conformance.js` for the ILHS sizing spec and WCAG, `browser-e2e.js`) that run against `wrangler dev`. |
| `wrangler.jsonc`, `worker/index.js`, `.assetsignore` | Cloudflare Workers deploy: primary-domain redirect, security headers, `Last-Modified`, and what not to publish. |
| `docs/DEPLOYMENT.md` | Cloudflare live and staging setup, quick checks, rollback. |
| `docs/shared/ilhs-sizing-tokens.css` | Pinned copy of the ILHS Shared Sizing Spec token block. |
| `SITE.md` | This site's entry for the ILHS website baseline (hosts, Workers, exceptions). |
| `LICENSE` | MIT, plus the licenses of the vendored files and fonts. |

## Quick Start

There is no build step and nothing to install: the files in the repository are the website.

```bash
git clone https://github.com/ILikeHostingServices/IT-Reference-Calculator.git
cd IT-Reference-Calculator
python -m http.server 8931            # or: npx --yes serve -l 8931
```

Open http://localhost:8931. Use a local web server rather than opening `index.html` from disk: offline mode is turned off on `file://` pages.

## Run It Yourself

You do not need calc.ilhs.app or Cloudflare to use the calculator. Pick whichever fits.

### 1. Requirements

| Task | You Need |
| --- | --- |
| Use it on your own machine | Git (or the GitHub "Download ZIP" button) and any static web server: Python 3 (`python -m http.server`) or Node 20+ (`npx --yes serve`) |
| Run the tests | Node 20 or newer (no `npm install`; the tests use Node's built-in runner) |
| Run it exactly as Cloudflare serves it | Node 20 or newer; Wrangler is fetched by `npx` on first use |
| Host it for others | Any HTTPS web server or static host, or a Cloudflare account |

### 2. Run It Locally

```bash
python -m http.server 8931            # Windows: py -m http.server 8931
```

Then open http://localhost:8931. Every tool works offline except DNS Lookup and Email Security, which need internet access to `cloudflare-dns.com` or `dns.google`.

### 3. Run The Tests

```bash
node --test tests/*.test.js
```

Pass the glob (`node --test tests/` fails on Node 22). Every test should pass on Windows, macOS, and Linux.

### 4. Run It As Cloudflare Serves It

```bash
npx wrangler dev --var PRIMARY_HOST:127.0.0.1
```

Open http://127.0.0.1:8787 (use `127.0.0.1`, not `localhost`: any other hostname is redirected to `PRIMARY_HOST`). This adds the real security headers, `Last-Modified`, and the redirect.

### 5. Host It On Your Own Web Server

1. Copy only the published files to the web root: `index.html`, `favicon.svg`, `manifest.webmanifest`, `sw.js`, `robots.txt`, `.well-known/`, `css/`, `js/`, and `assets/`. Everything else (docs, tests, `worker/`, config) is for development; `.assetsignore` lists it.
2. Serve it over HTTPS. Offline mode (the service worker) only runs on HTTPS or `localhost`.
3. Send the security headers from `SECURITY_HEADERS` in `worker/index.js`. The Content Security Policy must keep `connect-src 'self' https://cloudflare-dns.com https://dns.google` (DNS tools), `img-src 'self' data:` (QR codes), and `worker-src 'self'` (offline mode). For nginx:

   ```nginx
   add_header Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://cloudflare-dns.com https://dns.google; manifest-src 'self'; worker-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests" always;
   add_header X-Content-Type-Options "nosniff" always;
   add_header Referrer-Policy "strict-origin-when-cross-origin" always;
   ```

4. Replace `calc.ilhs.app` with your own address in `index.html` (the `canonical` link and `og:` tags), `robots.txt`, and `.well-known/security.txt`, and put your own contact in `security.txt`.
5. Make sure the server sends `Last-Modified` (most do by default); the footer's "Built" time comes from it.

The same files work on GitHub Pages, Netlify, Amazon S3, IIS, or Apache; only the way you set headers differs.

### 6. Host It On Your Own Cloudflare Worker

1. Fork the repository.
2. In `wrangler.jsonc`, change `name` to your Worker's name and set `PRIMARY_HOST` to your own hostname, or to `""` to turn the redirect off. Left as `calc.ilhs.app`, your Worker would redirect every visitor to calc.ilhs.app. Remove the `env.staging` block unless you want a staging Worker, and set `workers_dev` to `true` if you want a `*.workers.dev` address for testing.
3. Deploy: `npx wrangler login`, then `npx wrangler deploy --env=""`. Or connect the fork in the Cloudflare dashboard (Workers & Pages > Create > Import a repository) with the deploy command `npx wrangler deploy --env=""`.
4. Add your custom domain in the dashboard (Worker > Settings > Domains & Routes), then do step 4 of the previous section.

## After Install Configuration

- **Version:** `Calc.VERSION` in `js/version.js`. It also names the offline cache, so bumping it makes every visitor pick up the new files.
- **Worker settings:** `PRIMARY_HOST` (the one hostname that is served; others get a 301) and `NOINDEX` (`"1"` hides the site from search engines) in `wrangler.jsonc`.
- **Adding a tool:** see "Adding A Tool" in `docs/DESIGN.md`.
- **Resolution list:** the `GROUPS` table in `js/resolution.js`.
- **Port list:** `js/ports.js`.

The official site deploys through Cloudflare Workers Builds: `staging` to calc-staging.ilhs.app (login required) and `main` to calc.ilhs.app. Changes go into `staging` by pull request and reach `main` only after testing on staging. Steps are in `docs/RUNBOOK.md` and `docs/DEPLOYMENT.md`; security reports go to info@ilhs.app (`SECURITY.md`).

## Troubleshooting

- **DNS or email checks fail:** a firewall, filtering proxy, or ad blocker may block DNS over HTTPS (`cloudflare-dns.com` and `dns.google`). On your own server, check that the CSP `connect-src` lists both hosts.
- **Every page redirects to calc.ilhs.app:** your Worker still has `PRIMARY_HOST` set to `calc.ilhs.app`, or you opened `wrangler dev` on `localhost` instead of `127.0.0.1`.
- **A change does not show up:** the offline cache serves the old copy first and updates in the background; reload once more, or bump `Calc.VERSION`.
- **Footer shows no "Built" time:** the server is not sending `Last-Modified` (on Cloudflare the Worker adds it).
- **Offline mode is off:** the page was opened from disk or over plain HTTP on a hostname other than `localhost`; use a local web server or HTTPS.
- **Errors:** open the browser developer console; the app logs nothing on success, and a tool that fails to start logs `Tool "ID" failed to start`.
