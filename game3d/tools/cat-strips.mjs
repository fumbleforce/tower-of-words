// Frame strips of Tama walking and turning (Jørgen, 2026-10-03: "Has the cat been animated yet or is it still just
// sliding around?"): at the gate, she goes from her bowl to the front of the guard's desk with the place's own catTo
// hook, then turns round on the spot to face the way she came and walks back a little. FRAMES shots EVERY ms apart in
// real time; for each one the game camera is zoomed ZOOM times onto her (a view offset, so it is the game's own camera
// and light), and the strip is those close-ups left to right. Works on any checkout (BASE), so the same strips can be
// made before and after a change. Writes game3d/shots/cat-strips/<tag>/walk.png, turn.png and the frames.
//   node game3d/tools/cat-strips.mjs [w h]     BASE=<worktree>/game3d TAG=before FRAMES=14 EVERY=110 ZOOM=3
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const [W, H] = [+(process.argv[2] || 390), +(process.argv[3] || 844)];
const base = process.env.BASE || 'game3d';
const FRAMES = +(process.env.FRAMES || 14),
  EVERY = +(process.env.EVERY || 110),
  ZOOM = +(process.env.ZOOM || 3);
const tag = `${W}x${H}${process.env.TAG ? '-' + process.env.TAG : ''}`;
const out = `game3d/shots/cat-strips/${tag}`;
fs.mkdirSync(out, { recursive: true });
const errors = [];
const times = { walk: [], turn: [] };
let gait = null;
await withBrowserJob('cat-strips', async (browser) => {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:8771/${base}/index.html?cap&q=1&place=gate`, { timeout: 60000 });
  await page.waitForFunction(() => globalThis.__done, null, { timeout: 120000 });
  // the camera zoomed onto her, a little over her middle; resolves after two drawn frames
  const zoom = (z) =>
    page.evaluate(
      (z) =>
        new Promise((res) => {
          const g = globalThis.__game,
            cam = g.place.camera,
            r = g.place.people.tama.root;
          cam.clearViewOffset();
          cam.updateMatrixWorld();
          const p = r.getWorldPosition(r.position.clone()),
            s = r.getWorldScale(r.position.clone()).x;
          const v = p.setY(p.y + 0.15 * s).project(cam);
          const w = globalThis.innerWidth / z,
            h = globalThis.innerHeight / z,
            x = ((v.x + 1) / 2) * globalThis.innerWidth - w / 2,
            y = ((1 - v.y) / 2) * globalThis.innerHeight - h / 2;
          cam.setViewOffset(globalThis.innerWidth, globalThis.innerHeight, x, y, w, h);
          globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(() => res(g.t)));
        }),
      z,
    );
  const shoot = async (kind) => {
    for (let i = 0; i < FRAMES; i++) {
      const t0 = Date.now();
      times[kind].push(await zoom(ZOOM));
      await page.screenshot({ path: `${out}/${kind}-${String(i).padStart(2, '0')}.png` });
      await new Promise((res) => setTimeout(res, Math.max(0, EVERY - (Date.now() - t0))));
    }
  };
  await page.evaluate(async () => {
    const g = globalThis.__game,
      P = g.place;
    globalThis.__run = true;
    (await import('./js/movement/gait-watch.js')).startGaitCheck(g); // her steps against the ground, measured
    const r = P.people.tama.root,
      p = P.space.worldToLocal(r.getWorldPosition(r.position.clone()));
    globalThis.__from = [p.x, p.z];
    P.hooks.catTo({ to: 'desk_front' });
    await new Promise((res) => setTimeout(res, 150));
  });
  await shoot('walk');
  await page.evaluate(async () => {
    const g = globalThis.__game,
      P = g.place;
    await new Promise((res) => setTimeout(res, 1500));
    const { faceRig, walkRig } = await import('./js/move.js');
    const r = P.people.tama.root,
      [x, z] = globalThis.__from;
    // round to face the way she came, then a few steps back that way
    faceRig(g, P.people.tama, [r.position.x - (x - r.position.x), r.position.z - (z - r.position.z)]).then(() =>
      walkRig(g, P.people.tama, [(x + r.position.x) / 2, (z + r.position.z) / 2], { speed: 0.9 }),
    );
  });
  await shoot('turn');
  await new Promise((res) => setTimeout(res, 1500));
  gait = await page.evaluate(() => {
    const C = globalThis.__gaitCheck;
    return { tama: C.people.tama, reports: C.reports() };
  });
  await page.close();
});
fs.writeFileSync(`${out}/times.json`, JSON.stringify(times));
execFileSync('python3', [
  '-c',
  `
import json, sys
from PIL import Image, ImageDraw
out = sys.argv[1]
times = json.load(open(out + '/times.json'))
for kind, ts in times.items():
    frames = [Image.open(f'{out}/{kind}-{i:02d}.png').convert('RGB') for i in range(len(ts))]
    w, h = frames[0].size
    cw = ch = min(w, h) * 2 // 3
    strip = Image.new('RGB', (cw * len(frames), ch + 18), 'white')
    d = ImageDraw.Draw(strip)
    for i, (f, t) in enumerate(zip(frames, ts)):
        strip.paste(f.crop(((w - cw) // 2, (h - ch) // 2, (w + cw) // 2, (h + ch) // 2)), (i * cw, 18))
        d.text((i * cw + 4, 3), f"t={t:.2f}", fill='black')
    strip.save(f'{out}/{kind}.png')
`,
  out,
]);
console.log('gait check, tama (walking windows, step ratio per window; 1 is in time):', JSON.stringify(gait?.tama));
for (const l of gait?.reports || []) console.log('GAIT', l);
for (const e of errors) console.log('ERROR', e);
const bad = errors.length || gait?.reports?.length;
console.log(bad ? 'FAIL' : 'done', out, '(walk.png, turn.png)');
process.exitCode = bad ? 1 : 0;
