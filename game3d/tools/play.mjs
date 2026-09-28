// Smoke playthrough: clicks Start, reads every line, takes the first reply, and uses the highlighted goal
// (or the next unused marker). Saves a screenshot every few steps and prints console errors.
// node game3d/tools/play.mjs <outdir> [w] [h] [seconds]
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const [out = '/tmp/g3play', W = '1366', H = '860', SECS = '420'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const gl = process.env.GL === 'gpu' ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: gl });
const p = await b.newPage({ viewport: { width: +W, height: +H } });
const errs = [], log = [];
p.on('pageerror', (e) => errs.push('page: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); if (m.type() === 'warning') errs.push('warn: ' + m.text()); });
const url = process.env.URL || `http://127.0.0.1:8771/game3d/index.html${process.env.Q || ''}`;
await p.goto(url);
await p.waitForSelector('#title .go', { state: 'visible', timeout: 60000 }).then(() => p.click('#title .go')).catch(() => {});
const used = new Set();
const t0 = Date.now();
let n = 0, lastPlace = '', idle = 0;
while (Date.now() - t0 < +SECS * 1000) {
  n++;
  const s = await p.evaluate(() => {
    const g = window.__game; const vis = (e) => e && !e.hidden && e.offsetParent !== null;
    const talk = document.querySelector('#talk');
    return {
      place: g.place && g.place.name, busy: g.busy, ended: !!window.__ended,
      talk: vis(talk) ? talk.innerText.replace(/\s+/g, ' ').slice(0, 200) : '',
      chips: [...document.querySelectorAll('#talk .chip')].filter((c) => !c.disabled).length,
      goal: document.querySelector('#goal .t')?.innerText || '',
      goals: g.markers.list.filter((m) => m.enabled() && m.goal()).map((m) => m.id),
      all: g.markers.list.filter((m) => m.enabled()).map((m) => m.id),
    };
  });
  if (s.place !== lastPlace) { lastPlace = s.place; log.push(`== ${s.place}`); await p.screenshot({ path: `${out}/${String(n).padStart(3, '0')}-${s.place}.png` }); }
  if (s.ended) { log.push('ENDED'); await p.screenshot({ path: `${out}/end.png` }); break; }
  if (s.talk) {
    log.push(`${s.talk}`);
    if (n % 6 === 0) await p.screenshot({ path: `${out}/${String(n).padStart(3, '0')}.png` });
    if (s.chips) await p.click('#talk .chip >> nth=0'); else await p.click('#talk');
    await p.waitForTimeout(350); idle = 0; continue;
  }
  if (s.busy) { await p.waitForTimeout(500); continue; }
  const target = s.goals[0] || s.all.find((id) => !used.has(s.place + id));
  if (!target) {
    // nothing new to tap: walk up to something and say a word to it (commands open things up)
    const tried = await p.evaluate((st) => {
      const g = window.__game; const known = [...document.querySelectorAll('#cmdsPanel li')].length;
      const list = g.markers.list.filter((m) => m.enabled());
      const pick = list[(st * 7) % Math.max(1, list.length)];
      if (!pick) return null;
      const s = pick.spot(); g.walker.goTo(s[0], s[1]); return pick.id;
    }, idle);
    await p.waitForTimeout(2500);
    const btn = await p.$('#sayBtn:not([hidden])');
    if (btn) {
      await btn.click(); await p.waitForTimeout(300);
      const n = await p.$$eval('#sayMenu .cmd', (b) => b.length);
      if (n) { await p.click(`#sayMenu .cmd >> nth=${idle % n}`); log.push(`-> say #${idle % n} to ${tried}`); }
      await p.waitForTimeout(1200);
    }
    idle++; if (idle > 40) { log.push('STUCK: nothing left to use'); break; } continue;
  }
  used.add(s.place + target);
  log.push(`-> use ${target} (goal: ${s.goal})`);
  await p.evaluate((id) => { const m = window.__game.markers.list.find((x) => x.id === id); m.el.click(); }, target);
  await p.waitForTimeout(2500);
}
fs.writeFileSync(`${out}/log.txt`, log.join('\n') + '\n\nERRORS:\n' + errs.join('\n'));
console.log(log.slice(-15).join('\n'));
console.log('errors:', errs.length, errs.slice(0, 8).join('\n'));
await b.close();
