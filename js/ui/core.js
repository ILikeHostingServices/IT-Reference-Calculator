/* js/ui/core.js v1.0.0 (Last Rev: 2026-11-12) */
/* UI core - shared DOM helpers for every tool: errors, key/value and data tables with copy buttons,
   unit pickers, editable row lists, clipboard, toasts, and the tool registry that app.js drives.
   Tool files (js/ui/*.js) call Calc.UI.register(id, { init, getState, setState }). */
window.Calc = window.Calc || {};

Calc.UI = (function () {
  "use strict";

  const $ = id => document.getElementById(id);
  const tools = {};

  // ILHS brand: Title Case for UI labels (every word capitalized). Leaves units and terms such as
  // "(s)", "MB/s", "x", "chmod", and anything already capitalized or containing digits untouched.
  const KEEP_LOWER = new Set(["s", "ms", "x", "l", "setuid", "setgid", "chmod", "ls", "vs", "i"]);
  function titleCase(text) {
    return String(text).replace(/(^|[\s(]|(?<=[A-Za-z])-)([a-z][a-z']*)(?![A-Za-z0-9.])/g,
      (m, pre, word) => (KEEP_LOWER.has(word) ? m : pre + word[0].toUpperCase() + word.slice(1)));
  }

  function register(id, def) {
    tools[id] = def;
  }

  function showError(el, message) {
    el.textContent = message;
    el.hidden = false;
  }
  function hideError(el) {
    el.hidden = true;
    el.textContent = "";
  }

  // Run fn now and whenever any of the elements change. Errors thrown by fn land in errorEl.
  function live(elements, fn, errorEl) {
    const run = () => {
      if (errorEl) hideError(errorEl);
      try {
        fn();
      } catch (e) {
        if (errorEl) showError(errorEl, e.message);
        else throw e;
      }
    };
    elements.forEach(el => {
      el.addEventListener("input", run);
      el.addEventListener("change", run);
    });
    run();
    return run;
  }

  // Number from an input; null when blank or not a finite number.
  function num(el) {
    const v = String(el.value).trim();
    if (v === "") return null;
    const n = Number(v);
    return isFinite(n) ? n : null;
  }
  function need(el, label) {
    const n = num(el);
    if (n === null) throw new Error(`Enter ${label}`);
    return n;
  }

  // ---- Clipboard and toast ----
  let toastTimer;
  function toast(message) {
    let el = $("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 1800);
  }

  async function copyText(text, label = "Copied") {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // Fallback for browsers without async clipboard permission.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.className = "sr-only";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      if (!ok) { toast("Copy failed. Select the text and copy it manually."); return false; }
    }
    toast(label);
    return true;
  }

  function copyButton(getText, label = "Copy") {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "copy-btn";
    b.textContent = label;
    b.setAttribute("aria-label", `${label} value`);
    b.addEventListener("click", async () => {
      if (await copyText(typeof getText === "function" ? getText() : getText)) {
        b.classList.add("done");
        b.textContent = "Copied";
        setTimeout(() => { b.classList.remove("done"); b.textContent = label; }, 1200);
      }
    });
    return b;
  }

  // Key/value table: rows are [label, value] or [label, value, { copy: false }].
  function renderKV(table, rows) {
    const tbody = table.querySelector("tbody");
    tbody.innerHTML = "";
    rows.forEach(([label, value, opts]) => {
      const tr = document.createElement("tr");
      const tdL = document.createElement("td");
      const tdV = document.createElement("td");
      const tdC = document.createElement("td");
      tdL.textContent = titleCase(label);
      tdV.textContent = value;
      tdC.className = "copy-cell";
      if (!(opts && opts.copy === false) && String(value) !== "") tdC.appendChild(copyButton(() => String(value)));
      tr.append(tdL, tdV, tdC);
      tbody.appendChild(tr);
    });
    table.hidden = false;
  }

  // Data table with headers, appended to container: rows are arrays of cell text; monoCols are
  // column indexes shown in mono. Callers clear the container first when they redraw.
  function renderData(container, headers, rows, { monoCols = [], caption } = {}) {
    const wrap = document.createElement("div");
    wrap.className = "table-scroll";
    // Keyboard users must be able to scroll a wide table (WCAG 2.1.1): make the region focusable.
    wrap.tabIndex = 0;
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", caption || "Scrollable table");
    const table = document.createElement("table");
    table.className = "result-table data-table";
    if (caption) {
      const c = document.createElement("caption");
      c.className = "sr-only";
      c.textContent = caption;
      table.appendChild(c);
    }
    const thead = document.createElement("thead");
    const htr = document.createElement("tr");
    headers.forEach(h => { const th = document.createElement("th"); th.textContent = titleCase(h); htr.appendChild(th); });
    thead.appendChild(htr);
    const tbody = document.createElement("tbody");
    rows.forEach(r => {
      const tr = document.createElement("tr");
      r.forEach((cell, i) => {
        const td = document.createElement("td");
        td.textContent = cell;
        if (monoCols.includes(i)) td.className = "mono";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.append(thead, tbody);
    wrap.appendChild(table);
    container.appendChild(wrap);
    return table;
  }

  // Severity list: items [{ level: ok|info|warn|error, text }].
  function renderIssues(container, items) {
    const ul = document.createElement("ul");
    ul.className = "issues";
    items.forEach(i => {
      const li = document.createElement("li");
      li.className = i.level;
      li.textContent = i.text;
      ul.appendChild(li);
    });
    container.appendChild(ul);
    return ul;
  }

  // Big result box: [{ label, primary, secondary }] -> label / big value / note.
  function renderBox(el, { label, primary, secondary }) {
    el.innerHTML = "";
    if (label) { const d = document.createElement("div"); d.className = "label"; d.textContent = titleCase(label); el.appendChild(d); }
    const p = document.createElement("div");
    p.className = "primary";
    p.textContent = primary;
    el.appendChild(p);
    if (secondary) { const s = document.createElement("div"); s.className = "secondary"; s.textContent = secondary; el.appendChild(s); }
    el.hidden = false;
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // ---- Unit pickers ----
  function populateUnitSelect(selectEl, defaultUnit) {
    selectEl.innerHTML = "";
    const groups = [
      { label: "Binary (OS / RAM)", units: Calc.Units.BINARY },
      { label: "Decimal (drive labels)", units: Calc.Units.DECIMAL },
    ];
    groups.forEach(g => {
      const og = document.createElement("optgroup");
      og.label = g.label;
      g.units.forEach(u => {
        if (u.key === "B" && g.label.startsWith("Decimal")) return;
        const opt = document.createElement("option");
        opt.value = u.key;
        opt.textContent = u.key;
        og.appendChild(opt);
      });
      selectEl.appendChild(og);
    });
    selectEl.value = defaultUnit;
  }

  const RATES = [
    { key: "Kbps", factor: 1e3 }, { key: "Mbps", factor: 1e6 }, { key: "Gbps", factor: 1e9 },
    { key: "MB/s", factor: 8e6 }, { key: "GB/s", factor: 8e9 },
  ];
  function populateRateSelect(selectEl, defaultKey) {
    selectEl.innerHTML = "";
    RATES.forEach(r => { const o = document.createElement("option"); o.value = r.key; o.textContent = r.key; selectEl.appendChild(o); });
    selectEl.value = defaultKey;
  }
  const rateFactor = key => RATES.find(r => r.key === key).factor;

  function formatBps(bps) {
    const units = [["Tbps", 1e12], ["Gbps", 1e9], ["Mbps", 1e6], ["Kbps", 1e3], ["bps", 1]];
    for (const [u, f] of units) if (bps >= f || u === "bps") return `${Calc.Units.trimNumber(bps / f, 2)} ${u}`;
    return `${bps} bps`;
  }
  function formatBoth(bytes) {
    const b = Calc.Units.formatBoth(bytes);
    return `${b.binary} (${b.decimal})`;
  }
  const fmt = (n, d = 2) => Number(n).toLocaleString(undefined, { maximumFractionDigits: d });

  // ---- Editable row lists (subnets, SLA components, PoE devices) ----
  // fields: [{ key, type: "text"|"number"|"select", cls, placeholder, label, options: [[value, text]], min, step }]
  // Serializes to "a~b~c|d~e~f" for share links.
  function makeList(container, fields, initialRows, onChange) {
    function addRow(values = {}) {
      const row = el("div", "list-row");
      fields.forEach(f => {
        let input;
        if (f.type === "select") {
          input = document.createElement("select");
          f.options.forEach(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; input.appendChild(o); });
        } else {
          input = document.createElement("input");
          input.type = f.type === "number" ? "number" : "text";
          if (f.min !== undefined) input.min = f.min;
          if (f.step !== undefined) input.step = f.step;
          if (f.placeholder) input.placeholder = f.placeholder;
          input.autocomplete = "off";
        }
        input.className = f.cls || "";
        input.dataset.key = f.key;
        input.dataset.nostate = "";
        input.setAttribute("aria-label", f.label);
        if (values[f.key] !== undefined) input.value = values[f.key];
        else if (f.default !== undefined) input.value = f.default;
        row.appendChild(input);
      });
      const rm = el("button", "remove-row", "×");
      rm.type = "button";
      rm.title = "Remove";
      rm.setAttribute("aria-label", "Remove this line");
      rm.addEventListener("click", () => { row.remove(); onChange(); });
      row.appendChild(rm);
      container.appendChild(row);
      return row;
    }
    function rows() {
      return [...container.querySelectorAll(".list-row")].map(r => {
        const o = {};
        r.querySelectorAll("[data-key]").forEach(i => { o[i.dataset.key] = i.value; });
        return o;
      });
    }
    function set(list) {
      container.innerHTML = "";
      list.forEach(addRow);
      onChange();
    }
    const serialize = () => rows().map(r => fields.map(f => encodeURIComponent(r[f.key] || "").replace(/~/g, "%7E")).join("~")).join("|");
    function deserialize(s) {
      if (!s) return;
      set(s.split("|").map(line => {
        const vals = line.split("~");
        const o = {};
        fields.forEach((f, i) => { o[f.key] = decodeURIComponent(vals[i] || ""); });
        return o;
      }));
    }
    container.addEventListener("input", onChange);
    container.addEventListener("change", onChange);
    initialRows.forEach(addRow);
    return { addRow: v => { const r = addRow(v); onChange(); return r; }, rows, set, serialize, deserialize };
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  return {
    $, tools, register, titleCase, showError, hideError, live, num, need, toast, copyText, copyButton,
    renderKV, renderData, renderIssues, renderBox, el, populateUnitSelect, populateRateSelect, rateFactor,
    formatBps, formatBoth, fmt, makeList, debounce,
  };
})();
