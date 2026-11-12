/* Password.js - password and passphrase generation with the browser's cryptographic random source
   (crypto.getRandomValues), plus entropy estimates. Nothing is stored or sent anywhere. */
window.Calc = window.Calc || {};

Calc.Password = (function () {
  "use strict";

  const SETS = {
    lower: "abcdefghijklmnopqrstuvwxyz",
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    digits: "0123456789",
    symbols: "!@#$%^&*()-_=+[]{};:,.?/~",
  };
  const AMBIGUOUS = /[O0oIl1|`'"]/g;

  // Unbiased integer in [0, max) by rejection sampling.
  function randomInt(max) {
    if (max < 1 || max > 2 ** 32) throw new Error("Random range out of bounds");
    const limit = Math.floor(2 ** 32 / max) * max;
    const buf = new Uint32Array(1);
    let x;
    do {
      crypto.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return x % max;
  }

  function generatePassword({ length, lower, upper, digits, symbols, avoidAmbiguous }) {
    if (!Number.isInteger(length) || length < 4 || length > 256) throw new Error("Length must be 4 to 256");
    const chosen = [];
    if (lower) chosen.push(SETS.lower);
    if (upper) chosen.push(SETS.upper);
    if (digits) chosen.push(SETS.digits);
    if (symbols) chosen.push(SETS.symbols);
    if (!chosen.length) throw new Error("Pick at least one character type");
    const sets = chosen.map(s => (avoidAmbiguous ? s.replace(AMBIGUOUS, "") : s));
    const pool = sets.join("");
    if (length < sets.length) throw new Error("Length is shorter than the number of character types");
    // One from each chosen set, the rest from the full pool, then shuffle (Fisher-Yates).
    const chars = sets.map(s => s[randomInt(s.length)]);
    while (chars.length < length) chars.push(pool[randomInt(pool.length)]);
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return { value: chars.join(""), entropyBits: length * Math.log2(pool.length), poolSize: pool.length };
  }

  function generatePassphrase({ words, separator, capitalize, addNumber }) {
    const list = Calc.EFF_WORDS;
    if (!list || list.length !== 7776) throw new Error("Wordlist not loaded");
    if (!Number.isInteger(words) || words < 3 || words > 20) throw new Error("Use 3 to 20 words");
    const picked = [];
    for (let i = 0; i < words; i++) {
      const w = list[randomInt(list.length)];
      picked.push(capitalize ? w[0].toUpperCase() + w.slice(1) : w);
    }
    let entropy = words * Math.log2(list.length);
    if (addNumber) {
      picked.push(String(randomInt(100)));
      entropy += Math.log2(100);
    }
    return { value: picked.join(separator), entropyBits: entropy };
  }

  // Plain-language strength from entropy bits (offline cracking, fast hashes assumed).
  function strength(bits) {
    if (bits < 40) return "Weak: crackable quickly";
    if (bits < 60) return "Fair: fine for low-value accounts with rate limits";
    if (bits < 80) return "Strong: good for most accounts";
    if (bits < 100) return "Very strong: good for admin and encryption keys";
    return "Excellent";
  }

  return { SETS, randomInt, generatePassword, generatePassphrase, strength };
})();
