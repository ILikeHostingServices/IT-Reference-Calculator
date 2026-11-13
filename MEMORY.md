MEMORY.md v1.2.0 (Last Rev: 2026-11-12)

# Decisions And Open Questions

Context worth keeping between sessions. Newest first.

## Decisions

- **2026-11-12: Staging site and ILHS website baseline** (owner, relayed by the "ILHS website baseline standards" session and confirmed by the owner here): staging at calc-staging.ilhs.app on Worker `calculator-staging`, live Worker keeps the legacy name `calculator`, releases go staging first. Baseline gaps closed in 2.1.0; Cloudflare dashboard steps are the owner's (`docs/DEPLOYMENT.md`).
- **2026-11-12: MIT license** (owner).
- **2026-11-12: No branch previews.** Staging replaces them; `preview_urls` stays false and the runbook says to turn off non-production branch builds on the live Worker.
- **2026-11-12: ILHS brand check passed** against ilhs-internal `org/brand/BRANDING.md` v1.0.0 and `org/brand/SIZING.md` v1.0.1 (see CHANGELOG 2.0.0). Owner asked for the check and to publish once checks were green.
- **2026-11-12: Version 2.0.0, everything from the idea list built at once** (owner asked to "roll everything" before involving the ILHS website agent). 25 tools grouped in a side menu.
- **2026-11-12: Adopt the ILHS brand from ilhs.app** (colors, fonts, header, ILHS Shared Sizing Spec) so the calculator can be linked from the main site. The favicon stays a calculator glyph, recolored, so it is distinct from the ILHS mark in browser tabs.
- **2026-11-12: Feedback link, not a sales pitch.** ILHS is a free and open source software company, so the "need help?" idea became "Want a tool added or found a mistake? Email info@ilhs.app".
- **2026-11-12: DNS and email checks use public DNS over HTTPS** (Cloudflare, Google fallback). This is the only network use; each tool says so. Everything else stays local.
- **2026-11-12: Secrets never go in share links** (passwords, Wi-Fi passwords, pasted headers, encoder input).
- **2026-10-29: calc.ilhs.app is the primary domain**; every other attached domain 301-redirects to it.

## Open Questions (Owner)

- **Analytics:** ilhs.app allows only cookieless analytics, announced on the site. Cloudflare Web Analytics would need a site token from the dashboard and a CSP update. Not added.
- **Public repo:** the code is now MIT licensed, but the repository may still be private. ILHS's "Free And Open Source" promise implies public code; making it public is the owner's call.
- **Brand guide domain table is out of date:** BRANDING.md section 2 lists the calculator under "Legacy utilities `*.syshost.app`, not featured on ilhs.app until a decision on that domain is made", and its Open Decisions still ask whether syshost.app utilities move under ilhs.app. The owner made calc.ilhs.app the primary domain on 2026-10-29, so the calculator has effectively moved. The owner should record that decision in the brand guide (and decide whether ilhs.app may link to it, which the website agent needs).
- **SSL Certificate Checker link:** the tool menu links to sslchecker.syshost.app, which the brand guide still calls a legacy syshost utility. Keep, move it under ilhs.app, or drop the link.
- **Website listing:** the ILHS website agent should link calc.ilhs.app from ilhs.app (handoff drafted in the 2026-11-12 session).
