/* tests/worker.test.js v1.0.0 (Last Rev: 2026-11-12) */
/* Cloudflare Worker behavior (worker/index.js) with a fake ASSETS binding: every custom domain attached to the
   live Worker 301-redirects to calc.ilhs.app with path and query kept, the security headers are always sent,
   and staging sends noindex and a disallow-all robots.txt. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const load = () => import(path.join(__dirname, "..", "worker", "index.js")).then(m => m.default);
const ASSETS = { fetch: async req => new Response(`asset ${new URL(req.url).pathname}`, { status: 200, headers: { "Content-Type": "text/html" } }) };
const LIVE = { PRIMARY_HOST: "calc.ilhs.app", NOINDEX: "", ASSETS, CF_VERSION_METADATA: { timestamp: "2026-11-13T02:10:00Z" } };
const STAGING = { PRIMARY_HOST: "calc-staging.ilhs.app", NOINDEX: "1", ASSETS };

// The custom domains on the live Worker (owner's Cloudflare dashboard, 2026-10-29).
const OTHER_DOMAINS = ["calc.syshost.app", "itcalc.syshost.app", "itcalculator.ilhs.app", "calculator.syshost.app",
  "itcalc.ilhs.app", "itcalculator.syshost.app", "calculator.ilhs.app"];

test("every other attached domain 301-redirects to calc.ilhs.app, keeping path and query", async () => {
  const worker = await load();
  for (const host of OTHER_DOMAINS) {
    const res = await worker.fetch(new Request(`http://${host}/some/path?x=1`), LIVE);
    assert.equal(res.status, 301, host);
    assert.equal(res.headers.get("Location"), "https://calc.ilhs.app/some/path?x=1", host);
  }
});

test("the primary host is served with security headers and Last-Modified, no noindex", async () => {
  const worker = await load();
  const res = await worker.fetch(new Request("https://calc.ilhs.app/"), LIVE);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("Content-Security-Policy"), /default-src 'none'.*frame-ancestors 'none'/);
  assert.equal(res.headers.get("Strict-Transport-Security"), "max-age=31536000");
  assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(res.headers.get("Last-Modified"), "Fri, 13 Nov 2026 02:10:00 GMT");
  assert.equal(res.headers.get("X-Robots-Tag"), null);
});

test("staging sends noindex on every response and blocks crawlers in robots.txt", async () => {
  const worker = await load();
  const page = await worker.fetch(new Request("https://calc-staging.ilhs.app/"), STAGING);
  assert.equal(page.headers.get("X-Robots-Tag"), "noindex, nofollow");
  assert.ok(page.headers.get("Content-Security-Policy"));
  const robots = await worker.fetch(new Request("https://calc-staging.ilhs.app/robots.txt"), STAGING);
  assert.equal(await robots.text(), "User-agent: *\nDisallow: /\n");
  const live = await worker.fetch(new Request("https://calc.ilhs.app/robots.txt"), LIVE);
  assert.equal(await live.text(), "asset /robots.txt");
  // Staging only answers on its own hostname.
  const wrong = await worker.fetch(new Request("https://calc.ilhs.app/"), STAGING);
  assert.equal(wrong.headers.get("Location"), "https://calc-staging.ilhs.app/");
});
