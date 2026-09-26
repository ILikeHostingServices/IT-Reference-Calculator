# Changelog

All notable changes to this project are documented here, newest first.

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
