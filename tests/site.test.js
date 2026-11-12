"use strict";
/* Site integrity: brand sizing block, offline cache list, script order, and the no-dash writing rule. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const html = read("index.html");

test("style.css carries the pinned ILHS Shared Sizing Spec block unchanged", () => {
  const pinned = read("docs/shared/ilhs-sizing-tokens.css");
  const block = pinned.slice(pinned.indexOf("/* ILHS Shared Sizing Spec"), pinned.indexOf("/* ILHS Shared Sizing Spec v1.0.1 end */") + "/* ILHS Shared Sizing Spec v1.0.1 end */".length);
  assert.ok(block.length > 200);
  assert.ok(read("css/style.css").includes(block), "css/style.css differs from docs/shared/ilhs-sizing-tokens.css");
});

test("every file the page loads is precached by the service worker and exists", () => {
  const sw = read("sw.js");
  const refs = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map(m => m[1]);
  assert.ok(refs.length > 20);
  refs.forEach(ref => {
    assert.ok(fs.existsSync(path.join(root, ref)), `${ref} is referenced but missing`);
    assert.ok(sw.includes(`"${ref}"`), `${ref} is not in sw.js ASSETS`);
  });
  [...sw.matchAll(/^\s+"([^"]+)",$/gm)].map(m => m[1]).filter(f => f !== "./").forEach(f => {
    assert.ok(fs.existsSync(path.join(root, f)), `sw.js precaches missing file ${f}`);
  });
});

test("app.js loads last and every tool section has a UI module", () => {
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  assert.equal(scripts[scripts.length - 1], "js/app.js");
  const ui = scripts.filter(s => s.startsWith("js/ui/")).map(read).join("\n");
  const tools = [...html.matchAll(/data-tool="([^"]+)"/g)].map(m => m[1]);
  assert.ok(tools.length >= 25);
  tools.forEach(t => assert.ok(ui.includes(`register("${t}"`), `no Calc.UI.register("${t}")`));
  assert.equal(new Set(tools).size, tools.length, "duplicate tool id");
});

test("element ids are unique", () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dupes, []);
});

test("no em or en dashes in project files we write", () => {
  const files = ["index.html", "css/style.css", "sw.js", "manifest.webmanifest", "README.md", "CHANGELOG.md",
    ...fs.readdirSync(path.join(root, "js")).filter(f => f.endsWith(".js")).map(f => `js/${f}`),
    ...fs.readdirSync(path.join(root, "js/ui")).map(f => `js/ui/${f}`),
    ...fs.readdirSync(path.join(root, "tests")).map(f => `tests/${f}`)];
  files.forEach(f => assert.doesNotMatch(read(f), /[\u2013\u2014]/, `${f} contains an em or en dash`));
});

test("no inline styles or scripts (the Content-Security-Policy blocks them)", () => {
  assert.doesNotMatch(html, /\sstyle="/);
  assert.doesNotMatch(html, /<script>(?!\s*<\/script>)|<script(?![^>]*src=)[^>]*>/);
  assert.doesNotMatch(html, /\son[a-z]+="/);
});
