/* Resolution.js - standard display resolutions grouped by aspect ratio, plus
   width x height -> aspect ratio lookup. Some marketing ratios are nominal: 21:9
   panels are really 64:27, 43:18 or 12:5, and 1366x768 is only roughly 16:9, so
   lookups report the exact reduced ratio and the nearest standard group separately. */
window.Calc = window.Calc || {};

Calc.Resolution = (function () {
  "use strict";

  // Each group: key, label, the w:h used for matching, a summary, and its resolutions.
  // A resolution flagged nominal does not reduce to the group's exact ratio.
  const GROUPS = [
    {
      key: "16:9", w: 16, h: 9, label: "16:9 (Widescreen)",
      summary: "The default for TVs, monitors, laptops, video, and streaming.",
      resolutions: [
        { w: 1280, h: 720, name: "HD (720p)", use: "Entry-level TVs, video conferencing, streaming at low bandwidth" },
        { w: 1366, h: 768, name: "WXGA (HD)", use: "Budget laptops and 32\" TVs", nominal: true },
        { w: 1600, h: 900, name: "HD+ (900p)", use: "Mid-range laptops and 20\" monitors" },
        { w: 1920, h: 1080, name: "Full HD (1080p)", use: "Most office monitors, laptops, Blu-ray, gaming" },
        { w: 2560, h: 1440, name: "QHD / WQHD (1440p)", use: "27\" monitors, gaming, phones" },
        { w: 3200, h: 1800, name: "QHD+", use: "Premium 13\" to 15\" laptops" },
        { w: 3840, h: 2160, name: "4K UHD (2160p)", use: "4K TVs and monitors, streaming, video editing" },
        { w: 5120, h: 2880, name: "5K", use: "27\" pro monitors (Apple Studio Display, iMac 5K)" },
        { w: 7680, h: 4320, name: "8K UHD (4320p)", use: "8K TVs, high-end video production" },
      ],
    },
    {
      key: "16:10", w: 16, h: 10, label: "16:10 (Widescreen Productivity)",
      summary: "Extra vertical space over 16:9. Common on business laptops, MacBooks, and projectors.",
      resolutions: [
        { w: 1280, h: 800, name: "WXGA", use: "Projectors, older laptops, Steam Deck" },
        { w: 1440, h: 900, name: "WXGA+", use: "19\" monitors, older 13\" MacBook Air" },
        { w: 1680, h: 1050, name: "WSXGA+", use: "22\" monitors" },
        { w: 1920, h: 1200, name: "WUXGA", use: "24\" business monitors, business laptops, projectors" },
        { w: 2560, h: 1600, name: "WQXGA", use: "30\" monitors, 13\" MacBook Pro / Air Retina" },
        { w: 2880, h: 1800, name: "WQXGA+ (Retina)", use: "15\" MacBook Pro Retina" },
        { w: 3840, h: 2400, name: "WQUXGA", use: "High-end workstation laptops" },
      ],
    },
    {
      key: "21:9", w: 21, h: 9, label: "21:9 (Ultrawide)",
      summary: "Marketing name for ultrawide monitors. The real panels are about 2.37:1 to 2.4:1.",
      resolutions: [
        { w: 2560, h: 1080, name: "UW-FHD", use: "29\" to 34\" entry ultrawide monitors", nominal: true },
        { w: 3440, h: 1440, name: "UW-QHD (UWQHD)", use: "34\" ultrawide monitors, gaming, multitasking", nominal: true },
        { w: 3840, h: 1600, name: "UW-QHD+ (WQHD+)", use: "37.5\" to 38\" ultrawide monitors", nominal: true },
        { w: 5120, h: 2160, name: "UW5K (WUHD)", use: "40\" ultrawide pro monitors", nominal: true },
      ],
    },
    {
      key: "32:9", w: 32, h: 9, label: "32:9 (Super Ultrawide)",
      summary: "Two 16:9 screens side by side in one panel, typically 49\" curved monitors.",
      resolutions: [
        { w: 3840, h: 1080, name: "DFHD (Dual Full HD)", use: "49\" super ultrawide monitors" },
        { w: 5120, h: 1440, name: "DQHD (Dual QHD)", use: "49\" super ultrawide gaming monitors" },
        { w: 7680, h: 2160, name: "DUHD (Dual 4K UHD)", use: "57\" super ultrawide monitors" },
      ],
    },
    {
      key: "4:3", w: 4, h: 3, label: "4:3 (Standard / Legacy)",
      summary: "Classic CRT and early LCD ratio. Still common on projectors, KVMs, and iPads.",
      resolutions: [
        { w: 640, h: 480, name: "VGA", use: "Legacy displays, BIOS / safe mode, SD video, webcams" },
        { w: 800, h: 600, name: "SVGA", use: "Legacy monitors, KVM consoles, embedded panels" },
        { w: 1024, h: 768, name: "XGA", use: "Projectors, older monitors, 1st / 2nd gen iPad" },
        { w: 1152, h: 864, name: "XGA+", use: "Older CRT monitors" },
        { w: 1280, h: 960, name: "SXGA- (Quad VGA)", use: "Older CRT monitors, security cameras" },
        { w: 1400, h: 1050, name: "SXGA+", use: "Older business laptops" },
        { w: 1600, h: 1200, name: "UXGA", use: "20\" to 21\" pro monitors, medical displays" },
        { w: 2048, h: 1536, name: "QXGA", use: "iPad Retina (3rd gen and later), medical displays" },
      ],
    },
    {
      key: "5:4", w: 5, h: 4, label: "5:4 (Square-ish Legacy)",
      summary: "Common on 17\" and 19\" office LCDs from the 2000s and on medical imaging displays.",
      resolutions: [
        { w: 1280, h: 1024, name: "SXGA", use: "17\" / 19\" office LCDs, industrial and POS panels" },
        { w: 2560, h: 2048, name: "QSXGA", use: "Medical imaging (radiology) displays" },
      ],
    },
    {
      key: "3:2", w: 3, h: 2, label: "3:2 (Productivity Laptop / Tablet)",
      summary: "Taller than 16:10. Used on Surface devices, Framework, and some Chromebooks.",
      resolutions: [
        { w: 2160, h: 1440, name: "FHD+", use: "Surface Pro 3, 12\" to 13\" Chromebooks" },
        { w: 2256, h: 1504, name: "FHD+", use: "Framework Laptop 13, Surface Laptop 13.5\"" },
        { w: 2736, h: 1824, name: "PixelSense", use: "Surface Pro 4 through 7" },
        { w: 3000, h: 2000, name: "PixelSense", use: "Surface Book 13.5\"" },
      ],
    },
    {
      key: "256:135", w: 256, h: 135, label: "17:9 (DCI Cinema)",
      summary: "Digital Cinema Initiatives standard (about 1.9:1) used in cinema projection and pro cameras.",
      resolutions: [
        { w: 2048, h: 1080, name: "DCI 2K", use: "Cinema projection, pro video cameras" },
        { w: 4096, h: 2160, name: "DCI 4K", use: "Cinema projection, pro cameras, color grading monitors" },
        { w: 8192, h: 4320, name: "DCI 8K", use: "High-end cinema cameras" },
      ],
    },
    {
      key: "9:16", w: 9, h: 16, label: "9:16 (Vertical Video)",
      summary: "16:9 turned on its side. Phone-first video and portrait digital signage.",
      resolutions: [
        { w: 720, h: 1280, name: "HD Vertical", use: "Low-bandwidth vertical video" },
        { w: 1080, h: 1920, name: "Full HD Vertical", use: "Stories, Reels, Shorts, TikTok, portrait signage" },
        { w: 2160, h: 3840, name: "4K Vertical", use: "Portrait digital signage, high-res vertical video" },
      ],
    },
    {
      key: "1:1", w: 1, h: 1, label: "1:1 (Square)",
      summary: "Social media posts and a few specialty square monitors.",
      resolutions: [
        { w: 1080, h: 1080, name: "Square HD", use: "Instagram and social media square posts" },
        { w: 1920, h: 1920, name: "Square FHD", use: "Specialty square monitors (CAD, document review)" },
      ],
    },
  ];

  function gcd(a, b) {
    while (b) [a, b] = [b, a % b];
    return a;
  }

  // Accepts "1920x1080", "1920 x 1080", "1920*1080", "1920 by 1080", "1920,1080".
  function parse(text) {
    const m = String(text).trim().match(/^(\d+)\s*(?:x|\*|×|by|,|:)\s*(\d+)$/i);
    if (!m) throw new Error("Enter a resolution as width x height, for example 1920x1080");
    const w = Number(m[1]);
    const h = Number(m[2]);
    if (w <= 0 || h <= 0) throw new Error("Width and height must both be greater than zero");
    return { w, h };
  }

  function listGroups() {
    return GROUPS.map(g => ({ key: g.key, label: g.label }));
  }

  function getGroup(key) {
    const g = GROUPS.find(x => x.key === key);
    if (!g) throw new Error(`Unknown aspect ratio: ${key}`);
    return g;
  }

  // Describe a width x height: exact ratio, decimal ratio, known standard, nearest group.
  function lookup(w, h) {
    const d = gcd(w, h);
    const decimal = w / h;

    let known = null;
    GROUPS.forEach(g => g.resolutions.forEach(r => {
      if (!known && r.w === w && r.h === h) known = { group: g, res: r, rotated: false };
    }));
    GROUPS.forEach(g => g.resolutions.forEach(r => {
      if (!known && r.w === h && r.h === w) known = { group: g, res: r, rotated: true };
    }));

    // Nearest group by relative difference, also trying each group rotated.
    // Unrotated wins ties so 1080x1920 lands on 9:16 rather than rotated 16:9.
    let nearest = null;
    GROUPS.forEach(g => {
      [false, true].forEach(rotated => {
        const target = rotated ? g.h / g.w : g.w / g.h;
        const diffPct = Math.abs(decimal - target) / target * 100;
        const tie = nearest && Math.abs(diffPct - nearest.diffPct) < 1e-9;
        if (!nearest || diffPct < nearest.diffPct - 1e-9 || (tie && nearest.rotated && !rotated)) {
          nearest = { group: g, rotated, diffPct };
        }
      });
    });

    return {
      w, h,
      ratioW: w / d,
      ratioH: h / d,
      decimal,
      orientation: w > h ? "Landscape" : w < h ? "Portrait" : "Square",
      megapixels: (w * h) / 1e6,
      totalPixels: w * h,
      known,
      nearest,
    };
  }

  return { listGroups, getGroup, lookup, parse };
})();
