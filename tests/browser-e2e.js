/* tests/browser-e2e.js v1.0.0 (Last Rev: 2026-11-12) */
/* End-to-end browser checks: share links, copy buttons, search, DNS and email tools against mocked DNS over HTTPS,
   header analyzer, secrets kept out of links, QR, offline mode. Not part of node --test or CI. Usage:
     npx wrangler dev --port 8790 --var PRIMARY_HOST:127.0.0.1
     BASE=http://127.0.0.1:8790/ node tests/browser-e2e.js */
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8790/';
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  // Fake DNS-over-HTTPS answers.
  const TXT = { 'example.com': ['v=spf1 include:spf.protection.outlook.com -all'], 'spf.protection.outlook.com': ['v=spf1 ip4:40.92.0.0/15 -all'],
    '_dmarc.example.com': ['v=DMARC1; p=reject; rua=mailto:d@example.com'], 'selector1._domainkey.example.com': ['v=DKIM1; k=rsa; p=' + 'A'.repeat(392)] };
  await ctx.route('https://cloudflare-dns.com/**', route => {
    const u = new URL(route.request().url()); const name = u.searchParams.get('name'), type = u.searchParams.get('type');
    let Answer = [];
    if (type === 'TXT') Answer = (TXT[name] || []).map(t => ({ name: name + '.', type: 16, TTL: 300, data: `"${t}"` }));
    if (type === 'MX' && name === 'example.com') Answer = [{ name: 'example.com.', type: 15, TTL: 300, data: '0 example-com.mail.protection.outlook.com.' }];
    if (type === 'A' && name === 'example.com') Answer = [{ name: 'example.com.', type: 1, TTL: 60, data: '93.184.215.14' }];
    route.fulfill({ status: 200, headers: { 'content-type': 'application/dns-json', 'access-control-allow-origin': '*' }, body: JSON.stringify({ Status: 0, AD: true, Answer }) });
  });

  // 1. Share link round trip (plain fields).
  await p.goto(BASE + '#ipv4'); await p.fill('#ipv4-address', '10.9.8.7'); await p.fill('#ipv4-prefix', '20'); await p.waitForTimeout(500);
  ok(p.url().endsWith('#ipv4?address=10.9.8.7&prefix=20'), 'URL hash follows inputs: ' + p.url().split('/').pop());
  const p2 = await ctx.newPage(); await p2.goto(BASE + '#ipv4?address=172.16.5.4&prefix=12'); await p2.waitForTimeout(300);
  ok((await p2.textContent('#ipv4-results')).includes('172.16.0.0'), 'Opening a share link restores inputs and results');
  // 2. Share link with list state (subnet planner).
  await p.goto(BASE + '#planner'); await p.waitForTimeout(200);
  await p.click('#planner-list .list-row:last-child .remove-row'); await p.waitForTimeout(500);
  const link = p.url();
  ok(link.includes('list='), 'Planner list goes into the link');
  await p2.goto('about:blank'); await p2.goto(link); await p2.waitForTimeout(300);
  ok((await p2.$$('#planner-list .list-row')).length === 5, 'Planner rows restored from link (5 rows)');
  // 3. Old link alias.
  await p2.goto(BASE + '#resolutions'); await p2.waitForTimeout(200);
  ok(await p2.$eval('#t-resolution', s => s.classList.contains('active')), 'Legacy #resolutions link opens the Resolutions tool');
  // 4. Copy button.
  await p.goto(BASE + '#ipv4?address=192.168.1.10&prefix=24'); await p.waitForTimeout(300);
  await p.click('#ipv4-results tr:nth-child(3) .copy-btn');
  ok((await p.evaluate(() => navigator.clipboard.readText())) === '255.255.255.0', 'Row copy button copies the netmask');
  await p.click('#t-ipv4 .tool-actions button:nth-child(2)');
  ok((await p.evaluate(() => navigator.clipboard.readText())).includes('Netmask\t255.255.255.0'), 'Copy Results copies the table as text');
  // 5. Search palette.
  await p.keyboard.press('Control+k'); await p.keyboard.type('spf'); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
  ok(await p.$eval('#t-email', s => s.classList.contains('active')), 'Ctrl+K search "spf" opens Email Security');
  // 6. Email check with mocked DNS (exercises fetch under the real CSP).
  await p.fill('#email-domain', 'example.com'); await p.click('#email-go'); await p.waitForTimeout(800);
  const emailText = await p.textContent('#email-out');
  ok(/Valid SPF with 1 of 10/.test(emailText), 'SPF check counts lookups through mocked DNS');
  ok(/p=reject: spoofed mail is refused/.test(emailText) && /2048-bit/.test(emailText), 'DMARC and DKIM results render');
  // 7. DNS lookup.
  await p.goto(BASE + '#dns?name=example.com&type=A'); await p.waitForTimeout(800);
  ok((await p.textContent('#dns-out')).includes('93.184.215.14'), 'DNS share link runs the lookup and shows the A record');
  // 8. Header analyzer sample.
  await p.goto(BASE + '#headers'); await p.click('#headers-sample'); await p.waitForTimeout(400);
  const hdr = await p.textContent('#headers-out');
  ok(/DMARC fail/.test(hdr) && /Delivery Path \(3 hops/.test(hdr), 'Header sample shows DMARC fail and 3 hops');
  // 9. Password not in link; QR renders.
  await p.goto(BASE + '#password'); await p.waitForTimeout(200);
  const pw = await p.textContent('#password-out .primary');
  ok(pw.length === 20 && !p.url().includes(encodeURIComponent(pw)), 'Password generated (20 chars) and not in the URL');
  await p.goto(BASE + '#wifiqr'); await p.fill('#wifiqr-pass', 'correct horse'); await p.waitForTimeout(300);
  ok(!(await p.$eval('#wifiqr-box', e => e.hidden)) && !p.url().includes('correct'), 'Wi-Fi QR renders; password kept out of URL');
  const dark = await p.$eval('#wifiqr-canvas', c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 50) n++; return n; });
  ok(dark > 1000, 'QR canvas has dark modules');
  // 10. Offline: service worker cached, page loads with network off.
  await p.goto(BASE); await p.waitForTimeout(1500);
  const swReady = await p.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise(r => setTimeout(() => r(false), 5000))]));
  ok(swReady, 'Service worker active');
  await ctx.setOffline(true);
  const p3 = await ctx.newPage(); await p3.goto(BASE + '#cron'); await p3.waitForTimeout(500);
  ok((await p3.textContent('#cron-desc')).includes('weekdays'), 'Loads and works offline (cron tool)');
  await ctx.setOffline(false);
  console.log('page errors:', errs.length ? errs : 'none');
  await b.close();
})();
