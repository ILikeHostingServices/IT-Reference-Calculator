/* js/ui/dnsmail.js v1.0.0 (Last Rev: 2026-11-12) */
/* UI: DNS and email tools - DNS lookup, SPF/DKIM/DMARC checker and builders, header analyzer.
   Lookups run only when a button is pressed (or a shared link names a domain), never on typing. */
(function () {
  "use strict";
  const U = Calc.UI, $ = U.$;

  /* ---------- DNS Lookup ---------- */
  let dnsController;
  async function dnsLookup(types) {
    const nameEl = $("dns-name"), err = $("dns-error"), out = $("dns-out");
    U.hideError(err);
    out.innerHTML = "";
    if (dnsController) dnsController.abort();
    dnsController = new AbortController();
    try {
      const raw = nameEl.value.trim();
      if (!raw) throw new Error("Enter a domain name or an IP address");
      const reverse = Calc.DNS.reverseName(raw);
      const name = reverse || Calc.DNS.normalizeName(raw);
      const list = reverse ? ["PTR"] : types;
      out.appendChild(U.el("p", "muted-msg", "Looking up..."));
      const results = await Promise.all(list.map(t => Calc.DNS.query(name, t, { signal: dnsController.signal }).then(r => ({ t, r }))));
      out.innerHTML = "";
      const rows = [];
      let status = null, resolver = "", dnssec = false;
      results.forEach(({ t, r }) => {
        status = status === null || r.status !== 0 ? r.status : status;
        resolver = r.resolver;
        dnssec = dnssec || r.dnssec;
        if (!r.answers.length) rows.push([t, "(no records)", "", ""]);
        r.answers.forEach(a => rows.push([a.type, a.data, String(a.ttl), a.name]));
      });
      U.renderData(out, ["Type", "Value", "TTL (s)", "Name"], rows, { monoCols: [1, 3], caption: `DNS records for ${name}` });
      const note = `${name}: ${results.some(x => x.r.status === 3) ? "NXDOMAIN, this name does not exist" : "answered"} via ${resolver}.${dnssec ? " DNSSEC validated." : ""}`;
      out.appendChild(U.el("p", "notes", note));
    } catch (e) {
      out.innerHTML = "";
      if (e.name !== "AbortError") U.showError(err, e.message);
    }
  }
  U.register("dns", {
    init() {
      const sel = $("dns-type");
      Calc.DNS.LOOKUP_TYPES.forEach(t => { const o = document.createElement("option"); o.value = t; o.textContent = t; sel.appendChild(o); });
      $("dns-go").addEventListener("click", () => dnsLookup([sel.value]));
      $("dns-all").addEventListener("click", () => dnsLookup(["A", "AAAA", "CNAME", "MX", "NS", "TXT", "CAA"]));
      $("dns-name").addEventListener("keydown", e => { if (e.key === "Enter") dnsLookup([sel.value]); });
    },
    // A shared link with a name runs the lookup once the page opens.
    afterSetState: s => { if (s["dns-name"] || s.name) dnsLookup([$("dns-type").value]); },
  });

  /* ---------- Email security ---------- */
  function section(out, title) {
    const h = U.el("h4", "section-subheading", title);
    out.appendChild(h);
  }
  function recordBlock(out, text) {
    const pre = U.el("pre", "output", text);
    out.appendChild(pre);
    const btns = U.el("div", "btn-row");
    btns.appendChild(U.copyButton(text, "Copy Record"));
    out.appendChild(btns);
  }
  function spfTree(node, depth = 0) {
    const lines = [`${"  ".repeat(depth)}${node.domain}${node.record ? ` (${node.lookups} lookup${node.lookups === 1 ? "" : "s"})` : " (no SPF record)"}`];
    node.includes.forEach(c => lines.push(...spfTree(c, depth + 1)));
    return lines;
  }

  async function checkEmail() {
    const err = $("email-error"), out = $("email-out");
    U.hideError(err);
    out.innerHTML = "";
    try {
      const domain = Calc.DNS.normalizeName($("email-domain").value);
      const custom = $("email-selectors").value.split(/[\s,]+/).filter(Boolean);
      out.appendChild(U.el("p", "muted-msg", `Checking ${domain}...`));
      const resolve = name => Calc.DNS.txt(name);
      const [mx, spf, dmarc, dkim, mtasts, tlsrpt, bimi] = await Promise.all([
        Calc.DNS.query(domain, "MX"),
        Calc.EmailAuth.checkSpf(domain, resolve),
        Calc.EmailAuth.checkDmarc(domain, resolve),
        Calc.EmailAuth.checkDkim(domain, custom.length ? custom : Calc.EmailAuth.COMMON_SELECTORS, resolve),
        resolve(`_mta-sts.${domain}`).catch(() => []),
        resolve(`_smtp._tls.${domain}`).catch(() => []),
        resolve(`default._bimi.${domain}`).catch(() => []),
      ]);
      out.innerHTML = "";

      section(out, "MX (Mail Servers)");
      const mxRows = mx.answers.filter(a => a.type === "MX").map(a => a.data.split(" ")).sort((a, b) => a[0] - b[0]).map(([pri, host]) => [pri, host.replace(/\.$/, "")]);
      if (mxRows.length) U.renderData(out, ["Priority", "Server"], mxRows, { monoCols: [1] });
      else U.renderIssues(out, [{ level: "warn", text: "No MX records: this domain cannot receive email (fine for send-only domains, which should publish a null MX: 0 .)" }]);

      section(out, "SPF");
      if (spf.record) recordBlock(out, spf.record);
      const spfIssues = [...spf.issues];
      if (spf.record && !spfIssues.some(i => i.level === "error")) spfIssues.unshift({ level: "ok", text: `Valid SPF with ${spf.lookups} of 10 DNS lookups` });
      U.renderIssues(out, spfIssues);
      if (spf.includes.length) out.appendChild(U.el("pre", "output", spfTree(spf).join("\n")));

      section(out, "DMARC");
      if (dmarc.record) {
        recordBlock(out, dmarc.record);
        U.renderData(out, ["Tag", "Value", "Meaning"], Object.entries(dmarc.tags).map(([k, v]) => [k, v, Calc.EmailAuth.DMARC_TAGS[k] || ""]), { monoCols: [0, 1] });
      }
      U.renderIssues(out, dmarc.issues);

      section(out, "DKIM");
      if (!dkim.length) {
        U.renderIssues(out, [{ level: custom.length ? "error" : "warn", text: custom.length ? `No DKIM key found for selector(s): ${custom.join(", ")}` : "No DKIM key found under common selector names. DKIM may still be set up under another selector: check a received message's DKIM-Signature header for s= and enter it above." }]);
      }
      dkim.forEach(k => {
        out.appendChild(U.el("p", "notes", `Selector "${k.selector}" (${k.name})`));
        U.renderIssues(out, k.issues);
      });

      section(out, "Extras");
      U.renderIssues(out, [
        mtasts.some(r => /^v=STSv1/i.test(r)) ? { level: "ok", text: "MTA-STS published (forces TLS for inbound mail)" } : { level: "info", text: "No MTA-STS record (optional: enforces TLS for mail sent to you)" },
        tlsrpt.some(r => /^v=TLSRPTv1/i.test(r)) ? { level: "ok", text: "TLS-RPT reporting published" } : { level: "info", text: "No TLS-RPT record (optional: reports on TLS delivery failures)" },
        bimi.some(r => /^v=BIMI1/i.test(r)) ? { level: "ok", text: "BIMI logo record published" } : { level: "info", text: "No BIMI record (optional: shows your logo in some inboxes; needs DMARC enforcement)" },
      ]);
    } catch (e) {
      out.innerHTML = "";
      U.showError(err, e.message);
    }
  }

  U.register("email", {
    init() {
      $("email-go").addEventListener("click", checkEmail);
      $("email-domain").addEventListener("keydown", e => { if (e.key === "Enter") checkEmail(); });

      const spfIds = ["email-spf-m365", "email-spf-google", "email-spf-mx", "email-spf-a", "email-spf-inc", "email-spf-ip", "email-spf-all"].map($);
      U.live(spfIds, () => {
        const includes = [];
        if ($("email-spf-m365").checked) includes.push("spf.protection.outlook.com");
        if ($("email-spf-google").checked) includes.push("_spf.google.com");
        includes.push(...$("email-spf-inc").value.split(/[\s,]+/).filter(Boolean).map(s => s.replace(/^include:/, "")));
        const ips = $("email-spf-ip").value.split(/[\s,]+/).filter(Boolean);
        const r = Calc.EmailAuth.buildSpf({
          mx: $("email-spf-mx").checked, a: $("email-spf-a").checked, includes,
          ip4: ips.filter(x => !x.includes(":")), ip6: ips.filter(x => x.includes(":")), all: $("email-spf-all").value,
        });
        $("email-spf-out").textContent = r.record;
        $("email-spf-note").textContent = `Publish as a TXT record on the domain itself (@). Uses ${r.directLookups} DNS lookup(s) directly; each include can use more (limit 10 total). Use "Check Domain" after publishing to count them all.`;
      });

      const dmIds = ["email-dm-p", "email-dm-sp", "email-dm-pct", "email-dm-rua", "email-dm-ruf", "email-dm-adkim", "email-dm-aspf"].map($);
      U.live(dmIds, () => {
        $("email-dm-out").textContent = Calc.EmailAuth.buildDmarc({
          p: $("email-dm-p").value, sp: $("email-dm-sp").value, pct: $("email-dm-pct").value,
          rua: $("email-dm-rua").value.trim(), ruf: $("email-dm-ruf").value.trim(),
          adkim: $("email-dm-adkim").checked ? "s" : "r", aspf: $("email-dm-aspf").checked ? "s" : "r",
        });
      });
    },
    afterSetState: s => { if (s.domain) checkEmail(); },
  });

  /* ---------- Header analyzer ---------- */
  // Sample uses example domains and documentation IP ranges only (ILHS brand: never real hostnames).
  const SAMPLE = `Received: from mail-out.example.org (mail-out.example.org [192.0.2.25])
	by mx.example.net (Postfix) with ESMTPS id 4XyZ123
	for <alex.morgan@example.net>; Wed, 11 Nov 2026 14:32:09 -0500 (EST)
Received: by mail-out.example.org with SMTP id 00721157ae682-6e5;
        Wed, 11 Nov 2026 11:32:05 -0800 (PST)
Received: from [192.168.1.23] ([198.51.100.7])
        by smtp.example.org with ESMTPSA id abc123;
        Wed, 11 Nov 2026 11:31:58 -0800 (PST)
Authentication-Results: mx.example.net; spf=pass smtp.mailfrom=northwind-billing.example; dkim=pass header.d=example.org; dmarc=fail (p=REJECT) header.from=northwind.example
From: "Northwind Traders Accounts" <ap@northwind.example>
Reply-To: ap-desk@northwind-billing.example
Return-Path: <billing@northwind-billing.example>
To: alex.morgan@example.net
Subject: Updated bank details for invoice 4471
Date: Wed, 11 Nov 2026 11:31:57 -0800
Message-ID: <CAF=abc123@smtp.example.org>`;

  function fmtDelay(ms) {
    if (ms === null) return "";
    if (ms < 0) return `${Math.round(ms / 1000)} s (clock skew)`;
    return Calc.Capacity.formatDuration(ms / 1000);
  }

  U.register("headers", {
    init() {
      const raw = $("headers-raw"), err = $("headers-error"), out = $("headers-out");
      const run = () => {
        U.hideError(err);
        out.innerHTML = "";
        if (!raw.value.trim()) return;
        try {
          const r = Calc.MailHeaders.analyze(raw.value);
          const authRow = U.el("div", "btn-row");
          [["SPF", r.auth.spf], ["DKIM", r.auth.dkim], ["DMARC", r.auth.dmarc]].forEach(([k, v]) => {
            const cls = v === "pass" ? "pass" : v === null ? "neutral" : ["fail", "softfail", "permerror"].includes(v) ? "fail" : "neutral";
            authRow.appendChild(U.el("span", `badge ${cls}`, `${k}: ${v || "not reported"}`));
          });
          out.appendChild(authRow);
          if (r.flags.length) U.renderIssues(out, r.flags);
          const t = U.el("table", "result-table kv");
          t.appendChild(document.createElement("tbody"));
          out.appendChild(t);
          const s = r.summary;
          U.renderKV(t, [
            ["From", s.from], ["Reply-To", s.replyTo], ["Return-Path", s.returnPath], ["To", s.to], ["Subject", s.subject],
            ["Date", s.date], ["Message-ID", s.messageId], ["Mailer", s.mailer], ["Originating IP", s.originatingIp], ["Spam verdict", s.spam],
          ].filter(([, v]) => v));
          out.appendChild(U.el("h3", "section-subheading", `Delivery Path (${r.hops.length} hops${r.totalMs !== null ? `, ${fmtDelay(r.totalMs)} total` : ""})`));
          U.renderData(out, ["#", "From", "By", "Protocol", "Time (UTC)", "Delay"], r.hops.map(h => [
            String(h.index), [h.from, h.ip && !h.from.includes(h.ip) ? `[${h.ip}]` : ""].filter(Boolean).join(" "), h.by, h.with,
            h.date === null ? "?" : new Date(h.date).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC"), fmtDelay(h.delayMs),
          ]), { monoCols: [1, 2, 4] });
          out.appendChild(U.el("p", "notes", `Hop 1 is where the message started. ${r.headerCount} headers read.`));
        } catch (e) {
          U.showError(err, e.message);
        }
      };
      raw.addEventListener("input", U.debounce(run, 200));
      $("headers-sample").addEventListener("click", () => { raw.value = SAMPLE; run(); });
      $("headers-clear").addEventListener("click", () => { raw.value = ""; run(); raw.focus(); });
    },
  });
})();
