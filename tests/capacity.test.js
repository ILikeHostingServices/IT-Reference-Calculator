/* tests/capacity.test.js v1.0.0 (Last Rev: 2026-11-12) */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Calc = require("./load");
const C = Calc.Capacity;
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

test("transfer time and required bandwidth", () => {
  near(C.transferTime(1e12, 1e9, 100).seconds, 8000);
  near(C.transferTime(1e12, 1e9, 80).seconds, 10000);
  near(C.requiredBandwidth(1e12, 8000, 100).bitsPerSecond, 1e9);
  assert.throws(() => C.transferTime(1, 0), /greater than zero/);
});

test("downtime and composite availability", () => {
  near(C.downtime(99.9).year / 3600, 8.766, 1e-3);
  near(C.composite([{ availabilityPct: 99.9, count: 1 }, { availabilityPct: 99.9, count: 1 }]), 99.8001, 1e-9);
  near(C.composite([{ availabilityPct: 99, count: 2 }]), 99.99, 1e-9);
  near(C.availabilityFromDowntime(43.83 * 60, C.MONTH), 99.9, 1e-3);
  assert.throws(() => C.downtime(101), /at most 100/);
});

test("power and heat", () => {
  const r = C.powerHeat({ watts: 1000, powerFactor: 0.9, volts: 120 });
  assert.equal(Math.round(r.btu), 3412);
  assert.equal(Math.round(r.va), 1111);
  assert.equal(r.amps.toFixed(2), "9.26");
  assert.equal(r.breaker, 15, "9.26 A / 0.8 = 11.6 A, so a 15 A breaker");
  assert.equal(C.powerHeat({ watts: 3000, powerFactor: 1, volts: 120 }).breaker, 35);
  assert.throws(() => C.powerHeat({ watts: 100, powerFactor: 1.2, volts: 120 }), /between 0 and 1/);
});

test("switch ports", () => {
  const r = C.switchPorts({ devices: 100, growthPct: 20, portsPerSwitch: 48, reservedPerSwitch: 2 });
  assert.deepEqual(r, { needed: 120, switches: 3, usablePorts: 138, spare: 18, totalPorts: 144 });
  assert.equal(C.switchPorts({ devices: 0, growthPct: 0, portsPerSwitch: 24, reservedPerSwitch: 0 }).switches, 1);
  assert.throws(() => C.switchPorts({ devices: 10, growthPct: 0, portsPerSwitch: 8, reservedPerSwitch: 8 }), /at least one port/);
});

test("formatDuration", () => {
  assert.equal(C.formatDuration(3661), "1 h 1 min 1 s");
  assert.equal(C.formatDuration(0.25), "250 ms");
  assert.equal(C.formatDuration(90061), "1 d 1 h 1 min");
});

test("backup, NVR, PoE, UPS", () => {
  const b = C.backupRepository({ sourceBytes: 1e12, changePct: 10, dailyKept: 7, weeklyFullsKept: 0, monthlyFullsKept: 0, reductionRatio: 2, growthPct: 0, years: 0 });
  near(b.raw, 1e12 + 7 * 1e11);
  near(b.stored, (1e12 + 7e11) / 2);
  const n = C.nvrStorage({ cameras: 1, bitrateMbps: 8, hoursPerDay: 24, days: 1, motionPct: 100 });
  near(n.total, 1e6 * 86400); // 8 Mbps = 1 MB/s
  const p = C.poeBudget([{ qty: 4, watts: 30 }], 100);
  assert.equal(p.used, 120);
  assert.equal(p.remaining, -20);
  const u = C.upsRuntime({ loadWatts: 100, batteryWh: 100, efficiencyPct: 100, upsWatts: 0, agingPct: 0 });
  near(u.seconds, 3600);
});

test("RAID rebuild and read error risk", () => {
  near(C.raidRebuild(4e12, 100).seconds, 40000);
  near(C.ureRisk(12.5e12, 14).probability, 1 - Math.exp(-1)); // 10^14 bits read at a 1-in-10^14 spec
  near(C.ureRisk(0, 14).probability, 0);
});

test("pixel density", () => {
  const r = C.ppi(3840, 2160, 27);
  near(r.ppi, 163.18, 0.01);
  near(r.retinaDistanceIn, 3438 / r.ppi);
});

test("storage totals and units still behave", () => {
  assert.equal(Calc.Storage.total([{ quantity: 4, amount: 32, unit: "GiB" }]), 4 * 32 * 1024 ** 3);
  assert.equal(Calc.Units.formatBytes(4e12, "binary"), "3.64 TiB");
  const raid = Calc.RAID.calculate("raid5", 4, 4e12);
  assert.equal(raid.usableBytes, 12e12);
});

test("resolution lookup", () => {
  const r = Calc.Resolution.lookup(3440, 1440);
  assert.equal(`${r.ratioW}:${r.ratioH}`, "43:18");
  assert.equal(r.nearest.group.key, "21:9");
  assert.equal(Calc.Resolution.lookup(1080, 1920).nearest.group.key, "9:16");
  assert.equal(Calc.Resolution.lookup(768, 1024).known.rotated, true);
  assert.deepEqual(Calc.Resolution.parse("1920 by 1080"), { w: 1920, h: 1080 });
});
