/* Cron.js - parse standard 5-field cron expressions (minute hour day-of-month month day-of-week),
   describe them in plain English, and list upcoming run times in a chosen time zone.
   Supports *, lists, ranges, steps, month/day names, 7 = Sunday, and @hourly-style macros.
   As in Vixie cron, when both day-of-month and day-of-week are restricted, either one matching runs it. */
window.Calc = window.Calc || {};

Calc.Cron = (function () {
  "use strict";

  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MACROS = {
    "@yearly": "0 0 1 1 *", "@annually": "0 0 1 1 *", "@monthly": "0 0 1 * *",
    "@weekly": "0 0 * * 0", "@daily": "0 0 * * *", "@midnight": "0 0 * * *", "@hourly": "0 * * * *",
  };
  const FIELDS = [
    { name: "minute", min: 0, max: 59 },
    { name: "hour", min: 0, max: 23 },
    { name: "day of month", min: 1, max: 31 },
    { name: "month", min: 1, max: 12, names: MONTHS, offset: 1 },
    { name: "day of week", min: 0, max: 7, names: DAYS, offset: 0 },
  ];

  function parseValue(token, field) {
    const t = token.toLowerCase();
    if (field.names) {
      const i = field.names.indexOf(t);
      if (i !== -1) return i + field.offset;
    }
    if (!/^\d+$/.test(t)) throw new Error(`"${token}" is not valid in the ${field.name} field`);
    const n = Number(t);
    if (n < field.min || n > field.max) throw new Error(`${n} is out of range for ${field.name} (${field.min}-${field.max})`);
    return n;
  }

  function parseField(text, field) {
    const values = new Set();
    for (const part of text.split(",")) {
      if (part === "") throw new Error(`Empty list item in the ${field.name} field`);
      const [rangePart, stepPart] = part.split("/");
      const step = stepPart === undefined ? 1 : Number(stepPart);
      if (!Number.isInteger(step) || step < 1) throw new Error(`Bad step "/${stepPart}" in the ${field.name} field`);
      let lo, hi;
      if (rangePart === "*") { lo = field.min; hi = field.max; }
      else if (rangePart.includes("-")) {
        const [a, b] = rangePart.split("-");
        lo = parseValue(a, field); hi = parseValue(b, field);
        if (lo > hi) throw new Error(`Range ${rangePart} runs backwards in the ${field.name} field`);
      } else {
        lo = parseValue(rangePart, field);
        hi = stepPart === undefined ? lo : field.max;
      }
      for (let v = lo; v <= hi; v += step) values.add(v);
    }
    if (field.name === "day of week" && values.has(7)) { values.delete(7); values.add(0); }
    return values;
  }

  function parse(expr) {
    let s = String(expr).trim().toLowerCase();
    if (MACROS[s]) s = MACROS[s];
    if (s === "@reboot") throw new Error("@reboot runs once at startup, so it has no schedule to list");
    const parts = s.split(/\s+/);
    if (parts.length === 6) throw new Error("This looks like a 6-field (seconds or Quartz) cron. Use the standard 5 fields: minute hour day month weekday");
    if (parts.length !== 5) throw new Error("A cron expression has 5 fields: minute hour day-of-month month day-of-week");
    const sets = parts.map((p, i) => parseField(p, FIELDS[i]));
    return {
      raw: parts,
      minutes: sets[0], hours: sets[1], doms: sets[2], months: sets[3], dows: sets[4],
      domRestricted: parts[2] !== "*", dowRestricted: parts[4] !== "*",
    };
  }

  const pad = n => String(n).padStart(2, "0");
  function listWords(values, namer) {
    const arr = [...values].sort((a, b) => a - b).map(namer);
    if (arr.length <= 2) return arr.join(" and ");
    return `${arr.slice(0, -1).join(", ")}, and ${arr[arr.length - 1]}`;
  }
  const fullRange = (set, field) => set.size === (field.name === "day of week" ? 7 : field.max - field.min + 1);
  function stepOf(rawField) {
    const m = rawField.match(/^\*\/(\d+)$/);
    return m ? Number(m[1]) : null;
  }

  function describe(expr) {
    const c = parse(expr);
    const [rawMin, rawHour] = c.raw;
    let time;
    const minStep = stepOf(rawMin), hourStep = stepOf(rawHour);
    if (fullRange(c.minutes, FIELDS[0]) && fullRange(c.hours, FIELDS[1])) time = "Every minute";
    else if (minStep && fullRange(c.hours, FIELDS[1])) time = `Every ${minStep} minutes`;
    else if (c.minutes.size === 1 && fullRange(c.hours, FIELDS[1])) time = `Every hour at minute ${[...c.minutes][0]}`;
    else if (c.minutes.size === 1 && hourStep) time = `Every ${hourStep} hours at minute ${[...c.minutes][0]}`;
    else if (c.minutes.size * c.hours.size <= 6) {
      const times = [];
      for (const h of [...c.hours].sort((a, b) => a - b)) for (const m of [...c.minutes].sort((a, b) => a - b)) times.push(`${pad(h)}:${pad(m)}`);
      time = `At ${listWords(times, x => x)}`;
    } else {
      time = `At minute ${listWords(c.minutes, String)} past hour ${listWords(c.hours, String)}`;
    }
    const days = [];
    if (c.domRestricted && c.dowRestricted) {
      days.push(`on day ${listWords(c.doms, String)} of the month or on ${listWords(c.dows, d => DAY_NAMES[d])}`);
    } else if (c.domRestricted) {
      days.push(`on day ${listWords(c.doms, String)} of the month`);
    } else if (c.dowRestricted) {
      const d = [...c.dows].sort();
      days.push(d.join(",") === "1,2,3,4,5" ? "on weekdays (Monday to Friday)" : d.join(",") === "0,6" ? "on weekends" : `on ${listWords(c.dows, x => DAY_NAMES[x])}`);
    }
    if (!fullRange(c.months, FIELDS[3])) days.push(`in ${listWords(c.months, m => MONTH_NAMES[m - 1])}`);
    return [time, ...days].join(", ");
  }

  // Wall-clock parts of an instant in a time zone.
  function wall(ms, timeZone) {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric",
      weekday: "short", hourCycle: "h23",
    }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
    return { month: Number(p.month), day: Number(p.day), hour: Number(p.hour), minute: Number(p.minute), dow: DAYS.indexOf(p.weekday.toLowerCase().slice(0, 3)) };
  }

  // Next `count` run times after `fromMs`, evaluated in `timeZone` wall-clock time. Skips whole
  // hours that cannot match, so DST changes are handled by re-reading the wall clock each step.
  function nextRuns(expr, count = 5, timeZone = "America/New_York", fromMs = Date.now()) {
    const c = parse(expr);
    const runs = [];
    let t = Math.floor(fromMs / 60000) * 60000 + 60000;
    const limit = t + 4 * 366 * 86400000;
    while (runs.length < count && t < limit) {
      const w = wall(t, timeZone);
      const domOk = c.doms.has(w.day), dowOk = c.dows.has(w.dow);
      const dayOk = c.domRestricted && c.dowRestricted ? domOk || dowOk : domOk && dowOk;
      if (!c.months.has(w.month) || !dayOk || !c.hours.has(w.hour)) {
        t += (60 - w.minute) * 60000; // jump to the next hour boundary
        continue;
      }
      if (c.minutes.has(w.minute)) runs.push(t);
      t += 60000;
    }
    return runs;
  }

  return { parse, describe, nextRuns };
})();
