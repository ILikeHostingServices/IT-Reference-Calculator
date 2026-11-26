/* js/ui/network.js v1.2.1 (Last Rev: 2026-11-25) */
/* UI: Network tools - subnet planner (IPv4 VLSM, route summarization, IPv6 prefix split), IPv4 subnet,
   IPv4 toolkit, IPv6 subnet, IPv6 toolkit, MAC address, and port reference. IP Reference and
   Quick Links are static pages with no code. */
(function () {
  "use strict";
  const U = Calc.UI, $ = U.$;

  /* ---------- IPv4 Subnet ---------- */
  U.register("ipv4", {
    init() {
      const addr = $("ipv4-address"), prefix = $("ipv4-prefix"), err = $("ipv4-error"), out = $("ipv4-results");
      U.live([addr, prefix], () => {
        out.hidden = true;
        let ip = U.val(addr).trim();
        let p = U.need(prefix, "a prefix length");
        if (ip.includes("/")) {
          const [a, b] = ip.split("/");
          ip = a;
          if (b !== "") { p = Number(b); prefix.value = b; addr.value = a; }
        }
        const info = Calc.IPv4.subnetInfo(ip, p);
        U.renderKV(out, [
          ["IP address", info.ip],
          ["Prefix / CIDR", `/${info.prefix}`],
          ["Netmask", info.netmask],
          ["Wildcard mask", info.wildcardMask],
          ["Network address", info.network],
          ["Broadcast address", info.prefix >= 31 ? "None (/31 and /32)" : info.broadcast],
          ["First usable host", info.firstHost],
          ["Last usable host", info.lastHost],
          ["Total addresses", info.totalAddresses.toLocaleString()],
          ["Usable hosts", info.usableHosts.toLocaleString()],
          ["Class (informational)", info.ipClass, { copy: false }],
          ["Private (RFC 1918, loopback, link-local)", info.isPrivate ? "Yes" : "No", { copy: false }],
        ]);
      }, err);
    },
  });

  /* ---------- Subnet Planner ---------- */
  let plannerList;
  U.register("planner", {
    init() {
      const base = $("planner-base"), err = $("planner-error"), out = $("planner-out");
      const run = () => {
        U.hideError(err);
        out.innerHTML = "";
        try {
          const reqs = plannerList.rows()
            .filter(r => r.hosts !== "")
            .map(r => ({ name: r.name.trim(), hosts: Number(r.hosts) }));
          reqs.forEach(r => { if (!Number.isInteger(r.hosts) || r.hosts < 1) throw new Error(`"${r.name || "Subnet"}" needs a whole number of hosts (1 or more)`); });
          const plan = Calc.Net.planSubnets(U.val(base), reqs);
          U.renderData(out, ["Name", "Hosts", "Subnet", "Netmask", "Usable range", "Broadcast", "Usable", "Spare"],
            plan.allocations.map(a => [a.name, String(a.hosts), a.cidr, a.netmask, a.range, a.broadcast, a.usable.toLocaleString(), a.spare.toLocaleString()]),
            { monoCols: [2, 3, 4, 5], caption: "Subnet plan" });
          const pct = (plan.used / plan.total) * 100;
          const summary = U.el("p", "notes", `Used ${plan.used.toLocaleString()} of ${plan.total.toLocaleString()} addresses in ${plan.base} (${pct.toFixed(1)}%). Free space: ${plan.free.length ? plan.free.join(", ") : "none"}.`);
          out.appendChild(summary);
          const meter = U.el("div", "meter" + (pct > 90 ? " warn" : ""));
          const bar = document.createElement("span");
          bar.style.width = `${Math.min(100, pct)}%`;
          meter.appendChild(bar);
          out.appendChild(meter);
        } catch (e) {
          U.showError(err, e.message);
        }
      };
      plannerList = U.makeList($("planner-list"), [
        { key: "name", type: "text", cls: "name-input", label: "Subnet name", placeholder: "Name (for example Staff VLAN)" },
        { key: "hosts", type: "number", cls: "num-input", label: "Hosts needed", placeholder: "Hosts", min: 1, step: 1 },
      ], [
        { name: "Staff", hosts: 300 }, { name: "Wi-Fi Guests", hosts: 200 }, { name: "Servers", hosts: 50 },
        { name: "Printers", hosts: 20 }, { name: "Management", hosts: 10 }, { name: "Firewall link", hosts: 2 },
      ], run);
      $("planner-add").addEventListener("click", () => plannerList.addRow({}).querySelector("input").focus());
      U.live([base], run);

      const summ = $("planner-summ"), summErr = $("planner-summ-error"), summOut = $("planner-summ-results");
      U.live([summ], () => {
        summOut.hidden = true;
        const nets = U.val(summ).split(/[\s,;]+/).filter(Boolean);
        const r = Calc.Net.summarize(nets);
        U.renderKV(summOut, [
          ["Exact summary", r.exact.join(", ")],
          ["Routes", `${nets.length} in, ${r.exact.length} out`, { copy: false }],
          ["Smallest single supernet", r.supernet],
          ["Extra addresses the supernet adds", r.extraAddresses.toLocaleString(), { copy: false }],
        ]);
      }, summErr);

      // Split an IPv6 prefix (was the separate IPv6 Planner).
      const v6 = $("planner-v6net"), v6new = $("planner-v6new"), v6from = $("planner-v6from"), v6out = $("planner-v6-out");
      U.live([v6, v6new, v6from], () => {
        v6out.innerHTML = "";
        const [addr, p] = U.val(v6).trim().split("/");
        if (p === undefined) throw new Error("Include the prefix length, for example 2001:db8:abcd::/48");
        const newPrefix = U.need(v6new, "the new prefix length");
        const r = Calc.IPv6Plan.split(addr, Number(p), newPrefix, 16, U.num(v6from) || 1);
        v6out.appendChild(U.el("p", "notes", `${r.base} holds ${r.count.toLocaleString()} subnets of /${newPrefix}, each with ${r.perSubnet.toLocaleString()} addresses.${r.nibbleAligned ? "" : " Not on a 4-bit boundary, so subnets do not line up with hex digits."}`));
        const rows = [...r.subnets];
        if (r.last) rows.push({ number: "...", id: "", cidr: "" }, r.last);
        U.renderData(v6out, ["Number", "Subnet ID (hex)", "Subnet"], rows.map(s => [s.number.toLocaleString(), s.id, s.cidr]), { monoCols: [1, 2], caption: "IPv6 subnets" });
      }, $("planner-v6-error"));
    },
    getState: () => ({ list: plannerList.serialize() }),
    setState: s => { if (s.list) plannerList.deserialize(s.list); },
    clearAll: () => plannerList.clear(),
    restoreExamples: () => plannerList.restore(),
  });

  /* ---------- IPv4 Toolkit ---------- */
  U.register("v4tools", {
    init() {
      const ip = $("v4tools-ip"), net = $("v4tools-net"), inErr = $("v4tools-in-error"), inOut = $("v4tools-in-out");
      U.live([ip, net], () => {
        inOut.hidden = true;
        const r = Calc.Net.inSubnet(U.val(ip), U.val(net));
        const range = `${Calc.IPv4.uint32ToIp(r.net.network)} - ${Calc.IPv4.uint32ToIp(r.net.broadcast)}`;
        U.renderBox(inOut, { label: `${U.val(ip).trim()} in ${Calc.Net.cidrString(r.net.network, r.net.prefix)}?`, primary: r.inside ? "Yes, it is inside" : "No, it is outside", secondary: `That subnet covers ${range}${r.net.aligned ? "" : ` (you typed a host address; the network is ${Calc.Net.cidrString(r.net.network, r.net.prefix)})`}.` });
      }, inErr);

      const start = $("v4tools-start"), end = $("v4tools-end"), rErr = $("v4tools-range-error"), rOut = $("v4tools-range-out");
      U.live([start, end], () => {
        rOut.hidden = true;
        const blocks = Calc.Net.rangeToCidrs(U.val(start), U.val(end));
        rOut.textContent = blocks.join("\n");
        rOut.hidden = false;
      }, rErr);

      const acl = $("v4tools-acl"), aErr = $("v4tools-acl-error"), aOut = $("v4tools-acl-results");
      U.live([acl], () => {
        aOut.hidden = true;
        const r = Calc.Net.aclWildcard(U.val(acl));
        U.renderKV(aOut, [["Network", r.network], ["Wildcard mask", r.wildcard], ["ACL / OSPF form", r.cisco]]);
      }, aErr);
    },
  });

  /* ---------- IPv6 Subnet ---------- */
  U.register("ipv6", {
    init() {
      const addr = $("ipv6-address"), prefix = $("ipv6-prefix"), err = $("ipv6-error"), out = $("ipv6-results");
      U.live([addr, prefix], () => {
        out.hidden = true;
        let ip = U.val(addr).trim();
        let p = U.need(prefix, "a prefix length");
        if (ip.includes("/")) {
          const [a, b] = ip.split("/");
          ip = a;
          if (b !== "") { p = Number(b); prefix.value = b; addr.value = a; }
        }
        const info = Calc.IPv6.subnetInfo(ip, p);
        U.renderKV(out, [
          ["Address type", info.type, { copy: false }],
          ...(info.embeddedIPv4 ? [["Embedded IPv4 address", info.embeddedIPv4]] : []),
          ["Expanded address", info.expanded],
          ["Compressed address", info.compressed],
          ["Prefix length", `/${info.prefix}`],
          ["Network (compressed)", `${info.network}/${info.prefix}`],
          ["Network (expanded)", info.networkExpanded],
          ["Last address (compressed)", info.lastAddress],
          ["Last address (expanded)", info.lastAddressExpanded],
          ["Addresses in subnet", info.totalAddresses.toLocaleString()],
          ...(info.subnets64 ? [["/64 networks in this prefix", info.subnets64.toLocaleString(), { copy: false }]] : []),
          ["Reverse DNS (PTR) name", info.ptr],
        ]);
      }, err);
    },
  });

  /* ---------- IPv6 Toolkit ---------- */
  U.register("v6tools", {
    init() {
      const ip = $("v6tools-ip"), net = $("v6tools-net"), inErr = $("v6tools-in-error"), inOut = $("v6tools-in-out");
      U.live([ip, net], () => {
        inOut.hidden = true;
        const r = Calc.IPv6Plan.inPrefix(U.val(ip), U.val(net));
        U.renderBox(inOut, { label: `${U.val(ip).trim()} in ${r.network}?`, primary: r.inside ? "Yes, it is inside" : "No, it is outside", secondary: `That prefix covers ${r.network} through ${r.last}${r.aligned ? "" : " (you typed a host address; the prefix starts at the network shown)"}.` });
      }, inErr);

      const pfx = $("v6tools-prefix"), mac = $("v6tools-mac"), eErr = $("v6tools-eui-error"), eOut = $("v6tools-eui-results");
      U.live([pfx, mac], () => {
        eOut.hidden = true;
        const r = Calc.IPv6Plan.eui64Address(U.val(pfx).split("/")[0], U.val(mac));
        U.renderKV(eOut, [["Interface ID (EUI-64)", r.interfaceId], ["Global address", r.address], ["Expanded", r.expanded], ["Link-local address", r.linkLocal]]);
      }, eErr);

      const ulaOut = $("v6tools-ula-results");
      const ula = () => {
        const r = Calc.IPv6Plan.ulaPrefix([...crypto.getRandomValues(new Uint8Array(5))]);
        U.renderKV(ulaOut, [["Your /48 prefix", r.prefix], ["First /64 network", r.firstSubnet], ["Global ID (40 bits)", r.globalId]]);
      };
      $("v6tools-ula-gen").addEventListener("click", ula);
      ula();
    },
  });

  /* ---------- IP Reference and Quick Links: static tables and links, nothing to compute ---------- */
  U.register("ipref", {});
  U.register("links", {});

  /* ---------- MAC ---------- */
  U.register("mac", {
    init() {
      const input = $("mac-input"), err = $("mac-error"), out = $("mac-results");
      U.live([input], () => {
        out.hidden = true;
        const bytes = Calc.MAC.parse(U.val(input));
        const f = Calc.MAC.formats(bytes);
        const d = Calc.MAC.describe(bytes);
        U.renderKV(out, [
          ["Colon (IEEE)", f.colon], ["Lowercase colon (Linux)", f.colonLower], ["Dash (Windows)", f.dash],
          ["Cisco dotted", f.cisco], ["No separators", f.bare], ["OUI (vendor prefix)", d.oui],
          ["Type", d.kind, { copy: false }], ["Administered", d.admin, { copy: false }],
          ["IPv6 EUI-64 interface ID", Calc.MAC.eui64(bytes)],
        ]);
      }, err);
    },
  });

  /* ---------- Port Reference ---------- */
  U.register("ports", {
    init() {
      const q = $("ports-q"), tbody = $("ports-table").querySelector("tbody"), count = $("ports-count");
      const matches = (p, term) => {
        if (!term) return true;
        if (/^\d+$/.test(term)) {
          const n = Number(term);
          if (typeof p.port === "string") { const [a, b] = p.port.split("-").map(Number); return n >= a && n <= b; }
          return String(p.port).startsWith(term);
        }
        return `${p.service} ${p.note} ${p.proto}`.toLowerCase().includes(term);
      };
      U.live([q], () => {
        const term = q.value.trim().toLowerCase();
        const list = Calc.Ports.filter(p => matches(p, term));
        tbody.innerHTML = "";
        list.forEach(p => {
          const tr = document.createElement("tr");
          [String(p.port), p.proto, p.service, p.note].forEach(t => { const td = document.createElement("td"); td.textContent = t; tr.appendChild(td); });
          tbody.appendChild(tr);
        });
        U.labelCells($("ports-table"));
        count.textContent = term ? `${list.length} of ${Calc.Ports.length} ports match.` : `${Calc.Ports.length} common ports.`;
      });
    },
  });
})();
