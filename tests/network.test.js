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
  assert.deepEqual(r.subnets, ["2001:db8:abcd::/64", "2001:db8:abcd:1::/64", "2001:db8:abcd:2::/64"]);
  assert.equal(r.last, "2001:db8:abcd:ffff::/64");
  assert.throws(() => Calc.IPv6Plan.split("2001:db8::", 64, 48), /longer/);
  const e = Calc.IPv6Plan.eui64Address("2001:db8:abcd:12::", "00:1A:2B:3C:4D:5E");
  assert.equal(e.address, "2001:db8:abcd:12:21a:2bff:fe3c:4d5e");
  assert.equal(e.linkLocal, "fe80::21a:2bff:fe3c:4d5e");
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
