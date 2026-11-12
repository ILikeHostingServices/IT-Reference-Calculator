/* app.js - page shell: builds the grouped tool menu from the <section class="tool"> elements, routes
   between tools with the URL hash (#tool?field=value), keeps share links in sync with the inputs,
   adds Copy Link / Copy Results buttons, runs the Ctrl+K search, and fills in the footer.
   Must load last: every tool file has registered itself with Calc.UI by now. */
(function () {
  "use strict";
  const U = Calc.UI, $ = U.$;

  const sections = [...document.querySelectorAll("section.tool")];
  const toolIds = sections.map(s => s.dataset.tool);
  const DEFAULT_TOOL = toolIds[0];
  const EXTERNAL = [{ group: "Network", title: "SSL Certificate Checker", href: "https://sslchecker.syshost.app/" }];
  let current = null;

  /* ---------- Tool menu ---------- */
  const nav = $("toolnav");
  const groups = [];
  sections.forEach(s => {
    let g = groups.find(x => x.name === s.dataset.group);
    if (!g) groups.push(g = { name: s.dataset.group, items: [] });
    g.items.push({ id: s.dataset.tool, title: s.dataset.title });
  });
  groups.forEach(g => {
    const wrap = U.el("div", "group");
    wrap.appendChild(U.el("p", "nav-group", g.name));
    const ul = document.createElement("ul");
    g.items.forEach(item => {
      const li = document.createElement("li");
      const a = U.el("a", "", item.title);
      a.href = `#${item.id}`;
      a.dataset.tool = item.id;
      li.appendChild(a);
      ul.appendChild(li);
    });
    EXTERNAL.filter(x => x.group === g.name).forEach(x => {
      const li = document.createElement("li");
      const a = U.el("a", "ext", x.title);
      a.href = x.href;
      a.rel = "noopener";
      li.appendChild(a);
      ul.appendChild(li);
    });
    wrap.appendChild(ul);
    nav.appendChild(wrap);
  });

  // The menu is always open beside the tools on wide screens and collapsible on narrow ones.
  const navWrap = $("toolnav-wrap");
  const wide = window.matchMedia("(min-width: 960px)");
  const syncNav = () => { navWrap.open = wide.matches; };
  wide.addEventListener("change", syncNav);
  syncNav();

  /* ---------- Share state ---------- */
  // A field is shareable if it has an id, is not a password/file box, and is not marked data-nostate.
  const stateFields = section => [...section.querySelectorAll("input[id], select[id], textarea[id]")]
    .filter(el => !("nostate" in el.dataset) && !["password", "file", "search"].includes(el.type) && !el.closest("[data-nostate]"));
  const keyFor = (tool, el) => (el.id.startsWith(`${tool}-`) ? el.id.slice(tool.length + 1) : el.id);
  const valueOf = el => (el.type === "checkbox" ? (el.checked ? "1" : "0") : el.value);
  const defaults = {};

  function captureDefaults(section) {
    const tool = section.dataset.tool;
    defaults[tool] = {};
    stateFields(section).forEach(el => { defaults[tool][keyFor(tool, el)] = valueOf(el); });
    const def = U.tools[tool];
    if (def && def.getState) Object.assign(defaults[tool], def.getState());
  }

  function currentState(tool) {
    const section = $(`t-${tool}`);
    const state = {};
    stateFields(section).forEach(el => {
      const k = keyFor(tool, el), v = valueOf(el);
      if (v !== defaults[tool][k]) state[k] = v;
    });
    const def = U.tools[tool];
    if (def && def.getState) {
      Object.entries(def.getState()).forEach(([k, v]) => { if (v !== defaults[tool][k]) state[k] = v; });
    }
    return state;
  }

  function hashFor(tool, state) {
    const qs = new URLSearchParams(state).toString();
    return `#${tool}${qs ? `?${qs}` : ""}`;
  }

  function applyState(tool, params) {
    const section = $(`t-${tool}`);
    const def = U.tools[tool];
    const changed = [];
    Object.entries(params).forEach(([k, v]) => {
      const el = $(`${tool}-${k}`) || $(k);
      if (!el || !section.contains(el) || "nostate" in el.dataset) return;
      if (el.type === "checkbox") el.checked = v === "1";
      else el.value = v;
      changed.push(el);
    });
    // Selects that drive other fields go first, so dependent fields keep their shared values.
    changed.sort((a, b) => (a.tagName === "SELECT" ? -1 : 0) - (b.tagName === "SELECT" ? -1 : 0));
    changed.forEach(el => { el.dispatchEvent(new Event("change", { bubbles: true })); el.dispatchEvent(new Event("input", { bubbles: true })); });
    if (def && def.setState) def.setState(params);
    if (def && def.afterSetState) def.afterSetState(params);
  }

  const syncHash = U.debounce(() => {
    if (!current) return;
    const h = hashFor(current, currentState(current));
    if (location.hash !== h) history.replaceState(null, "", h);
  }, 300);

  /* ---------- Tool header buttons ---------- */
  function resultsText(section) {
    const parts = [section.querySelector(".tool-head h2").textContent];
    section.querySelectorAll(".result-table:not([hidden]), .result-box:not([hidden]), .output:not([hidden])").forEach(node => {
      if (node.closest("[hidden]")) return;
      if (node.tagName === "TABLE") {
        node.querySelectorAll("tr").forEach(tr => {
          const cells = [...tr.children].filter(c => !c.classList.contains("copy-cell")).map(c => c.textContent.trim());
          if (cells.join("")) parts.push(cells.join("\t"));
        });
      } else parts.push(node.innerText.trim());
    });
    return parts.join("\n");
  }
  sections.forEach(section => {
    const head = section.querySelector(".tool-head");
    const actions = U.el("div", "tool-actions");
    const link = U.el("button", "btn small", "Copy Link");
    link.type = "button";
    link.title = "Copy a link to this tool with your current inputs";
    link.addEventListener("click", () => {
      const tool = section.dataset.tool;
      U.copyText(`${location.origin}${location.pathname}${hashFor(tool, currentState(tool))}`, "Link copied");
    });
    const copy = U.el("button", "btn small", "Copy Results");
    copy.type = "button";
    copy.addEventListener("click", () => U.copyText(resultsText(section), "Results copied"));
    actions.append(link, copy);
    head.appendChild(actions);
    section.addEventListener("input", syncHash);
    section.addEventListener("change", syncHash);
    section.addEventListener("click", e => { if (e.target.closest(".remove-row, .chip, [id$='-add']")) syncHash(); });
  });

  /* ---------- Init every tool, then route ---------- */
  sections.forEach(section => {
    const def = U.tools[section.dataset.tool];
    try {
      if (def && def.init) def.init();
    } catch (e) {
      console.error(`Tool "${section.dataset.tool}" failed to start`, e);
    }
    captureDefaults(section);
  });

  function parseHash() {
    const raw = decodeURIComponent(location.hash.slice(1));
    const [tool, query] = location.hash.slice(1).split("?");
    const params = Object.fromEntries(new URLSearchParams(query || ""));
    // Old links and legacy tab names keep working.
    const aliases = { "": DEFAULT_TOOL, resolutions: "resolution", subnet: "ipv4", vlsm: "planner" };
    const id = toolIds.includes(tool) ? tool : aliases[tool] || (raw ? null : DEFAULT_TOOL);
    return { id: id || DEFAULT_TOOL, params };
  }

  function activate(id, { focus } = {}) {
    current = id;
    sections.forEach(s => s.classList.toggle("active", s.dataset.tool === id));
    nav.querySelectorAll("a[data-tool]").forEach(a => {
      if (a.dataset.tool === id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    const section = $(`t-${id}`);
    document.title = `${section.dataset.title} | IT Reference Calculator | ILHS`;
    if (!wide.matches) navWrap.open = false;
    if (focus) {
      const first = section.querySelector("input:not([type=checkbox]), textarea, select");
      (first || $("main")).focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    }
  }

  function route(opts) {
    const { id, params } = parseHash();
    activate(id, opts);
    if (Object.keys(params).length) applyState(id, params);
  }
  window.addEventListener("hashchange", () => route({ focus: true }));
  nav.addEventListener("click", e => {
    const a = e.target.closest("a[data-tool]");
    if (!a) return;
    e.preventDefault();
    if (a.dataset.tool !== current) {
      history.pushState(null, "", hashFor(a.dataset.tool, currentState(a.dataset.tool)));
      activate(a.dataset.tool, { focus: true });
    }
  });
  window.addEventListener("popstate", () => route({ focus: false }));
  route({ focus: false });

  /* ---------- Search palette (Ctrl+K or /) ---------- */
  const palette = $("palette"), pInput = $("palette-input"), pList = $("palette-list");
  const index = sections.map(s => ({ id: s.dataset.tool, title: s.dataset.title, group: s.dataset.group, text: `${s.dataset.title} ${s.dataset.group} ${s.dataset.keywords || ""}`.toLowerCase() }));
  let selected = 0, matches = index;
  function renderPalette() {
    const terms = pInput.value.toLowerCase().split(/\s+/).filter(Boolean);
    matches = index.filter(t => terms.every(term => t.text.includes(term)));
    selected = Math.min(selected, Math.max(0, matches.length - 1));
    pList.innerHTML = "";
    if (!matches.length) { pList.appendChild(U.el("li", "empty", "No tools match. Try another word.")); return; }
    matches.forEach((m, i) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `#${m.id}`;
      a.setAttribute("role", "option");
      a.setAttribute("aria-selected", i === selected ? "true" : "false");
      a.append(U.el("span", "", m.title), U.el("span", "grp", m.group));
      a.addEventListener("click", e => { e.preventDefault(); go(m.id); });
      li.appendChild(a);
      pList.appendChild(li);
    });
  }
  function go(id) {
    palette.close();
    if (id !== current) {
      history.pushState(null, "", hashFor(id, currentState(id)));
      activate(id, { focus: true });
    }
  }
  function openPalette() {
    pInput.value = "";
    selected = 0;
    renderPalette();
    palette.showModal();
    pInput.focus();
  }
  $("search-open").addEventListener("click", openPalette);
  pInput.addEventListener("input", () => { selected = 0; renderPalette(); });
  pInput.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { selected = Math.min(selected + 1, matches.length - 1); renderPalette(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { selected = Math.max(selected - 1, 0); renderPalette(); e.preventDefault(); }
    else if (e.key === "Enter" && matches[selected]) { go(matches[selected].id); e.preventDefault(); }
  });
  palette.addEventListener("click", e => { if (e.target === palette) palette.close(); });
  document.addEventListener("keydown", e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) {
      e.preventDefault();
      if (palette.open) palette.close(); else openPalette();
    }
  });

  /* ---------- Footer: version + build time ---------- */
  // No build step, so "build time" is the newest Last-Modified across the page's own files as
  // served (when they were last deployed). On Cloudflare the Worker supplies the header.
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
      ...[...document.querySelectorAll("link[rel=stylesheet][href], link[rel=icon][href], script[src]")].map(el => el.href || el.src),
    ];
    const dates = await Promise.all(urls.map(url =>
      fetch(url, { method: "HEAD", cache: "no-cache" })
        .then(res => res.headers.get("Last-Modified"))
        .then(h => (h ? new Date(h) : null))
        .catch(() => null)));
    const valid = dates.filter(d => d && !isNaN(d));
    return valid.length ? new Date(Math.max(...valid)) : null;
  }
  const buildInfo = $("build-info");
  buildInfo.textContent = `${Calc.APP_NAME} - v${Calc.VERSION}`;
  newestAssetDate().then(date => { if (date) buildInfo.textContent += ` - Built ${formatEastern(date)}`; });

  /* ---------- Offline support ---------- */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))) {
    navigator.serviceWorker.register("sw.js").catch(err => console.warn("Offline mode unavailable:", err));
  }
})();
