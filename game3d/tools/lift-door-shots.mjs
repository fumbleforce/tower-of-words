// The lift ride, frame by frame: plays the gate in test mode, and once the ride starts runs at 3x and
// shoots a frame every ~0.4 s through the doors opening, the walk in, the stop at 5 (the Sales pair walking out),
// and B2. Each frame also logs the doors (car k, landing k) and flags anyone standing in the doorway while the
// doors are less than 90% open (someone walking through a closed door).
//   sh game3d/tools/with-browser-lock.sh lift node game3d/tools/lift-door-shots.mjs [outdir] [prefix] [W H]
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [out = 'game3d/shots/lift-doors', pre = 'after', W = '1366', H = '860'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
let gl = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], gpu = false;
const GLOCK = '/tmp/claude-1000/gpu.lock';
try { fs.mkdirSync(GLOCK); fs.writeFileSync(GLOCK + '/owner', 'lift-shots'); gpu = true; gl = ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu']; } catch {}
const unGpu = () => { if (gpu) try { fs.rmSync(GLOCK, { recursive: true, force: true }); } catch {} gpu = false; };
process.on('exit', unGpu);
console.log('GL', gpu ? 'gpu' : 'swiftshader');
const b = await chromium.launch({ headless: true, args: gl });
const phone = +W < 700;
const p = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const t0 = Date.now();
const kill = setTimeout(() => { console.log('TIMEOUT'); unGpu(); process.exit(2); }, 280000);
await p.goto('http://127.0.0.1:8771/game3d/index.html?test=fast&ts=3&q=1&place=gate');
await p.waitForFunction(() => window.__lift && window.__lift.ride.on, null, { timeout: 200000, polling: 50 });
const probe = () => {
  const G = window.__game, { cars, ride } = window.__lift, L = cars.get(G.place);
  const s = L.site, c = L.car;
  const zDoor0 = s.zBack - 0.2, zDoor1 = s.zFront + 0.02;   // car doors to landing doors
  const who = [];
  const land = G.place.liftLanding && (G.liftFloor || s.floor) === s.floor ? G.place.liftLanding.k() : null;
  for (const [id, r] of Object.entries(G.place.people || {})) {
    if (!r || !r.root || !r.root.visible) continue;
    const { x, z } = r.root.position;
    if (z > zDoor0 && z < zDoor1 && Math.abs(x - s.x) < 0.6) who.push(id);
  }
  const e = G.player.root.position; if (e.z > zDoor0 && e.z < zDoor1 && Math.abs(e.x - s.x) < 0.6) who.push('eric');
  return { place: G.place.name, floor: G.liftFloor, k: +c.k.toFixed(2), land: land == null ? null : +land.toFixed(2), on: ride.on, inDoor: who };
};
const log = [];
let bad = 0;
for (let i = 0; i < 80; i++) {
  const st = await p.evaluate(probe).catch(() => null);
  if (!st) { await p.waitForTimeout(200); continue; }
  const closed = st.inDoor.length && (st.k < 0.9 || (st.land != null && st.land < 0.9));
  if (closed) bad++;
  const line = `${String(i).padStart(2, '0')} ${st.place} floor ${st.floor} car ${st.k} landing ${st.land} ${st.inDoor.length ? 'in doorway: ' + st.inDoor.join(',') : ''}${closed ? '  THROUGH A CLOSED DOOR' : ''}`;
  log.push(line); console.log(line);
  await p.screenshot({ path: `${out}/${pre}-${W}-${String(i).padStart(2, '0')}.png` });
  if (st.place === 'office' && !st.on) break;
  await p.waitForTimeout(300);
}
fs.writeFileSync(`${out}/${pre}-${W}-log.txt`, log.join('\n') + `\nclosed-door crossings: ${bad}\nerrors: ${errs.join(' | ')}\n`);
console.log('closed-door crossings:', bad, '| errors:', errs.length ? errs.join(' | ') : 'none', '|', ((Date.now() - t0) / 1000).toFixed(0), 's');
clearTimeout(kill);
await b.close(); unGpu();
