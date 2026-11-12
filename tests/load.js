/* Test loader: runs the browser modules in Node the same way the page does (plain scripts that attach
   to window.Calc), in load order. Usage: const Calc = require("./load"); */
"use strict";
const path = require("path");

globalThis.window = globalThis;
const FILES = [
  "version", "units", "ipv4", "ipv6", "net", "mac", "ipv6plan", "ports", "raid", "storage", "capacity",
  "resolution", "timefmt", "cron", "bits", "vendor/eff-wordlist", "password", "encode", "dns", "emailauth", "mailheaders",
];
FILES.forEach(f => require(path.join(__dirname, "..", "js", `${f}.js`)));

module.exports = globalThis.Calc;
