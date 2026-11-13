/* js/capacity.js v1.0.0 (Last Rev: 2026-11-12) */
/* Capacity.js - planning math: transfer time and bandwidth, backup repository size, camera/NVR
   storage, uptime and SLA, PoE budget, UPS runtime, RAID rebuild time and read-error risk, and
   display pixel density. Sizes are bytes, rates are bits per second unless a name says otherwise. */
window.Calc = window.Calc || {};

Calc.Capacity = (function () {
  "use strict";

  const SECOND = 1, MINUTE = 60, HOUR = 3600, DAY = 86400;
  const YEAR = 365.25 * DAY, MONTH = YEAR / 12, WEEK = 7 * DAY;

  function positive(n, name) {
    if (!isFinite(n) || n <= 0) throw new Error(`${name} must be greater than zero`);
    return n;
  }
  function nonNegative(n, name) {
    if (!isFinite(n) || n < 0) throw new Error(`${name} must be zero or more`);
    return n;
  }

  // "3 d 4 h 5 min" style duration for a number of seconds.
  function formatDuration(seconds) {
    if (!isFinite(seconds)) return "Never";
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)} ms`;
    const parts = [];
    let s = Math.round(seconds);
    const units = [["y", YEAR], ["d", DAY], ["h", HOUR], ["min", MINUTE], ["s", SECOND]];
    for (const [label, size] of units) {
      const n = Math.floor(s / Math.round(size));
      if (n > 0 || (label === "s" && parts.length === 0)) {
        parts.push(`${n} ${label}`);
        s -= n * Math.round(size);
      }
      if (parts.length === 3) break;
    }
    return parts.join(" ");
  }

  // Link speed in bits/s; efficiency 0-100 covers protocol overhead (TCP/IP, SMB, VPN, ...).
  function transferTime(bytes, bitsPerSecond, efficiencyPct = 100) {
    nonNegative(bytes, "Size");
    positive(bitsPerSecond, "Link speed");
    const eff = positive(efficiencyPct, "Efficiency") / 100;
    const effectiveBps = bitsPerSecond * eff;
    const seconds = (bytes * 8) / effectiveBps;
    return { seconds, effectiveBps, bytesPerSecond: effectiveBps / 8 };
  }

  function requiredBandwidth(bytes, seconds, efficiencyPct = 100) {
    nonNegative(bytes, "Size");
    positive(seconds, "Time window");
    const eff = positive(efficiencyPct, "Efficiency") / 100;
    return { bitsPerSecond: (bytes * 8) / seconds / eff };
  }

  // Simple GFS-style repository estimate: fulls kept + daily incrementals kept, with the
  // daily change rate, then data reduction (compression x dedupe) and growth headroom.
  function backupRepository({ sourceBytes, changePct, dailyKept, weeklyFullsKept, monthlyFullsKept, reductionRatio, growthPct, years }) {
    nonNegative(sourceBytes, "Source data");
    const change = nonNegative(changePct, "Daily change") / 100;
    const ratio = positive(reductionRatio, "Data reduction ratio");
    const fulls = 1 + nonNegative(weeklyFullsKept, "Weekly fulls") + nonNegative(monthlyFullsKept, "Monthly fulls");
    const incrementals = nonNegative(dailyKept, "Daily restore points");
    const grownSource = sourceBytes * Math.pow(1 + nonNegative(growthPct, "Yearly growth") / 100, nonNegative(years, "Planning years"));
    const fullBytes = fulls * grownSource;
    const incBytes = incrementals * grownSource * change;
    const raw = fullBytes + incBytes;
    return { grownSource, fulls, fullBytes, incBytes, raw, stored: raw / ratio };
  }

  // Cameras x bitrate (Mbps) x hours a day x days kept, with a motion-recording percentage.
  function nvrStorage({ cameras, bitrateMbps, hoursPerDay, days, motionPct }) {
    positive(cameras, "Cameras");
    positive(bitrateMbps, "Bitrate");
    const recordingShare = positive(motionPct, "Recording share") / 100;
    const secondsPerDay = Math.min(24, positive(hoursPerDay, "Hours per day")) * HOUR * recordingShare;
    const bytesPerCameraDay = (bitrateMbps * 1e6 / 8) * secondsPerDay;
    const total = bytesPerCameraDay * cameras * positive(days, "Days kept");
    return { bytesPerCameraDay, perDay: bytesPerCameraDay * cameras, total, bandwidthMbps: bitrateMbps * cameras };
  }

  // Allowed downtime for an availability percentage.
  function downtime(availabilityPct) {
    if (!(availabilityPct > 0 && availabilityPct <= 100)) throw new Error("Availability must be above 0 and at most 100%");
    const down = 1 - availabilityPct / 100;
    return { year: down * YEAR, month: down * MONTH, week: down * WEEK, day: down * DAY };
  }

  // Availability (%) from allowed downtime seconds per period.
  function availabilityFromDowntime(seconds, periodSeconds) {
    nonNegative(seconds, "Downtime");
    if (seconds > periodSeconds) throw new Error("Downtime cannot be longer than the period");
    return (1 - seconds / periodSeconds) * 100;
  }

  // Components in series must all be up (multiply); a redundant group is down only when every
  // member is down. `groups`: [{ availabilityPct, count }] where count > 1 means N redundant copies.
  function composite(groups) {
    if (!groups.length) throw new Error("Add at least one component");
    const a = groups.reduce((acc, g) => {
      const single = g.availabilityPct / 100;
      if (!(single > 0 && single <= 1)) throw new Error("Each availability must be above 0 and at most 100%");
      const n = Math.max(1, Math.floor(g.count || 1));
      return acc * (1 - Math.pow(1 - single, n));
    }, 1);
    return a * 100;
  }

  // 802.3 PoE classes: watts the switch must budget per port (PSE side).
  const POE_CLASSES = [
    { key: "af0", label: "802.3af Class 0 (default)", watts: 15.4 },
    { key: "af1", label: "802.3af Class 1", watts: 4.0 },
    { key: "af2", label: "802.3af Class 2", watts: 7.0 },
    { key: "af3", label: "802.3af Class 3", watts: 15.4 },
    { key: "at4", label: "802.3at Class 4 (PoE+)", watts: 30.0 },
    { key: "bt5", label: "802.3bt Class 5", watts: 45.0 },
    { key: "bt6", label: "802.3bt Class 6 (PoE++)", watts: 60.0 },
    { key: "bt7", label: "802.3bt Class 7", watts: 75.0 },
    { key: "bt8", label: "802.3bt Class 8", watts: 90.0 },
  ];

  // items: [{ qty, watts }]. Budget check against the switch's PoE budget.
  function poeBudget(items, budgetWatts) {
    const used = items.reduce((sum, i) => sum + nonNegative(i.qty, "Quantity") * nonNegative(i.watts, "Watts"), 0);
    const ports = items.reduce((sum, i) => sum + i.qty, 0);
    return { used, ports, budget: budgetWatts, remaining: budgetWatts - used, pct: budgetWatts > 0 ? (used / budgetWatts) * 100 : null };
  }

  // Rough UPS runtime: usable battery energy (Wh) x inverter efficiency / load, with a Peukert-
  // style penalty for heavy loads. Manufacturer runtime charts are always the authority.
  function upsRuntime({ loadWatts, batteryWh, efficiencyPct, upsWatts, agingPct }) {
    positive(loadWatts, "Load");
    positive(batteryWh, "Battery capacity");
    const eff = positive(efficiencyPct, "Inverter efficiency") / 100;
    const health = (100 - nonNegative(agingPct, "Battery wear")) / 100;
    const loadShare = upsWatts > 0 ? loadWatts / upsWatts : null;
    const hours = (batteryWh * health * eff) / loadWatts;
    const penalty = loadShare === null ? 1 : Math.max(0.6, 1 - Math.max(0, loadShare - 0.5) * 0.5);
    return { seconds: hours * penalty * HOUR, loadPct: loadShare === null ? null : loadShare * 100, overloaded: loadShare !== null && loadShare > 1 };
  }

  // Rebuild time: read/write the whole replacement disk at a sustained rate (MB/s, decimal).
  function raidRebuild(diskBytes, mbPerSecond) {
    positive(diskBytes, "Disk size");
    positive(mbPerSecond, "Rebuild speed");
    return { seconds: diskBytes / (mbPerSecond * 1e6) };
  }

  // Chance of hitting at least one unrecoverable read error while reading `bytesRead`, given a
  // spec of 1 error per 10^exp bits (consumer 14, enterprise 15, SSD 16-17). A worst-case
  // spec-sheet number; real drives usually do better.
  function ureRisk(bytesRead, exponent) {
    nonNegative(bytesRead, "Data read");
    const bits = bytesRead * 8;
    const p = 1 - Math.exp(-bits / Math.pow(10, exponent));
    return { probability: p };
  }

  // Pixels per inch from resolution and diagonal (inches); "retina" distance is where one pixel
  // spans 1 arcminute (20/20 vision): 3438 / PPI inches.
  function ppi(width, height, diagonalInches) {
    positive(width, "Width");
    positive(height, "Height");
    positive(diagonalInches, "Diagonal");
    const diagPx = Math.hypot(width, height);
    const density = diagPx / diagonalInches;
    const widthIn = diagonalInches * width / diagPx;
    const heightIn = diagonalInches * height / diagPx;
    return { ppi: density, dotPitchMm: 25.4 / density, widthIn, heightIn, retinaDistanceIn: 3438 / density };
  }

  return {
    SECOND, MINUTE, HOUR, DAY, WEEK, MONTH, YEAR,
    formatDuration, transferTime, requiredBandwidth, backupRepository, nvrStorage,
    downtime, availabilityFromDowntime, composite, POE_CLASSES, poeBudget, upsRuntime,
    raidRebuild, ureRisk, ppi,
  };
})();
