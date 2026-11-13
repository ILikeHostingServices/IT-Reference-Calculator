/* js/emailauth.js v1.0.0 (Last Rev: 2026-11-12) */
/* Emailauth.js - check and build SPF, DKIM, and DMARC records. Checks take a resolver function
   (name -> Promise<array of TXT strings>) so they can run against live DNS (Calc.DNS.txt) or test data. */
window.Calc = window.Calc || {};

Calc.EmailAuth = (function () {
  "use strict";

  const LOOKUP_MECHS = new Set(["include", "a", "mx", "ptr", "exists", "redirect"]);
  const COMMON_SELECTORS = ["selector1", "selector2", "google", "default", "k1", "k2", "s1", "s2", "dkim", "mail", "smtp", "mxvault", "everlytickey1", "zoho", "protonmail", "mandrill", "pm", "sig1"];

  // Split an SPF record into terms: [{ qualifier, mech, value }].
  function parseSpf(record) {
    const terms = record.trim().split(/\s+/);
    if (!/^v=spf1$/i.test(terms[0])) throw new Error("Not an SPF record (must start with v=spf1)");
    return terms.slice(1).map(t => {
      const m = t.match(/^([+\-~?]?)([a-z0-9_.-]+)(?:[:=](.*))?$/i);
      if (!m) return { raw: t, mech: "invalid" };
      return { raw: t, qualifier: m[1] || "+", mech: m[2].toLowerCase(), value: m[3] || "" };
    });
  }

  // Walk SPF includes/redirects and count DNS lookups toward the RFC 7208 limit of 10.
  async function checkSpf(domain, resolveTxt, depth = 0, seen = new Set()) {
    const out = { domain, record: null, lookups: 0, includes: [], issues: [], terms: [], all: null };
    if (depth > 10) { out.issues.push({ level: "error", text: "Includes nest more than 10 deep" }); return out; }
    if (seen.has(domain)) { out.issues.push({ level: "error", text: `Include loop back to ${domain}` }); return out; }
    seen.add(domain);
    const records = (await resolveTxt(domain)).filter(r => /^v=spf1(\s|$)/i.test(r));
    if (records.length === 0) {
      out.issues.push({ level: depth === 0 ? "error" : "error", text: depth === 0 ? "No SPF record found" : `Included domain ${domain} has no SPF record (a "permerror" for receivers)` });
      return out;
    }
    if (records.length > 1) out.issues.push({ level: "error", text: `${records.length} SPF records found; there must be exactly one (receivers treat this as a permerror)` });
    out.record = records[0];
    if (out.record.length > 450) out.issues.push({ level: "warn", text: `Record is ${out.record.length} characters; long records risk DNS truncation` });
    out.terms = parseSpf(out.record);
    for (const t of out.terms) {
      if (t.mech === "invalid") out.issues.push({ level: "error", text: `Cannot read term "${t.raw}"` });
      if (LOOKUP_MECHS.has(t.mech)) out.lookups++;
      if (t.mech === "ptr") out.issues.push({ level: "warn", text: "ptr is deprecated and slow; remove it" });
      if (t.mech === "all") out.all = t.qualifier;
      if ((t.mech === "include" || t.mech === "redirect") && t.value) {
        const child = await checkSpf(t.value.toLowerCase(), resolveTxt, depth + 1, seen);
        out.includes.push(child);
        out.lookups += child.lookups;
        child.issues.filter(i => i.level === "error").forEach(i => out.issues.push(i));
      }
    }
    if (depth === 0) {
      if (out.lookups > 10) out.issues.push({ level: "error", text: `${out.lookups} DNS lookups; the limit is 10, so receivers return permerror and SPF fails. Flatten or remove includes.` });
      else if (out.lookups >= 8) out.issues.push({ level: "warn", text: `${out.lookups} of 10 DNS lookups used; little room left for new senders` });
      const hasRedirect = out.terms.some(t => t.mech === "redirect");
      if (out.all === "+") out.issues.push({ level: "error", text: "+all lets anyone on the internet send as this domain" });
      else if (out.all === "?") out.issues.push({ level: "warn", text: "?all (neutral) gives no protection" });
      else if (out.all === "~") out.issues.push({ level: "info", text: "~all (softfail): fine while DMARC enforces; -all is stricter" });
      else if (out.all === null && !hasRedirect) out.issues.push({ level: "warn", text: "No all mechanism; unlisted senders get a neutral result" });
    }
    return out;
  }

  const DMARC_TAGS = {
    v: "Version",
    p: "Policy for the domain",
    sp: "Policy for subdomains",
    pct: "Percent of failing mail the policy applies to",
    rua: "Aggregate report address",
    ruf: "Forensic (failure) report address",
    adkim: "DKIM alignment (r = relaxed, s = strict)",
    aspf: "SPF alignment (r = relaxed, s = strict)",
    fo: "Failure report options",
    ri: "Report interval (seconds)",
  };

  function parseTags(record) {
    const tags = {};
    record.split(";").map(s => s.trim()).filter(Boolean).forEach(pair => {
      const i = pair.indexOf("=");
      if (i > 0) tags[pair.slice(0, i).trim().toLowerCase()] = pair.slice(i + 1).trim();
    });
    return tags;
  }

  async function checkDmarc(domain, resolveTxt) {
    const out = { domain, record: null, tags: {}, issues: [], foundAt: null };
    let records = (await resolveTxt(`_dmarc.${domain}`)).filter(r => /^v=DMARC1/i.test(r));
    out.foundAt = `_dmarc.${domain}`;
    // Subdomains inherit the organizational domain's policy (approximated as the last two labels).
    const labels = domain.split(".");
    if (!records.length && labels.length > 2) {
      const org = labels.slice(-2).join(".");
      records = (await resolveTxt(`_dmarc.${org}`)).filter(r => /^v=DMARC1/i.test(r));
      if (records.length) {
        out.foundAt = `_dmarc.${org}`;
        out.issues.push({ level: "info", text: `No record on ${domain}; the parent domain's policy (sp= or p=) applies` });
      }
    }
    if (!records.length) {
      out.issues.push({ level: "error", text: "No DMARC record. Anyone can spoof this domain in the From line, and Google and Yahoo require DMARC for bulk senders." });
      return out;
    }
    if (records.length > 1) out.issues.push({ level: "error", text: "More than one DMARC record; receivers ignore them all" });
    out.record = records[0];
    out.tags = parseTags(out.record);
    const p = (out.tags.p || "").toLowerCase();
    if (!["none", "quarantine", "reject"].includes(p)) out.issues.push({ level: "error", text: "Missing or invalid p= tag" });
    else if (p === "none") out.issues.push({ level: "warn", text: "p=none only monitors; spoofed mail is still delivered. Move to quarantine, then reject, once reports look clean." });
    else if (p === "reject") out.issues.push({ level: "ok", text: "p=reject: spoofed mail is refused" });
    else out.issues.push({ level: "ok", text: "p=quarantine: spoofed mail goes to spam" });
    if (out.tags.pct && Number(out.tags.pct) < 100) out.issues.push({ level: "warn", text: `pct=${out.tags.pct}: the policy covers only part of failing mail` });
    if (!out.tags.rua) out.issues.push({ level: "warn", text: "No rua= report address, so you cannot see who sends as your domain" });
    return out;
  }

  // Estimate RSA key size from the base64 p= value (DER SubjectPublicKeyInfo length).
  function dkimKeyBits(p) {
    const len = Math.floor(p.replace(/\s/g, "").length * 3 / 4);
    if (len === 0) return 0;
    if (len < 100) return 512;
    if (len < 180) return 1024;
    if (len < 310) return 2048;
    if (len < 450) return 3072;
    return 4096;
  }

  async function checkDkim(domain, selectors, resolveTxt) {
    const results = [];
    for (const sel of selectors) {
      const name = `${sel}._domainkey.${domain}`;
      const records = (await resolveTxt(name)).filter(r => /(^|;)\s*(v=DKIM1|k=|p=)/i.test(r));
      if (!records.length) continue;
      const tags = parseTags(records[0]);
      const issues = [];
      const p = tags.p === undefined ? null : tags.p;
      let bits = null;
      if (p === null) issues.push({ level: "error", text: "No p= public key" });
      else if (p === "") issues.push({ level: "warn", text: "Empty p=: this key has been revoked" });
      else if ((tags.k || "rsa").toLowerCase() === "rsa") {
        bits = dkimKeyBits(p);
        if (bits < 1024) issues.push({ level: "error", text: `About ${bits}-bit key: too weak, many receivers reject it` });
        else if (bits === 1024) issues.push({ level: "warn", text: "1024-bit key: still accepted, but rotate to 2048-bit" });
        else issues.push({ level: "ok", text: `About ${bits}-bit RSA key` });
      }
      results.push({ selector: sel, name, record: records[0], tags, bits, issues });
    }
    return results;
  }

  // Builders produce record text from simple options.
  function buildSpf({ mx, a, includes, ip4, ip6, all }) {
    const parts = ["v=spf1"];
    if (mx) parts.push("mx");
    if (a) parts.push("a");
    (ip4 || []).forEach(x => parts.push(`ip4:${x}`));
    (ip6 || []).forEach(x => parts.push(`ip6:${x}`));
    (includes || []).forEach(x => parts.push(`include:${x}`));
    parts.push(`${all || "-"}all`);
    const record = parts.join(" ");
    const lookups = (mx ? 1 : 0) + (a ? 1 : 0) + (includes || []).length;
    return { record, directLookups: lookups };
  }

  function buildDmarc({ p, sp, pct, rua, ruf, adkim, aspf }) {
    const parts = ["v=DMARC1", `p=${p}`];
    if (sp && sp !== p) parts.push(`sp=${sp}`);
    if (pct !== undefined && pct !== "" && Number(pct) !== 100) parts.push(`pct=${pct}`);
    if (rua) parts.push(`rua=${rua.split(/[\s,]+/).filter(Boolean).map(x => (x.startsWith("mailto:") ? x : `mailto:${x}`)).join(",")}`);
    if (ruf) parts.push(`ruf=${ruf.split(/[\s,]+/).filter(Boolean).map(x => (x.startsWith("mailto:") ? x : `mailto:${x}`)).join(",")}`, "fo=1");
    if (adkim === "s") parts.push("adkim=s");
    if (aspf === "s") parts.push("aspf=s");
    return parts.join("; ");
  }

  return { COMMON_SELECTORS, DMARC_TAGS, parseSpf, checkSpf, parseTags, checkDmarc, dkimKeyBits, checkDkim, buildSpf, buildDmarc };
})();
