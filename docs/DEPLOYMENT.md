DEPLOYMENT.md v1.1.0 (Last Rev: 2026-11-12 23:55 EST)

# Deploying calc.ilhs.app (Live And Staging)

How the IT Reference Calculator is hosted on Cloudflare Workers, how live and staging are separated, and the dashboard steps to set staging up. The files in this repository that control deploys are `wrangler.jsonc` and `worker/index.js`; everything below is dashboard work for the owner. Modeled on ILHS-Primary-Website `docs/DEPLOYMENT.md` (the ILHS website baseline's reference site).

## The Target Setup

| Site | Address | Built from | Worker | Who can see it |
|---|---|---|---|---|
| Live | `calc.ilhs.app` | `main` | `calculator` (legacy name, kept) | Everyone |
| Staging | `calc-staging.ilhs.app` | `staging` | `calculator-staging` | Approved emails only (one-time code by email) |

The live Worker also answers seven older domains and 301-redirects them to calc.ilhs.app, keeping the path: `calc.syshost.app`, `calculator.syshost.app`, `itcalc.syshost.app`, `itcalculator.syshost.app`, `calculator.ilhs.app`, `itcalc.ilhs.app`, `itcalculator.ilhs.app`. `tests/worker.test.js` checks the redirect for each.

How changes flow (required, see `CLAUDE.md`): branch from `staging`, open a pull request into `staging`, test on calc-staging.ilhs.app, and only after the owner approves, open a pull request from `staging` into `main` to go live.

## Step 1: Protect The Branches (GitHub)

The `staging` branch was created from `main` on 2026-11-12. In GitHub > IT-Reference-Calculator > Settings > Branches (or Rules > Rulesets), for both `main` and `staging`:

1. Require a pull request before merging.
2. Require status checks to pass: `test` (the Tests workflow).
3. Block force pushes and deletions.

GitHub only offers branch protection on private repositories with a paid plan. If it is not available, the release flow is kept by process (as on ilhs.app): record "no branch protection (free plan)" as an exception in `SITE.md`.

## Step 2: Tidy The Live Worker (calculator)

1. Workers & Pages > `calculator` > Settings > Build:
   - **Production branch:** `main`. **Build command:** empty. **Root directory:** `/`.
   - **Deploy command:** `npx wrangler deploy --env=""`. The `--env=""` picks the top-level (live) settings and silences the "Multiple environments are defined" warning now that `wrangler.jsonc` also defines staging.
   - **API token:** one token that can deploy this Worker only. Do not reuse a personal all-access token or the sslchecker token (this Worker used the "sslchecker build token" in October; replace it).
2. Settings > Domains & Routes: check that `calc.ilhs.app` and the seven redirect domains above are listed, and that the `workers.dev` and Preview URL toggles are off (`wrangler.jsonc` sets both off, so a deploy keeps them off).
3. Check after the next deploy (Quick Checks below): every redirect domain answers `301` with `location: https://calc.ilhs.app/...`.
4. **Previews off (ILHS website baseline rule 13, owner 2026-11-12):** Settings > Build > Branch control: turn off builds for non-production branches, so only `main` builds. `wrangler.jsonc` already sets `preview_urls: false`. No Previews Base token and no preview domain are needed. Then check that no `*.workers.dev` preview links are still generated (Quick Checks).

## Step 3: Create The Staging Worker (calculator-staging)

1. Workers & Pages > **Create** > **Import a repository** > `ILikeHostingServices/IT-Reference-Calculator`.
   - **Worker name:** `calculator-staging` (must match exactly: `wrangler.jsonc` names the staging environment this way).
   - **Production branch:** `staging`.
   - **Build command:** empty. **Deploy command:** `npx wrangler deploy --env staging`. **Root directory:** `/`.
   - **API token:** create a new token for this Worker only.
   - **Branch control:** turn off builds for non-production branches, so only `staging` builds (previews are off for every ILHS site, baseline rule 13).
2. Let the first build finish. Do not attach a domain yet.

## Step 4: Require A Login For Staging (Before The Domain)

1. Zero Trust > Settings > Authentication > Login methods: make sure **One-time PIN** is added.
2. Zero Trust > Access > Applications > **Add an application** > **Self-hosted**.
   - Name: `Calc Staging`. Public hostname: `calc-staging.ilhs.app`.
   - Policies: reuse the ones the `ILHS Staging` app uses for staging.ilhs.app (same approved emails).
   - Login methods: One-time PIN, with **Apply instant authentication** on.
   - Session duration: 1 hour.

## Step 5: Attach The Staging Domain

1. `calculator-staging` > Settings > Domains & Routes > **Add** > **Custom Domain** > `calc-staging.ilhs.app`. Cloudflare creates the DNS record and certificate (one subdomain level, so the free certificate covers it).
2. From a private browser window, open https://calc-staging.ilhs.app: it must redirect to a `cloudflareaccess.com` login page. If the calculator loads with no login, remove the domain and fix Step 4 first.

The staging Worker sends `X-Robots-Tag: noindex, nofollow` on every response and answers `/robots.txt` with `Disallow: /` (the `NOINDEX` setting in `wrangler.jsonc`), so it stays out of search results even if Access is ever misconfigured.

## Quick Checks

From a Windows machine (`curl.exe`), Mac, or Linux (`curl`):

```
curl -sI https://calc.ilhs.app
curl -sI https://calc.ilhs.app/.well-known/security.txt
curl -sI https://calc-staging.ilhs.app
for h in calc.syshost.app calculator.syshost.app itcalc.syshost.app itcalculator.syshost.app calculator.ilhs.app itcalc.ilhs.app itcalculator.ilhs.app; do curl -s -o /dev/null -w "$h %{http_code} %{redirect_url}\n" https://$h/raid; done
```

| Result | Meaning |
|---|---|
| calc.ilhs.app: `200` with `content-security-policy` and `strict-transport-security` | Live Worker and its headers are working |
| Each redirect domain: `301 https://calc.ilhs.app/raid` | Redirects are working |
| calc-staging: `302` with `location: https://...cloudflareaccess.com/...` | Staging login is working |
| calc-staging: `200` with no login | Access app missing: remove the domain and fix Step 4 now |
| Cloudflare error 522, 523, 530, or 1016 | Hostname is not attached to a Worker |
| A pull request still gets a Cloudflare comment with a "Preview URL" or "Branch Preview URL" | Non-production branch builds are still on: turn them off (Step 2.4 and Step 3) |

Previews check: in each Worker, Deployments should list builds of `main` (live) or `staging` (staging) only, and Settings > Domains & Routes should show the `workers.dev` and Preview URL toggles off. On the next pull request, the `Workers Builds: calculator` check and the Cloudflare bot comment should no longer appear.

## Rollback

- Workers & Pages > Worker > **Deployments** lists every version. Use **Rollback** on the last good one.
- To take staging offline quickly, remove its custom domain, or set its Access policy to block everyone.
- A bad release can also be reverted in GitHub with a revert pull request into `staging`, then `staging` into `main`.
