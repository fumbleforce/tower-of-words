// The copy-room (copier) scene on B2, checked on its own: who shows which face, and how Mori and Eric move.
//   node game3d/tools/printer-shots.mjs [w] [h]        (RACE=1: Eric heads for the copier first, ahead of Mori)
// Plays the day in fast test mode (?test=fast) and, from Mio's repair request until Mori is back at his desk:
//  - logs every line with the speaker and both portraits (who, face, listening or speaking),
//  - samples Mori's and Eric's floor positions every frame and flags Mori stalling or doubling back,
//  - saves frames at the scene's key moments.
// Output: game3d/shots/printer/<w>x<h>/ (JPEGs, log.json). Takes the browser lock (GUIDE, Process).
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [W = '1366', H = '860'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(G, 'shots/printer', `${W}x${H}${process.env.RACE ? '-race' : ''}`);
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });

const LOCK = '/tmp/claude-1000/browser.lock.' + process.pid, ME = 'printer-shots';
for (let i = 0; ; i++) {
  try { fs.mkdirSync(LOCK); fs.writeFileSync(LOCK + '/owner', ME + ' ' + new Date().toISOString()); break; }
  catch { if (i % 12 === 0) console.log('waiting for the browser lock'); await new Promise((r) => setTimeout(r, 5000)); }
}
const unlock = () => { try { if (fs.readFileSync(LOCK + '/owner', 'utf8').startsWith(ME)) fs.rmSync(LOCK, { recursive: true, force: true }); } catch {} };
process.on('exit', unlock);
const GLOCK = '/tmp/claude-1000/gpu.lock'; let gpu = false;
try { fs.mkdirSync(GLOCK); fs.writeFileSync(GLOCK + '/owner', ME); gpu = true; } catch {}
process.on('exit', () => { if (!gpu) return; try { if (fs.readFileSync(GLOCK + '/owner', 'utf8').startsWith(ME)) fs.rmSync(GLOCK, { recursive: true, force: true }); } catch {} });
const gl = gpu ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

const b = await chromium.launch({ headless: true, args: [...gl, '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, hasTouch: +W < 700, isMobile: +W < 700 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
let n = 0;
await p.exposeFunction('__shot', async (name) => { await p.screenshot({ path: path.join(out, `${String(++n).padStart(2, '0')}-${name}.jpg`), type: 'jpeg', quality: 80 }); });
await p.addInitScript((race) => {
  window.__race = race;
  const L = window.__pr = { lines: [], track: [], nodes: [], on: false, done: false };
  const hook = () => {
    const g = window.__game; if (!g || !g.runner || !g.ui || !g.place) return setTimeout(hook, 50);
    const run = g.runner.run.bind(g.runner);
    g.runner.run = async (node) => {
      if (node === 'ticket') L.on = true;
      if (L.on) L.nodes.push({ node, t: g.t });
      if (node === 'copier') { await new Promise((r) => requestAnimationFrame(r)); await window.__shot('copier-start'); }
      const r = await run(node);
      if (node === 'copier') { L.copierEnd = g.t; }
      // RACE=1: head for the copier the moment Mio hands over the request, ahead of Mori (the way Jørgen played it)
      if (node === 'ticket' && window.__race) { const go = () => (g.busy ? setTimeout(go, 20) : g.walker.goTo(-2.95, 4.2)); go(); }
      return r;
    };
    const por = (sel) => { const e = document.querySelector('#stage .por.' + sel); return e && !e.hidden ? { who: e.dataset.who, face: e.dataset.face, listen: e.classList.contains('listen') } : null; };
    const say = g.ui.say.bind(g.ui);
    g.ui.say = (sp, text, o = {}) => {
      const pr = say(sp, text, o);
      if (L.on && !L.done) {
        requestAnimationFrame(() => requestAnimationFrame(async () => {
          const rec = { node: g.runner.trace?.at(-1), who: o.whoId || null, text: String(text).slice(0, 70), left: por('left'), right: por('right') };
          L.lines.push(rec);
          if (g.runner.trace?.at(-1) === 'copier' && o.whoId) await window.__shot('line-' + o.whoId + '-' + L.lines.length);
        }));
      }
      return pr;
    };
    const tp = g.ui.typePrompt.bind(g.ui);
    g.ui.typePrompt = async (...a) => { const r = tp(...a); if (L.on) { await new Promise((q) => setTimeout(q, 200)); await window.__shot('type-prompt'); } return r; };
    // positions every frame
    const tick = () => {
      if (L.on && !L.done) {
        const m = g.place.people?.mori?.root?.position, e = g.player.root.position;
        if (m && g.place.name === 'office') L.track.push([+g.t.toFixed(3), +m.x.toFixed(3), +m.z.toFixed(3), +e.x.toFixed(3), +e.z.toFixed(3), g.runner.trace?.at(-1) || '', g.place.people.mori._walk ? 1 : 0, g.busy ? 1 : 0]);
        if (L.copierEnd && g.t > L.copierEnd + 8) { L.done = true; }
      }
      requestAnimationFrame(tick);
    };
    tick();
    // frames while Mori walks out of the room after the scene
    let outShots = 0;
    setInterval(async () => { if (L.copierEnd && !L.done && outShots < 3 && g.t > L.copierEnd + 0.4 + outShots * 0.9) { outShots++; await window.__shot('mori-leaves'); } }, 30);
  };
  hook();
}, !!process.env.RACE);
const t0 = Date.now();
await p.goto(`http://127.0.0.1:8771/game3d/index.html?test=fast&q=0`);
await p.waitForFunction(() => window.__pr && window.__pr.done, null, { timeout: 240000 }).catch(() => errs.push('timeout before the copier scene ended'));
const L = await p.evaluate(() => window.__pr);
await b.close();

// movement analysis: Mori's walks (runs of frames with a walk active)
const walks = []; let cur = null;
for (const [t, mx, mz, ex, ez, node, walking] of L.track) {
  if (walking && !cur) cur = { t0: t, pts: [] };
  if (cur) cur.pts.push([t, mx, mz, ex, ez]);
  if (!walking && cur) { cur.t1 = t; walks.push(cur); cur = null; }
}
if (cur) { cur.t1 = cur.pts.at(-1)[0]; walks.push(cur); }
const rep = walks.map((w) => {
  const P = w.pts; let len = 0, stall = 0, maxStall = 0, stallAt = null, back = 0, minGap = 9;
  const a = P[0], z = P.at(-1); const straight = Math.hypot(z[1] - a[1], z[2] - a[2]);
  for (let i = 1; i < P.length; i++) {
    const d = Math.hypot(P[i][1] - P[i - 1][1], P[i][2] - P[i - 1][2]), dt = P[i][0] - P[i - 1][0];
    len += d;
    if (dt > 0 && d / dt < 0.15) { stall += dt; if (stall > maxStall) { maxStall = stall; stallAt = [P[i][1], P[i][2], P[i][3], P[i][4], P[i][0]]; } } else stall = 0;
    minGap = Math.min(minGap, Math.hypot(P[i][1] - P[i][3], P[i][2] - P[i][4]));
    // doubling back: the step points away from the walk's goal while far from it
    const gx = z[1] - P[i - 1][1], gz = z[2] - P[i - 1][2], gl = Math.hypot(gx, gz);
    if (gl > 0.3 && d > 1e-4 && ((P[i][1] - P[i - 1][1]) * gx + (P[i][2] - P[i - 1][2]) * gz) / (d * gl) < -0.3) back += d;
  }
  return { from: [a[1], a[2]], to: [z[1], z[2]], seconds: +(w.t1 - w.t0).toFixed(2), pathLen: +len.toFixed(2), straight: +straight.toFixed(2), maxStall: +maxStall.toFixed(2), stallAt, backtrack: +back.toFixed(2), minGapToEric: +minGap.toFixed(2), ericAt: [P.at(-1)[3], P.at(-1)[4]] };
});
fs.writeFileSync(path.join(out, 'log.json'), JSON.stringify({ lines: L.lines, nodes: L.nodes, copierEnd: L.copierEnd, walks: rep, errs, track: L.track.filter((_, i) => i % 6 === 0) }));
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s (${gpu ? 'gpu' : 'swiftshader'}) -> ${path.relative(path.dirname(G), out)}`);
for (const l of L.lines.filter((x) => x.node === 'copier' || x.node === 'ticket')) console.log(`[${l.node}] ${l.who || '-'}: ${l.text}\n    left ${JSON.stringify(l.left)} right ${JSON.stringify(l.right)}`);
console.log('Mori walks:'); for (const r of rep) console.log(' ', JSON.stringify(r));
if (errs.length) console.log('errors:', errs.slice(0, 5).join(' | '));
