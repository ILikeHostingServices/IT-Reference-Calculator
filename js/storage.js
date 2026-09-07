/* Storage.js - arithmetic across storage/RAM sizes expressed in different units.
   Operates on plain byte counts (Number); unit conversion is handled by Calc.Units. */
window.Calc = window.Calc || {};

Calc.Storage = (function () {
  "use strict";

  function toBytesEntry(amount, unit) {
    if (!isFinite(amount)) throw new Error("Amount must be a finite number");
    return Calc.Units.toBytes(amount, unit);
  }

  // Apply a binary operator to two byte counts. Division/multiplication by a
  // plain scalar factor is also supported (pass factor as bytesB with isScalar=true).
  function apply(operator, bytesA, bytesB, isScalarB) {
    switch (operator) {
      case "+": return bytesA + bytesB;
      case "-": return bytesA - bytesB;
      case "*": return isScalarB ? bytesA * bytesB : bytesA * bytesB; // size*size is unusual but not blocked
      case "/":
        if (bytesB === 0) throw new Error("Cannot divide by zero");
        return bytesA / bytesB;
      default:
        throw new Error(`Unknown operator "${operator}"`);
    }
  }

  // Reduce a list of {amount, unit, operator} steps into a running total in bytes.
  // The first entry's operator is ignored (it seeds the total).
  function reduceSteps(steps) {
    if (!steps.length) return 0;
    let total = toBytesEntry(steps[0].amount, steps[0].unit);
    for (let i = 1; i < steps.length; i++) {
      const stepBytes = toBytesEntry(steps[i].amount, steps[i].unit);
      total = apply(steps[i].operator, total, stepBytes);
    }
    return total;
  }

  return { toBytesEntry, apply, reduceSteps };
})();
