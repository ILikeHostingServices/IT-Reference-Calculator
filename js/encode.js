/* js/encode.js v1.0.0 (Last Rev: 2026-11-13) */
/* Encode.js - text encodings (Base64, Base64URL, URL, hex, HTML entities) and hashes via the
   browser's Web Crypto API. Everything runs locally. */
window.Calc = window.Calc || {};

Calc.Encode = (function () {
  "use strict";

  const utf8 = s => new TextEncoder().encode(s);
  const fromUtf8 = bytes => new TextDecoder("utf-8", { fatal: true }).decode(bytes);

  function bytesToBase64(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function base64ToBytes(b64) {
    const clean = b64.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = clean + "===".slice((clean.length + 3) % 4);
    let bin;
    try { bin = atob(padded); } catch (e) { throw new Error("Not valid Base64"); }
    return Uint8Array.from(bin, c => c.charCodeAt(0));
  }

  const HTML = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  const CODECS = {
    base64: {
      label: "Base64",
      encode: s => bytesToBase64(utf8(s)),
      decode: s => fromUtf8(base64ToBytes(s)),
    },
    base64url: {
      label: "Base64URL (JWT style)",
      encode: s => bytesToBase64(utf8(s)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
      decode: s => fromUtf8(base64ToBytes(s)),
    },
    url: {
      label: "URL (percent) encoding",
      encode: s => encodeURIComponent(s),
      decode: s => {
        try { return decodeURIComponent(s.replace(/\+/g, " ")); } catch (e) { throw new Error("Not valid percent-encoding"); }
      },
    },
    hex: {
      label: "Hex (UTF-8 bytes)",
      encode: s => Array.from(utf8(s), b => b.toString(16).padStart(2, "0")).join(""),
      decode: s => {
        const clean = s.replace(/^0x/i, "").replace(/[\s:,-]/g, "");
        if (!/^([0-9a-fA-F]{2})*$/.test(clean)) throw new Error("Hex needs pairs of 0-9 / A-F digits");
        return fromUtf8(Uint8Array.from(clean.match(/../g) || [], h => parseInt(h, 16)));
      },
    },
    html: {
      label: "HTML entities",
      encode: s => s.replace(/[&<>"']/g, c => HTML[c]),
      decode: s => {
        const doc = new DOMParser().parseFromString(`<!doctype html><body>${s.replace(/</g, "&lt;")}`, "text/html");
        return doc.body.textContent;
      },
    },
  };

  function run(codec, direction, text) {
    const c = CODECS[codec];
    if (!c) throw new Error(`Unknown encoding "${codec}"`);
    try {
      return c[direction](text);
    } catch (e) {
      if (e instanceof TypeError && direction === "decode") throw new Error("That text does not decode to valid UTF-8");
      throw e;
    }
  }

  const HASHES = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];
  async function hashes(text) {
    if (!crypto.subtle) throw new Error("Hashing needs a secure (HTTPS) page");
    const data = utf8(text);
    const out = {};
    for (const alg of HASHES) {
      const digest = new Uint8Array(await crypto.subtle.digest(alg, data));
      out[alg] = Array.from(digest, b => b.toString(16).padStart(2, "0")).join("");
    }
    return out;
  }

  // Decode a JWT's header and payload (no signature check: that needs the key).
  function decodeJwt(token) {
    const parts = token.trim().split(".");
    if (parts.length < 2) throw new Error("A JWT has three dot-separated parts");
    const json = p => JSON.parse(CODECS.base64url.decode(p));
    return { header: json(parts[0]), payload: json(parts[1]) };
  }

  // Wi-Fi join string read by iOS and Android cameras: WIFI:T:<type>;S:<ssid>;P:<pass>;H:true;;
  // with \ ; , : " escaped by a backslash.
  function wifiString({ ssid, pass, sec, hidden }) {
    const esc = s => s.replace(/([\\;,:"])/g, "\\$1");
    return `WIFI:T:${sec};S:${esc(ssid)};${sec === "nopass" ? "" : `P:${esc(pass)};`}${hidden ? "H:true;" : ""};`;
  }

  return { CODECS, run, hashes, decodeJwt, HASHES, wifiString };
})();
