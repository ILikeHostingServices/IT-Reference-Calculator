/* IPv6.js - IPv6 address / subnet math using BigInt (128-bit addresses exceed safe Number range). */
window.Calc = window.Calc || {};

Calc.IPv6 = (function () {
  "use strict";

  const BITS = 128n;
  const MAX_ADDR = (1n << BITS) - 1n;

  // Parse an IPv6 string (with optional "::" compression and optional "/prefix")
  // into a BigInt. Does not support embedded IPv4 (e.g. ::ffff:192.0.2.1) tails.
  function parseIp(input) {
    let addr = String(input).trim();
    if (addr.includes("/")) addr = addr.split("/")[0];
    if (addr === "") throw new Error("Empty IPv6 address");

    const doubleColonCount = (addr.match(/::/g) || []).length;
    if (doubleColonCount > 1) throw new Error('IPv6 address may contain only one "::"');

    let head, tail;
    if (addr.includes("::")) {
      const [h, t] = addr.split("::");
      head = h.length ? h.split(":") : [];
      tail = t.length ? t.split(":") : [];
    } else {
      head = addr.split(":");
      tail = [];
    }

    const totalGiven = head.length + tail.length;
    if (totalGiven > 8) throw new Error("Too many groups in IPv6 address");
    if (!addr.includes("::") && totalGiven !== 8) {
      throw new Error("IPv6 address must have 8 groups, or use :: to compress zeros");
    }

    const missing = 8 - totalGiven;
    const middle = addr.includes("::") ? new Array(missing).fill("0") : [];
    const groups = [...head, ...middle, ...tail];

    if (groups.length !== 8) throw new Error("Invalid IPv6 address structure");

    let value = 0n;
    for (const g of groups) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(g)) throw new Error(`Invalid group "${g}"`);
      value = (value << 16n) | BigInt(parseInt(g, 16));
    }
    return value;
  }

  function toGroups(value) {
    let v = value;
    const groups = [];
    for (let i = 0; i < 8; i++) {
      groups.unshift((v & 0xFFFFn).toString(16));
      v >>= 16n;
    }
    return groups;
  }

  // Full, non-compressed, zero-padded form.
  function expand(value) {
    return toGroups(value).map(g => g.padStart(4, "0")).join(":");
  }

  // Standard compressed form (lowercase, longest run of zero groups collapsed to "::").
  function compress(value) {
    const groups = toGroups(value); // no leading zero padding

    let bestStart = -1, bestLen = 0;
    let curStart = -1, curLen = 0;
    for (let i = 0; i < groups.length; i++) {
      if (groups[i] === "0") {
        if (curStart === -1) curStart = i;
        curLen++;
        if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
      } else {
        curStart = -1; curLen = 0;
      }
    }

    if (bestLen < 2) return groups.join(":"); // no run worth compressing

    const before = groups.slice(0, bestStart);
    const after = groups.slice(bestStart + bestLen);
    return `${before.join(":")}::${after.join(":")}`;
  }

  function prefixToMask(prefix) {
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 128) {
      throw new Error("Prefix must be an integer between 0 and 128");
    }
    if (prefix === 0) return 0n;
    return (MAX_ADDR << BigInt(128 - prefix)) & MAX_ADDR;
  }

  function subnetInfo(ip, prefix) {
    const addr = parseIp(ip);
    const mask = prefixToMask(prefix);
    const wildcard = (~mask) & MAX_ADDR;
    const network = addr & mask;
    const lastAddr = network | wildcard;

    const totalAddresses = 1n << BigInt(128 - prefix);

    return {
      ip,
      prefix,
      expanded: expand(addr),
      compressed: compress(addr),
      network: compress(network),
      networkExpanded: expand(network),
      lastAddress: compress(lastAddr),
      lastAddressExpanded: expand(lastAddr),
      totalAddresses, // BigInt - format with .toLocaleString() or similar for display
      totalAddressesStr: totalAddresses.toString(),
    };
  }

  return {
    parseIp,
    expand,
    compress,
    prefixToMask,
    subnetInfo,
    MAX_ADDR,
  };
})();
