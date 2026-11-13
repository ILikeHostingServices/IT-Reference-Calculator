/* js/bits.js v1.0.0 (Last Rev: 2026-11-13) */
/* Bits.js - Unix permission (chmod) conversion and number base conversion (BigInt, any size). */
window.Calc = window.Calc || {};

Calc.Bits = (function () {
  "use strict";

  // chmod: 3 or 4 octal digits <-> rwxr-xr-x style (with setuid/setgid/sticky).
  function chmodFromOctal(text) {
    const s = String(text).trim();
    if (!/^[0-7]{3,4}$/.test(s)) throw new Error("Use 3 or 4 octal digits, for example 755 or 2775");
    const digits = s.padStart(4, "0").split("").map(Number);
    return chmodFromDigits(digits);
  }

  function chmodFromDigits([special, u, g, o]) {
    const triad = (n, specialBit, specialChar) => {
      const r = n & 4 ? "r" : "-";
      const w = n & 2 ? "w" : "-";
      const hasX = (n & 1) === 1;
      const x = specialBit ? (hasX ? specialChar : specialChar.toUpperCase()) : (hasX ? "x" : "-");
      return r + w + x;
    };
    const symbolic = triad(u, special & 4, "s") + triad(g, special & 2, "s") + triad(o, special & 1, "t");
    const octal = `${special ? special : ""}${u}${g}${o}`;
    return { octal, symbolic, digits: [special, u, g, o] };
  }

  // rwxr-xr-x (9 chars, optional leading file-type char) -> octal.
  function chmodFromSymbolic(text) {
    let s = String(text).trim();
    if (s.length === 10) s = s.slice(1);
    if (!/^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(s)) {
      throw new Error("Use 9 characters like rwxr-xr-x (s/S and t/T allowed for special bits)");
    }
    const triad = (t) => (t[0] === "r" ? 4 : 0) + (t[1] === "w" ? 2 : 0) + ("xst".includes(t[2]) ? 1 : 0);
    const special = (/[sS]/.test(s[2]) ? 4 : 0) + (/[sS]/.test(s[5]) ? 2 : 0) + (/[tT]/.test(s[8]) ? 1 : 0);
    return chmodFromDigits([special, triad(s.slice(0, 3)), triad(s.slice(3, 6)), triad(s.slice(6, 9))]);
  }

  // Number bases: parse with an optional 0x / 0b / 0o prefix, underscores and spaces ignored.
  const PREFIX = { 16: "0x", 2: "0b", 8: "0o", 10: "" };
  function parseBase(text, base) {
    let s = String(text).trim().replace(/[\s_]/g, "").toLowerCase();
    let negative = false;
    if (s.startsWith("-")) { negative = true; s = s.slice(1); }
    const prefix = PREFIX[base];
    if (prefix && s.startsWith(prefix)) s = s.slice(prefix.length);
    const valid = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[0-9a-f]+$/ }[base];
    if (!valid || !valid.test(s)) throw new Error(`Not a valid base-${base} number`);
    const value = base === 10 ? BigInt(s) : BigInt(PREFIX[base] + s);
    return negative ? -value : value;
  }

  // Group digits from the right for readability (binary in nibbles, hex in 4s, decimal in 3s).
  function group(str, size, sep) {
    const out = [];
    for (let i = str.length; i > 0; i -= size) out.unshift(str.slice(Math.max(0, i - size), i));
    return out.join(sep);
  }

  function toBases(value) {
    const negative = value < 0n;
    const v = negative ? -value : value;
    const sign = negative ? "-" : "";
    const bin = v.toString(2);
    return {
      dec: sign + v.toString(10),
      decGrouped: sign + group(v.toString(10), 3, ","),
      hex: sign + v.toString(16).toUpperCase(),
      hexGrouped: sign + group(v.toString(16).toUpperCase(), 4, " "),
      oct: sign + v.toString(8),
      bin: sign + bin,
      binGrouped: sign + group(bin.padStart(Math.ceil(bin.length / 4) * 4, "0"), 4, " "),
      bits: bin.length,
      bytes: Math.ceil(bin.length / 8),
    };
  }

  return { chmodFromOctal, chmodFromSymbolic, parseBase, toBases };
})();
