SECURITY.md v1.0.0 (Last Rev: 2026-11-12 23:20 EST)

# Security Policy

This policy covers the IT Reference Calculator website (calc.ilhs.app) and this repository. The ilhs.app website has its own [policy](https://ilhs.app/contact/#security), and each ILHS app has one in its own repository.

## Reporting A Problem

Email **info@ilhs.app** with:

- The address (URL) or file involved.
- What you found and how to see it again.
- What someone could do with it, if you know.

Please do not open a public issue or post details anywhere public until it is fixed.

The same contact is published for security tools at https://calc.ilhs.app/.well-known/security.txt (RFC 9116).

## What To Expect

| Step | Target |
|---|---|
| We confirm we got your report | Within 3 business days |
| We tell you whether it is a real problem and our plan | Within 10 business days |
| Fix goes live | As soon as it is tested on staging, usually within 30 days |

We will credit you when the fix goes live, unless you ask us not to.

## Scope

| In scope | Out of scope |
|---|---|
| https://calc.ilhs.app and every tool on it | Reports from automated scanners with no working example |
| https://calc-staging.ilhs.app (login required) | The DNS-over-HTTPS resolvers themselves (Cloudflare, Google) |
| The domains that redirect to calc.ilhs.app | Denial of service and volume testing. Please do not run them |
| The Worker (`worker/index.js`), `wrangler.jsonc`, the page code in `js/`, and the GitHub Actions workflow | The ILHS apps and ilhs.app (use their own policies) |

## How The Site Is Protected

- **Runs in the browser.** Every calculation happens on the visitor's device. There are no accounts, cookies, or tracking, and no server-side code beyond the Worker that serves the files.
- **One outside request, disclosed.** The DNS Lookup and Email Security tools send the name being looked up to Cloudflare's public DNS-over-HTTPS resolver (Google's as a backup). Both tools say so on screen, and the Content Security Policy allows only those two hosts.
- **Secrets stay out of links.** Share links never include passwords, the Wi-Fi password, pasted email headers, or encoder input.
- **Strict response headers** from the Worker: a Content Security Policy with no inline scripts or styles, no third-party scripts, and no framing; HSTS; `nosniff`; and same-origin opener and resource policies.
- **Staging behind a login.** calc-staging.ilhs.app is protected by Cloudflare Access with an email one-time code, a 1 hour session, `noindex`, and no `workers.dev` address.
- **One deploy token per Worker.** The live and staging Workers each have their own Cloudflare API token, scoped to deploying that Worker only. No secrets are stored in this repository.
- **Staging first and checks on every pull request.** Every change is tested on staging before it reaches calc.ilhs.app (see `CLAUDE.md`). The Tests workflow runs with read-only permissions, and Dependabot keeps its Actions current.

## Keeping This Current

`.well-known/security.txt` expires on 2027-11-12. Renew the `Expires` date each year, before it passes.
