RUNBOOK.md v1.0.0 (Last Rev: 2026-11-25)

# Runbook

How to deploy, check, and roll back calc.ilhs.app. Cloudflare dashboard setup (Workers, Access, domains) is in `docs/DEPLOYMENT.md`. To run or host your own copy, see "Run It Yourself" in `README.md`.

## Deploy

Deploys are automatic through Cloudflare Workers Builds; nobody runs `wrangler deploy` by hand.

1. Open a pull request into `staging` (mutating, GitHub). Wait for the `test` check.
2. Merge it with a merge commit. Workers Builds deploys Worker `calculator-staging` with `npx wrangler deploy --env staging`.
3. The owner tests on https://calc-staging.ilhs.app (Cloudflare Access login).
4. After the owner approves, open a pull request from `staging` into `main` and merge it. Workers Builds deploys Worker `calculator` with `npx wrangler deploy --env=""`.

## Verify

- Tests (read-only, any shell with Node 20 or newer): `node --test tests/*.test.js`.
- Live headers and redirects (read-only): the curl commands under "Quick Checks" in `docs/DEPLOYMENT.md`. Expected: `200` with `content-security-policy` on calc.ilhs.app, `301` to calc.ilhs.app from every redirect domain, and a `cloudflareaccess.com` login redirect on staging.
- In the browser: the footer shows the new `v` number and a "Built" time from the deploy; DevTools Application shows a cache named `itcalc-<version>`.

## Rollback

1. Cloudflare dashboard > Workers & Pages > the Worker > Deployments > Rollback on the last good version (mutating, immediate).
2. Then fix the source: a revert pull request into `staging`, then `staging` into `main`, so the next build does not redeploy the bad version.

## Failure Alerts

- Failed tests show as a red `test` check on the pull request; nothing merges until it is green.
- A failed Workers Build shows in the Cloudflare dashboard (Worker > Deployments) and in the GitHub commit status.
- Visitors keep the previous version from their offline cache until the new one installs.

## Logs

- Cloudflare dashboard > the Worker > Logs (real-time) for Worker errors. The Worker logs nothing on success.
- Browser developer console for page errors; a tool that fails to start logs `Tool "ID" failed to start`.

## Scheduled Work

- `.well-known/security.txt` expires 2027-11-12. Renew the `Expires` date before then (owner, yearly).
- Dependabot opens a monthly pull request into `staging` for GitHub Actions updates.
