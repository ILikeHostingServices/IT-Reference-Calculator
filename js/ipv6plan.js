/* IPv6plan.js - IPv6 subnet planning on top of Calc.IPv6: split a prefix into smaller ones and
   build an address from a /64 prefix plus a MAC (EUI-64). BigInt throughout. */
window.Calc = window.Calc || {};

Calc.IPv6Plan = (function () {
  "use strict";

  const V6 = Calc.IPv6;

  // Split network/prefix into /newPrefix subnets. Lists up to `limit` from the start (and the
  // last one), since a /48 holds 65,536 /64s.
  function split(networkText, prefix, newPrefix, limit = 16) {
    if (!Number.isInteger(newPrefix) || newPrefix <= prefix || newPrefix > 128) {
      throw new Error("The new prefix must be longer (bigger number) than the current one, up to /128");
    }
    const base = V6.parseIp(networkText) & V6.prefixToMask(prefix);
    const count = 1n << BigInt(newPrefix - prefix);
    const step = 1n << BigInt(128 - newPrefix);
    const shown = count < BigInt(limit) ? Number(count) : limit;
    const subnets = [];
    for (let i = 0; i < shown; i++) subnets.push(`${V6.compress(base + step * BigInt(i))}/${newPrefix}`);
    const last = `${V6.compress(base + step * (count - 1n))}/${newPrefix}`;
    return {
      base: `${V6.compress(base)}/${prefix}`,
      count,
      subnets,
      last: count > BigInt(shown) ? last : null,
      nibbleAligned: (newPrefix - prefix) % 4 === 0,
      perSubnet: step,
    };
  }

  // Combine the first 64 bits of a /64 prefix with a MAC-derived EUI-64 interface ID.
  function eui64Address(prefixText, macText) {
    const net = V6.parseIp(prefixText) & V6.prefixToMask(64);
    const iid = Calc.MAC.eui64(Calc.MAC.parse(macText));
    const iidValue = V6.parseIp(`::${iid}`);
    const addr = net | iidValue;
    return { interfaceId: iid, address: V6.compress(addr), expanded: V6.expand(addr), linkLocal: V6.compress(V6.parseIp("fe80::") | iidValue) };
  }

  return { split, eui64Address };
})();
