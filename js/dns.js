/* js/dns.js v1.0.0 (Last Rev: 2026-11-12) */
/* DNS.js - DNS lookups from the browser over DNS-over-HTTPS (JSON API). Queries go to Cloudflare's
   public resolver, falling back to Google's if Cloudflare cannot be reached. This is the only part
   of the site that sends anything off the page: the name being looked up and the record type. */
window.Calc = window.Calc || {};

Calc.DNS = (function () {
  "use strict";

  const RESOLVERS = [
    { name: "Cloudflare (1.1.1.1)", url: "https://cloudflare-dns.com/dns-query" },
    { name: "Google (8.8.8.8)", url: "https://dns.google/resolve" },
  ];
  const TYPES = { 1: "A", 2: "NS", 5: "CNAME", 6: "SOA", 12: "PTR", 15: "MX", 16: "TXT", 28: "AAAA", 33: "SRV", 43: "DS", 48: "DNSKEY", 65: "HTTPS", 257: "CAA" };
  const STATUS = { 0: "NOERROR", 1: "FORMERR", 2: "SERVFAIL", 3: "NXDOMAIN (name does not exist)", 4: "NOTIMP", 5: "REFUSED" };
  const LOOKUP_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA", "CAA", "SRV", "PTR", "HTTPS", "DS"];

  function normalizeName(text) {
    let s = String(text).trim().toLowerCase();
    s = s.replace(/^[a-z]+:\/\//, "").replace(/[/?#].*$/, "").replace(/\.$/, "");
    if (!s) throw new Error("Enter a domain name, for example example.com");
    if (!/^[a-z0-9_]([a-z0-9_-]{0,62}\.)*[a-z0-9_-]{1,63}$/.test(s) && !/^[\d.]+$/.test(s) && !s.includes(":")) {
      throw new Error(`"${text}" is not a valid domain name`);
    }
    return s;
  }

  // An IPv4 or IPv6 address -> its reverse-lookup (PTR) name.
  function reverseName(ip) {
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return ip.split(".").reverse().join(".") + ".in-addr.arpa";
    if (ip.includes(":")) {
      const hex = Calc.IPv6.expand(Calc.IPv6.parseIp(ip)).replace(/:/g, "");
      return hex.split("").reverse().join(".") + ".ip6.arpa";
    }
    return null;
  }

  // TXT data arrives as one or more quoted strings; join them the way receivers do.
  function joinTxt(data) {
    const pieces = data.match(/"((?:[^"\\]|\\.)*)"/g);
    if (!pieces) return data;
    return pieces.map(p => p.slice(1, -1).replace(/\\(.)/g, "$1")).join("");
  }

  async function query(name, type = "A", { signal } = {}) {
    let lastError;
    for (const r of RESOLVERS) {
      try {
        const url = `${r.url}?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
        const res = await fetch(url, { headers: { accept: "application/dns-json" }, signal, cache: "no-store" });
        if (!res.ok) throw new Error(`${r.name} answered HTTP ${res.status}`);
        const json = await res.json();
        const answers = (json.Answer || []).map(a => ({
          name: a.name.replace(/\.$/, ""),
          type: TYPES[a.type] || String(a.type),
          ttl: a.TTL,
          data: a.type === 16 ? joinTxt(a.data) : a.data,
        }));
        return { status: json.Status, statusText: STATUS[json.Status] || String(json.Status), dnssec: !!json.AD, answers, resolver: r.name };
      } catch (e) {
        if (e.name === "AbortError") throw e;
        lastError = e;
      }
    }
    throw new Error(`DNS lookup failed. Check your connection, or a firewall or ad blocker may be blocking DNS over HTTPS. (${lastError && lastError.message})`);
  }

  // TXT records of `type` only (drops CNAME hops in the answer chain).
  async function txt(name, opts) {
    const r = await query(name, "TXT", opts);
    return r.answers.filter(a => a.type === "TXT").map(a => a.data);
  }

  return { RESOLVERS, LOOKUP_TYPES, normalizeName, reverseName, joinTxt, query, txt };
})();
