/* js/timefmt.js v1.0.0 (Last Rev: 2026-11-13) */
/* Timefmt.js - decode and convert timestamps: Unix seconds/milliseconds, Windows FILETIME and
   Active Directory values (pwdLastSet, lastLogonTimestamp, accountExpires), and date text. */
window.Calc = window.Calc || {};

Calc.Time = (function () {
  "use strict";

  // 100 ns ticks between 1601-01-01 and 1970-01-01.
  const EPOCH_DIFF_TICKS = 116444736000000000n;
  const AD_NEVER = 9223372036854775807n;

  // Decode text into { ms, source, never } where ms is Unix milliseconds.
  function decode(text, format = "auto") {
    const s = String(text).trim();
    if (s === "") throw new Error("Enter a timestamp or a date");
    const digits = /^-?\d+$/.test(s);
    let kind = format;
    if (kind === "auto") {
      if (!digits) kind = "text";
      else if (s.replace("-", "").length >= 17) kind = "filetime";
      else if (s.replace("-", "").length >= 12) kind = "unixms";
      else kind = "unix";
    }
    if (kind === "text") {
      const ms = Date.parse(s);
      if (isNaN(ms)) throw new Error("Could not read that date. Try ISO 8601, for example 2026-11-12T14:30:00Z");
      return { ms, source: "Date text" };
    }
    if (!digits) throw new Error("That format expects a whole number");
    if (kind === "unix") return { ms: Number(s) * 1000, source: "Unix seconds" };
    if (kind === "unixms") return { ms: Number(s), source: "Unix milliseconds" };
    if (kind === "filetime") {
      const ticks = BigInt(s);
      if (ticks === 0n || ticks === AD_NEVER) return { ms: null, never: true, source: "Windows FILETIME / AD" };
      return { ms: Number((ticks - EPOCH_DIFF_TICKS) / 10000n), source: "Windows FILETIME / AD" };
    }
    throw new Error(`Unknown format "${format}"`);
  }

  function toFiletime(ms) {
    return (BigInt(Math.round(ms)) * 10000n + EPOCH_DIFF_TICKS).toString();
  }

  // YYYY-MM-DD HH:MM:SS TZ in a given IANA time zone (24 hour).
  function formatIn(ms, timeZone) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
      second: "2-digit", hourCycle: "h23", timeZoneName: "short",
    }).formatToParts(new Date(ms)).map(p => [p.type, p.value]));
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} ${parts.timeZoneName}`;
  }

  function relative(ms, now = Date.now()) {
    const diff = ms - now;
    const abs = Math.abs(diff) / 1000;
    const units = [["year", 31557600], ["day", 86400], ["hour", 3600], ["minute", 60], ["second", 1]];
    for (const [name, size] of units) {
      if (abs >= size || name === "second") {
        const n = Math.floor(abs / size);
        const label = `${n} ${name}${n === 1 ? "" : "s"}`;
        return diff < 0 ? `${label} ago` : `in ${label}`;
      }
    }
    return "now";
  }

  return { decode, toFiletime, formatIn, relative, AD_NEVER };
})();
