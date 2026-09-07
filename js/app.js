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
      { label: "Binary (preferred)", units: Calc.Units.BINARY },
      { label: "Decimal", units: Calc.Units.DECIMAL },
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

  /* ---------- Storage / RAM estimator ---------- */
  const storageRowsEl = document.getElementById("storage-rows");
  const storageError = document.getElementById("storage-error");
  const storageResult = document.getElementById("storage-result");
  let storageRowCount = 0;

  function addStorageRow() {
    const isFirst = storageRowCount === 0;
    const rowId = storageRowCount++;
    const row = document.createElement("div");
    row.className = "storage-row";
    row.dataset.rowId = rowId;

    let html = "";
    if (isFirst) {
      html += `<span style="flex:0 0 64px; color:var(--text-muted); font-size:0.9rem;">Start</span>`;
    } else {
      html += `<select class="operator-select">
        <option value="+">+</option>
        <option value="-">-</option>
        <option value="*">x</option>
        <option value="/">/</option>
      </select>`;
    }
    html += `<input type="number" class="amount-input" step="any" value="1">`;
    html += `<select class="unit-select"></select>`;
    if (!isFirst) {
      html += `<button type="button" class="remove-row" title="Remove row">&times;</button>`;
    }
    row.innerHTML = html;
    storageRowsEl.appendChild(row);

    populateUnitSelect(row.querySelector(".unit-select"), "GiB");

    const removeBtn = row.querySelector(".remove-row");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => row.remove());
    }
  }

  document.getElementById("storage-add-row").addEventListener("click", addStorageRow);
  addStorageRow(); // seed with first row
  addStorageRow(); // and one operation row for convenience

  document.getElementById("storage-calc").addEventListener("click", () => {
    hideError(storageError);
    storageResult.hidden = true;
    try {
      const rowEls = [...storageRowsEl.querySelectorAll(".storage-row")];
      if (rowEls.length === 0) throw new Error("Add at least one row");

      const steps = rowEls.map(rowEl => {
        const opSelect = rowEl.querySelector(".operator-select");
        const amount = Number(rowEl.querySelector(".amount-input").value);
        const unit = rowEl.querySelector(".unit-select").value;
        if (!isFinite(amount)) throw new Error("All amounts must be valid numbers");
        return { operator: opSelect ? opSelect.value : "+", amount, unit };
      });

      const totalBytes = Calc.Storage.reduceSteps(steps);
      const both = Calc.Units.formatBoth(totalBytes);

      storageResult.innerHTML = `
        <div class="primary">${both.binary}</div>
        <div class="secondary">${both.decimal}</div>
        <div class="secondary">${totalBytes.toLocaleString()} bytes</div>
      `;
      storageResult.hidden = false;
    } catch (e) {
      showError(storageError, e.message);
    }
  });
})();
