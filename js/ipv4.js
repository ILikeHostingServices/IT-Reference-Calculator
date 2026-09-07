/* IPv4.js - IPv4 address / subnet math. Plain 32-bit integers (fits safely in Number). */
window.Calc = window.Calc || {};

Calc.IPv4 = (function () {
  "use strict";

  function parseIp(ip) {
    const parts = String(ip).trim().split(".");
    if (parts.length !== 4) throw new Error("IPv4 address must have 4 octets");
    const octets = parts.map(p => {
      if (!/^\d{1,3}$/.test(p)) throw new Error(`Invalid octet "${p}"`);
      const n = Number(p);
      if (n < 0 || n > 255) throw new Error(`Octet "${p}" out of range (0-255)`);
      return n;
    });
    return octets;
  }

  function octetsToUint32(octets) {
    return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
  }

  function uint32ToOctets(n) {
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  }

  function uint32ToIp(n) {
    return uint32ToOctets(n).join(".");
  }

  function ipToUint32(ip) {
    return octetsToUint32(parseIp(ip));
  }

  function prefixToMaskUint32(prefix) {
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
      throw new Error("Prefix must be an integer between 0 and 32");
    }
    if (prefix === 0) return 0;
    return (0xFFFFFFFF << (32 - prefix)) >>> 0;
  }

  function maskUint32ToPrefix(maskInt) {
    let prefix = 0;
    let n = maskInt >>> 0;
    for (let i = 31; i >= 0; i--) {
      if ((n & (1 << i)) !== 0) prefix++;
      else break;
    }
    // Validate the mask is contiguous ones followed by zeros.
    const rebuilt = prefixToMaskUint32(prefix);
    if (rebuilt !== n) throw new Error("Netmask is not a valid contiguous mask");
    return prefix;
  }

  function isPrivate(octets) {
    const [a, b] = octets;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local
    return false;
  }

  function classify(a) {
    if (a >= 1 && a <= 126) return "A";
    if (a === 127) return "A (loopback)";
    if (a >= 128 && a <= 191) return "B";
    if (a >= 192 && a <= 223) return "C";
    if (a >= 224 && a <= 239) return "D (multicast)";
    if (a >= 240 && a <= 255) return "E (reserved)";
    return "unknown";
  }

  // Full subnet report for an IP + prefix.
  function subnetInfo(ip, prefix) {
    const octets = parseIp(ip);
    const ipInt = octetsToUint32(octets);
    const maskInt = prefixToMaskUint32(prefix);
    const wildcardInt = (~maskInt) >>> 0;
    const networkInt = (ipInt & maskInt) >>> 0;
    const broadcastInt = (networkInt | wildcardInt) >>> 0;

    const totalAddresses = Math.pow(2, 32 - prefix);
    let usableHosts, firstHost, lastHost;

    if (prefix >= 31) {
      // /31 (point-to-point, RFC 3021) and /32 (single host) have no traditional broadcast.
      usableHosts = prefix === 32 ? 1 : 2;
      firstHost = networkInt;
      lastHost = broadcastInt;
    } else {
      usableHosts = totalAddresses - 2;
      firstHost = (networkInt + 1) >>> 0;
      lastHost = (broadcastInt - 1) >>> 0;
    }

    return {
      ip: ip,
      prefix,
      netmask: uint32ToIp(maskInt),
      wildcardMask: uint32ToIp(wildcardInt),
      network: uint32ToIp(networkInt),
      broadcast: uint32ToIp(broadcastInt),
      firstHost: uint32ToIp(firstHost),
      lastHost: uint32ToIp(lastHost),
      totalAddresses,
      usableHosts,
      ipClass: classify(octets[0]),
      isPrivate: isPrivate(octets),
    };
  }

  return {
    parseIp,
    octetsToUint32,
    uint32ToOctets,
    uint32ToIp,
    ipToUint32,
    prefixToMaskUint32,
    maskUint32ToPrefix,
    isPrivate,
    classify,
    subnetInfo,
  };
})();
