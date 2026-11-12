# Changelog

All notable changes to this project are documented here, newest first.

## [1.2.0] - 2026-10-29

### Added
- **Resolutions** tab: pick an aspect ratio to list its standard resolutions with names and use cases, or type a resolution (for example `3440x1440`) to get its exact and decimal aspect ratio, the nearest standard ratio (flagging nominal ratios such as ultrawide "21:9"), orientation, pixel count, and its standard name and use case. Tapping a listed resolution looks it up.
- Cloudflare Workers deploy config: `wrangler.jsonc`, `.assetsignore`, and a small Worker (`worker/index.js`). Fixes the Workers Builds failure "Missing entry-point to Worker script or to assets directory".
- `calc.ilhs.app` is the primary domain: every other custom domain on the Worker 301-redirects to it, keeping path and query (`PRIMARY_HOST` in `wrangler.jsonc`).
- The Worker adds a `Last-Modified` header (the deployed version's upload time), so the footer build time shows on Cloudflare, whose static assets send only an `ETag`.

### Changed
- Rebranded from "IT Calculator" to "IT Reference Calculator" (page title, header, footer, docs) to go with the repository rename from `calculator` to `IT-Reference-Calculator`.

## [1.1.0] - 2026-09-26

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

## [1.0.0] - 2026-09-07

### Added
- Initial release: IPv4/IPv6 subnetting, public DNS resolver tables, RAID/JBOD sizing, and storage/RAM unit math.
