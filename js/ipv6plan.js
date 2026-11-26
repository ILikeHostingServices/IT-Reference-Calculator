/* js/ipv6plan.js v1.2.0 (Last Rev: 2026-11-25) */
/* IPv6plan.js - IPv6 planning on top of Calc.IPv6: split a prefix into smaller ones, build an address from a
   /64 prefix plus a MAC (EUI-64), check whether an address is in a prefix, and make a ULA prefix. BigInt throughout. */
window.Calc = window.Calc || {};

Calc.IPv6Plan = (function () {
  "use strict";

  const V6 = Calc.IPv6;

  // Split network/prefix into /newPrefix subnets. Lists up to `limit` starting at subnet number `from`
  // (1 = the first), plus the last one, since a /48 holds 65,536 /64s. Each entry carries its number
  // and its subnet ID in hex (the bits between the two prefix lengths).
  function split(networkText, prefix, newPrefix, limit = 16, from = 1) {
    if (!Number.isInteger(newPrefix) || newPrefix <= prefix || newPrefix > 128) {
      throw new Error("The new prefix must be longer (bigger number) than the current one, up to /128");
    }
    const base = V6.parseIp(networkText) & V6.prefixToMask(prefix);
    const count = 1n << BigInt(newPrefix - prefix);
    const step = 1n << BigInt(128 - newPrefix);
    const start = BigInt(from) - 1n;
    if (start < 0n || start >= count) throw new Error(`Start at a subnet number from 1 to ${count.toLocaleString()}`);
    const end = start + BigInt(limit) < count ? start + BigInt(limit) : count;
    const entry = i => ({ number: i + 1n, id: i.toString(16), cidr: `${V6.compress(base + step * i)}/${newPrefix}` });
    const subnets = [];
    for (let i = start; i < end; i++) subnets.push(entry(i));
    return {
      base: `${V6.compress(base)}/${prefix}`,
      count,
      subnets,
      last: end < count ? entry(count - 1n) : null,
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

  // Is an address inside a prefix? Returns the result plus the prefix's network and last address.
  function inPrefix(addressText, prefixText) {
    const [net, len] = String(prefixText).trim().split("/");
    if (len === undefined) throw new Error("Include the prefix length, for example 2001:db8::/32");
    const p = Number(len), mask = V6.prefixToMask(p), base = V6.parseIp(net) & mask;
    const last = base | ((~mask) & ((1n << 128n) - 1n));
    return { inside: (V6.parseIp(addressText) & mask) === base, network: `${V6.compress(base)}/${p}`, last: V6.compress(last), aligned: V6.parseIp(net) === base };
  }

  // RFC 4193 unique local /48: fd00::/8 plus a random 40-bit global ID (5 bytes from the caller,
  // so the browser's crypto.getRandomValues supplies them and tests can pass fixed bytes).
  function ulaPrefix(bytes) {
    if (!bytes || bytes.length !== 5) throw new Error("A ULA global ID is 5 random bytes");
    const hex = [0xfd, ...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
    const p = `${hex.slice(0, 4)}:${hex.slice(4, 8)}:${hex.slice(8, 12)}`;
    return { prefix: V6.compress(V6.parseIp(`${p}::`)) + "/48", firstSubnet: V6.compress(V6.parseIp(`${p}::`)) + "/64", globalId: hex.slice(2) };
  }

  return { split, eui64Address, inPrefix, ulaPrefix };
})();
