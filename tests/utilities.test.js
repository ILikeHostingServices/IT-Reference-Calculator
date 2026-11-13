/* tests/utilities.test.js v1.0.0 (Last Rev: 2026-11-12) */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Calc = require("./load");

test("time decoding", () => {
  const ft = Calc.Time.decode("133758144000000000");
  assert.equal(ft.source, "Windows FILETIME / AD");
  // (133758144000000000 - 116444736000000000) / 10^7 = 1731340800 s after 1970.
  assert.equal(new Date(ft.ms).toISOString(), "2024-11-11T16:00:00.000Z");
  assert.equal(Calc.Time.toFiletime(ft.ms), "133758144000000000");
  assert.equal(Calc.Time.decode("9223372036854775807").never, true);
  assert.equal(Calc.Time.decode("0", "filetime").never, true);
  assert.equal(Calc.Time.decode("1700000000").ms, 1700000000000);
  assert.equal(Calc.Time.decode("1700000000123").source, "Unix milliseconds");
  assert.equal(Calc.Time.decode("2026-11-12T14:30:00Z").ms, Date.UTC(2026, 10, 12, 14, 30));
  assert.equal(Calc.Time.formatIn(Date.UTC(2026, 6, 4, 16, 5), "America/New_York"), "2026-07-04 12:05:00 EDT");
  assert.throws(() => Calc.Time.decode("not a date"), /Could not read/);
});

test("cron describe", () => {
  assert.equal(Calc.Cron.describe("15 2 * * 1-5"), "At 02:15, on weekdays (Monday to Friday)");
  assert.equal(Calc.Cron.describe("*/5 * * * *"), "Every 5 minutes");
  assert.equal(Calc.Cron.describe("@monthly"), "At 00:00, on day 1 of the month");
  assert.equal(Calc.Cron.describe("0 9 * jan,jul sun"), "At 09:00, on Sunday, in January and July");
  assert.throws(() => Calc.Cron.describe("* * * *"), /5 fields/);
  assert.throws(() => Calc.Cron.describe("0 0 * * * *"), /6-field/);
  assert.throws(() => Calc.Cron.describe("61 * * * *"), /out of range/);
});

test("cron next runs across the spring DST change", () => {
  // 2026-03-08 is the US spring-forward day. 03:00 local exists before and after it.
  const from = Date.UTC(2026, 2, 7, 12, 0);
  const runs = Calc.Cron.nextRuns("0 3 * * *", 3, "America/New_York", from).map(ms => new Date(ms).toISOString());
  assert.deepEqual(runs, ["2026-03-08T07:00:00.000Z", "2026-03-09T07:00:00.000Z", "2026-03-10T07:00:00.000Z"]);
  const utc = Calc.Cron.nextRuns("30 */6 * * *", 2, "UTC", Date.UTC(2026, 0, 1, 0, 0)).map(ms => new Date(ms).toISOString());
  assert.deepEqual(utc, ["2026-01-01T00:30:00.000Z", "2026-01-01T06:30:00.000Z"]);
  // Day-of-month OR day-of-week when both are restricted (Vixie cron rule).
  const both = Calc.Cron.nextRuns("0 0 13 * fri", 2, "UTC", Date.UTC(2026, 1, 1)).map(ms => new Date(ms).toISOString().slice(0, 10));
  assert.deepEqual(both, ["2026-02-06", "2026-02-13"]);
});

test("chmod", () => {
  assert.equal(Calc.Bits.chmodFromOctal("755").symbolic, "rwxr-xr-x");
  assert.equal(Calc.Bits.chmodFromOctal("4755").symbolic, "rwsr-xr-x");
  assert.equal(Calc.Bits.chmodFromOctal("1777").symbolic, "rwxrwxrwt");
  assert.equal(Calc.Bits.chmodFromOctal("2644").symbolic, "rw-r-Sr--");
  assert.equal(Calc.Bits.chmodFromSymbolic("-rw-r--r--").octal, "644");
  assert.equal(Calc.Bits.chmodFromSymbolic("rwsr-sr-t").octal, "7755");
  assert.throws(() => Calc.Bits.chmodFromOctal("789"), /octal/);
});

test("number bases", () => {
  const b = Calc.Bits.toBases(Calc.Bits.parseBase("0xC0A80101", 16));
  assert.equal(b.dec, "3232235777");
  assert.equal(b.binGrouped, "1100 0000 1010 1000 0000 0001 0000 0001");
  assert.equal(Calc.Bits.toBases(Calc.Bits.parseBase("0b1111_1111", 2)).hex, "FF");
  assert.equal(Calc.Bits.toBases(Calc.Bits.parseBase("18446744073709551616", 10)).hex, "10000000000000000");
  assert.throws(() => Calc.Bits.parseBase("12", 2), /base-2/);
});

test("password generation", () => {
  for (let i = 0; i < 50; i++) {
    const r = Calc.Password.generatePassword({ length: 12, lower: true, upper: true, digits: true, symbols: false, avoidAmbiguous: true });
    assert.equal(r.value.length, 12);
    assert.match(r.value, /[a-z]/);
    assert.match(r.value, /[A-Z]/);
    assert.match(r.value, /[0-9]/);
    assert.doesNotMatch(r.value, /[O0oIl1]/);
  }
  const p = Calc.Password.generatePassphrase({ words: 5, separator: "-", capitalize: false, addNumber: false });
  assert.equal(p.value.split("-").length >= 5, true);
  assert.ok(Math.abs(p.entropyBits - 5 * Math.log2(7776)) < 1e-9);
  assert.throws(() => Calc.Password.generatePassword({ length: 10 }), /at least one/);
  const counts = new Array(3).fill(0);
  for (let i = 0; i < 3000; i++) counts[Calc.Password.randomInt(3)]++;
  counts.forEach(c => assert.ok(c > 850 && c < 1150, `skewed ${counts}`));
});

test("encodings, hashes, JWT, Wi-Fi string", async () => {
  const E = Calc.Encode;
  const text = "Héllo wörld ✓";
  for (const codec of ["base64", "base64url", "url", "hex"]) assert.equal(E.run(codec, "decode", E.run(codec, "encode", text)), text);
  assert.equal(E.run("base64", "encode", "hi"), "aGk=");
  assert.equal(E.run("html", "encode", `<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  assert.throws(() => E.run("hex", "decode", "abc"), /pairs/);
  const h = await E.hashes("abc");
  assert.equal(h["SHA-256"], "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  const jwt = `${E.run("base64url", "encode", '{"alg":"HS256"}')}.${E.run("base64url", "encode", '{"sub":"42"}')}.sig`;
  assert.deepEqual(E.decodeJwt(jwt).payload, { sub: "42" });
  assert.equal(E.wifiString({ ssid: "Cafe;Guest", pass: 'p:a"ss', sec: "WPA", hidden: true }), 'WIFI:T:WPA;S:Cafe\\;Guest;P:p\\:a\\"ss;H:true;;');
  assert.equal(E.wifiString({ ssid: "Open", pass: "", sec: "nopass", hidden: false }), "WIFI:T:nopass;S:Open;;");
});
