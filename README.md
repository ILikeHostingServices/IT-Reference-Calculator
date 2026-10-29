README.md v1.2.0 (Last Rev: 2026-10-29)

# IT Reference Calculator

## Overview

A static, browser-only calculator for everyday IT math. Nothing is sent to a server; all math runs in the page.

- **IPv4** - subnet details (netmask, wildcard, network/broadcast, host range, host counts) plus common public DNS resolvers.
- **IPv6** - expanded/compressed forms, network and last address, subnet size (BigInt math), plus IPv6 DNS resolvers.
- **RAID** - usable/raw capacity, overhead, efficiency, and fault tolerance for common and nested RAID levels and JBOD.
- **Storage / RAM** - three live tools:
  - **Convert a size** into every binary (KiB..EiB) and decimal (KB..EB) unit side by side.
  - **Add it up** - total quantity x size line items (RAM sticks, drives), with one-click presets.
  - **Compare two sizes** - space left over, percent used, and how many copies of B fit in A.
- **Resolutions** - two live tools:
  - **Find The Aspect Ratio** - type a resolution (`1920x1080`, `1920 x 1080`, `1920*1080`, `1920 by 1080`) to get the exact reduced ratio, decimal ratio, nearest standard ratio, orientation, pixel count, and the standard name and use case when it is a known resolution.
  - **Standard Resolutions** - pick an aspect ratio (16:9, 16:10, 21:9, 32:9, 4:3, 5:4, 3:2, 17:9 DCI, 9:16, 1:1) to list its standard resolutions with names and typical use cases. Tap a row to look it up.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | Page markup for all five tabs and the footer. |
| `favicon.svg` | Site icon (calculator glyph). |
| `css/style.css` | All styles; light/dark via `prefers-color-scheme`. |
| `js/version.js` | App name and version shown in the footer. Bump on every functional change. |
| `js/units.js` | Binary/decimal unit conversion and formatting. |
| `js/ipv4.js`, `js/ipv6.js` | Subnet math. |
| `js/raid.js` | RAID level definitions and capacity math. |
| `js/storage.js` | Storage/RAM totals and comparisons (bytes in, bytes out). |
| `js/resolution.js` | Standard resolutions grouped by aspect ratio, and resolution to aspect ratio lookup. |
| `wrangler.jsonc` | Cloudflare Workers config (Worker name, assets, primary hostname). |
| `worker/index.js` | Worker: redirects other hostnames to the primary one, adds `Last-Modified`, serves the static files. |
| `.assetsignore` | Files Wrangler must not publish (docs, config, `.git`, Worker source). |
| `js/app.js` | DOM wiring for every tab, plus the footer build time. |

## Quick Start

There is no build step. Serve the folder with any static web server, for example:

```bash
python -m http.server 8931
```

Then open `http://localhost:8931`. Opening `index.html` directly from disk also works.

## Deployment (Cloudflare Workers)

The Worker named `calculator` is connected to this repo through Workers Builds. Pushes to `main` run `npx wrangler deploy`; other branches run `npx wrangler versions upload`. Both read `wrangler.jsonc`, which publishes the repo root as static assets (minus everything in `.assetsignore`).

- **Primary domain:** `PRIMARY_HOST` in `wrangler.jsonc` (currently `calc.ilhs.app`). Any other custom domain attached to the Worker gets a 301 redirect to it. Set it to an empty string to serve every domain directly.
- **Custom domains** are added in the Cloudflare dashboard (Worker > Settings > Domains & Routes), not in `wrangler.jsonc`.
- **Test locally with the Worker:** `npx wrangler dev --var PRIMARY_HOST:127.0.0.1`, then open `http://127.0.0.1:8787`.

## After Install Configuration

- **Version:** edit `Calc.VERSION` in `js/version.js`.
- **Resolution list:** edit the `GROUPS` table in `js/resolution.js`. Mark a resolution `nominal: true` when it is sold under a ratio it does not reduce to exactly (for example 3440x1440 as 21:9).
- **Build time in the footer:** computed in the browser as the newest `Last-Modified` header across the page, stylesheet, favicon, and scripts, shown in US Eastern time as `YYYY-MM-DD HH:MM`. It reflects when the deployed files were last written, so no stamping step is needed. On Cloudflare the Worker supplies `Last-Modified` from the deploy time.

## Troubleshooting

- **Footer shows a version but no "Built" time:** the web server is not sending `Last-Modified` headers (or HEAD requests are blocked). Enable `Last-Modified` on the server.
- **Build time looks too new:** deploy tooling that rewrites every file (for example a fresh `git clone`) resets file times to the deploy time. That is expected; it is the deploy time.
- **Errors:** open the browser developer console; the app logs nothing on success.
