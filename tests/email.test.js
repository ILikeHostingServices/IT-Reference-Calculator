"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Calc = require("./load");
const A = Calc.EmailAuth;

// Fake DNS: name -> TXT strings.
const zone = data => async name => data[name] || [];

test("SPF lookups are counted through includes", async () => {
  const r = await A.checkSpf("example.com", zone({
    "example.com": ["v=spf1 mx include:spf.protection.outlook.com include:_spf.google.com -all"],
    "spf.protection.outlook.com": ["v=spf1 ip4:40.92.0.0/15 include:spfd.protection.outlook.com -all"],
    "spfd.protection.outlook.com": ["v=spf1 ip4:52.100.0.0/14 -all"],
    "_spf.google.com": ["v=spf1 include:_netblocks.google.com ~all"],
    "_netblocks.google.com": ["v=spf1 ip4:35.190.247.0/24 ~all"],
  }));
  assert.equal(r.lookups, 5); // mx, 2 includes, and 1 nested include under each
  assert.equal(r.all, "-");
  assert.ok(!r.issues.some(i => i.level === "error"));
});

test("SPF over 10 lookups, +all, duplicates, and loops are errors", async () => {
  const many = { "big.com": [`v=spf1 ${Array.from({ length: 11 }, (_, i) => `include:i${i}.com`).join(" ")} -all`] };
  for (let i = 0; i < 11; i++) many[`i${i}.com`] = ["v=spf1 -all"];
  assert.ok((await A.checkSpf("big.com", zone(many))).issues.some(i => /limit is 10/.test(i.text)));
  assert.ok((await A.checkSpf("open.com", zone({ "open.com": ["v=spf1 +all"] }))).issues.some(i => /anyone/.test(i.text)));
  assert.ok((await A.checkSpf("two.com", zone({ "two.com": ["v=spf1 -all", "v=spf1 mx -all"] }))).issues.some(i => /exactly one/.test(i.text)));
  assert.ok((await A.checkSpf("a.com", zone({ "a.com": ["v=spf1 include:b.com -all"], "b.com": ["v=spf1 include:a.com -all"] }))).issues.some(i => /loop/.test(i.text)));
  assert.ok((await A.checkSpf("none.com", zone({}))).issues.some(i => /No SPF/.test(i.text)));
});

test("DMARC parsing, inheritance, and advice", async () => {
  const r = await A.checkDmarc("example.com", zone({ "_dmarc.example.com": ["v=DMARC1; p=none; rua=mailto:d@example.com"] }));
  assert.equal(r.tags.p, "none");
  assert.ok(r.issues.some(i => /only monitors/.test(i.text)));
  const sub = await A.checkDmarc("mail.example.com", zone({ "_dmarc.example.com": ["v=DMARC1; p=reject"] }));
  assert.equal(sub.foundAt, "_dmarc.example.com");
  assert.ok(sub.issues.some(i => /rua/.test(i.text)));
  assert.ok((await A.checkDmarc("x.com", zone({}))).issues.some(i => i.level === "error"));
});

test("DKIM key size and revocation", async () => {
  const key2048 = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA" + "A".repeat(348);
  const r = await A.checkDkim("example.com", ["selector1", "nope"], zone({
    "selector1._domainkey.example.com": [`v=DKIM1; k=rsa; p=${key2048}`],
  }));
  assert.equal(r.length, 1);
  assert.equal(r[0].bits, 2048);
  const revoked = await A.checkDkim("example.com", ["old"], zone({ "old._domainkey.example.com": ["v=DKIM1; p="] }));
  assert.ok(revoked[0].issues.some(i => /revoked/.test(i.text)));
});

test("SPF and DMARC builders", () => {
  assert.deepEqual(A.buildSpf({ mx: true, includes: ["spf.protection.outlook.com"], ip4: ["203.0.113.10"], all: "-" }),
    { record: "v=spf1 mx ip4:203.0.113.10 include:spf.protection.outlook.com -all", directLookups: 2 });
  assert.equal(A.buildDmarc({ p: "quarantine", sp: "", pct: "100", rua: "dmarc@example.com", ruf: "", adkim: "r", aspf: "s" }),
    "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com; aspf=s");
});

test("header analyzer: path, delays, and red flags", () => {
  const raw = `Received: from b.example (b.example [192.0.2.2]) by c.example with ESMTPS; Wed, 11 Nov 2026 19:32:09 +0000
Received: from a.example (a.example [192.0.2.1])
\tby b.example with ESMTP; Wed, 11 Nov 2026 19:30:00 +0000
Authentication-Results: c.example; spf=pass smtp.mailfrom=x.net; dkim=pass; dmarc=fail header.from=bank.com
From: "support@bank.com" <random@x.net>
Reply-To: help@elsewhere.org
Subject: Test

Body is ignored`;
  const r = Calc.MailHeaders.analyze(raw);
  assert.equal(r.hops.length, 2);
  assert.equal(r.hops[0].from, "a.example");
  assert.equal(r.hops[0].ip, "192.0.2.1");
  assert.equal(r.hops[1].delayMs, 129000);
  assert.equal(r.auth.dmarc, "fail");
  assert.ok(r.flags.some(f => /DMARC fail/.test(f.text)));
  assert.ok(r.flags.some(f => /Reply-To/.test(f.text)));
  assert.ok(r.flags.some(f => /display name/.test(f.text)));
  assert.throws(() => Calc.MailHeaders.analyze("just text"), /No headers/);
});
