README.md v1.1.0 (Last Rev: 2026-09-26)

# IT Calculator

## Overview

A static, browser-only calculator for everyday IT math. Nothing is sent to a server; all math runs in the page.

- **IPv4** - subnet details (netmask, wildcard, network/broadcast, host range, host counts) plus common public DNS resolvers.
- **IPv6** - expanded/compressed forms, network and last address, subnet size (BigInt math), plus IPv6 DNS resolvers.
- **RAID** - usable/raw capacity, overhead, efficiency, and fault tolerance for common and nested RAID levels and JBOD.
- **Storage / RAM** - three live tools:
  - **Convert a size** into every binary (KiB..EiB) and decimal (KB..EB) unit side by side.
  - **Add it up** - total quantity x size line items (RAM sticks, drives), with one-click presets.
  - **Compare two sizes** - space left over, percent used, and how many copies of B fit in A.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | Page markup for all four tabs and the footer. |
| `favicon.svg` | Site icon (calculator glyph). |
| `css/style.css` | All styles; light/dark via `prefers-color-scheme`. |
| `js/version.js` | App name and version shown in the footer. Bump on every functional change. |
| `js/units.js` | Binary/decimal unit conversion and formatting. |
| `js/ipv4.js`, `js/ipv6.js` | Subnet math. |
| `js/raid.js` | RAID level definitions and capacity math. |
| `js/storage.js` | Storage/RAM totals and comparisons (bytes in, bytes out). |
| `js/app.js` | DOM wiring for every tab, plus the footer build time. |

## Quick Start

There is no build step. Serve the folder with any static web server, for example:

```bash
python -m http.server 8931
```

Then open `http://localhost:8931`. Opening `index.html` directly from disk also works.

## After Install Configuration

- **Version:** edit `Calc.VERSION` in `js/version.js`.
- **Build time in the footer:** computed in the browser as the newest `Last-Modified` header across the page, stylesheet, favicon, and scripts, shown in US Eastern time as `YYYY-MM-DD HH:MM`. It reflects when the deployed files were last written, so no stamping step is needed.

## Troubleshooting

- **Footer shows a version but no "Built" time:** the web server is not sending `Last-Modified` headers (or HEAD requests are blocked). Enable `Last-Modified` on the server.
- **Build time looks too new:** deploy tooling that rewrites every file (for example a fresh `git clone`) resets file times to the deploy time. That is expected; it is the deploy time.
- **Errors:** open the browser developer console; the app logs nothing on success.
