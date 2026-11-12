MEMORY.md v1.0.0 (Last Rev: 2026-11-12)

# Decisions And Open Questions

Context worth keeping between sessions. Newest first.

## Decisions

- **2026-11-12: Version 2.0.0, everything from the idea list built at once** (owner asked to "roll everything" before involving the ILHS website agent). 25 tools grouped in a side menu.
- **2026-11-12: Adopt the ILHS brand from ilhs.app** (colors, fonts, header, ILHS Shared Sizing Spec) so the calculator can be linked from the main site. The favicon stays a calculator glyph, recolored, so it is distinct from the ILHS mark in browser tabs.
- **2026-11-12: Feedback link, not a sales pitch.** ILHS is a free and open source software company, so the "need help?" idea became "Want a tool added or found a mistake? Email info@ilhs.app".
- **2026-11-12: DNS and email checks use public DNS over HTTPS** (Cloudflare, Google fallback). This is the only network use; each tool says so. Everything else stays local.
- **2026-11-12: Secrets never go in share links** (passwords, Wi-Fi passwords, pasted headers, encoder input).
- **2026-10-29: calc.ilhs.app is the primary domain**; every other attached domain 301-redirects to it.

## Open Questions (Owner)

- **Analytics:** ilhs.app allows only cookieless analytics, announced on the site. Cloudflare Web Analytics would need a site token from the dashboard and a CSP update. Not added.
- **License and public repo:** ILHS projects are MIT licensed with public code ("Free And Open Source"). This repo has no LICENSE file yet and may be private. Owner to decide before listing it as an ILHS project.
- **Brand guide check:** the private `ilhs-internal` repo (brand guide, sizing spec) could not be attached in the 2026-11-12 session; branding was matched from ilhs.app's own CSS. A session with `ilhs-internal` attached should run the brand check in its section 10.
- **Preview URLs:** Cloudflare still generated workers.dev preview links for branch builds although `preview_urls` is false in `wrangler.jsonc`; check after the next production deploy and turn them off in the dashboard if they persist.
- **Website listing:** the ILHS website agent should link calc.ilhs.app from ilhs.app (handoff drafted in the 2026-11-12 session).
