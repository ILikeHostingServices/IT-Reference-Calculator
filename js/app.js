/* app.js - DOM wiring for the IT Calculator UI. Depends on units.js, ipv4.js, ipv6.js, raid.js, storage.js. */
(function () {
  "use strict";

  /* ---------- Tabs ---------- */
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });

  /* ---------- Shared helpers ---------- */
  function showError(el, message) {
    el.textContent = message;
    el.hidden = false;
  }
  function hideError(el) {
    el.hidden = true;
    el.textContent = "";
  }
  function renderTable(tableEl, rows) {
    const tbody = tableEl.querySelector("tbody");
    tbody.innerHTML = "";
    rows.forEach(([label, value]) => {
      const tr = document.createElement("tr");
      const tdLabel = document.createElement("td");
      const tdValue = document.createElement("td");
      tdLabel.textContent = label;
      tdValue.textContent = value;
      tr.append(tdLabel, tdValue);
      tbody.appendChild(tr);
    });
    tableEl.hidden = false;
  }

  // Populate a <select> with unit options grouped Binary (preferred) / Decimal.
  function populateUnitSelect(selectEl, defaultUnit) {
    selectEl.innerHTML = "";
    const groups = [
      { label: "Binary (OS / RAM)", units: Calc.Units.BINARY },
      { label: "Decimal (drive labels)", units: Calc.Units.DECIMAL },
    ];
    groups.forEach(g => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = g.label;
      g.units.forEach(u => {
        if (u.key === "B" && g.label.startsWith("Decimal")) return; // avoid duplicate "B" entry
        const opt = document.createElement("option");
        opt.value = u.key;
        opt.textContent = u.key;
        optgroup.appendChild(opt);
      });
      selectEl.appendChild(optgroup);
    });
    selectEl.value = defaultUnit;
  }

  /* ---------- IPv4 ---------- */
  const ipv4Error = document.getElementById("ipv4-error");
  const ipv4Results = document.getElementById("ipv4-results");
  document.getElementById("ipv4-calc").addEventListener("click", () => {
    hideError(ipv4Error);
    ipv4Results.hidden = true;
    try {
      const ip = document.getElementById("ipv4-address").value;
      const prefix = Number(document.getElementById("ipv4-prefix").value);
      const info = Calc.IPv4.subnetInfo(ip, prefix);
      renderTable(ipv4Results, [
        ["IP address", info.ip],
        ["Prefix / CIDR", `/${info.prefix}`],
        ["Netmask", info.netmask],
        ["Wildcard mask", info.wildcardMask],
        ["Network address", info.network],
        ["Broadcast address", info.broadcast],
        ["First usable host", info.firstHost],
        ["Last usable host", info.lastHost],
        ["Total addresses", info.totalAddresses.toLocaleString()],
        ["Usable hosts", info.usableHosts.toLocaleString()],
        ["Class (informational)", info.ipClass],
        ["Private (RFC1918/loopback/link-local)", info.isPrivate ? "Yes" : "No"],
      ]);
    } catch (e) {
      showError(ipv4Error, e.message);
    }
  });

  /* ---------- IPv6 ---------- */
  const ipv6Error = document.getElementById("ipv6-error");
  const ipv6Results = document.getElementById("ipv6-results");
  document.getElementById("ipv6-calc").addEventListener("click", () => {
    hideError(ipv6Error);
    ipv6Results.hidden = true;
    try {
      const ip = document.getElementById("ipv6-address").value;
      const prefix = Number(document.getElementById("ipv6-prefix").value);
      const info = Calc.IPv6.subnetInfo(ip, prefix);
      renderTable(ipv6Results, [
        ["Expanded address", info.expanded],
        ["Compressed address", info.compressed],
        ["Prefix length", `/${info.prefix}`],
        ["Network (compressed)", info.network],
        ["Network (expanded)", info.networkExpanded],
        ["Last address in subnet (compressed)", info.lastAddress],
        ["Last address in subnet (expanded)", info.lastAddressExpanded],
        ["Total addresses in subnet", info.totalAddressesStr],
      ]);
    } catch (e) {
      showError(ipv6Error, e.message);
    }
  });

  /* ---------- RAID ---------- */
  const raidLevelSelect = document.getElementById("raid-level");
  const raidSizeUnitSelect = document.getElementById("raid-size-unit");
  const raidGroupsRow = document.getElementById("raid-groups-row");
  const raidError = document.getElementById("raid-error");
  const raidResults = document.getElementById("raid-results");
  const raidNotes = document.getElementById("raid-notes");

  Calc.RAID.listLevels().forEach(l => {
    const opt = document.createElement("option");
    opt.value = l.key;
    opt.textContent = `${l.label} (min ${l.minDisks} disks)`;
    raidLevelSelect.appendChild(opt);
  });
  raidLevelSelect.value = "raid5";
  populateUnitSelect(raidSizeUnitSelect, "TiB");

  function syncRaidGroupsVisibility() {
    const level = Calc.RAID.getLevel(raidLevelSelect.value);
    raidGroupsRow.hidden = !level.needsGroups;
    if (level.needsGroups) {
      document.getElementById("raid-groups").value = level.defaultGroups;
    }
  }
  raidLevelSelect.addEventListener("change", syncRaidGroupsVisibility);
  syncRaidGroupsVisibility();

  document.getElementById("raid-calc").addEventListener("click", () => {
    hideError(raidError);
    raidResults.hidden = true;
    raidNotes.hidden = true;
    try {
      const level = raidLevelSelect.value;
      const diskCount = Number(document.getElementById("raid-disks").value);
      const sizeAmount = Number(document.getElementById("raid-size").value);
      const sizeUnit = raidSizeUnitSelect.value;
      const diskSizeBytes = Calc.Units.toBytes(sizeAmount, sizeUnit);
      const groups = raidGroupsRow.hidden ? undefined : Number(document.getElementById("raid-groups").value);

      const result = Calc.RAID.calculate(level, diskCount, diskSizeBytes, groups);
      const usable = Calc.Units.formatBoth(result.usableBytes);
      const raw = Calc.Units.formatBoth(result.rawBytes);
      const overhead = Calc.Units.formatBoth(result.overheadBytes);

      const rows = [
        ["RAID level", result.label],
        ["Disk count", result.diskCount],
      ];
      if (result.groups) rows.push(["Groups", result.groups]);
      rows.push(
        ["Raw capacity (binary)", raw.binary],
        ["Raw capacity (decimal)", raw.decimal],
        ["Usable capacity (binary)", usable.binary],
        ["Usable capacity (decimal)", usable.decimal],
        ["Overhead (binary)", overhead.binary],
        ["Overhead (decimal)", overhead.decimal],
        ["Storage efficiency", `${Calc.Units.trimNumber(result.efficiencyPct, 1)}%`],
        ["Fault tolerance", result.faultTolerance],
      );
      renderTable(raidResults, rows);
      raidNotes.textContent = result.notes;
      raidNotes.hidden = false;
    } catch (e) {
      showError(raidError, e.message);
    }
  });

  /* ---------- Storage / RAM ---------- */
  // Parse a number input; returns null when empty or not a valid non-negative number.
  function readAmount(inputEl) {
    if (inputEl.value.trim() === "") return null;
    const n = Number(inputEl.value);
    return isFinite(n) && n >= 0 ? n : null;
  }

  // Human-friendly number for unit tables: grouped digits, tiny values in exponent form.
  function formatAmount(value) {
    if (value !== 0 && Math.abs(value) < 0.0001) return value.toExponential(3);
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }

  function formatBothLine(bytes) {
    const both = Calc.Units.formatBoth(bytes);
    return `${both.binary} (${both.decimal})`;
  }

  /* Convert */
  const convAmount = document.getElementById("conv-amount");
  const convUnit = document.getElementById("conv-unit");
  const convResults = document.getElementById("conv-results");
  const convEmpty = document.getElementById("conv-empty");
  populateUnitSelect(convUnit, "TB");

  function renderUnitTable(tableEl, units, bytes) {
    const best = Calc.Units.bestUnit(bytes, units === Calc.Units.DECIMAL ? "decimal" : "binary");
    const tbody = tableEl.querySelector("tbody");
    tbody.innerHTML = "";
    units.filter(u => u.key !== "B").forEach(u => {
      const tr = document.createElement("tr");
      if (u.key === best) tr.className = "best";
      const tdValue = document.createElement("td");
      const tdUnit = document.createElement("td");
      tdValue.textContent = formatAmount(Calc.Units.fromBytes(bytes, u.key));
      tdUnit.textContent = u.key;
      tr.append(tdValue, tdUnit);
      tbody.appendChild(tr);
    });
  }

  function updateConvert() {
    const amount = readAmount(convAmount);
    convEmpty.hidden = amount !== null;
    convResults.hidden = amount === null;
    if (amount === null) return;
    const bytes = Calc.Units.toBytes(amount, convUnit.value);
    renderUnitTable(document.getElementById("conv-binary"), Calc.Units.BINARY, bytes);
    renderUnitTable(document.getElementById("conv-decimal"), Calc.Units.DECIMAL, bytes);
  }
  convAmount.addEventListener("input", updateConvert);
  convUnit.addEventListener("change", updateConvert);
  updateConvert();

  /* Add it up */
  const storageItemsEl = document.getElementById("storage-items");
  const storageError = document.getElementById("storage-error");
  const storageTotal = document.getElementById("storage-total");
  const PRESETS = [
    { label: "16 GiB DIMM", amount: 16, unit: "GiB" },
    { label: "32 GiB DIMM", amount: 32, unit: "GiB" },
    { label: "64 GiB DIMM", amount: 64, unit: "GiB" },
    { label: "1 TB SSD", amount: 1, unit: "TB" },
    { label: "4 TB HDD", amount: 4, unit: "TB" },
    { label: "8 TB HDD", amount: 8, unit: "TB" },
  ];

  function addStorageItem(quantity, amount, unit, label) {
    const row = document.createElement("div");
    row.className = "storage-row";
    row.innerHTML = `
      <input type="number" class="qty-input" min="0" step="1" aria-label="Quantity">
      <span class="times">&times;</span>
      <input type="number" class="amount-input" min="0" step="any" aria-label="Size">
      <select class="unit-select" aria-label="Unit"></select>
      <input type="text" class="label-input" placeholder="Label (optional)" aria-label="Label">
      <button type="button" class="remove-row" title="Remove line" aria-label="Remove line">&times;</button>`;
    row.querySelector(".qty-input").value = quantity;
    row.querySelector(".amount-input").value = amount;
    row.querySelector(".label-input").value = label || "";
    populateUnitSelect(row.querySelector(".unit-select"), unit);
    row.querySelector(".remove-row").addEventListener("click", () => {
      row.remove();
      updateTotal();
    });
    storageItemsEl.appendChild(row);
    updateTotal();
    return row;
  }

  // Presets bump the quantity of a matching line instead of adding duplicates.
  PRESETS.forEach(p => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = `+ ${p.label}`;
    chip.addEventListener("click", () => {
      const match = [...storageItemsEl.querySelectorAll(".storage-row")].find(r =>
        Number(r.querySelector(".amount-input").value) === p.amount &&
        r.querySelector(".unit-select").value === p.unit);
      if (match) {
        const qty = match.querySelector(".qty-input");
        qty.value = (Number(qty.value) || 0) + 1;
        updateTotal();
      } else {
        addStorageItem(1, p.amount, p.unit, p.label);
      }
    });
    document.getElementById("storage-presets").appendChild(chip);
  });

  function updateTotal() {
    hideError(storageError);
    const rowEls = [...storageItemsEl.querySelectorAll(".storage-row")];
    if (rowEls.length === 0) {
      storageTotal.innerHTML = `<div class="secondary">Add a line or tap a preset above.</div>`;
      return;
    }
    try {
      const items = rowEls.map(rowEl => ({
        quantity: Number(rowEl.querySelector(".qty-input").value),
        amount: readAmount(rowEl.querySelector(".amount-input")) ?? NaN,
        unit: rowEl.querySelector(".unit-select").value,
      }));
      if (items.some(i => isNaN(i.amount))) throw new Error("Every line needs a size of zero or more");
      const totalBytes = Calc.Storage.total(items);
      const both = Calc.Units.formatBoth(totalBytes);
      const count = items.reduce((n, i) => n + i.quantity, 0);
      storageTotal.innerHTML = `
        <div class="label">Total of ${count.toLocaleString()} item${count === 1 ? "" : "s"}</div>
        <div class="primary">${both.binary}</div>
        <div class="secondary">${both.decimal} &middot; ${totalBytes.toLocaleString()} bytes</div>`;
    } catch (e) {
      showError(storageError, e.message);
    }
  }
  storageItemsEl.addEventListener("input", updateTotal);
  storageItemsEl.addEventListener("change", updateTotal);
  document.getElementById("storage-add-item").addEventListener("click", () => {
    addStorageItem(1, 1, "TB").querySelector(".amount-input").select();
  });
  addStorageItem(4, 32, "GiB", "DIMM"); // example line so the tool isn't blank

  /* Compare */
  const cmpA = document.getElementById("cmp-a-amount");
  const cmpAUnit = document.getElementById("cmp-a-unit");
  const cmpB = document.getElementById("cmp-b-amount");
  const cmpBUnit = document.getElementById("cmp-b-unit");
  const cmpResults = document.getElementById("cmp-results");
  const cmpEmpty = document.getElementById("cmp-empty");
  populateUnitSelect(cmpAUnit, "TB");
  populateUnitSelect(cmpBUnit, "GB");

  function updateCompare() {
    const a = readAmount(cmpA);
    const b = readAmount(cmpB);
    const ready = a !== null && b !== null;
    cmpEmpty.hidden = ready;
    cmpResults.hidden = !ready;
    if (!ready) return;

    const bytesA = Calc.Units.toBytes(a, cmpAUnit.value);
    const bytesB = Calc.Units.toBytes(b, cmpBUnit.value);
    const r = Calc.Storage.compare(bytesA, bytesB);
    const rows = [
      r.differenceBytes >= 0
        ? ["Left over (A - B)", formatBothLine(r.differenceBytes)]
        : ["Short by (B - A)", formatBothLine(-r.differenceBytes)],
    ];
    if (r.percentOfA !== null) rows.push(["B uses this much of A", `${Calc.Units.trimNumber(r.percentOfA, 2)}%`]);
    if (r.fits !== null) {
      rows.push(["Whole copies of B that fit in A", r.fits.toLocaleString()]);
      if (r.fits > 0) rows.push(["Space left after those copies", formatBothLine(r.leftoverBytes)]);
    }
    renderTable(cmpResults, rows);
  }
  [cmpA, cmpB].forEach(el => el.addEventListener("input", updateCompare));
  [cmpAUnit, cmpBUnit].forEach(el => el.addEventListener("change", updateCompare));
  updateCompare();

  /* ---------- Footer: version + build time ---------- */
  // No build step, so "build time" is the newest Last-Modified across the page's own
  // files as served (i.e. when they were last deployed/edited). Shown in US Eastern time.
  function formatEastern(date) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short",
    }).formatToParts(date).map(p => [p.type, p.value]));
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} ${parts.timeZoneName}`;
  }

  async function newestAssetDate() {
    if (location.protocol === "file:") return new Date(document.lastModified);
    const urls = [
      location.href.split("#")[0],
      ...[...document.querySelectorAll("link[rel=stylesheet][href], link[rel=icon][href], script[src]")]
        .map(el => el.href || el.src),
    ];
    const dates = await Promise.all(urls.map(url =>
      fetch(url, { method: "HEAD", cache: "no-cache" })
        .then(res => res.headers.get("Last-Modified"))
        .then(h => (h ? new Date(h) : null))
        .catch(() => null)));
    const valid = dates.filter(d => d && !isNaN(d));
    return valid.length ? new Date(Math.max(...valid)) : null;
  }

  const buildInfo = document.getElementById("build-info");
  buildInfo.textContent = `${Calc.APP_NAME} - v${Calc.VERSION}`;
  newestAssetDate().then(date => {
    if (date) buildInfo.textContent += ` - Built ${formatEastern(date)}`;
  });
})();
