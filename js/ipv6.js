/* js/ipv6.js v1.1.0 (Last Rev: 2026-11-25) */
/* IPv6.js - IPv6 address / subnet math using BigInt (128-bit addresses exceed safe Number range). */
window.Calc = window.Calc || {};

Calc.IPv6 = (function () {
  "use strict";

  const BITS = 128n;
  const MAX_ADDR = (1n << BITS) - 1n;

  // Parse an IPv6 string into a BigInt. Accepts "::" compression, an optional "/prefix", a zone ID
  // (fe80::1%eth0, dropped), square brackets ([2001:db8::1]), and a dotted IPv4 tail (::ffff:192.0.2.1).
  function parseIp(input) {
    let addr = String(input).trim().replace(/^\[(.*)\]$/, "$1");
    if (addr.includes("/")) addr = addr.split("/")[0];
    addr = addr.split("%")[0];
    if (addr === "") throw new Error("Empty IPv6 address");
    const v4 = addr.match(/^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (v4) {
      const o = v4[2].split(".").map(Number);
      if (o.some(n => n > 255)) throw new Error(`Invalid IPv4 part "${v4[2]}"`);
      addr = `${v4[1]}${((o[0] << 8) | o[1]).toString(16)}:${((o[2] << 8) | o[3]).toString(16)}`;
    }

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

  const v4Text = n => [24n, 16n, 8n, 0n].map(s => Number((n >> s) & 0xFFn)).join(".");

  // Special-purpose ranges (IANA IPv6 Special-Purpose Address Registry), most specific first.
  // v4: where an embedded IPv4 address sits ("low" = last 32 bits, "6to4" = bits 16 to 47).
  const TYPES = [
    ["::", 128, "Unspecified (::)"],
    ["::1", 128, "Loopback (::1)"],
    ["::ffff:0:0", 96, "IPv4-mapped (an IPv4 address seen through a dual-stack socket)", "low"],
    ["64:ff9b::", 96, "NAT64 well-known prefix (RFC 6052)", "low"],
    ["100::", 64, "Discard-only (RFC 6666)"],
    ["64:ff9b:1::", 48, "NAT64 local-use prefix (RFC 8215)"],
    ["2001::", 32, "Teredo tunnel (RFC 4380)"],
    ["2001:db8::", 32, "Documentation (RFC 3849), never routed"],
    ["2001::", 23, "IETF protocol assignment"],
    ["3fff::", 20, "Documentation (RFC 9637), never routed"],
    ["2002::", 16, "6to4 (RFC 3056), deprecated", "6to4"],
    ["fe80::", 10, "Link-local (fe80::/10), never routed"],
    ["fc00::", 7, "Unique local (ULA, fc00::/7), private"],
    ["ff00::", 8, "Multicast"],
    ["2000::", 3, "Global unicast (2000::/3), public"],
  ].map(([p, len, name, v4]) => ({ net: parseIp(p), len, name, v4 }));
  const SCOPES = { 1: "interface-local", 2: "link-local", 4: "admin-local", 5: "site-local", 8: "organization-local", 14: "global" };

  // What kind of address this is, and any IPv4 address carried inside it.
  function addressType(value) {
    const t = TYPES.find(x => (value & prefixToMask(x.len)) === x.net);
    if (!t) return { type: "Reserved by the IETF (not assigned)", embeddedIPv4: null };
    let type = t.name;
    if (t.len === 8) type += `, ${SCOPES[Number((value >> 112n) & 0xFn)] || "reserved"} scope`;
    const embeddedIPv4 = t.v4 === "low" ? v4Text(value & 0xFFFFFFFFn) : t.v4 === "6to4" ? v4Text((value >> 80n) & 0xFFFFFFFFn) : null;
    return { type, embeddedIPv4 };
  }

  // Reverse DNS name: every hex digit, last first, under ip6.arpa.
  function ptrName(value) {
    return `${expand(value).replace(/:/g, "").split("").reverse().join(".")}.ip6.arpa`;
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
      ...addressType(addr),
      ptr: ptrName(addr),
      subnets64: prefix < 64 ? 1n << BigInt(64 - prefix) : null,
      expanded: expand(addr),
      compressed: compress(addr),
      network: compress(network),
      networkExpanded: expand(network),
      lastAddress: compress(lastAddr),
      lastAddressExpanded: expand(lastAddr),
      totalAddresses, // BigInt: format with .toLocaleString() for display
    };
  }

  return {
    parseIp,
    expand,
    compress,
    prefixToMask,
    subnetInfo,
    addressType,
    ptrName,
  };
})();
