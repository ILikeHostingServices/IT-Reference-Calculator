/* js/net.js v1.0.0 (Last Rev: 2026-11-12) */
/* Net.js - IPv4 planning helpers built on Calc.IPv4: CIDR parsing, "is this IP in that subnet",
   range to CIDR blocks, Cisco-style ACL wildcards, VLSM subnet planning, and route summarization.
   Addresses are unsigned 32-bit integers held in Numbers (safe up to 2^53). */
window.Calc = window.Calc || {};

Calc.Net = (function () {
  "use strict";

  const V4 = Calc.IPv4;
  const TWO32 = 4294967296;

  // "10.0.0.0/22" (or a bare address, treated as /32) -> { network, prefix, size, broadcast }.
  function parseCidr(text) {
    const s = String(text).trim();
    if (s === "") throw new Error("Enter a network in CIDR form, for example 10.0.0.0/24");
    const [ipPart, prefixPart] = s.split("/");
    const prefix = prefixPart === undefined ? 32 : Number(prefixPart);
    if (!/^\d{1,2}$/.test(String(prefixPart === undefined ? 32 : prefixPart)) || prefix > 32) {
      throw new Error(`Invalid prefix in "${s}" (use /0 to /32)`);
    }
    const ip = V4.ipToUint32(ipPart);
    const mask = V4.prefixToMaskUint32(prefix);
    const network = (ip & mask) >>> 0;
    const size = 2 ** (32 - prefix);
    return { ip, network, prefix, size, broadcast: network + size - 1, aligned: network === ip };
  }

  function cidrString(network, prefix) {
    return `${V4.uint32ToIp(network)}/${prefix}`;
  }

  function inSubnet(ipText, cidrText) {
    const ip = V4.ipToUint32(ipText);
    const net = parseCidr(cidrText);
    return { inside: ip >= net.network && ip <= net.broadcast, net };
  }

  // Smallest set of CIDR blocks that exactly covers start..end (inclusive).
  function rangeToCidrs(startText, endText) {
    let start = V4.ipToUint32(startText);
    const end = V4.ipToUint32(endText);
    if (start > end) throw new Error("The start address must not be after the end address");
    const out = [];
    while (start <= end) {
      // Largest block aligned at start: limited by the lowest set bit of start...
      let size = start === 0 ? TWO32 : start & -start;
      if (size < 0) size = 2147483648; // & on the top bit yields -2^31
      // ...and by what is left of the range.
      while (size > end - start + 1) size /= 2;
      out.push(cidrString(start, 32 - Math.log2(size)));
      start += size;
    }
    return out;
  }

  // ACL wildcard for a network (inverse mask), e.g. 10.1.0.0/22 -> 10.1.0.0 0.0.3.255.
  function aclWildcard(cidrText) {
    const net = parseCidr(cidrText);
    const wildcard = (~V4.prefixToMaskUint32(net.prefix)) >>> 0;
    return {
      network: V4.uint32ToIp(net.network),
      wildcard: V4.uint32ToIp(wildcard),
      cisco: net.prefix === 32 ? `host ${V4.uint32ToIp(net.network)}` : `${V4.uint32ToIp(net.network)} ${V4.uint32ToIp(wildcard)}`,
    };
  }

  // Smallest prefix whose block holds `hosts` usable addresses (network + broadcast reserved,
  // except /31 point-to-point links and /32 single hosts).
  function prefixForHosts(hosts) {
    if (!Number.isInteger(hosts) || hosts < 1) throw new Error("Each subnet needs at least 1 host");
    if (hosts === 1) return 32;
    if (hosts === 2) return 31;
    for (let p = 30; p >= 0; p--) if (2 ** (32 - p) - 2 >= hosts) return p;
    throw new Error("Too many hosts for IPv4");
  }

  // VLSM: carve `requests` ([{ name, hosts }]) out of a base block, largest first so every
  // subnet stays aligned. Returns allocations in request order plus the free space left.
  function planSubnets(baseText, requests) {
    const base = parseCidr(baseText);
    if (!requests.length) throw new Error("Add at least one subnet to plan");
    const sized = requests.map((r, i) => {
      const prefix = prefixForHosts(r.hosts);
      return { index: i, name: r.name || `Subnet ${i + 1}`, hosts: r.hosts, prefix, size: 2 ** (32 - prefix) };
    });
    const order = [...sized].sort((a, b) => b.size - a.size || a.index - b.index);
    let cursor = base.network;
    for (const s of order) {
      if (cursor + s.size - 1 > base.broadcast) {
        throw new Error(`Not enough space in ${cidrString(base.network, base.prefix)} for "${s.name}" (${s.hosts} hosts). Use a bigger block or fewer hosts.`);
      }
      s.network = cursor;
      cursor += s.size;
    }
    const allocations = sized.map(s => {
      const usable = s.prefix >= 31 ? s.size : s.size - 2;
      const first = s.prefix >= 31 ? s.network : s.network + 1;
      const last = s.prefix >= 31 ? s.network + s.size - 1 : s.network + s.size - 2;
      return {
        name: s.name,
        hosts: s.hosts,
        cidr: cidrString(s.network, s.prefix),
        netmask: V4.uint32ToIp(V4.prefixToMaskUint32(s.prefix)),
        range: `${V4.uint32ToIp(first)} - ${V4.uint32ToIp(last)}`,
        broadcast: s.prefix >= 31 ? "n/a" : V4.uint32ToIp(s.network + s.size - 1),
        usable,
        spare: usable - s.hosts,
      };
    });
    const free = cursor <= base.broadcast ? rangeToCidrs(V4.uint32ToIp(cursor), V4.uint32ToIp(base.broadcast)) : [];
    const used = cursor - base.network;
    return { base: cidrString(base.network, base.prefix), allocations, free, used, total: base.size };
  }

  // Merge networks into the fewest covering blocks without adding any address not in the
  // input (exact), plus the single smallest supernet that covers them all (may over-cover).
  function summarize(cidrTexts) {
    const nets = cidrTexts.map(parseCidr).map(n => [n.network, n.broadcast]);
    if (!nets.length) throw new Error("Enter at least one network");
    nets.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const [s, e] of nets) {
      const last = merged[merged.length - 1];
      if (last && s <= last[1] + 1) last[1] = Math.max(last[1], e);
      else merged.push([s, e]);
    }
    const exact = merged.flatMap(([s, e]) => rangeToCidrs(V4.uint32ToIp(s), V4.uint32ToIp(e)));
    const lo = merged[0][0];
    const hi = merged[merged.length - 1][1];
    let prefix = 32;
    while (prefix > 0) {
      const mask = V4.prefixToMaskUint32(prefix);
      if (((lo & mask) >>> 0) === ((hi & mask) >>> 0)) break;
      prefix--;
    }
    const mask = V4.prefixToMaskUint32(prefix);
    const superNet = (lo & mask) >>> 0;
    const superSize = 2 ** (32 - prefix);
    const covered = merged.reduce((n, [s, e]) => n + (e - s + 1), 0);
    return { exact, supernet: cidrString(superNet, prefix), extraAddresses: superSize - covered };
  }

  return { parseCidr, cidrString, inSubnet, rangeToCidrs, aclWildcard, prefixForHosts, planSubnets, summarize };
})();
