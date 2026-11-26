DESIGN.md v1.4.0 (Last Rev: 2026-11-26)

# Design

How the calculator presents itself and behaves to visitors and to contributors. Structure lives in `ARCHITECTURE.md`.

## Interfaces

- **URL routing and share links:** `#tool` opens a tool; `#tool?key=value` also fills its inputs. Every `input`, `select`, and `textarea` with an id inside a tool section is shared when it differs from its starting value (key = id minus the `tool-` prefix). Anything secret or bulky carries `data-nostate` (passwords, the Wi-Fi password, pasted headers, encoder input) and never enters a link. Row lists built with `Calc.UI.makeList` share through the tool's `getState` and `setState`. Network lookups run from a link only through `afterSetState`, never on typing. Legacy names still route: `#resolutions`, `#subnet`, `#vlsm`.
- **Tool registry:** each UI file calls `Calc.UI.register("ID", { init, getState, setState, afterSetState })`. `app.js` calls `init` once, then routes.
- **Logic modules:** each `js/*.js` file defines one `Calc.X` object and touches no DOM, so `tests/load.js` can load it into Node.
- **Worker:** environment variables `PRIMARY_HOST` (the one hostname that is served; every other custom domain gets a 301 to it; empty disables the redirect; `*.workers.dev` is never redirected) and `NOINDEX` (`"1"` sends `X-Robots-Tag: noindex, nofollow` and a disallow-all `robots.txt`). Both are set in `wrangler.jsonc`.

## Conventions

- **File headers:** every first-party file starts with a header naming it, its own version, and its last edit date, for example `/* js/net.js v1.0.0 (Last Rev: 2026-11-13) */`. Bump it on every functional change. Vendored files and JSON are exempt.
- **App version:** `Calc.VERSION` in `js/version.js`, shown in the footer and used as the offline cache name. Bump it with a `CHANGELOG.md` entry on every functional change.
- **Examples:** example inputs are placeholders; read inputs with `Calc.UI.val` (text), `num`, or `need` (numbers), which fall back to the placeholder when the box is empty. Do not put demo data in `value=` unless the field drives other fields. A tool with row lists adds `clearAll` and `restoreExamples` to its definition and gets Clear All and Restore Examples buttons.
- **Copy Results:** copies the tool name, visible result tables, boxes, outputs, and check lists, any text from the tool's `resultsText()`, and a share link. Never include secrets.
- **Live updates:** every tool recalculates on input; there are no Calculate buttons except network lookups and generators. Storage / RAM multiplies only quantity x size (size x size was removed on purpose).
- **Resolutions tool:** data lives in `GROUPS` in `js/resolution.js`. Ultrawide "21:9" panels reduce to 64:27, 43:18, or 12:5, and 1366x768 is 683:384; those rows carry `nominal: true`, and the lookup treats anything within `MARKETED_TOLERANCE_PCT` (3%, in `js/ui/display.js`) as a nominal match. Standard groups are at least about 6% apart, so do not raise the tolerance much. Compare reduced ratios, never the group key string (16:10 reduces to 8:5).
- **Errors:** a tool's logic throws an `Error` with a plain-language message; `Calc.UI.live` shows it in the tool's `.error` element. The app logs nothing on success.
- **Example data:** only example domains, documentation IP ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24, 2001:db8::/32), `alex.morgan@example.com`, and "Northwind Traders".

### Adding A Tool

1. Logic in a new or existing `js/*.js` module, plus tests (add a new module to `FILES` in `tests/load.js`).
2. A `<section class="tool" id="t-ID" data-tool="ID" data-group="..." data-title="..." data-keywords="...">` in `index.html` with a `.tool-head` `h2`. The menu, search, Copy Link, and Copy Results are generated from it.
3. `Calc.UI.register("ID", { init })` in the right `js/ui/*.js` file.
4. Any new script goes in `index.html` and in `ASSETS` in `sw.js` (`tests/site.test.js` fails otherwise).
5. Bump the version and add a changelog entry.

## User Interface

- **Layout:** a one-row 56 px header (ILHS mark, wordmark, app title, Search Tools, link to ilhs.app; phones drop the wordmark and the ilhs.app link); Home, the default page, lists every tool by group at full width; on other pages the tool menu sits beside the active tool from 960 px wide, with a collapsible "All Tools" menu below that; one tool shown at a time. Each tool section carries a `data-summary` sentence that Home shows. The footer is two short lines. No horizontal page scroll at any width from 320 px up; wide tables scroll inside a focusable region.
- **Brand:** colors, fonts, header, and buttons copy ilhs.app. Only the brand palette is used: `--bg`, `--surface`, `--surface-2`, `--line`, `--text`, `--muted`, `--accent` (teal), `--accent-ink`, `--accent-soft`, `--amber` (warnings), `--red` (errors). No greens or second accents. `--field-line` is a mix of `--muted` and `--line` for form field borders.
- **Contrast:** all text pairs meet WCAG AA (4.5:1) in both themes; form field borders meet 3:1 (WCAG 1.4.11) through `--field-line` `[TESTED]` (2026-11-25).
- **Themes:** dark by default, light when the system asks for it. Printing always uses the light palette.
- **Type and sizing:** fonts Familjen Grotesk (headings), Source Sans 3 (body), JetBrains Mono (values). Font sizes only from the ILHS Shared Sizing Spec (v2.0.0) tokens: tool titles `--fs-h1`, card headings `--fs-h3`, labels, buttons, and result tables `--fs-nav`, inputs `--fs-body` (never under 16 px, or iPhones zoom on focus). Buttons, fields, and menu links at least 44 x 44 px; footer and in-text links at least 24 px tall (Sizing Spec v2). Corners: 10 px cards, 8 px buttons, 6 px code and tags. No shadows.
- **Copy:** **Capitalization (owner guideline, 2026-11-26).** Two kinds of text:
  1. **Labels, buttons, tags, menu items, form labels, and table headers:** the strict short-word rule. Words of 4 or more letters are capitalized; words of 3 letters or fewer are lowercase, except the first word (or the first word after a colon). Examples: "Free and Open Source", "View on GitHub", "Download for Windows", "Clear all", "Look up".
  2. **Headlines, page and section titles, card and panel titles, eyebrow lines, and taglines:** headline style, using judgment for what reads best. Capitalize every word except short articles, conjunctions, and prepositions in the middle (a, an, the, and, but, or, nor, as, at, by, for, in, of, on, per, to, via). Short words that carry meaning are capitalized (Is, It, Not, Two, Do, We, Up in "Add It Up"). The first and last words are always capitalized. Examples: "Who We Are", "Get It Free", "Page Not Found", "Same Experience on Windows, Mac, and Linux".
  3. **Approved taglines keep their own capitalization:** "Free Software For All" and "FOSS For All".
  In both kinds, keep acronyms (IP, DNS, PoE), proper names (Mac), the pronoun I, and unit symbols in parentheses ((W)) as they are. Sentences use normal sentence case.
  Result labels and table headers are labels: `Calc.UI.titleCase` applies the strict rule. No emoji or exclamation marks. Do not spell out ILHS. ILHS is a free and open source software company: no sales or "hire us" copy.
- **Phones:** key/value results stack the label above the value so addresses never break mid-value. On wider screens key/value tables use fixed columns (label 34%, copy button 5 rem) so long values wrap in place and short ones stay on one line.
- **Print:** menus, buttons, and notes are hidden. The Wi-Fi QR Code tool prints as a one-page sign: optional title, "Wi-Fi", QR code, network name, and the password when chosen.
- **External links:** Quick Links and reference links open in a new tab with `rel="noopener noreferrer"`.
- **Brand check before publishing:** the brand guide (`org/brand/BRANDING.md`), sizing spec (`org/brand/SIZING.md`), and org rules (`org/conventions.md`) are in the private `ILikeHostingServices/ilhs-internal` repository. When the sizing spec changes, update `css/style.css` and `docs/shared/ilhs-sizing-tokens.css` together. Re-check with `tests/browser-conformance.js` (sizing at every test size, zoom, headings, axe-core WCAG 2.2 AA) and `tests/browser-e2e.js`.

## Principles

1. Everything runs in the browser; anything that leaves the page is disclosed on screen.
2. Secrets never go into links.
3. Plain language over jargon, and show the working (ranges, counts, the reason a value is what it is).
4. No build step and no dependencies: a contributor can open the files and run them.
