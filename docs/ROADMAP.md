ROADMAP.md v1.0.0 (Last Rev: 2026-11-25)

# Roadmap

Direction, not a task list. Finished work moves to `CHANGELOG.md`.

## Now

- v2.2.0 audit (2026-11-25): standard repo files, contrast and phone layout fixes, printable Wi-Fi sign, IPv6 improvements, run-it-yourself guide. Pull request into `staging`, then owner testing on calc-staging.ilhs.app.

## Next

Open questions for the owner (moved from the former `MEMORY.md`):

- **Analytics:** ilhs.app allows only cookieless analytics, announced on the site. Cloudflare Web Analytics would need a site token and a CSP update. Not added.
- **Brand guide domain table:** `BRANDING.md` section 2 still lists the calculator under legacy `*.syshost.app` utilities. calc.ilhs.app has been the primary domain since 2026-10-29; the guide should record that, and whether ilhs.app may link to the calculator.
- **SSL Certificate Checker link:** the menu links to sslchecker.syshost.app, which the brand guide calls a legacy utility. Keep, move under ilhs.app, or drop.
- **Website listing:** the ILHS website agent should link calc.ilhs.app from ilhs.app.

## Later

Suggestions from the 2026-11-25 audit, not committed. Each is independent.

1. **Run the browser checks in CI.** `tests/browser-conformance.js` and `tests/browser-e2e.js` are run by hand; a second workflow job with Playwright against `wrangler dev` would catch layout and accessibility regressions on every pull request.
2. **Wi-Fi QR as SVG.** The vendored library can emit SVG; a Download SVG button gives a crisp code at any print size (signs, laminated cards, labels).
3. **Wi-Fi sign sizes.** A choice of full page, half page, or a 3 x 5 card layout for the printed sign.
4. **IPv6 next steps.** A "which /64 holds this address" reverse lookup in the planner (address in, subnet number and ID out), and an IPv6 option in the IPv4 Toolkit's "is this IP in that subnet" check.
5. **Dark/light toggle.** Both palettes exist (`:root[data-theme]`), but there is no switch on the page; visitors get only the system setting.
6. **Self-host package.** A GitHub Actions job that attaches a zip of only the published files to each release, so self-hosters do not have to filter the repository by hand.
7. **Trim internal-only exports.** About 20 functions are exported from `Calc.*` modules but used only inside their own module (for example `Calc.Units.factorFor`, `Calc.EmailAuth.parseTags`). Harmless, but un-exporting them would make the module surfaces match what the UI uses.
8. **Cache headers.** The Worker does not set `Cache-Control`; the service worker already handles repeat visits, but long-lived caching for `assets/fonts/` would help first visits.
9. **Repo standard check in CI.** Run the repository standard check as a workflow step so the doc set cannot drift.
