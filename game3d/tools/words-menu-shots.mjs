// The Words panel with every phrase and command taught, at desktop and phone sizes, plus a data check:
// every -te/-masu word in it shows its dictionary word, and the -te note is there.
//   game3d/tools/with-browser-lock.sh node game3d/tools/words-menu-shots.mjs [outdir]
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [out = 'game3d/shots/words-menu'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let bad = 0;
for (const [tag, W, H] of [['desktop', 1366, 860], ['phone', 390, 844]]) {
  const phone = W < 700;
  const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.text().startsWith('panel')) console.log(tag, m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('amakawa-onboard', JSON.stringify({ moved: true, talked: true, uses: 1, sayUsed: false })); } catch {} });
  await p.goto(`http://127.0.0.1:${process.env.PORT || 8771}/game3d/index.html?q=0`);
  await p.waitForFunction(() => document.body.classList.contains('at-title'), null, { timeout: 120000 });
  await p.waitForTimeout(1000);
  if (phone) await p.tap('#title .go'); else await p.click('#title .go');
  await p.waitForFunction(() => window.__game && window.__game.player && !document.body.classList.contains('at-title'), null, { timeout: 60000 });
  await p.waitForTimeout(2500);
  // talk to a passenger once (onboarding keeps the HUD back until then), click through their lines
  await p.evaluate(() => { const G = window.__game, q = G.player.root.position; const m = G.markers.list.filter((m) => m.enabled() && /person/.test(m.kind || '') && !['mio', 'kuroda', 'tama'].includes(m.id)).sort((a, b) => Math.hypot(q.x - a.spot()[0], q.z - a.spot()[1]) - Math.hypot(q.x - b.spot()[0], q.z - b.spot()[1]))[0]; const s = m.spot(); q.x = s[0]; q.z = s[1]; });
  await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector('#actMenu .use')?.click());
  for (let i = 0; i < 20; i++) { await p.waitForTimeout(500); const busy = await p.evaluate(() => !!window.__game.busy || !document.querySelector('#talk').hidden); if (!busy) break; await p.mouse.click(W - 20, H - 20); }
  const res = await p.evaluate(async () => {
    const L = await import('./js/lang.js');
    for (const id of L.SAYABLE) L.learn(id);
    window.__game.ui.refreshWords(); document.querySelector('#cmdsBtn').click();
    await new Promise((r) => setTimeout(r, 300));
    const pn = document.querySelector('#cmdsPanel'), cs = getComputedStyle(pn), ui = getComputedStyle(document.querySelector('#ui'));
    console.log('panel', pn.hidden, cs.display, cs.opacity, ui.opacity, ui.visibility, document.body.className);
    const rows = [...document.querySelectorAll('#cmdsPanel li.wrow')].map((li) => ({ ja: li.querySelector('.jp')?.textContent, base: li.querySelector('.bf')?.textContent || '' }));
    return { rows, note: document.querySelector('#cmdsPanel li.fnote')?.textContent || '', te: L.COMMANDS.filter((id) => !L.BASE[id]) };
  });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/${tag}.png` });
  // scroll the list to the bottom too, in case it's taller than the screen
  await p.evaluate(() => { const c = document.querySelector('#cmdsPanel .card'); const u = document.querySelector('#cmdsPanel ul'); for (const el of [c, u]) if (el) el.scrollTop = 1e6; });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/${tag}-end.png` });
  const missing = res.rows.filter((r) => /て$|ます$|ません$/.test(r.ja) && !r.base);
  if (missing.length || !res.note || res.te.length) bad++;
  console.log(tag, errs.length ? 'ERR ' + errs.join(' | ') : 'ok', '| rows', res.rows.length, '| missing base', JSON.stringify(missing), '| note', !!res.note);
  for (const r of res.rows) console.log('  ', r.ja, '|', r.base);
  await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
