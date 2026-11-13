/* js/ui/display.js v1.0.0 (Last Rev: 2026-11-13) */
/* UI: Display - resolutions by aspect ratio, resolution to aspect ratio lookup, and pixel density. */
(function () {
  "use strict";
  const U = Calc.UI, $ = U.$;

  // Ultrawide "21:9" panels run up to ~2.9% off true 21:9; standard groups are 6%+ apart.
  const MARKETED_TOLERANCE_PCT = 3;

  U.register("resolution", {
    init() {
      const input = $("res-input"), err = $("res-error"), results = $("res-results"), showGroup = $("res-show-group");
      const groupSel = $("res-group"), summary = $("res-group-summary"), groupTable = $("res-group-table");

      Calc.Resolution.listGroups().forEach(g => {
        const opt = document.createElement("option");
        opt.value = g.key;
        opt.textContent = g.label;
        groupSel.appendChild(opt);
      });
      const reducedKey = (w, h) => { const r = Calc.Resolution.lookup(w, h); return `${r.ratioW}:${r.ratioH}`; };

      function updateGroup() {
        const group = Calc.Resolution.getGroup(groupSel.value);
        summary.textContent = group.summary;
        const tbody = groupTable.querySelector("tbody");
        tbody.innerHTML = "";
        group.resolutions.forEach(r => {
          const tr = document.createElement("tr");
          tr.tabIndex = 0;
          tr.title = "Look up this resolution";
          [`${r.w} x ${r.h}${r.nominal ? " *" : ""}`, r.name, r.use].forEach(t => { const td = document.createElement("td"); td.textContent = t; tr.appendChild(td); });
          const pick = () => {
            input.value = `${r.w}x${r.h}`;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.scrollIntoView({ behavior: "smooth", block: "center" });
          };
          tr.addEventListener("click", pick);
          tr.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
          tbody.appendChild(tr);
        });
      }

      U.live([input], () => {
        results.hidden = true;
        showGroup.hidden = true;
        if (input.value.trim() === "") return;
        const { w, h } = Calc.Resolution.parse(input.value);
        const r = Calc.Resolution.lookup(w, h);
        const exact = `${r.ratioW}:${r.ratioH}`;
        const near = r.nearest.group;
        const nearLabel = r.nearest.rotated ? `${near.h}:${near.w}, portrait ${near.label}` : near.label;
        const nearReduced = r.nearest.rotated ? reducedKey(near.h, near.w) : reducedKey(near.w, near.h);
        let standard;
        if (exact === nearReduced) standard = `${nearLabel} - exact match`;
        else if (r.nearest.diffPct <= MARKETED_TOLERANCE_PCT) standard = `${nearLabel} - nominal match (${Calc.Units.trimNumber(r.nearest.diffPct, 2)}% off)`;
        else standard = `No standard ratio (closest is ${nearLabel}, ${Calc.Units.trimNumber(r.nearest.diffPct, 1)}% off)`;
        const rows = [
          ["Exact aspect ratio", exact],
          ["Decimal ratio", `${Calc.Units.trimNumber(r.decimal, 3)}:1`],
          ["Standard ratio", standard, { copy: false }],
          ["Orientation", r.orientation, { copy: false }],
          ["Total pixels", `${r.totalPixels.toLocaleString()} (${Calc.Units.trimNumber(r.megapixels, 2)} MP)`],
        ];
        if (r.known) {
          rows.push(["Standard name", `${r.known.res.name}${r.known.rotated ? ` (rotated to ${r.orientation.toLowerCase()})` : ""}`]);
          rows.push(["Typical use", r.known.res.use, { copy: false }]);
        } else rows.push(["Standard name", "Not in the standard list", { copy: false }]);
        U.renderKV(results, rows);
        const key = r.known ? r.known.group.key : r.nearest.diffPct <= MARKETED_TOLERANCE_PCT ? near.key : null;
        if (key) {
          showGroup.textContent = `Show All ${Calc.Resolution.getGroup(key).label} Resolutions`;
          showGroup.dataset.group = key;
          showGroup.hidden = false;
        }
      }, err);

      U.live([input, $("res-diag")], () => {
        $("res-ppi-results").hidden = true;
        if (input.value.trim() === "") return;
        const { w, h } = Calc.Resolution.parse(input.value);
        const p = Calc.Capacity.ppi(w, h, U.need($("res-diag"), "a screen size"));
        const ft = p.retinaDistanceIn / 12;
        U.renderKV($("res-ppi-results"), [
          ["Pixel density", `${p.ppi.toFixed(1)} PPI`],
          ["Dot pitch", `${p.dotPitchMm.toFixed(3)} mm`],
          ["Screen width x height", `${p.widthIn.toFixed(1)} x ${p.heightIn.toFixed(1)} in (${(p.widthIn * 2.54).toFixed(1)} x ${(p.heightIn * 2.54).toFixed(1)} cm)`],
          ["Pixels stop being visible beyond", `${p.retinaDistanceIn.toFixed(0)} in (${ft.toFixed(1)} ft, ${(p.retinaDistanceIn * 2.54 / 100).toFixed(2)} m)`, { copy: false }],
          ["Windows scaling to start with", p.ppi < 110 ? "100%" : p.ppi < 140 ? "125%" : p.ppi < 170 ? "150%" : p.ppi < 210 ? "175% to 200%" : "200% or more", { copy: false }],
        ]);
      }, $("res-ppi-error"));

      showGroup.addEventListener("click", () => {
        groupSel.value = showGroup.dataset.group;
        updateGroup();
        groupSel.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      groupSel.addEventListener("change", updateGroup);
      updateGroup();
    },
  });
})();
