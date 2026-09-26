/* Storage.js - storage/RAM math on plain byte counts (Number).
   Unit conversion is handled by Calc.Units; this module only does the arithmetic
   behind the Storage / RAM tab's "Add it up" and "Compare" tools. */
window.Calc = window.Calc || {};

Calc.Storage = (function () {
  "use strict";

  function toBytesEntry(amount, unit) {
    if (!isFinite(amount)) throw new Error("Amount must be a finite number");
    return Calc.Units.toBytes(amount, unit);
  }

  // Sum a list of {quantity, amount, unit} line items into a total byte count.
  function total(items) {
    return items.reduce((sum, item) => {
      if (!isFinite(item.quantity) || item.quantity < 0) {
        throw new Error("Quantities must be zero or more");
      }
      return sum + item.quantity * toBytesEntry(item.amount, item.unit);
    }, 0);
  }

  // Compare a capacity (A) against a used amount / item size (B), both in bytes.
  function compare(bytesA, bytesB) {
    const result = {
      differenceBytes: bytesA - bytesB,
      percentOfA: null, // B as a percentage of A
      fits: null,       // whole copies of B that fit in A
      leftoverBytes: null,
    };
    if (bytesA > 0) result.percentOfA = (bytesB / bytesA) * 100;
    if (bytesB > 0 && bytesA >= 0) {
      result.fits = Math.floor(bytesA / bytesB);
      result.leftoverBytes = bytesA - result.fits * bytesB;
    }
    return result;
  }

  return { toBytesEntry, total, compare };
})();
