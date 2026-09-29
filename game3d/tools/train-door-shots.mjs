// The train doors, frame by frame: plays the train in test mode at a slower speed and shoots a frame every ~0.35 s
// from the doors opening, through Eric walking out onto the platform, to the car pulling away. Each frame logs the
// doors (open k), the closed-overlay k and where Eric is.
//   sh game3d/tools/with-browser-lock.sh train-doors node game3d/tools/train-door-shots.mjs [outdir] [prefix] [W H]
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [out = 'game3d/shots/train-doors', pre = 'after', W = '1366', H = '860'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
let gl = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  gpu = false;
const GLOCK = '/tmp/claude-1000/gpu.lock';
// swiftshader is too slow for the desktop size, so wait up to three minutes for the GPU lock (other agents' fast tests
// hold it for about a minute)
for (let i = 0; i < 90 && !gpu; i++)
  try {
    fs.mkdirSync(GLOCK);
    fs.writeFileSync(GLOCK + '/owner', 'train-door-shots');
    gpu = true;
    gl = ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'];
  } catch {
    await new Promise((r) => setTimeout(r, 2000));
  }
const unGpu = () => {
  if (gpu)
    try {
      if (fs.readFileSync(GLOCK + '/owner', 'utf8').includes('train-door-shots')) fs.rmSync(GLOCK, { recursive: true, force: true });
    } catch {}
  gpu = false;
};
process.on('exit', unGpu);
console.log('GL', gpu ? 'gpu' : 'swiftshader');
const b = await chromium.launch({ headless: true, args: gl });
const phone = +W < 700;
const p = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
const t0 = Date.now();
const kill = setTimeout(() => {
  console.log('TIMEOUT');
  unGpu();
  process.exit(2);
}, 280000);
await p.goto('http://127.0.0.1:8771/game3d/index.html?test=fast&ts=2&q=1');
const probe = () => {
  const G = window.__game;
  if (!G || !G.place || G.place.name !== 'train' || !G.place.snapshotState) return G && G.place ? { place: G.place.name } : null;
  const s = G.place.snapshotState();
  const e = G.player.root.position;
  return {
    place: 'train',
    door: +s.doors.value.toFixed(2),
    closedK: +(s.departure.closedK ?? 0).toFixed(2),
    leaving: s.departure.leaving,
    departing: s.departure.departing,
    departed: s.departed,
    eric: [+e.x.toFixed(2), +e.z.toFixed(2)],
  };
};
await p.waitForFunction(
  () => {
    const G = window.__game;
    return G && G.place && G.place.name === 'train' && G.place.snapshotState && G.place.snapshotState().doors.value > 0.02;
  },
  null,
  { timeout: 200000, polling: 100 },
);
const log = [];
for (let i = 0; i < 90; i++) {
  const st = await p.evaluate(probe).catch(() => null);
  if (!st || st.place !== 'train') break;
  const line = `${String(i).padStart(2, '0')} door ${st.door} closedK ${st.closedK} eric ${st.eric} ${st.leaving ? 'leaving' : ''} ${st.departing ? 'departing' : ''}`;
  log.push(line);
  console.log(line);
  await p.screenshot({ path: `${out}/${pre}-${W}-${String(i).padStart(2, '0')}.png` });
  if (st.departed) break;
  await p.waitForTimeout(350);
}
fs.writeFileSync(`${out}/${pre}-${W}-log.txt`, log.join('\n') + `\nerrors: ${errs.join(' | ')}\n`);
console.log('errors:', errs.length ? errs.join(' | ') : 'none', '|', ((Date.now() - t0) / 1000).toFixed(0), 's');
clearTimeout(kill);
await b.close();
unGpu();
