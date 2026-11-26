DECISIONS.md v1.2.0 (Last Rev: 2026-11-25)

# Decisions

Newest first. Never delete an entry. To change a decision, add a new entry that supersedes it and note the old ID. Do not relitigate a recorded decision unless new evidence invalidates it.

Entry format: ID, date (YYYY-MM-DD), decision, why, evidence label, how to undo. Entries D-001 to D-011 were moved here from the former `MEMORY.md` and `CLAUDE.md` on 2026-11-25.

## D-017 - Sizing Spec v2 And A Home Page (Supersedes D-014)

- Date: 2026-11-25
- Decision: Adopt ILHS Shared Sizing Spec v2.0.0 (smaller headline and spacing tokens, 1.15x big-screen cap, one-row 56 px header, footer budget, 24 px text links, 44 px controls). Tool titles return to the page-title token (`--fs-h1`, now 34 px at desktop). The calculator opens on a Home page listing every tool.
- Why: The owner found both ilhs.app and calc.ilhs.app oversized (header, footer, headlines) and wanted an overview page before the menu.
- Evidence: `[USER]`; `[TESTED]` 2026-11-25 at 1920 x 1080: header 57 px, footer 91 px, title 34 px; at 375 px: header 57 px (was 139), footer 100 px (was 197).
- Undo: Pin the v1.0.1 token block again and remove the Home section; record that here.

## D-016 - Network Menu Order And Merged Planners

- Date: 2026-11-25
- Decision: Network order is Subnet Planner, IPv4 Subnet, IPv4 Toolkit, IPv6 Subnet, IPv6 Toolkit, MAC Address, Port Reference, IP Reference, Quick Links, SSL Certificate Checker. The IPv6 prefix split joins Subnet Planner (one planner); EUI-64 moves to the new IPv6 Toolkit. Resolutions moves into Utilities, ending the one-tool Display group.
- Why: Owner review of 2.2.0 on staging.
- Evidence: `[USER]`
- Undo: Reorder the sections in `index.html` and record that here.

## D-015 - Example Values As Placeholders

- Date: 2026-11-25
- Decision: Example inputs are placeholders. Code reads inputs through `Calc.UI.val`, `num`, and `need`, which use the placeholder when a box is empty, so each tool still shows a worked example. Settings that drive linked fields (chmod, Number Bases, password length and words, DMARC percent, RAID groups) keep real values. Row lists keep example rows plus Clear All and Restore Examples.
- Why: People had to delete the example before typing their own value.
- Evidence: `[USER]`
- Undo: Move placeholders back to `value=` and drop the fallback in `Calc.UI.val`.

## D-014 - Smaller Tool Titles And Controls (Supersedes Part Of D-009)

- Date: 2026-11-25
- Decision: Tool titles use the h2 token (24 to 32 px) instead of the 44 px page-title size chosen in the 2026-11-13 brand check; buttons are 44 px tall with nav-size text; cards use the inset padding. All sizes still come from the ILHS sizing tokens, and every target stays at least 44 px.
- Why: The owner found titles and boxes oversized next to the content.
- Evidence: `[USER]`; `tests/browser-conformance.js` now expects a 32 px title at 1920 x 1080.
- Undo: Set `.tool-head h2` back to `--fs-h1`.

## D-013 - Footer Links To The Repository

- Date: 2026-11-25
- Decision: The footer links to the GitHub repository ("Free and open source: view the code on GitHub"). This reverses the earlier "no repo link" instruction.
- Why: Owner request; the code is MIT licensed and public.
- Evidence: `[USER]`
- Undo: Remove the footer line.

## D-012 - Adopt The Standard Repo File Set

- Date: 2026-11-25
- Decision: The repo uses the owner's standard file set (`AGENTS.md`, thin `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`, `docs/RUNBOOK.md`, `SECURITY.md`, `CHANGELOG.md`). `MEMORY.md` was retired: its decisions are below and its open questions are in `docs/ROADMAP.md`.
- Why: Any agent or person with no prior context finds architecture, decisions, and runbooks in the same place in every repo.
- Evidence: `[USER]` asked for the repo to be audited against the owner's standards.
- Undo: Move the content back into `CLAUDE.md` and `MEMORY.md` and record that here.

## D-011 - Staging First Releases

- Date: 2026-11-12
- Decision: Changes go to `staging` (calc-staging.ilhs.app, behind Cloudflare Access) and reach `main` (calc.ilhs.app) only after the owner approves. Previews are off on both Workers.
- Why: ILHS website baseline; the owner tests every change before it is live.
- Evidence: `[USER]` owner decision 2026-11-12; baseline v1.2.0 rule 13.
- Undo: Owner decision only.

## D-010 - MIT License

- Date: 2026-11-12
- Decision: MIT, `Copyright (c) 2026 ILHS Software, LLC`. Vendored code and fonts keep their own licenses, listed at the end of `LICENSE`.
- Why: ILHS projects are free and open source.
- Evidence: `[USER]` owner decision 2026-11-12.
- Undo: Owner decision only.

## D-009 - Brand Check Passed

- Date: 2026-11-13
- Decision: The site passed the ILHS brand check against `BRANDING.md` v1.0.0 and `SIZING.md` v1.0.1 (see CHANGELOG v2.0.0).
- Why: The owner asked for the check before publishing.
- Evidence: `[TESTED]` browser conformance and axe-core runs on 2026-11-13.
- Undo: Not applicable; re-run the check after brand changes.

## D-008 - Everything From The Idea List At Once

- Date: 2026-11-12
- Decision: Version 2.0.0 shipped every tool from the idea list together (25 tools grouped in a side menu).
- Why: The owner asked to "roll everything" before involving the ILHS website agent.
- Evidence: `[USER]`
- Undo: Remove tools individually, each recorded here.

## D-007 - ILHS Brand

- Date: 2026-11-12
- Decision: Adopt the ilhs.app colors, fonts, header, and the ILHS Shared Sizing Spec. The favicon stays a calculator glyph in ILHS colors so it is distinct from the ILHS mark in browser tabs.
- Why: So the calculator can be linked from the main site.
- Evidence: `[USER]`
- Undo: Owner decision only.

## D-006 - Feedback Link, Not A Sales Pitch

- Date: 2026-11-12
- Decision: The footer says "Want a tool added or found a mistake? Email info@ilhs.app". No "need help?" or hire-us copy.
- Why: ILHS is a free and open source software company, not an IT services business.
- Evidence: `[USER]`
- Undo: Owner decision only.

## D-005 - Public DNS Over HTTPS For Lookups

- Date: 2026-11-12
- Decision: DNS Lookup and Email Security query Cloudflare DNS over HTTPS, with Google as a fallback. This is the only network use, and each tool says so on screen.
- Why: Browsers cannot send raw DNS queries; everything else stays local.
- Evidence: `[SOURCE]` `js/dns.js`, `worker/index.js` `connect-src`.
- Undo: Remove the two tools and the two hosts from the CSP.

## D-004 - Secrets Never In Share Links

- Date: 2026-11-12
- Decision: Passwords, the Wi-Fi password, pasted headers, and encoder input carry `data-nostate`.
- Why: Share links get pasted into tickets and chats.
- Evidence: `[USER]`
- Undo: Do not.

## D-003 - Footer Text And Build Time

- Date: 2026-09-26
- Decision: The footer reads "It will not get any easier than this", with no repo link. The build time is computed at runtime from the newest `Last-Modified` of the page's own files, shown in US Eastern as `YYYY-MM-DD HH:MM TZ`.
- Why: Owner's wording; no build step to stamp a date.
- Evidence: `[USER]`
- Undo: Owner decision only.

## D-002 - calc.ilhs.app Is The Primary Domain

- Date: 2026-10-29
- Decision: Every other domain attached to the live Worker 301-redirects to calc.ilhs.app, keeping the path. The live Worker keeps its legacy name `calculator`.
- Why: One canonical address.
- Evidence: `[USER]`; `tests/worker.test.js` checks each redirect.
- Undo: Change `PRIMARY_HOST` in `wrangler.jsonc`.

## D-001 - No Build Step

- Date: 2026-09-07 (first release, CHANGELOG v1.0.0)
- Decision: Vanilla HTML, CSS, and JS loaded with plain script tags; no bundler and no npm dependencies.
- Why: Anyone can read, run, and host the files as they are.
- Evidence: `[SOURCE]` repository layout.
- Undo: Introducing a build would need a new entry and CI changes.
