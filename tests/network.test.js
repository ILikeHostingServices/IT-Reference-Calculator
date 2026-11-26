/* tests/network.test.js v1.1.0 (Last Rev: 2026-11-25) */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Calc = require("./load");

test("IPv4 subnet info", () => {
  const i = Calc.IPv4.subnetInfo("192.168.1.10", 24);
  assert.equal(i.network, "192.168.1.0");
  assert.equal(i.broadcast, "192.168.1.255");
  assert.equal(i.usableHosts, 254);
  assert.equal(Calc.IPv4.subnetInfo("10.0.0.1", 31).usableHosts, 2);
});

test("range to CIDR blocks", () => {
  assert.deepEqual(Calc.Net.rangeToCidrs("192.168.1.10", "192.168.1.40"),
    ["192.168.1.10/31", "192.168.1.12/30", "192.168.1.16/28", "192.168.1.32/29", "192.168.1.40/32"]);
  assert.deepEqual(Calc.Net.rangeToCidrs("0.0.0.0", "255.255.255.255"), ["0.0.0.0/0"]);
  // Top bit set: the lowest-set-bit trick must not go negative.
  assert.deepEqual(Calc.Net.rangeToCidrs("128.0.0.0", "255.255.255.255"), ["128.0.0.0/1"]);
  assert.deepEqual(Calc.Net.rangeToCidrs("10.0.0.5", "10.0.0.5"), ["10.0.0.5/32"]);
  assert.throws(() => Calc.Net.rangeToCidrs("10.0.0.9", "10.0.0.1"), /must not be after/);
});

test("in subnet and ACL wildcard", () => {
  assert.equal(Calc.Net.inSubnet("10.1.3.77", "10.1.0.0/22").inside, true);
  assert.equal(Calc.Net.inSubnet("10.1.4.1", "10.1.0.0/22").inside, false);
  assert.equal(Calc.Net.aclWildcard("172.16.8.0/21").cisco, "172.16.8.0 0.0.7.255");
  assert.equal(Calc.Net.aclWildcard("10.0.0.9/32").cisco, "host 10.0.0.9");
  assert.throws(() => Calc.Net.parseCidr("10.0.0.0/33"), /Invalid prefix/);
});

test("VLSM plan places big subnets first and reports free space", () => {
  const plan = Calc.Net.planSubnets("10.20.0.0/22", [
    { name: "Staff", hosts: 300 }, { name: "Guests", hosts: 200 }, { name: "Link", hosts: 2 },
  ]);
  assert.equal(plan.allocations[0].cidr, "10.20.0.0/23");
  assert.equal(plan.allocations[1].cidr, "10.20.2.0/24");
  assert.equal(plan.allocations[2].cidr, "10.20.3.0/31");
  assert.equal(plan.allocations[2].usable, 2);
  assert.deepEqual(plan.free.slice(0, 2), ["10.20.3.2/31", "10.20.3.4/30"]);
  assert.throws(() => Calc.Net.planSubnets("10.0.0.0/24", [{ name: "Too big", hosts: 300 }]), /Not enough space/);
});

test("route summarization", () => {
  const r = Calc.Net.summarize(["192.168.0.0/24", "192.168.1.0/24", "192.168.2.0/24", "192.168.3.0/24"]);
  assert.deepEqual(r.exact, ["192.168.0.0/22"]);
  assert.equal(r.extraAddresses, 0);
  const gap = Calc.Net.summarize(["10.0.0.0/24", "10.0.2.0/24"]);
  assert.deepEqual(gap.exact, ["10.0.0.0/24", "10.0.2.0/24"]);
  assert.equal(gap.supernet, "10.0.0.0/22");
  assert.equal(gap.extraAddresses, 512);
});

test("MAC formats, bits, and EUI-64", () => {
  const b = Calc.MAC.parse("001a.2b3c.4d5e");
  assert.equal(Calc.MAC.formats(b).colon, "00:1A:2B:3C:4D:5E");
  assert.equal(Calc.MAC.formats(b).cisco, "001a.2b3c.4d5e");
  assert.equal(Calc.MAC.describe(Calc.MAC.parse("02:00:00:00:00:01")).local, true);
  assert.equal(Calc.MAC.describe(Calc.MAC.parse("01:00:5e:00:00:fb")).multicast, true);
  assert.equal(Calc.MAC.eui64(b), "21a:2bff:fe3c:4d5e");
  assert.throws(() => Calc.MAC.parse("00:11:22"), /12 hex digits/);
});

test("IPv6 split and EUI-64 address", () => {
  const r = Calc.IPv6Plan.split("2001:db8:abcd::", 48, 64, 3);
  assert.equal(r.count, 65536n);
  assert.deepEqual(r.subnets.map(s => s.cidr), ["2001:db8:abcd::/64", "2001:db8:abcd:1::/64", "2001:db8:abcd:2::/64"]);
  assert.equal(r.last.cidr, "2001:db8:abcd:ffff::/64");
  assert.throws(() => Calc.IPv6Plan.split("2001:db8::", 64, 48), /longer/);
  const mid = Calc.IPv6Plan.split("2001:db8:abcd::", 48, 64, 2, 43);
  assert.deepEqual(mid.subnets.map(s => [s.number, s.id, s.cidr]), [[43n, "2a", "2001:db8:abcd:2a::/64"], [44n, "2b", "2001:db8:abcd:2b::/64"]]);
  assert.throws(() => Calc.IPv6Plan.split("2001:db8:abcd::", 48, 64, 2, 65537), /from 1 to 65,536/);
  assert.equal(Calc.IPv6Plan.split("2001:db8::", 62, 64, 16).last, null, "no separate last entry when every subnet is listed");
  const e = Calc.IPv6Plan.eui64Address("2001:db8:abcd:12::", "00:1A:2B:3C:4D:5E");
  assert.equal(e.address, "2001:db8:abcd:12:21a:2bff:fe3c:4d5e");
  assert.equal(e.linkLocal, "fe80::21a:2bff:fe3c:4d5e");
});

test("IPv6 in prefix and ULA prefix", () => {
  const P = Calc.IPv6Plan;
  assert.equal(P.inPrefix("2001:db8:abcd:12::1", "2001:db8:abcd::/48").inside, true);
  assert.equal(P.inPrefix("2001:db8:abce::1", "2001:db8:abcd::/48").inside, false);
  assert.equal(P.inPrefix("2001:db8::1", "2001:db8:abcd::/48").last, "2001:db8:abcd:ffff:ffff:ffff:ffff:ffff");
  assert.throws(() => P.inPrefix("2001:db8::1", "2001:db8::"), /prefix length/);
  const u = P.ulaPrefix([0x12, 0x34, 0x56, 0x78, 0x9a]);
  assert.deepEqual(u, { prefix: "fd12:3456:789a::/48", firstSubnet: "fd12:3456:789a::/64", globalId: "123456789a" });
  assert.throws(() => P.ulaPrefix([1, 2, 3]), /5 random bytes/);
});

test("IPv6 input forms, address types, and reverse DNS", () => {
  const V = Calc.IPv6;
  assert.equal(V.compress(V.parseIp("fe80::1%eth0")), "fe80::1", "zone ID dropped");
  assert.equal(V.compress(V.parseIp("[2001:db8::1]")), "2001:db8::1", "brackets dropped");
  assert.equal(V.compress(V.parseIp("::ffff:192.0.2.1")), "::ffff:c000:201", "dotted IPv4 tail");
  assert.throws(() => V.parseIp("::ffff:192.0.2.300"), /IPv4 part/);
  const type = a => V.addressType(V.parseIp(a));
  assert.deepEqual(type("::ffff:192.0.2.1"), { type: type("::ffff:192.0.2.1").type, embeddedIPv4: "192.0.2.1" });
  assert.equal(type("64:ff9b::c633:6407").embeddedIPv4, "198.51.100.7");
  assert.equal(type("2002:c000:204::1").embeddedIPv4, "192.0.2.4");
  assert.match(type("2001:db8::1").type, /Documentation/);
  assert.match(type("2001:0::1").type, /Teredo/);
  assert.match(type("fd00::1").type, /Unique local/);
  assert.match(type("fe80::1").type, /Link-local/);
  assert.match(type("ff02::1").type, /Multicast, link-local scope/);
  assert.match(type("2606:4700::1111").type, /Global unicast/);
  assert.match(type("::1").type, /Loopback/);
  assert.match(type("4000::").type, /Reserved/);
  // RFC 3849 example.
  assert.equal(V.ptrName(V.parseIp("2001:db8::567:89ab")), "b.a.9.8.7.6.5.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa");
  const info = V.subnetInfo("2001:db8:abcd::1", 48);
  assert.equal(info.subnets64, 65536n);
  assert.equal(V.subnetInfo("2001:db8::1", 64).subnets64, null);
});

test("port data is well formed", () => {
  const seen = new Set();
  Calc.Ports.forEach(p => {
    assert.ok(p.service && p.note && /^(TCP|UDP|TCP\/UDP)$/.test(p.proto), `bad entry ${p.port}`);
    const key = `${p.port}/${p.proto}`;
    assert.ok(!seen.has(key), `duplicate ${key}`);
    seen.add(key);
  });
});

test("DNS helpers", () => {
  assert.equal(Calc.DNS.reverseName("8.8.4.4"), "4.4.8.8.in-addr.arpa");
  assert.ok(Calc.DNS.reverseName("2001:db8::1").startsWith("1.0.0.0."));
  assert.ok(Calc.DNS.reverseName("2001:db8::1").endsWith(".8.b.d.0.1.0.0.2.ip6.arpa"));
  assert.equal(Calc.DNS.reverseName("example.com"), null);
  assert.equal(Calc.DNS.normalizeName("https://Example.com/path?q=1"), "example.com");
  assert.equal(Calc.DNS.joinTxt('"v=spf1 include:a.com " "-all"'), "v=spf1 include:a.com -all");
  assert.throws(() => Calc.DNS.normalizeName("not a domain!"), /not a valid/);
});
