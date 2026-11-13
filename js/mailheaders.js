/* js/mailheaders.js v1.0.0 (Last Rev: 2026-11-13) */
/* Mailheaders.js - parse raw email headers: the hop-by-hop Received path with delays, the
   authentication results (SPF, DKIM, DMARC), and common phishing red flags. Runs locally. */
window.Calc = window.Calc || {};

Calc.MailHeaders = (function () {
  "use strict";

  // Unfold continuation lines and split into [{ name, value }] in original order.
  function parse(raw) {
    const text = String(raw).replace(/\r\n?/g, "\n");
    const headerPart = text.split(/\n\s*\n/)[0];
    const lines = headerPart.split("\n");
    const headers = [];
    for (const line of lines) {
      if (/^[ \t]/.test(line) && headers.length) headers[headers.length - 1].value += " " + line.trim();
      else {
        const i = line.indexOf(":");
        if (i > 0 && /^[!-9;-~]+$/.test(line.slice(0, i))) headers.push({ name: line.slice(0, i).trim(), value: line.slice(i + 1).trim() });
      }
    }
    if (!headers.length) throw new Error("No headers found. Paste the full header block (in Outlook: File > Properties > Internet headers; in Gmail: Show original).");
    return headers;
  }

  const get = (headers, name) => headers.filter(h => h.name.toLowerCase() === name.toLowerCase()).map(h => h.value);
  const first = (headers, name) => get(headers, name)[0] || "";

  function domainOf(addr) {
    const m = String(addr).match(/@([a-z0-9.-]+)/i);
    return m ? m[1].toLowerCase().replace(/\.$/, "") : "";
  }

  // Received: from X (...) by Y (...) with Z ...; <date>
  function parseReceived(value) {
    const semi = value.lastIndexOf(";");
    const dateText = semi >= 0 ? value.slice(semi + 1).trim() : "";
    const body = semi >= 0 ? value.slice(0, semi) : value;
    const from = (body.match(/\bfrom\s+(\S+)(\s+\(([^)]*)\))?/i) || []);
    const by = (body.match(/\bby\s+(\S+)/i) || [])[1] || "";
    const withProto = (body.match(/\bwith\s+(\S+)/i) || [])[1] || "";
    const ip = (value.match(/\[((?:\d{1,3}\.){3}\d{1,3}|[0-9a-f:]+:[0-9a-f:]+)\]/i) || [])[1] || "";
    const ms = Date.parse(dateText.replace(/\s*\([^)]*\)\s*$/, ""));
    return { from: from[1] || "", fromDetail: from[3] || "", by, with: withProto, ip, date: isNaN(ms) ? null : ms, raw: value };
  }

  // Pull spf=, dkim=, dmarc= results out of Authentication-Results (and ARC) headers.
  function authResults(headers) {
    const all = [...get(headers, "Authentication-Results"), ...get(headers, "ARC-Authentication-Results")].join(" ; ");
    const pick = (key) => {
      const m = all.match(new RegExp(`\\b${key}=([a-z]+)`, "i"));
      return m ? m[1].toLowerCase() : null;
    };
    return { spf: pick("spf"), dkim: pick("dkim"), dmarc: pick("dmarc"), compauth: pick("compauth") };
  }

  function analyze(raw) {
    const headers = parse(raw);
    // Received headers are newest first; reverse into the order the message travelled.
    const hops = get(headers, "Received").map(parseReceived).reverse();
    let prev = null;
    hops.forEach((h, i) => {
      h.index = i + 1;
      h.delayMs = prev !== null && h.date !== null ? h.date - prev : null;
      if (h.date !== null) prev = h.date;
    });
    const from = first(headers, "From");
    const replyTo = first(headers, "Reply-To");
    const returnPath = first(headers, "Return-Path");
    const auth = authResults(headers);
    const flags = [];
    const fromDomain = domainOf(from);
    if (replyTo && domainOf(replyTo) && domainOf(replyTo) !== fromDomain) flags.push({ level: "warn", text: `Reply-To goes to ${domainOf(replyTo)}, not the From domain ${fromDomain}. Common in phishing (also used by some newsletters).` });
    if (returnPath && domainOf(returnPath) && fromDomain && !domainOf(returnPath).endsWith(fromDomain) && !fromDomain.endsWith(domainOf(returnPath))) {
      flags.push({ level: "info", text: `Return-Path (bounce) domain ${domainOf(returnPath)} differs from From. Normal for mailing services; DMARC decides if it aligns.` });
    }
    if (auth.dmarc && auth.dmarc !== "pass") flags.push({ level: "error", text: `DMARC ${auth.dmarc}: the From domain did not authenticate` });
    if (auth.spf && !["pass", "none", "neutral"].includes(auth.spf)) flags.push({ level: "warn", text: `SPF ${auth.spf}` });
    if (auth.dkim && !["pass", "none"].includes(auth.dkim)) flags.push({ level: "warn", text: `DKIM ${auth.dkim}` });
    const display = from.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>/);
    if (display && /@/.test(display[1]) && !display[1].toLowerCase().includes(display[2].toLowerCase())) {
      flags.push({ level: "warn", text: `The display name shows an address (${display[1].trim()}) that is not the real sender (${display[2]})` });
    }
    const slow = hops.filter(h => h.delayMs !== null && h.delayMs > 5 * 60000);
    if (slow.length) flags.push({ level: "info", text: `${slow.length} hop(s) took more than 5 minutes (see the path below)` });
    const total = hops.length > 1 && hops[0].date !== null && hops[hops.length - 1].date !== null ? hops[hops.length - 1].date - hops[0].date : null;
    return {
      summary: {
        from, to: first(headers, "To"), subject: first(headers, "Subject"), date: first(headers, "Date"),
        messageId: first(headers, "Message-ID"), replyTo, returnPath,
        mailer: first(headers, "X-Mailer") || first(headers, "User-Agent"),
        originatingIp: first(headers, "X-Originating-IP") || first(headers, "X-Sender-IP"),
        spam: first(headers, "X-Spam-Status") || first(headers, "X-MS-Exchange-Organization-SCL") || first(headers, "X-Spam-Score"),
      },
      auth, hops, flags, totalMs: total, headerCount: headers.length,
    };
  }

  return { parse, parseReceived, authResults, analyze, domainOf };
})();
