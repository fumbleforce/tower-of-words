// The first minute of a new game, played with real input like a first-time player, one frame per step.
//   node game3d/tools/opening-frames.mjs [w] [h] [outdir]      (default 1366 860, game3d/shots/opening/<w>x<h>)
// Desktop plays with keys (WASD, E, Space); a phone size (w < 700) plays with taps. Steps: the title, Start, the
// first screen, a few steps of walking, walking up to the nearest passenger, E/tap on them, clicking through
// their lines (one click in an empty corner of the screen, to test the whole-screen click), and walking on to the
// cat and to Mio. Writes NN-step.png, steps.json (what's on screen at each step) and sheet.png.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const [W = '1366', H = '860', outArg] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(outArg || path.join(G, `shots/opening/${W}x${H}`));
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const gl = process.env.GL === 'gpu' ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: [...gl, '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const steps = [];
let n = 0;
const onScreen = () => p.evaluate(() => {
  const vis = (e) => { if (!e) return false; const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false; for (let a = e; a; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; } return true; };
  const t = (s) => { const e = document.querySelector(s); return vis(e) ? (e.innerText || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 90) : null; };
  return { controls: t('#ctrlLine'), goal: t('#goal'), hint: t('#hint'), toast: t('#toast'), action: t('#actMenu'), talk: t('#talk'), words: t('#cmdsBtn'), people: t('#peopleBtn'), clock: t('#clock'), pins: [...document.querySelectorAll('#marks .mark')].filter(vis).length, busy: !!(window.__game && window.__game.busy) };
});
const shot = async (name) => {
  await p.waitForTimeout(250);
  const f = `${String(n++).padStart(2, '0')}-${name}.png`;
  await p.screenshot({ path: path.join(out, f), timeout: 180000 });
  const s = await onScreen(); steps.push({ f, name, ...s }); console.log(f, JSON.stringify(s));
};
const g = (fn, arg) => p.evaluate(fn, arg);
// screen position of a thing's floor spot, for taps
const spotXY = (id) => g((id) => { const G = window.__game; const m = G.markers.list.find((x) => x.id === id); if (!m) return null; const s = m.spot(); const V = G.place.camera.position.constructor; const v = new V(s[0], G.place.floorY || 0, s[1]); G.place.space.localToWorld(v); v.project(G.place.camera); return [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight]; }, id);
const walkTo = async (id) => {
  const xy = await spotXY(id); if (!xy) return;
  if (phone) await p.touchscreen.tap(xy[0], xy[1]); else await p.mouse.click(xy[0], xy[1]);
  for (let i = 0; i < 40; i++) { await p.waitForTimeout(250); const d = await g((id) => { const G = window.__game; const m = G.markers.list.find((x) => x.id === id); const s = m.spot(), q = G.player.root.position; return Math.hypot(q.x - s[0], q.z - s[1]); }, id); if (d < 0.4) break; }
};
const clickAway = async () => { if (phone) await p.touchscreen.tap(+W - 20, +H - 20); else await p.mouse.click(+W - 20, +H - 20); };
const advance = async (max = 12, label = 'line') => {
  for (let i = 0; i < max; i++) {
    const s = await onScreen(); if (!s.busy && !s.talk) return;
    if (s.talk) await shot(`${label}-${i}`);
    if (i % 2 && !phone) await p.keyboard.press('Space'); else await clickAway();
    await p.waitForTimeout(700);
  }
};

await p.goto(`http://127.0.0.1:8771/game3d/index.html?q=${process.env.Q ?? 0}`);
await p.waitForFunction(() => document.body.classList.contains('at-title'), null, { timeout: 120000 });
await p.waitForTimeout(1500);
await shot('title');
await p.evaluate(() => { localStorage.removeItem('amakawa-onboard'); });
if (phone) await p.tap('#title .go'); else { await p.keyboard.press('Enter'); }
await p.waitForTimeout(3500);
await shot('first-screen');
// a few steps of walking
if (phone) { await p.touchscreen.tap(+W / 2, +H * 0.62); await p.waitForTimeout(1600); }
else { await p.keyboard.down('KeyD'); await p.waitForTimeout(900); await p.keyboard.up('KeyD'); await p.keyboard.down('KeyA'); await p.waitForTimeout(1400); await p.keyboard.up('KeyA'); }
await shot('walked');
// the nearest passenger who talks
const who = await g(() => { const G = window.__game, q = G.player.root.position; const c = G.markers.list.filter((m) => m.enabled() && /person/.test(m.kind || '') && !['mio', 'kuroda', 'tama'].includes(m.id)).map((m) => [m.id, Math.hypot(q.x - m.spot()[0], q.z - m.spot()[1])]).sort((a, b) => a[1] - b[1]); return c.length ? c[0][0] : null; });
await walkTo(who);
await shot(`near-${who}`);
if (phone) { const xy = await g(() => { const a = document.querySelector('#actMenu .use'); if (!a) return null; const r = a.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); if (xy) await p.touchscreen.tap(xy[0], xy[1]); }
else await p.keyboard.press('KeyE');
await p.waitForTimeout(1500);
await advance(10, `talk-${who}`);
await shot('after-first-talk');
for (const id of ['tama', 'mio']) {
  await walkTo(id);
  await shot(`near-${id}`);
}
fs.writeFileSync(path.join(out, 'steps.json'), JSON.stringify({ size: `${W}x${H}`, errors: errs, steps }, null, 1));
await b.close();
if (errs.length) console.log('page errors:', errs.slice(0, 4).join(' | '));
const py = `
import sys, os
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]; fs = sorted(f for f in os.listdir(d) if f.endswith('.png') and f[0].isdigit())
ims = [Image.open(os.path.join(d, f)).convert('RGB') for f in fs]
h = 420 if ims[0].height >= ims[0].width else 300
ims = [i.resize((int(i.width * h / i.height), h)) for i in ims]
cols = 4 if ims[0].width > ims[0].height else 6
w = max(i.width for i in ims); rows = (len(ims) + cols - 1) // cols
try: font = ImageFont.truetype('/usr/share/fonts/noto/NotoSans-Bold.ttf', 15)
except Exception: font = ImageFont.load_default()
S = Image.new('RGB', (cols * (w + 10) + 10, rows * (h + 34) + 10), (16, 18, 23))
for k, (f, i) in enumerate(zip(fs, ims)):
    x, y = 10 + (k % cols) * (w + 10), 10 + (k // cols) * (h + 34)
    ImageDraw.Draw(S).text((x, y), f[:-4], fill=(230, 234, 240), font=font); S.paste(i, (x, y + 24))
S.save(os.path.join(d, 'sheet.png')); print(os.path.join(d, 'sheet.png'))
`;
console.log(execFileSync('python3', ['-c', py, out]).toString().trim());
