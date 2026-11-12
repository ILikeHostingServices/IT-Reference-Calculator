/* UI: Storage, capacity, and infrastructure tools - RAID (with rebuild risk), Storage / RAM,
   transfer time, backup storage, camera/NVR storage, uptime/SLA, and PoE/UPS. */
(function () {
  "use strict";
  const U = Calc.UI, $ = U.$, Cap = Calc.Capacity;

  /* ---------- RAID ---------- */
  U.register("raid", {
    init() {
      const level = $("raid-level"), unit = $("raid-size-unit"), groupsRow = $("raid-groups-row");
      Calc.RAID.listLevels().forEach(l => {
        const opt = document.createElement("option");
        opt.value = l.key;
        opt.textContent = `${l.label} (min ${l.minDisks} disks)`;
        level.appendChild(opt);
      });
      level.value = "raid5";
      U.populateUnitSelect(unit, "TB");
      const syncGroups = () => {
        const l = Calc.RAID.getLevel(level.value);
        const wasHidden = groupsRow.hidden;
        groupsRow.hidden = !l.needsGroups;
        if (l.needsGroups && wasHidden) $("raid-groups").value = l.defaultGroups;
      };
      level.addEventListener("change", syncGroups);
      syncGroups();

      const inputs = [level, $("raid-disks"), $("raid-size"), unit, $("raid-groups")];
      U.live(inputs, () => {
        $("raid-results").hidden = true;
        $("raid-notes").hidden = true;
        const diskSizeBytes = Calc.Units.toBytes(U.need($("raid-size"), "a disk size"), unit.value);
        const groups = groupsRow.hidden ? undefined : Number($("raid-groups").value);
        const r = Calc.RAID.calculate(level.value, Number($("raid-disks").value), diskSizeBytes, groups);
        const rows = [["RAID level", r.label, { copy: false }], ["Disk count", r.diskCount, { copy: false }]];
        if (r.groups) rows.push(["Groups", r.groups, { copy: false }]);
        rows.push(
          ["Usable capacity", U.formatBoth(r.usableBytes)],
          ["Raw capacity", U.formatBoth(r.rawBytes)],
          ["Overhead", U.formatBoth(r.overheadBytes)],
          ["Storage efficiency", `${Calc.Units.trimNumber(r.efficiencyPct, 1)}%`],
          ["Fault tolerance", r.faultTolerance, { copy: false }],
        );
        U.renderKV($("raid-results"), rows);
        $("raid-notes").textContent = r.notes;
        $("raid-notes").hidden = false;
      }, $("raid-error"));

      U.live([...inputs, $("raid-speed"), $("raid-ure")], () => {
        $("raid-rb-results").hidden = true;
        const diskBytes = Calc.Units.toBytes(U.need($("raid-size"), "a disk size"), unit.value);
        const disks = Number($("raid-disks").value);
        const rebuild = Cap.raidRebuild(diskBytes, U.need($("raid-speed"), "a rebuild speed"));
        const exp = Number($("raid-ure").value);
        const readBytes = diskBytes * Math.max(1, disks - 1);
        const risk = Cap.ureRisk(readBytes, exp);
        U.renderKV($("raid-rb-results"), [
          ["Rebuild time (best case, idle array)", Cap.formatDuration(rebuild.seconds)],
          ["Data read from surviving disks", U.formatBoth(readBytes)],
          ["Chance of at least one read error", `${(risk.probability * 100).toFixed(risk.probability < 0.01 ? 3 : 1)}%`],
        ]);
      }, $("raid-rb-error"));
    },
  });

  /* ---------- Storage / RAM ---------- */
  function formatAmount(value) {
    if (value !== 0 && Math.abs(value) < 0.0001) return value.toExponential(3);
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  U.register("storage", {
    init() {
      const convAmount = $("conv-amount"), convUnit = $("conv-unit");
      U.populateUnitSelect(convUnit, "TB");
      const renderUnitTable = (tableEl, units, bytes) => {
        const best = Calc.Units.bestUnit(bytes, units === Calc.Units.DECIMAL ? "decimal" : "binary");
        const tbody = tableEl.querySelector("tbody");
        tbody.innerHTML = "";
        units.filter(u => u.key !== "B").forEach(u => {
          const tr = document.createElement("tr");
          if (u.key === best) tr.className = "best";
          const v = document.createElement("td"), k = document.createElement("td");
          v.textContent = formatAmount(Calc.Units.fromBytes(bytes, u.key));
          k.textContent = u.key;
          tr.append(v, k);
          tbody.appendChild(tr);
        });
      };
      U.live([convAmount, convUnit], () => {
        const amount = U.num(convAmount);
        const ok = amount !== null && amount >= 0;
        $("conv-empty").hidden = ok;
        $("conv-results").hidden = !ok;
        if (!ok) return;
        const bytes = Calc.Units.toBytes(amount, convUnit.value);
        renderUnitTable($("conv-binary"), Calc.Units.BINARY, bytes);
        renderUnitTable($("conv-decimal"), Calc.Units.DECIMAL, bytes);
      });

      // Add it up
      const items = $("storage-items"), err = $("storage-error"), total = $("storage-total");
      const PRESETS = [
        { label: "16 GiB DIMM", amount: 16, unit: "GiB" }, { label: "32 GiB DIMM", amount: 32, unit: "GiB" },
        { label: "64 GiB DIMM", amount: 64, unit: "GiB" }, { label: "1 TB SSD", amount: 1, unit: "TB" },
        { label: "4 TB HDD", amount: 4, unit: "TB" }, { label: "8 TB HDD", amount: 8, unit: "TB" },
      ];
      function updateTotal() {
        U.hideError(err);
        const rowEls = [...items.querySelectorAll(".storage-row")];
        total.innerHTML = "";
        if (!rowEls.length) { total.appendChild(U.el("div", "secondary", "Add a line or tap a preset above.")); return; }
        try {
          const list = rowEls.map(r => ({
            quantity: Number(r.querySelector(".qty-input").value),
            amount: U.num(r.querySelector(".amount-input")),
            unit: r.querySelector(".unit-select").value,
          }));
          if (list.some(i => i.amount === null || i.amount < 0)) throw new Error("Every line needs a size of zero or more");
          const bytes = Calc.Storage.total(list);
          const both = Calc.Units.formatBoth(bytes);
          const count = list.reduce((n, i) => n + i.quantity, 0);
          U.renderBox(total, { label: `Total of ${count.toLocaleString()} item${count === 1 ? "" : "s"}`, primary: both.binary, secondary: `${both.decimal} · ${bytes.toLocaleString()} bytes` });
        } catch (e) {
          U.showError(err, e.message);
        }
      }
      function addItem(quantity, amount, unit, label) {
        const row = U.el("div", "storage-row");
        const qty = document.createElement("input");
        qty.type = "number"; qty.className = "qty-input"; qty.min = "0"; qty.step = "1"; qty.value = quantity; qty.setAttribute("aria-label", "Quantity");
        const times = U.el("span", "times", "×");
        const amt = document.createElement("input");
        amt.type = "number"; amt.className = "amount-input"; amt.min = "0"; amt.step = "any"; amt.value = amount; amt.setAttribute("aria-label", "Size");
        const sel = document.createElement("select");
        sel.className = "unit-select"; sel.setAttribute("aria-label", "Unit");
        const lab = document.createElement("input");
        lab.type = "text"; lab.className = "label-input"; lab.placeholder = "Label (optional)"; lab.value = label || ""; lab.setAttribute("aria-label", "Label");
        const rm = U.el("button", "remove-row", "×");
        rm.type = "button"; rm.title = "Remove line"; rm.setAttribute("aria-label", "Remove line");
        rm.addEventListener("click", () => { row.remove(); updateTotal(); });
        [qty, amt, sel, lab].forEach(i => { i.dataset.nostate = ""; });
        row.append(qty, times, amt, sel, lab, rm);
        U.populateUnitSelect(sel, unit);
        items.appendChild(row);
        updateTotal();
        return row;
      }
      PRESETS.forEach(p => {
        const chip = U.el("button", "chip", `+ ${p.label}`);
        chip.type = "button";
        chip.addEventListener("click", () => {
          const match = [...items.querySelectorAll(".storage-row")].find(r =>
            Number(r.querySelector(".amount-input").value) === p.amount && r.querySelector(".unit-select").value === p.unit);
          if (match) { const q = match.querySelector(".qty-input"); q.value = (Number(q.value) || 0) + 1; updateTotal(); }
          else addItem(1, p.amount, p.unit, p.label);
        });
        $("storage-presets").appendChild(chip);
      });
      items.addEventListener("input", updateTotal);
      items.addEventListener("change", updateTotal);
      $("storage-add-item").addEventListener("click", () => addItem(1, 1, "TB").querySelector(".amount-input").select());
      addItem(4, 32, "GiB", "DIMM");

      // Compare
      const a = $("cmp-a-amount"), au = $("cmp-a-unit"), b = $("cmp-b-amount"), bu = $("cmp-b-unit");
      U.populateUnitSelect(au, "TB");
      U.populateUnitSelect(bu, "GB");
      U.live([a, au, b, bu], () => {
        const x = U.num(a), y = U.num(b);
        const ready = x !== null && y !== null && x >= 0 && y >= 0;
        $("cmp-empty").hidden = ready;
        $("cmp-results").hidden = !ready;
        if (!ready) return;
        const r = Calc.Storage.compare(Calc.Units.toBytes(x, au.value), Calc.Units.toBytes(y, bu.value));
        const rows = [r.differenceBytes >= 0 ? ["Left over (A - B)", U.formatBoth(r.differenceBytes)] : ["Short by (B - A)", U.formatBoth(-r.differenceBytes)]];
        if (r.percentOfA !== null) rows.push(["B uses this much of A", `${Calc.Units.trimNumber(r.percentOfA, 2)}%`]);
        if (r.fits !== null) {
          rows.push(["Whole copies of B that fit in A", r.fits.toLocaleString()]);
          if (r.fits > 0) rows.push(["Space left after those copies", U.formatBoth(r.leftoverBytes)]);
        }
        U.renderKV($("cmp-results"), rows);
      });
    },
  });

  /* ---------- Transfer Time ---------- */
  U.register("transfer", {
    init() {
      U.populateUnitSelect($("transfer-unit"), "TB");
      U.populateRateSelect($("transfer-rate"), "Gbps");
      U.populateUnitSelect($("transfer-need-unit"), "GB");
      U.live(["transfer-size", "transfer-unit", "transfer-speed", "transfer-rate", "transfer-eff"].map($), () => {
        $("transfer-out").hidden = true;
        const bytes = Calc.Units.toBytes(U.need($("transfer-size"), "a data size"), $("transfer-unit").value);
        const bps = U.need($("transfer-speed"), "a link speed") * U.rateFactor($("transfer-rate").value);
        const r = Cap.transferTime(bytes, bps, U.need($("transfer-eff"), "an efficiency"));
        U.renderBox($("transfer-out"), {
          label: "Estimated transfer time",
          primary: Cap.formatDuration(r.seconds),
          secondary: `About ${U.formatBps(r.effectiveBps)} of real throughput (${Calc.Units.formatBytes(r.bytesPerSecond, "decimal")}/s), ${Calc.Units.formatBytes(r.bytesPerSecond * 3600, "decimal")} per hour.`,
        });
      }, $("transfer-error"));
      U.live(["transfer-need-size", "transfer-need-unit", "transfer-window", "transfer-need-eff"].map($), () => {
        $("transfer-need-out").hidden = true;
        const bytes = Calc.Units.toBytes(U.need($("transfer-need-size"), "a data size"), $("transfer-need-unit").value);
        const r = Cap.requiredBandwidth(bytes, U.need($("transfer-window"), "a time window") * 3600, U.need($("transfer-need-eff"), "an efficiency"));
        U.renderBox($("transfer-need-out"), { label: "Link speed needed", primary: U.formatBps(r.bitsPerSecond), secondary: `${Calc.Units.trimNumber(r.bitsPerSecond / 8e6, 1)} MB/s of throughput before overhead.` });
      }, $("transfer-need-error"));
    },
  });

  /* ---------- Backup ---------- */
  U.register("backup", {
    init() {
      U.populateUnitSelect($("backup-unit"), "TB");
      const ids = ["backup-source", "backup-unit", "backup-change", "backup-daily", "backup-weekly", "backup-monthly", "backup-ratio", "backup-growth", "backup-years"];
      U.live(ids.map($), () => {
        $("backup-results").hidden = true;
        const n = (id, label) => U.need($(id), label);
        const r = Cap.backupRepository({
          sourceBytes: Calc.Units.toBytes(n("backup-source", "the data size"), $("backup-unit").value),
          changePct: n("backup-change", "a change rate"), dailyKept: n("backup-daily", "daily restore points"),
          weeklyFullsKept: n("backup-weekly", "weekly fulls"), monthlyFullsKept: n("backup-monthly", "monthly fulls"),
          reductionRatio: n("backup-ratio", "a reduction ratio"), growthPct: n("backup-growth", "a growth rate"), years: n("backup-years", "years"),
        });
        U.renderKV($("backup-results"), [
          ["Source data after growth", U.formatBoth(r.grownSource)],
          ["Full backups kept", `${r.fulls} (${U.formatBoth(r.fullBytes)} before reduction)`, { copy: false }],
          ["Incrementals kept", U.formatBoth(r.incBytes)],
          ["Total before reduction", U.formatBoth(r.raw)],
          ["Estimated repository size", U.formatBoth(r.stored)],
          ["With 20% free space headroom", U.formatBoth(r.stored * 1.25)],
        ]);
      }, $("backup-error"));
    },
  });

  /* ---------- NVR ---------- */
  const STREAMS = [
    ["", "Custom (enter bitrate)"], ["1", "1080p (2 MP) H.265, ~1 to 2 Mbps"], ["2", "1080p (2 MP) H.264, ~2 to 4 Mbps"],
    ["4", "4 MP H.265, ~3 to 4 Mbps"], ["6", "4 MP H.264, ~5 to 6 Mbps"], ["8", "4K (8 MP) H.265, ~6 to 8 Mbps"], ["16", "4K (8 MP) H.264, ~12 to 16 Mbps"],
  ];
  U.register("nvr", {
    init() {
      const preset = $("nvr-preset");
      STREAMS.forEach(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; preset.appendChild(o); });
      preset.addEventListener("change", () => { if (preset.value) { $("nvr-bitrate").value = preset.value; $("nvr-bitrate").dispatchEvent(new Event("input")); } });
      U.live(["nvr-cameras", "nvr-bitrate", "nvr-hours", "nvr-motion", "nvr-days"].map($), () => {
        $("nvr-results").hidden = true;
        const r = Cap.nvrStorage({
          cameras: U.need($("nvr-cameras"), "the number of cameras"), bitrateMbps: U.need($("nvr-bitrate"), "a bitrate"),
          hoursPerDay: U.need($("nvr-hours"), "recording hours"), motionPct: U.need($("nvr-motion"), "a recording share"), days: U.need($("nvr-days"), "days to keep"),
        });
        U.renderKV($("nvr-results"), [
          ["Storage needed", U.formatBoth(r.total)],
          ["Per day (all cameras)", U.formatBoth(r.perDay)],
          ["Per camera per day", U.formatBoth(r.bytesPerCameraDay)],
          ["Recording bandwidth into the NVR", `${Calc.Units.trimNumber(r.bandwidthMbps, 1)} Mbps`],
        ]);
      }, $("nvr-error"));
    },
  });

  /* ---------- SLA ---------- */
  let slaList;
  U.register("sla", {
    init() {
      const pct = $("sla-pct");
      ["99", "99.5", "99.9", "99.95", "99.99", "99.999"].forEach(v => {
        const c = U.el("button", "chip", `${v}%`);
        c.type = "button";
        c.addEventListener("click", () => { pct.value = v; pct.dispatchEvent(new Event("input")); });
        $("sla-presets").appendChild(c);
      });
      U.live([pct], () => {
        $("sla-results").hidden = true;
        const d = Cap.downtime(U.need(pct, "an availability percentage"));
        U.renderKV($("sla-results"), [
          ["Per year", Cap.formatDuration(d.year)], ["Per month", Cap.formatDuration(d.month)],
          ["Per week", Cap.formatDuration(d.week)], ["Per day", Cap.formatDuration(d.day)],
        ]);
      }, $("sla-error"));

      const periods = { month: Cap.MONTH, year: Cap.YEAR, week: Cap.WEEK, day: Cap.DAY };
      U.live([$("sla-down"), $("sla-period")], () => {
        $("sla-rev-out").hidden = true;
        const a = Cap.availabilityFromDowntime(U.need($("sla-down"), "the downtime") * 60, periods[$("sla-period").value]);
        U.renderBox($("sla-rev-out"), { label: "Availability", primary: `${a.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}%` });
      }, $("sla-rev-error"));

      const err = $("sla-comp-error"), out = $("sla-comp-results");
      const run = () => {
        U.hideError(err);
        out.hidden = true;
        try {
          const rows = slaList.rows().filter(r => r.pct !== "");
          const groups = rows.map(r => ({ availabilityPct: Number(r.pct), count: Number(r.count) || 1 }));
          const a = Cap.composite(groups);
          const d = Cap.downtime(a);
          const weakest = rows.map((r, i) => ({ name: r.name || `Component ${i + 1}`, eff: Cap.composite([groups[i]]) })).sort((x, y) => x.eff - y.eff)[0];
          U.renderKV(out, [
            ["Combined availability", `${a.toFixed(4)}%`],
            ["Expected downtime per year", Cap.formatDuration(d.year)],
            ["Expected downtime per month", Cap.formatDuration(d.month)],
            ["Weakest link", `${weakest.name} (${weakest.eff.toFixed(4)}%)`, { copy: false }],
          ]);
        } catch (e) {
          U.showError(err, e.message);
        }
      };
      slaList = U.makeList($("sla-list"), [
        { key: "name", type: "text", cls: "name-input", label: "Component", placeholder: "Component" },
        { key: "pct", type: "number", cls: "num-input", label: "Availability percent", placeholder: "%", step: "any" },
        { key: "count", type: "number", cls: "qty-input", label: "Redundant copies", placeholder: "Copies", min: 1, step: 1, default: 1 },
      ], [
        { name: "Internet circuit", pct: 99.5, count: 2 }, { name: "Firewall", pct: 99.9, count: 2 },
        { name: "Core switch", pct: 99.95, count: 1 }, { name: "Hypervisor host", pct: 99.9, count: 3 }, { name: "Application", pct: 99.9, count: 1 },
      ], run);
      $("sla-add").addEventListener("click", () => slaList.addRow({ count: 1 }).querySelector("input").focus());
      run();
    },
    getState: () => ({ list: slaList.serialize() }),
    setState: s => { if (s.list) slaList.deserialize(s.list); },
  });

  /* ---------- PoE and UPS ---------- */
  let poeList;
  U.register("power", {
    init() {
      const err = $("power-error"), out = $("power-out");
      const classOpts = [["", "Custom watts"], ...Cap.POE_CLASSES.map(c => [String(c.watts), `${c.label}: ${c.watts} W`])];
      const run = () => {
        U.hideError(err);
        out.hidden = true;
        try {
          const items = poeList.rows().map(r => ({ qty: Number(r.qty) || 0, watts: Number(r.watts) || 0, name: r.name }));
          const budget = U.need($("power-budget"), "the switch PoE budget");
          const r = Cap.poeBudget(items, budget);
          U.renderBox(out, {
            label: `${r.ports} powered port${r.ports === 1 ? "" : "s"}`,
            primary: `${Calc.Units.trimNumber(r.used, 1)} W of ${Calc.Units.trimNumber(budget, 1)} W`,
            secondary: r.remaining >= 0 ? `${Calc.Units.trimNumber(r.remaining, 1)} W left (${r.pct.toFixed(0)}% used). Keep 20% spare for startup surges and future devices.` : `Over budget by ${Calc.Units.trimNumber(-r.remaining, 1)} W: some devices will not power up.`,
          });
          const meter = U.el("div", "meter" + (r.pct > 100 ? " over" : r.pct > 80 ? " warn" : ""));
          const bar = document.createElement("span");
          bar.style.width = `${Math.min(100, r.pct || 0)}%`;
          meter.appendChild(bar);
          out.appendChild(meter);
        } catch (e) {
          U.showError(err, e.message);
        }
      };
      poeList = U.makeList($("power-list"), [
        { key: "name", type: "text", cls: "name-input", label: "Device", placeholder: "Device" },
        { key: "qty", type: "number", cls: "qty-input", label: "Quantity", placeholder: "Qty", min: 0, step: 1, default: 1 },
        { key: "cls", type: "select", label: "PoE class", options: classOpts },
        { key: "watts", type: "number", cls: "num-input", label: "Watts each", placeholder: "W each", min: 0, step: "any" },
      ], [
        { name: "Wi-Fi 6 access point", qty: 6, cls: "30", watts: 25.5 },
        { name: "IP camera", qty: 12, cls: "15.4", watts: 8 },
        { name: "Desk phone", qty: 20, cls: "7", watts: 4.5 },
      ], run);
      // Picking a class fills in its worst-case watts.
      $("power-list").addEventListener("change", e => {
        if (e.target.dataset.key === "cls" && e.target.value) {
          const w = e.target.parentElement.querySelector('[data-key="watts"]');
          w.value = e.target.value;
          run();
        }
      });
      $("power-add").addEventListener("click", () => poeList.addRow({ qty: 1 }).querySelector("input").focus());
      U.live([$("power-budget")], run);

      U.live(["power-load", "power-ups", "power-wh", "power-eff", "power-age"].map($), () => {
        $("power-ups-results").hidden = true;
        const r = Cap.upsRuntime({
          loadWatts: U.need($("power-load"), "the load"), upsWatts: U.num($("power-ups")) || 0, batteryWh: U.need($("power-wh"), "the battery capacity"),
          efficiencyPct: U.need($("power-eff"), "the inverter efficiency"), agingPct: U.num($("power-age")) || 0,
        });
        const rows = [["Estimated runtime", Cap.formatDuration(r.seconds)]];
        if (r.loadPct !== null) rows.push(["UPS load", `${r.loadPct.toFixed(0)}%${r.overloaded ? " (OVERLOADED: the UPS will shut off)" : r.loadPct > 80 ? " (above 80%: little headroom)" : ""}`, { copy: false }]);
        rows.push(["Time to shut down servers safely", r.seconds >= 600 ? "Enough for a scripted shutdown" : "Tight: set shutdown to start within the first minutes", { copy: false }]);
        U.renderKV($("power-ups-results"), rows);
      }, $("power-ups-error"));
    },
    getState: () => ({ list: poeList.serialize() }),
    setState: s => { if (s.list) poeList.deserialize(s.list); },
  });
})();
