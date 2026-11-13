SITE.md v1.0.0 (Last Rev: 2026-11-12 23:20 EST)

# Site: calc

- Live: https://calc.ilhs.app   (Worker: calculator, legacy name kept by owner decision 2026-11-12)
- Staging: https://calc-staging.ilhs.app   (Worker: calculator-staging)
- Source: repository root (static files; the Worker in worker/ serves them)
- Hosting: Cloudflare Workers static assets, built by Workers Builds from wrangler.jsonc
- Headers: Worker code (worker/index.js), because the site needs scripts, two DNS-over-HTTPS hosts, data: images, and a service worker
- Own branding: calculator glyph favicon in ILHS colors; ILHS mark and wordmark in the header per the Brand Guide
- Exceptions to the ILHS website baseline: live Worker is named `calculator` instead of the lowercase repository name (legacy, owner decision 2026-11-12); seven older domains are attached to the live Worker and 301-redirect to calc.ilhs.app
- Baseline: https://github.com/ILikeHostingServices/ILHS-Internal/blob/main/org/baseline/WEBSITES.md
- Runbook: projects/it-reference-calculator/HANDOFF.md in ILHS-Internal; Cloudflare steps in docs/DEPLOYMENT.md here
