// Frame strips of people walking, to see their steps against the ground (Jørgen, 2026-10-03: "Why are all the
// animations wrong, people walk on the spot, and slide when they move"): the plaza at lunch with its crowd, Eric
// walking (the player's walker) and Mio walking beside him (walkRig), FRAMES shots EVERY ms apart in real time.
// Writes game3d/shots/gait-strips/<tag>/: eric.png and mio.png (a close crop round each, frame by frame, left to
// right) and crowd.png (the whole view at half size), plus the frames. Works on any checkout (BASE), so the same
// strips can be made before and after a change.
//   node game3d/tools/gait-strips.mjs [w h]     BASE=<worktree>/game3d QS=&chibi=0 TAG=before FRAMES=10 EVERY=110
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const [W, H] = [+(process.argv[2] || 390), +(process.argv[3] || 844)];
const base = process.env.BASE || 'game3d';
const QS = process.env.QS || '';
const FRAMES = +(process.env.FRAMES || 10),
  EVERY = +(process.env.EVERY || 110);
const tag = `${W}x${H}${QS.replace(/[^a-z0-9=]/gi, '-')}${process.env.TAG ? '-' + process.env.TAG : ''}`;
const out = `game3d/shots/gait-strips/${tag}`;
fs.mkdirSync(out, { recursive: true });
const errors = [];
const boxes = [];
await withBrowserJob('gait-strips', async (browser) => {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:8771/${base}/index.html?cap&q=1&place=plaza${QS}`, { timeout: 60000 });
  await page.waitForFunction(() => globalThis.__done, null, { timeout: 120000 });
  await page.evaluate(async () => {
    const g = globalThis.__game,
      P = g.place;
    const { sim } = await import('./js/sim.js');
    const { walkRig } = await import('./js/move.js');
    const { reachableNear } = await import('./js/movement/navigation.js');
    globalThis.__run = true;
    sim.period = 'lunch';
    P.onPeriod?.('lunch');
    P.ambient?.enter('lunch');
    await new Promise((res) => setTimeout(res, 3000)); // the crowd under way
    const K = P.charScale || 1,
      e = g.player.root.position,
      s0 = [e.x, e.z];
    const near = (dx, dz) => reachableNear(P.nav, ...s0, s0[0] + dx * K, s0[1] + dz * K) || s0;
    const mio = g.mioNpc;
    if (!mio.root.parent) P.space.add(mio.root);
    mio.root.visible = true;
    mio.root.scale.setScalar(K);
    const m0 = near(0.9, 0.9);
    mio.root.position.set(m0[0], 0, m0[1]);
    const [ex, ez] = near(3.5, 0.6);
    g.walker.goTo(ex, ez);
    walkRig(g, mio, near(4.2, 1.6), { speed: 1.1 });
    await new Promise((res) => setTimeout(res, 500)); // both up to speed
  });
  for (let i = 0; i < FRAMES; i++) {
    const t0 = Date.now();
    // each one's box on screen: feet to a little over the head
    boxes.push(
      await page.evaluate(() => {
        const g = globalThis.__game,
          cam = g.place.camera;
        const box = (r) => {
          const p = r.root.getWorldPosition(r.root.position.clone()),
            s = r.root.getWorldScale(r.root.position.clone()).x;
          const a = p.clone().project(cam),
            b = p.clone().setY(p.y + 1.3 * s).project(cam);
          const px = (v) => [((v.x + 1) / 2) * globalThis.innerWidth, ((1 - v.y) / 2) * globalThis.innerHeight];
          return { feet: px(a), head: px(b) };
        };
        return { t: g.t, eric: box(g.player), mio: box(g.mioNpc) };
      }),
    );
    await page.screenshot({ path: `${out}/frame-${String(i).padStart(2, '0')}.png` });
    await new Promise((res) => setTimeout(res, Math.max(0, EVERY - (Date.now() - t0))));
  }
  await page.close();
});
fs.writeFileSync(`${out}/boxes.json`, JSON.stringify(boxes));
// the strips (Pillow)
execFileSync('python3', [
  '-c',
  `
import json, sys
from PIL import Image, ImageDraw
out = sys.argv[1]
boxes = json.load(open(out + '/boxes.json'))
frames = [Image.open(f'{out}/frame-{i:02d}.png').convert('RGB') for i in range(len(boxes))]
for who in ('eric', 'mio'):
    h = max(abs(b[who]['feet'][1] - b[who]['head'][1]) for b in boxes)
    ch, cw = int(h * 1.5) + 20, int(h * 0.9) + 20
    strip = Image.new('RGB', (cw * len(frames), ch + 18), 'white')
    d = ImageDraw.Draw(strip)
    for i, (f, b) in enumerate(zip(frames, boxes)):
        fx, fy = b[who]['feet']
        strip.paste(f.crop((int(fx - cw / 2), int(fy - ch + 25), int(fx + cw / 2), int(fy + 25))), (i * cw, 18))
        d.text((i * cw + 4, 3), f"t={b['t']:.2f}", fill='black')
    strip.save(f'{out}/{who}.png')
half = [f.resize((f.width // 2, f.height // 2)) for f in frames]
crowd = Image.new('RGB', (sum(f.width for f in half), half[0].height), 'white')
for i, f in enumerate(half):
    crowd.paste(f, (i * f.width, 0))
crowd.save(f'{out}/crowd.png')
`,
  out,
]);
for (const e of errors) console.log('ERROR', e);
console.log(errors.length ? 'FAIL' : 'done', out, '(eric.png, mio.png, crowd.png)');
process.exitCode = errors.length ? 1 : 0;
