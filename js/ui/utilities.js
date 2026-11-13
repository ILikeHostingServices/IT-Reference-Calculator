/* js/ui/utilities.js v1.0.0 (Last Rev: 2026-11-13) */
/* UI: Utilities - time decoder, cron explainer, chmod, number bases, password generator,
   encode/decode/hash, and Wi-Fi QR codes. All local; nothing is sent anywhere. */
(function () {
  "use strict";
  const U = Calc.UI, $ = U.$;
  const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

  /* ---------- Time Decoder ---------- */
  U.register("time", {
    init() {
      const input = $("time-input"), fmtSel = $("time-format"), out = $("time-results");
      U.live([input, fmtSel], () => {
        out.hidden = true;
        const d = Calc.Time.decode(input.value, fmtSel.value);
        if (d.never) {
          U.renderKV(out, [["Read as", d.source, { copy: false }], ["Meaning", "Never (0 or the maximum value: never set, or never expires)", { copy: false }]]);
          return;
        }
        if (!isFinite(d.ms) || Math.abs(d.ms) > 8.64e15) throw new Error("That value is outside the range dates can show");
        const rows = [
          ["Read as", d.source, { copy: false }],
          ["UTC", Calc.Time.formatIn(d.ms, "UTC")],
          ["US Eastern", Calc.Time.formatIn(d.ms, "America/New_York")],
        ];
        if (BROWSER_TZ && BROWSER_TZ !== "America/New_York" && BROWSER_TZ !== "UTC") rows.push([`Your time zone (${BROWSER_TZ})`, Calc.Time.formatIn(d.ms, BROWSER_TZ)]);
        rows.push(
          ["ISO 8601", new Date(d.ms).toISOString()],
          ["Relative", Calc.Time.relative(d.ms), { copy: false }],
          ["Unix seconds", String(Math.floor(d.ms / 1000))],
          ["Unix milliseconds", String(Math.round(d.ms))],
          ["Windows FILETIME / AD", Calc.Time.toFiletime(d.ms)],
        );
        U.renderKV(out, rows);
      }, $("time-error"));
      $("time-now").addEventListener("click", () => {
        input.value = String(Math.floor(Date.now() / 1000));
        fmtSel.value = "unix";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    },
  });

  /* ---------- Cron ---------- */
  const ZONES = ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu", "UTC", "Europe/London", "Europe/Berlin", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney"];
  U.register("cron", {
    init() {
      const expr = $("cron-expr"), tz = $("cron-tz");
      const zones = BROWSER_TZ && !ZONES.includes(BROWSER_TZ) ? [BROWSER_TZ, ...ZONES] : ZONES;
      zones.forEach(z => { const o = document.createElement("option"); o.value = z; o.textContent = z.replace(/_/g, " "); tz.appendChild(o); });
      tz.value = "America/New_York";
      [["Every 5 Minutes", "*/5 * * * *"], ["Weekdays 02:15", "15 2 * * 1-5"], ["Sundays 03:00", "0 3 * * 0"], ["1st Of The Month", "0 0 1 * *"], ["Every 6 Hours", "0 */6 * * *"], ["@daily", "@daily"]].forEach(([label, v]) => {
        const c = U.el("button", "chip", label);
        c.type = "button";
        c.addEventListener("click", () => { expr.value = v; expr.dispatchEvent(new Event("input", { bubbles: true })); });
        $("cron-presets").appendChild(c);
      });
      U.live([expr, tz], () => {
        $("cron-desc").hidden = true;
        $("cron-results").hidden = true;
        const desc = Calc.Cron.describe(expr.value);
        U.renderBox($("cron-desc"), { label: "Runs", primary: desc });
        const runs = Calc.Cron.nextRuns(expr.value, 8, tz.value);
        U.renderKV($("cron-results"), runs.map((ms, i) => [`Run ${i + 1}`, Calc.Time.formatIn(ms, tz.value), { copy: false }]));
      }, $("cron-error"));
    },
  });

  /* ---------- chmod ---------- */
  U.register("chmod", {
    init() {
      const octal = $("chmod-octal"), symbolic = $("chmod-symbolic"), err = $("chmod-error"), out = $("chmod-out");
      const tbody = $("chmod-grid").querySelector("tbody");
      const boxes = {};
      ["Owner", "Group", "Others"].forEach((who, wi) => {
        const tr = document.createElement("tr");
        tr.appendChild(U.el("td", "", who));
        [4, 2, 1].forEach(bit => {
          const td = document.createElement("td");
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.dataset.nostate = "";
          cb.setAttribute("aria-label", `${who} ${bit === 4 ? "read" : bit === 2 ? "write" : "execute"}`);
          boxes[`${wi}-${bit}`] = cb;
          td.appendChild(cb);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      const specials = [[4, "setuid (Run As Owner)"], [2, "setgid (Inherit Group)"], [1, "Sticky (Only Owners Delete)"]];
      specials.forEach(([bit, label]) => {
        const l = document.createElement("label");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.dataset.nostate = "";
        boxes[`s-${bit}`] = cb;
        l.append(cb, ` ${label}`);
        $("chmod-special").appendChild(l);
      });
      function show(r, from) {
        if (from !== "octal") octal.value = r.octal;
        if (from !== "symbolic") symbolic.value = r.symbolic;
        const [s, u, g, o] = r.digits;
        [u, g, o].forEach((n, wi) => [4, 2, 1].forEach(bit => { boxes[`${wi}-${bit}`].checked = (n & bit) !== 0; }));
        specials.forEach(([bit]) => { boxes[`s-${bit}`].checked = (s & bit) !== 0; });
        out.textContent = `chmod ${r.octal} file\nls -l shows: -${r.symbolic}`;
      }
      const guard = fn => () => { U.hideError(err); try { fn(); } catch (e) { U.showError(err, e.message); } };
      octal.addEventListener("input", guard(() => show(Calc.Bits.chmodFromOctal(octal.value), "octal")));
      symbolic.addEventListener("input", guard(() => show(Calc.Bits.chmodFromSymbolic(symbolic.value), "symbolic")));
      tbody.addEventListener("change", guard(fromBoxes));
      $("chmod-special").addEventListener("change", guard(fromBoxes));
      function fromBoxes() {
        const digit = wi => [4, 2, 1].reduce((n, bit) => n + (boxes[`${wi}-${bit}`].checked ? bit : 0), 0);
        const s = specials.reduce((n, [bit]) => n + (boxes[`s-${bit}`].checked ? bit : 0), 0);
        show(Calc.Bits.chmodFromOctal(`${s}${digit(0)}${digit(1)}${digit(2)}`), "boxes");
        octal.dispatchEvent(new Event("change", { bubbles: true })); // keeps the share link current
      }
      guard(() => show(Calc.Bits.chmodFromOctal(octal.value), "octal"))();
      octal.addEventListener("change", guard(() => show(Calc.Bits.chmodFromOctal(octal.value), "octal")));
    },
  });

  /* ---------- Number bases ---------- */
  U.register("base", {
    init() {
      const fields = { dec: [$("base-dec"), 10], hex: [$("base-hex"), 16], oct: [$("base-oct"), 8], bin: [$("base-bin"), 2] };
      const err = $("base-error"), out = $("base-results");
      function update(fromKey) {
        U.hideError(err);
        const [el, base] = fields[fromKey];
        if (el.value.trim() === "") { out.hidden = true; return; }
        try {
          const v = Calc.Bits.parseBase(el.value, base);
          const b = Calc.Bits.toBases(v);
          if (fromKey !== "dec") fields.dec[0].value = b.dec;
          if (fromKey !== "hex") fields.hex[0].value = b.hex;
          if (fromKey !== "oct") fields.oct[0].value = b.oct;
          if (fromKey !== "bin") fields.bin[0].value = b.bin;
          const rows = [["Decimal (grouped)", b.decGrouped], ["Hex", `0x${b.hex}`], ["Hex (grouped)", b.hexGrouped], ["Binary (nibbles)", b.binGrouped], ["Size", `${b.bits} bits (${b.bytes} byte${b.bytes === 1 ? "" : "s"})`, { copy: false }]];
          if (v >= 0n && v <= 0xFFFFFFFFn) rows.push(["As an IPv4 address", Calc.IPv4.uint32ToIp(Number(v))]);
          U.renderKV(out, rows);
        } catch (e) {
          out.hidden = true;
          U.showError(err, e.message);
        }
      }
      Object.keys(fields).forEach(k => fields[k][0].addEventListener("input", () => update(k)));
      fields.dec[0].addEventListener("change", () => update("dec"));
      update("dec");
    },
  });

  /* ---------- Password ---------- */
  U.register("password", {
    init() {
      const genPw = () => {
        U.hideError($("password-error"));
        try {
          const r = Calc.Password.generatePassword({
            length: Number($("password-length").value), lower: $("password-lower").checked, upper: $("password-upper").checked,
            digits: $("password-digits").checked, symbols: $("password-symbols").checked, avoidAmbiguous: $("password-ambig").checked,
          });
          showSecret($("password-out"), r.value, `${Math.round(r.entropyBits)} bits of entropy. ${Calc.Password.strength(r.entropyBits)}`);
        } catch (e) { $("password-out").hidden = true; U.showError($("password-error"), e.message); }
      };
      const genPhrase = () => {
        U.hideError($("password-phrase-error"));
        try {
          const r = Calc.Password.generatePassphrase({ words: Number($("password-words").value), separator: $("password-sep").value, capitalize: $("password-cap").checked, addNumber: $("password-num").checked });
          showSecret($("password-phrase-out"), r.value, `${Math.round(r.entropyBits)} bits of entropy. ${Calc.Password.strength(r.entropyBits)}`);
        } catch (e) { $("password-phrase-out").hidden = true; U.showError($("password-phrase-error"), e.message); }
      };
      function showSecret(box, value, note) {
        U.renderBox(box, { primary: value, secondary: note });
        const row = U.el("div", "btn-row");
        row.appendChild(U.copyButton(value, "Copy"));
        box.appendChild(row);
      }
      $("password-gen").addEventListener("click", genPw);
      $("password-gen-phrase").addEventListener("click", genPhrase);
      ["password-length", "password-lower", "password-upper", "password-digits", "password-symbols", "password-ambig"].forEach(id => $(id).addEventListener("change", genPw));
      ["password-words", "password-sep", "password-cap", "password-num"].forEach(id => $(id).addEventListener("change", genPhrase));
      genPw();
      genPhrase();
    },
  });

  /* ---------- Encode / hash ---------- */
  U.register("encode", {
    init() {
      const input = $("encode-input"), codec = $("encode-codec"), out = $("encode-out"), err = $("encode-error");
      Object.entries(Calc.Encode.CODECS).forEach(([k, c]) => { const o = document.createElement("option"); o.value = k; o.textContent = c.label; codec.appendChild(o); });
      const show = text => { out.textContent = text; out.hidden = false; };
      const act = fn => () => { U.hideError(err); out.hidden = true; try { show(fn()); } catch (e) { U.showError(err, e.message); } };
      $("encode-enc").addEventListener("click", act(() => Calc.Encode.run(codec.value, "encode", input.value)));
      $("encode-dec").addEventListener("click", act(() => Calc.Encode.run(codec.value, "decode", input.value)));
      $("encode-jwt").addEventListener("click", act(() => {
        const j = Calc.Encode.decodeJwt(input.value);
        const exp = j.payload.exp ? `\n\nExpires: ${Calc.Time.formatIn(j.payload.exp * 1000, "UTC")} (${Calc.Time.relative(j.payload.exp * 1000)})` : "";
        return `Header:\n${JSON.stringify(j.header, null, 2)}\n\nPayload:\n${JSON.stringify(j.payload, null, 2)}${exp}\n\nThe signature is not checked (that needs the signing key).`;
      }));
      const hashErr = $("encode-hash-error"), hashOut = $("encode-hash-results");
      let seq = 0;
      const hash = U.debounce(async () => {
        const mine = ++seq;
        U.hideError(hashErr);
        try {
          const h = await Calc.Encode.hashes(input.value);
          if (mine !== seq) return;
          U.renderKV(hashOut, Calc.Encode.HASHES.map(a => [a, h[a]]));
        } catch (e) { hashOut.hidden = true; U.showError(hashErr, e.message); }
      }, 150);
      input.addEventListener("input", hash);
      hash();
    },
  });

  /* ---------- Wi-Fi QR ---------- */
  U.register("wifiqr", {
    init() {
      const canvas = $("wifiqr-canvas"), box = $("wifiqr-box"), dl = $("wifiqr-download");
      qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];
      U.live(["wifiqr-ssid", "wifiqr-pass", "wifiqr-sec", "wifiqr-hidden"].map($), () => {
        box.hidden = true;
        const ssid = $("wifiqr-ssid").value, pass = $("wifiqr-pass").value, sec = $("wifiqr-sec").value;
        if (!ssid) throw new Error("Enter the network name");
        if (sec === "WPA" && pass && pass.length < 8) throw new Error("WPA passwords are at least 8 characters");
        if (sec !== "nopass" && !pass) { $("wifiqr-error").hidden = true; return; }
        const qr = qrcode(0, "M");
        qr.addData(Calc.Encode.wifiString({ ssid, pass, sec, hidden: $("wifiqr-hidden").checked }), "Byte");
        qr.make();
        const n = qr.getModuleCount(), quiet = 4, scale = Math.max(4, Math.floor(512 / (n + quiet * 2)));
        const size = (n + quiet * 2) * scale;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = "#000000";
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
        dl.href = canvas.toDataURL("image/png");
        dl.download = `wifi-${ssid.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "network"}.png`;
        box.hidden = false;
      }, $("wifiqr-error"));
      $("wifiqr-print").addEventListener("click", () => window.print());
    },
  });

})();
