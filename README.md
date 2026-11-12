README.md v2.0.0 (Last Rev: 2026-11-12)

# IT Reference Calculator

## Overview

Free IT calculators and references from ILHS, live at https://calc.ilhs.app. Everything runs in the browser and works offline once loaded. The only requests that leave the page are the DNS and email checks, which send the name being looked up to Cloudflare's public DNS-over-HTTPS resolver (Google's as a backup); each of those tools says so on screen.

Every tool updates as you type, has **Copy Link** (a link with your inputs, so you can paste it into a ticket) and **Copy Results**, and each result row has its own copy button. **Ctrl K** (or **/**) searches all tools.

| Group | Tools |
| --- | --- |
| Network | IPv4 Subnet; Subnet Planner (VLSM and route summarization); IPv4 Toolkit (is this IP in that subnet, IP range to CIDR blocks, ACL wildcard masks); IPv6 Subnet; IPv6 Planner (split a prefix, EUI-64 addresses); MAC Address (formats, vendor prefix, address type); Port Reference (searchable); link to the SSL Certificate Checker |
| DNS And Email | DNS Lookup (any record type, reverse lookups); Email Security (SPF with the 10-lookup count, DKIM, DMARC, MX, MTA-STS, TLS-RPT, BIMI, plus SPF and DMARC record builders); Email Header Analyzer (hop-by-hop path and delays, SPF/DKIM/DMARC results, phishing red flags) |
| Storage And Capacity | RAID / JBOD (with rebuild time and read-error risk); Storage / RAM (unit converter, add it up, compare); Transfer Time (how long, or what speed you need); Backup Storage (GFS repository estimate); Camera / NVR Storage |
| Infrastructure | Uptime / SLA (allowed downtime, availability from downtime, combined availability with redundancy); PoE Budget and UPS Runtime |
| Display | Resolutions by aspect ratio, resolution to aspect ratio, and pixel density (PPI) |
| Utilities | Time Decoder (Unix, Windows FILETIME and Active Directory, ISO); Cron Explainer (plain English plus the next runs in a chosen time zone); chmod Permissions; Number Bases; Password and Passphrase Generator; Encode, Decode, And Hash (Base64, URL, hex, HTML, SHA hashes, JWT); Wi-Fi QR Code |

The look follows the ILHS brand used on ilhs.app: same colors, fonts, header, and the ILHS Shared Sizing Spec.

## Files

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
| `tests/` | Unit and site-integrity tests (`node --test tests/*.test.js`). |
| `wrangler.jsonc`, `worker/index.js`, `.assetsignore` | Cloudflare Workers deploy: primary-domain redirect, security headers, `Last-Modified`, and what not to publish. |
| `docs/shared/ilhs-sizing-tokens.css` | Pinned copy of the ILHS Shared Sizing Spec token block. |

## Quick Start

There is no build step and nothing to install.

```bash
python -m http.server 8931            # then open http://localhost:8931
node --test tests/*.test.js           # run the tests (Node 20 or newer)
npx wrangler dev --var PRIMARY_HOST:127.0.0.1   # run it as Cloudflare serves it, with the real security headers
```

## Deployment (Cloudflare Workers)

The Worker named `calculator` is connected to this repo through Workers Builds. Pushes to `main` run `npx wrangler deploy`; other branches run `npx wrangler versions upload`. Both read `wrangler.jsonc`, which publishes the repo root as static assets (minus everything in `.assetsignore`).

- **Primary domain:** `PRIMARY_HOST` in `wrangler.jsonc` (currently `calc.ilhs.app`). Any other custom domain attached to the Worker gets a 301 redirect to it.
- **Custom domains** are added in the Cloudflare dashboard (Worker > Settings > Domains & Routes), not in `wrangler.jsonc`.
- **Security headers** are set in `worker/index.js`: the same strict policy as ilhs.app, plus scripts, the two DNS-over-HTTPS hosts, `data:` images for the QR download, and a service worker.

## After Install Configuration

- **Version:** `Calc.VERSION` in `js/version.js`. It also names the offline cache, so bumping it makes every visitor pick up the new files.
- **Adding a tool:** see "Adding A Tool" in `CLAUDE.md`.
- **Resolution list:** the `GROUPS` table in `js/resolution.js`.
- **Port list:** `js/ports.js`.

## Troubleshooting

- **DNS or email checks fail:** a firewall, filtering proxy, or ad blocker may block DNS over HTTPS (`cloudflare-dns.com` and `dns.google`).
- **A change does not show up:** the offline cache serves the old copy first and updates in the background; reload once more, or bump `Calc.VERSION`.
- **Footer shows no "Built" time:** the server is not sending `Last-Modified` (on Cloudflare the Worker adds it).
- **Errors:** open the browser developer console; the app logs nothing on success.
