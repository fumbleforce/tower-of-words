// QA: a human-pace run of a new game with real input (keys, clicks, taps, typing), no test mode, real time.
// Reads each line for a human reading time, explores what's in reach before following goals, uses E / Q and
// the phone buttons as a player would, types the romaji it is shown. Stills at every new line, prompt, menu,
// place, goal change and every 15 s. Run under the browser lock:
//   sh game3d/tools/with-browser-lock.sh qa node game3d/qa/human.mjs <w> <h> <outdir> [seconds=300]
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [W = '1366', H = '860', outArg, SECS = '300'] = process.argv.slice(2);
const out = path.resolve(outArg); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const gl = process.env.GL === 'gpu' ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: [...gl, '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const steps = [], log = [];
let n = 0, t0 = Date.now();
const el = () => ((Date.now() - t0) / 1000).toFixed(0).padStart(3, '0');
const S = () => p.evaluate(() => {
  const vis = (e) => { if (!e) return false; const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false; for (let a = e; a; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; } return true; };
  const t = (s) => { const e = document.querySelector(s); return vis(e) ? (e.innerText || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 160) : null; };
  const g = window.__game;
  const talk = document.querySelector('#talk');
  return {
    title: document.body.classList.contains('at-title'),
    place: g && g.place ? g.place.name : null, busy: !!(g && g.busy), ended: !!window.__ended,
    talk: t('#talk'), typing: !!(talk && vis(talk) && talk.classList.contains('typing')),
    ro: talk && talk.classList.contains('typing') ? [...talk.querySelectorAll('.tp-ro .lt, .tp-ro .sp')].map((x) => x.textContent).join('') : null,
    chips: [...document.querySelectorAll('#talk .chip')].filter((c) => vis(c) && !c.disabled).length,
    canGo: !!(talk && talk.classList.contains('can-go')),
    sayMenu: t('#sayMenu'), sayCmds: [...document.querySelectorAll('#sayMenu .cmd')].map((x) => x.innerText.replace(/\s+/g, ' ')),
    act: t('#actMenu'), actSay: !!document.querySelector('#actMenu .act.say'),
    goal: t('#goal'), hint: t('#hint'), controls: t('#ctrlLine'), toast: t('#toast'), words: t('#cmdsBtn'),
    near: g && g.near ? g.near.id : null, seated: !!(g && g.player && g.player.seated),
    goals: g && g.markers ? g.markers.list.filter((m) => m.enabled() && m.goal()).map((m) => m.id) : [],
    marks: [...document.querySelectorAll('#marks .mark')].filter(vis).length,
    panels: [...document.querySelectorAll('.panel')].filter(vis).map((x) => x.id),
  };
}).catch((e) => ({ err: e.message }));
const shot = async (name, s) => {
  const f = `${String(n++).padStart(3, '0')}-t${el()}-${String(name).replace(/[^\w.~-]+/g, '_').slice(0, 60)}.png`;
  try { await p.screenshot({ path: path.join(out, f), timeout: 120000 }); } catch (e) { errs.push('shot: ' + e.message); return; }
  s = s || await S(); steps.push({ f, name, t: +el(), ...s }); log.push(`${el()}s SHOT ${f}`);
};
const g = (fn, arg) => p.evaluate(fn, arg);
const tap = async (x, y) => { if (phone) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); };
const spotXY = (id) => g((id) => { const G = window.__game; const m = G.markers.list.find((x) => x.id === id); if (!m) return null; const s = m.spot(); const V = G.place.camera.position.constructor; const v = new V(s[0], G.place.floorY || 0, s[1]); G.place.space.localToWorld(v); v.project(G.place.camera); const x = ((v.x + 1) / 2) * innerWidth, y = ((1 - v.y) / 2) * innerHeight; return x > 4 && y > 4 && x < innerWidth - 4 && y < innerHeight - 4 ? [x, y] : null; }, id);
const dist = (id) => g((id) => { const G = window.__game; const m = G.markers.list.find((x) => x.id === id); if (!m) return 99; const s = m.spot(), q = G.player.root.position; return Math.hypot(q.x - s[0], q.z - s[1]); }, id);
const btn = async (sel) => { const xy = await g((s) => { const a = document.querySelector(s); if (!a) return null; const r = a.getBoundingClientRect(); return r.width ? [r.x + r.width / 2, r.y + r.height / 2] : null; }, sel); if (xy) { await tap(xy[0], xy[1]); return true; } return false; };

await p.goto(`http://127.0.0.1:8771/game3d/index.html`);
await p.waitForFunction(() => document.body.classList.contains('at-title'), null, { timeout: 180000 });
t0 = Date.now();
await p.evaluate(() => { try { localStorage.clear(); } catch {} });
await p.waitForTimeout(1500);
await shot('title');
if (phone) await btn('#title .go'); else await p.keyboard.press('Enter');
await p.waitForTimeout(3000);
await shot('first-screen');
// a new player tries the controls first
if (phone) { await tap(+W / 2, +H * 0.62); await p.waitForTimeout(1800); }
else { await p.keyboard.down('KeyD'); await p.waitForTimeout(900); await p.keyboard.up('KeyD'); await p.keyboard.down('KeyW'); await p.waitForTimeout(600); await p.keyboard.up('KeyW'); }
await shot('walked');

const used = new Map();   // target -> uses
let lastLine = '', lastGoal = '', lastAct = '', lastPlace = '', lastShotAt = Date.now(), same = 0, lastSig = '', target = null, targetSince = 0;
const explore = 3;        // talk to a few things before following the goal, as a curious player does
let talked = 0;
while ((Date.now() - t0) / 1000 < +SECS) {
  const s = await S();
  if (s.err) { await p.waitForTimeout(500); continue; }
  if (s.ended) { await shot('end', s); break; }
  const sig = JSON.stringify([s.talk, s.goal, s.act, s.place, s.sayMenu, s.busy, s.near]);
  if (sig === lastSig) same++; else { same = 0; lastSig = sig; }
  if (same === 60) { log.push(`${el()}s STUCK? no change for a while`); await shot('stuck', s); }
  if (s.place !== lastPlace) { lastPlace = s.place; await shot(`place-${s.place}`, s); }
  if (s.goal !== lastGoal) { lastGoal = s.goal; if (s.goal) { log.push(`${el()}s GOAL ${s.goal}`); await shot('goal', s); } }
  if (Date.now() - lastShotAt > 15000) { lastShotAt = Date.now(); await shot('every15s', s); }
  if (s.typing && s.ro) {
    await shot('type-prompt', s); log.push(`${el()}s TYPE ${s.ro}`);
    await p.waitForTimeout(1500);
    if (phone) { await p.fill('#talk .tp-in', ''); await btn('#talk .tp-in'); await p.keyboard.type(s.ro, { delay: 120 }); }
    else await p.keyboard.type(s.ro, { delay: 120 });
    await p.keyboard.press('Enter'); await p.waitForTimeout(1200); await shot('typed'); continue;
  }
  if (s.sayMenu) { await shot('say-menu', s); log.push(`${el()}s SAYMENU ${s.sayCmds.join(' / ')}`); await p.waitForTimeout(1200); await btn('#sayMenu .cmd'); await p.waitForTimeout(900); continue; }
  if (s.talk) {
    if (s.talk !== lastLine) { lastLine = s.talk; log.push(`${el()}s LINE ${s.talk}`); await shot(s.chips ? 'choice' : 'line', s); }
    const read = Math.min(6000, 1200 + s.talk.length * 35);
    await p.waitForTimeout(read);
    if (s.chips) { await btn('#talk .chip'); }
    else if (phone) await tap(+W - 20, +H - 20);
    else { if (n % 2) await p.keyboard.press('Space'); else await p.mouse.click(+W - 20, +H - 20); }
    await p.waitForTimeout(500); continue;
  }
  if (s.busy) { await p.waitForTimeout(500); continue; }
  if (s.act && s.act !== lastAct) { lastAct = s.act; await shot(`act-${s.near}`, s); }
  // choose a target: explore first, then the goal
  const free = await g(() => { const G = window.__game, q = G.player.root.position; return G.markers.list.filter((m) => m.enabled()).map((m) => [m.id, Math.hypot(q.x - m.spot()[0], q.z - m.spot()[1]), /person/.test(m.kind || '')]).sort((a, b) => a[1] - b[1]); });
  let want = null, say = false;
  if (s.goals.length && (talked >= explore || s.goal)) want = s.goals[0];
  if (want && (used.get(want) || 0) >= 1 && s.actSay) say = true;
  if (!want) { const c = free.find(([id, , person]) => !used.has(id) && (talked < explore ? person && id !== 'mio' : true)) || free.find(([id]) => !used.has(id)); want = c ? c[0] : (free[0] || [null])[0]; }
  if (s.actSay && /say|Say/.test(s.goal || '') && s.near) say = true;
  if (!want) { await p.waitForTimeout(800); continue; }
  if (want !== target) { target = want; targetSince = Date.now(); }
  const d = await dist(want);
  if (s.near === want || d < 0.5) {
    if (say) { log.push(`${el()}s SAY at ${s.near}`); if (phone) await btn('#actMenu .act.say'); else await p.keyboard.press('KeyQ'); }
    else { log.push(`${el()}s USE ${s.near || want}`); if (phone) { if (!(await btn('#actMenu .act.use'))) { const xy = await spotXY(want); if (xy) await tap(xy[0], xy[1]); } } else await p.keyboard.press('KeyE'); }
    used.set(want, (used.get(want) || 0) + 1); talked++;
    await p.waitForTimeout(1300); continue;
  }
  if (Date.now() - targetSince > 20000) {
    const xy0 = await spotXY(want);
    const diag = await g(([id, xy]) => { const G = window.__game, m = G.markers.list.find((x) => x.id === id), q = G.player.root.position; const under = xy ? document.elementFromPoint(xy[0], xy[1]) : null; return { player: [+q.x.toFixed(2), +q.z.toFixed(2)], spot: m ? m.spot().map((v) => +v.toFixed(2)) : null, xy: xy && xy.map(Math.round), under: under ? (under.id || under.className || under.tagName) : null, path: G.walker.path ? G.walker.path.length : 0, keys: [...(G.walker.keys || [])] }; }, [want, xy0]);
    log.push(`${el()}s GAVE UP reaching ${want} ${JSON.stringify(diag)}`); await shot(`cant-reach-${want}`); used.set(want, 9); target = null; continue; }
  const xy = await spotXY(want);
  if (!xy) { used.set(want, 9); continue; }
  if (s.seated) { if (phone) await tap(xy[0], xy[1]); else { await p.keyboard.press('KeyS'); await p.waitForTimeout(600); } }
  await tap(xy[0], xy[1]);
  await p.waitForTimeout(1500);
}
await shot('final');
fs.writeFileSync(path.join(out, 'steps.json'), JSON.stringify({ size: `${W}x${H}`, errors: errs, steps }, null, 1));
fs.writeFileSync(path.join(out, 'log.txt'), log.join('\n') + '\n\nERRORS:\n' + errs.join('\n') + '\n');
await b.close();
console.log(`${n} shots in ${el()} s -> ${out}`, errs.length ? 'errors: ' + errs.slice(0, 4).join(' | ') : '');
console.log(log.filter((l) => /GOAL|STUCK|GAVE|TYPE|SAY/.test(l)).slice(-25).join('\n'));
