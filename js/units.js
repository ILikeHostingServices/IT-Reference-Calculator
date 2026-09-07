/* Units.js - binary (KiB/MiB/...) and decimal (KB/MB/...) byte conversion helpers.
   Preferred default is binary (matches how most OSes report capacity). */
window.Calc = window.Calc || {};

Calc.Units = (function () {
  "use strict";

  // Ordered smallest -> largest. "factor" is the multiplier relative to bytes.
  const BINARY = [
    { key: "B",   label: "B",   factor: 1 },
    { key: "KiB", label: "KiB", factor: 1024 },
    { key: "MiB", label: "MiB", factor: 1024 ** 2 },
    { key: "GiB", label: "GiB", factor: 1024 ** 3 },
    { key: "TiB", label: "TiB", factor: 1024 ** 4 },
    { key: "PiB", label: "PiB", factor: 1024 ** 5 },
    { key: "EiB", label: "EiB", factor: 1024 ** 6 },
  ];

  const DECIMAL = [
    { key: "B",  label: "B",  factor: 1 },
    { key: "KB", label: "KB", factor: 1000 },
    { key: "MB", label: "MB", factor: 1000 ** 2 },
    { key: "GB", label: "GB", factor: 1000 ** 3 },
    { key: "TB", label: "TB", factor: 1000 ** 4 },
    { key: "PB", label: "PB", factor: 1000 ** 5 },
    { key: "EB", label: "EB", factor: 1000 ** 6 },
  ];

  const ALL_UNITS = [...BINARY, ...DECIMAL.filter(d => d.key !== "B")];

  function factorFor(unitKey) {
    const u = ALL_UNITS.find(u => u.key === unitKey);
    if (!u) throw new Error(`Unknown unit "${unitKey}"`);
    return u.factor;
  }

  // Convert an amount in `fromUnit` to bytes (Number).
  function toBytes(amount, fromUnit) {
    return amount * factorFor(fromUnit);
  }

  // Convert a byte count to `toUnit`.
  function fromBytes(bytes, toUnit) {
    return bytes / factorFor(toUnit);
  }

  // Convert directly between two units.
  function convert(amount, fromUnit, toUnit) {
    return fromBytes(toBytes(amount, fromUnit), toUnit);
  }

  // Pick the "nicest" unit for a byte count within a given system (binary/decimal),
  // i.e. the largest unit where the value is still >= 1 (falls back to B for tiny values).
  function bestUnit(bytes, system) {
    const list = system === "decimal" ? DECIMAL : BINARY;
    let chosen = list[0];
    for (const u of list) {
      if (bytes >= u.factor) chosen = u;
      else break;
    }
    return chosen.key;
  }

  // Format a byte count as a human string in the requested system, auto-picking scale.
  function formatBytes(bytes, system, decimals = 2) {
    const unit = bestUnit(Math.abs(bytes), system);
    const value = fromBytes(bytes, unit);
    return `${trimNumber(value, decimals)} ${unit}`;
  }

  // Return both binary and decimal human-readable strings for a byte count.
  function formatBoth(bytes, decimals = 2) {
    return {
      binary: formatBytes(bytes, "binary", decimals),
      decimal: formatBytes(bytes, "decimal", decimals),
    };
  }

  function trimNumber(value, decimals) {
    if (!isFinite(value)) return String(value);
    const fixed = value.toFixed(decimals);
    // Strip trailing zeros/decimal point but keep at least the integer part.
    return fixed.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  }

  return {
    BINARY,
    DECIMAL,
    ALL_UNITS,
    factorFor,
    toBytes,
    fromBytes,
    convert,
    bestUnit,
    formatBytes,
    formatBoth,
    trimNumber,
  };
})();
