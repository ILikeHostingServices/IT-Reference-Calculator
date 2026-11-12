/* MAC.js - MAC address parsing and formatting, address-type bits, and IPv6 EUI-64 interface IDs. */
window.Calc = window.Calc || {};

Calc.MAC = (function () {
  "use strict";

  // Accepts 00:1A:2B:3C:4D:5E, 00-1a-2b-3c-4d-5e, 001a.2b3c.4d5e, or 001A2B3C4D5E.
  function parse(text) {
    const hex = String(text).trim().replace(/[\s:.\-]/g, "");
    if (!/^[0-9a-fA-F]{12}$/.test(hex)) throw new Error("A MAC address has 12 hex digits, for example 00:1A:2B:3C:4D:5E");
    return hex.toLowerCase().match(/../g).map(b => parseInt(b, 16));
  }

  const hex2 = b => b.toString(16).padStart(2, "0");

  function formats(bytes) {
    const h = bytes.map(hex2);
    const flat = h.join("");
    return {
      colon: h.join(":").toUpperCase(),
      colonLower: h.join(":"),
      dash: h.join("-").toUpperCase(),
      cisco: `${flat.slice(0, 4)}.${flat.slice(4, 8)}.${flat.slice(8)}`,
      bare: flat.toUpperCase(),
    };
  }

  // Bit 0 of the first byte: group (multicast) vs individual; bit 1: locally administered vs universal.
  function describe(bytes) {
    const multicast = (bytes[0] & 1) === 1;
    const local = (bytes[0] & 2) === 2;
    const broadcast = bytes.every(b => b === 255);
    return {
      broadcast,
      multicast,
      local,
      oui: bytes.slice(0, 3).map(hex2).join(":").toUpperCase(),
      kind: broadcast ? "Broadcast" : multicast ? "Multicast (group)" : "Unicast (single device)",
      admin: local
        ? "Locally administered (set by software: VMs, containers, or randomized Wi-Fi/privacy MACs)"
        : "Universally administered (burned in by the manufacturer; the first half identifies the vendor)",
    };
  }

  // Modified EUI-64: insert FFFE in the middle and flip the universal/local bit.
  function eui64(bytes) {
    const b = [bytes[0] ^ 2, bytes[1], bytes[2], 0xff, 0xfe, bytes[3], bytes[4], bytes[5]];
    const groups = [];
    for (let i = 0; i < 8; i += 2) groups.push(((b[i] << 8) | b[i + 1]).toString(16));
    return groups.join(":");
  }

  return { parse, formats, describe, eui64 };
})();
