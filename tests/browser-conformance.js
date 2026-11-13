/* tests/browser-conformance.js v1.0.0 (Last Rev: 2026-11-13) */
/* ILHS Shared Sizing Spec Conformance Checklist and axe-core WCAG 2.2 AA check for every tool, dark and light.
   Not part of node --test or CI (needs Playwright and a running site). Usage:
     npx wrangler dev --port 8790 --var PRIMARY_HOST:127.0.0.1
     npm pack axe-core && tar xzf axe-core-*.tgz   (in a scratch folder)
     BASE=http://127.0.0.1:8790/ node tests/browser-conformance.js <path>/package/axe.min.js */
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:8790/';
const AXE = fs.readFileSync(process.argv[2], 'utf8');
let failures = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) failures++; };
(async () => {
  const b = await chromium.launch();
  const tools = ['ipv4','planner','v4tools','ipv6','v6plan','mac','ports','dns','email','headers','raid','storage','transfer','backup','nvr','sla','power','resolution','time','cron','chmod','base','password','encode','wifiqr'];

  // 2. Computed sizes at 1920 x 1080.
  const d = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await d.goto(BASE + '#ipv4'); await d.waitForTimeout(400);
  const sizes = await d.evaluate(() => ({
    root: getComputedStyle(document.documentElement).fontSize,
    body: getComputedStyle(document.body).fontSize,
    headline: getComputedStyle(document.querySelector('#t-ipv4 .tool-head h2')).fontSize,
    wrap: document.querySelector('.layout').getBoundingClientRect().width,
  }));
  ok(sizes.root === '16px' && sizes.body === '17px' && sizes.headline === '44px' && Math.round(sizes.wrap) === 1200,
    `1920x1080 sizes: root ${sizes.root}, body ${sizes.body}, headline ${sizes.headline}, content width ${Math.round(sizes.wrap)}px`);

  // 4. No horizontal scroll / clipped text at the test sizes; tap targets >= 44 px.
  const SIZES = [[414,896],[360,800],[390,844],[393,852],[430,932],[412,915],[375,667],[360,640],[320,640],
    [768,1024],[800,1280],[810,1080],[820,1180],[834,1194],[1024,1366],[1366,768],[1536,864],[1440,900],[1920,1080],[1920,1200],[2560,1440],[3440,1440],[3840,2160]];
  for (const scheme of ['dark', 'light']) {
    let bad = [];
    for (const [w, h] of SIZES) {
      const p = await b.newPage({ viewport: { width: w, height: h }, colorScheme: scheme });
      await p.goto(BASE); await p.waitForTimeout(150);
      for (const t of tools) {
        await p.evaluate(t => { location.hash = t; }, t); await p.waitForTimeout(40);
        const r = await p.evaluate(() => {
          const out = [];
          if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`hscroll ${document.documentElement.scrollWidth}>${window.innerWidth}`);
          // Clipped text: an element whose content overflows a box that hides overflow (scroll areas excluded).
          document.querySelectorAll('.tool.active *, header *, nav *').forEach(el => {
            if (!el.offsetParent) return;
            const cs = getComputedStyle(el);
            if (!el.classList.contains('sr-only') && (cs.overflowX === 'hidden' || cs.overflow === 'hidden') && el.scrollWidth > el.clientWidth + 2 && !el.closest('.table-scroll') && el.tagName !== 'TABLE') out.push(`clip ${el.tagName}.${el.className}`);
          });
          const small = [...document.querySelectorAll('a, button, summary, select, input:not([type=checkbox]):not([type=radio])')]
            .filter(el => el.offsetParent && !el.closest('.palette') && !el.closest('.sr-only') && !el.classList.contains('skip'))
            .map(el => ({ el, r: el.getBoundingClientRect() }))
            .filter(({ el, r }) => r.height < 43.5 || (r.width < 43.5 && el.tagName !== 'INPUT' && el.tagName !== 'SELECT'))
            .map(({ el, r }) => `${el.tagName}.${el.className}${el.id ? '#' + el.id : ''} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent || '').trim().slice(0, 20)}"`);
          return out.concat(small.map(s => 'small ' + s));
        });
        r.forEach(x => bad.push(`${w}x${h} #${t}: ${x}`));
      }
      await p.close();
    }
    const uniq = [...new Set(bad.map(x => x.replace(/^\d+x\d+ #\w+: /, '')))];
    ok(bad.length === 0, `${scheme}: no horizontal scroll, clipping, or small targets at ${SIZES.length} sizes x ${tools.length} tools` + (bad.length ? `\n   ${bad.length} findings, unique:\n   - ${uniq.slice(0, 15).join('\n   - ')}` : ''));
  }

  // Zoom: each step makes the page bigger (headline px grows with devicePixelRatio-equivalent zoom).
  const z = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const cdp = await z.context().newCDPSession(z);
  await z.goto(BASE + '#ipv4'); await z.waitForTimeout(300);
  let last = 0, grows = true; const seen = [];
  for (const zoom of [1, 1.1, 1.25, 1.5, 2]) {
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await z.setViewportSize({ width: Math.round(1920 / zoom), height: Math.round(1080 / zoom) }); // browser zoom shrinks the CSS viewport
    await z.waitForTimeout(100);
    const px = await z.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#t-ipv4 .tool-head h2')).fontSize));
    const onScreen = px * zoom; seen.push(`${Math.round(zoom * 100)}%: ${onScreen.toFixed(1)}px`);
    if (onScreen <= last) grows = false; last = onScreen;
  }
  ok(grows, `Browser zoom makes the headline bigger at each step (${seen.join(', ')})`);

  // 5. Headings in order + axe-core WCAG 2.2 AA on every tool, both themes.
  for (const scheme of ['dark', 'light']) {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, colorScheme: scheme, bypassCSP: true }); // test browser only
    const p = await ctx.newPage();
    await p.goto(BASE); await p.waitForTimeout(300);
    await p.addScriptTag({ content: AXE });
    const viol = {};
    let headingIssues = [];
    for (const t of tools) {
      await p.evaluate(t => { location.hash = t; }, t); await p.waitForTimeout(80);
      if (t === 'headers') { await p.click('#headers-sample'); await p.waitForTimeout(150); }
      if (t === 'wifiqr') { await p.fill('#wifiqr-pass', 'correct horse'); await p.waitForTimeout(150); }
      const hs = await p.evaluate(() => [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(h => h.offsetParent).map(h => +h.tagName[1]));
      for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) headingIssues.push(`#${t}: h${hs[i - 1]} -> h${hs[i]}`);
      const res = await p.evaluate(async () => {
        const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
        return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0] && v.nodes[0].target.join(' '), msg: v.nodes[0] && v.nodes[0].failureSummary.split('\n')[1] }));
      });
      res.forEach(v => { const k = v.id; viol[k] = viol[k] || { ...v, tools: [] }; viol[k].tools.push(t); });
    }
    ok(headingIssues.length === 0, `${scheme}: headings in order on every tool` + (headingIssues.length ? ': ' + headingIssues.join('; ') : ''));
    const list = Object.values(viol);
    ok(list.length === 0, `${scheme}: axe-core WCAG 2.2 AA, 25 tools` + (list.length ? '\n   ' + list.map(v => `${v.id} (${v.impact}) on ${v.tools.length} tools, e.g. ${v.sample}: ${v.msg}`).join('\n   ') : ''));
    await p.close();
  }
  console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
  await b.close();
})();
