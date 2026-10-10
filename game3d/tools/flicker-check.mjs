// Finds flickering surfaces (z-fighting: two surfaces at the same depth that swap as the camera moves). For each
// case the game is paused with Eric on a spot, the HUD hidden, and the camera nudged back and forth by a millimetre
// between frames. A steady scene barely changes under such a nudge; a z-fight flips whole patches of pixels between
// two colours. Pixels that change hard between frames and aren't on an edge of the first frame are counted, and every
// case over the limit is a FAIL with a marked still (flicker in magenta) in the output folder.
//   node game3d/tools/flicker-check.mjs [outdir] [W H]     BASE=.claude/worktrees/<name>/game3d for a worktree
//   CASES='[["dorms",true,"door_203"]]' to check other spots: [place, evening, spot name, [x, z] or null (start)]
//   SET=outdoor     every outdoor place where it starts him in the morning, plus the spots Jørgen flagged;
//   SET=outdoor-eve the same places after work; ONLY=plaza,works keeps the cases of those places (runs stay short)
//   NEAR=8          the camera's near plane this many times closer: depth precision as if the buffer had 3 bits
//                   fewer, a margin for phone GPUs (each halving of near costs one bit)
//   QS='&nobatch'   added to the query (nobatch: every mesh drawn on its own, no perf batching)
//   flats-check.mjs finds the same faults from the geometry, for a whole place at once
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';

const [out = 'game3d/shots/flicker', W = '1366', H = '860'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'game3d';
const LIMIT = +(process.env.LIMIT || 60); // flickering pixels a case may have (single stray pixels on thin parts)
const OUTDOOR = [
  'forecourt',
  'plaza',
  'dorm_court',
  'shotengai',
  'east_lane',
  'east_coast',
  'sports',
  'office_quarter',
  'harbour',
  'works',
];
const NEAR = +(process.env.NEAR || 1);
const QS = process.env.QS || '';
const CASES = process.env.CASES
  ? JSON.parse(process.env.CASES)
  : process.env.SET === 'outdoor'
    ? [
        ...OUTDOOR.map((pl) => [pl, false, null]),
        ['east_lane', false, [1.4, 1.4]], // the pocket park's tree (Jørgen, S23, 2026-10-03)
        ['plaza', false, [0, 6]],
      ]
    : process.env.SET === 'outdoor-eve'
      ? OUTDOOR.map((pl) => [pl, true, null])
      : [
          ['train', false, null],
          ['gate', false, null],
          ['office', false, null],
          ['forecourt', false, 'station_exit'],
          ['forecourt', true, [12.25, -2.85]],
          ['forecourt', false, [12.25, -2.85]], // the head office door
          ['forecourt', false, [11.9, -6.5]], // in the lobby
          ['forecourt', false, [17.25, -11.7]], // at the lifts: the door and lift frames (Jørgen, 2026-10-10)
          ['plaza', false, [0, 6]],
          ['plaza', true, [0, 6]],
          ['dorm_court', true, 'dorm_entry'],
          ['dorm_court', true, 'hall'],
          ['dorms', true, 'landing'],
          ['dorms', true, [1.38, 1.49]], // the corridor by the room numbers
          ['dorms', true, 'door_203'],
        ];
const only = process.env.ONLY?.split(',');
if (only) CASES.splice(0, CASES.length, ...CASES.filter(([pl]) => only.includes(pl)));
// GPU_WAIT=600: wait up to that many seconds for a GPU slot (default 60) when the machine is busy
const WAIT = gpuWaitOptions(60, 285000);
const fails = [];
await withBrowserJob('flicker-check', async (browser) => {
  const phone = +W < 700;
  const ctx = await browser.newContext({
    viewport: { width: +W, height: +H },
    isMobile: phone,
    hasTouch: phone,
  });
  await ctx.addInitScript(() =>
    globalThis.localStorage.setItem(
      'amakawa-onboard',
      JSON.stringify({ moved: true, talked: true, uses: 3, sayUsed: true }),
    ),
  );
  const lab = await ctx.newPage();
  for (const [i, [place, eve, at]] of CASES.entries()) {
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(`http://127.0.0.1:8771/${base}/index.html?q=1&place=${place}${QS}`, { timeout: 60000 });
    await p.waitForFunction((pl) => globalThis.__game?.place?.name === pl, place, { timeout: 90000 });
    // a place whose opening scene is still running is checked as it stands
    await p.waitForFunction(() => !globalThis.__game.busy, null, { timeout: 8000 }).catch(() => {});
    await p.evaluate(
      ([eve, at]) => {
        const G = globalThis.__game;
        if (eve) G.hooks.period({ to: 'evening' }); // the clock's own change: light, sky and what else the period changes
        if (!at) return; // where the place starts him
        const s = typeof at === 'string' ? G.place.spots[at] : at;
        const [x, z] = typeof s === 'function' ? s() : s;
        G.player.root.position.set(x, 0, z);
        G.walker.sync();
        G.place.cam.snap?.(G.player.root.position);
      },
      [eve, at],
    );
    await p.waitForTimeout(2500); // occluders fade, the camera settles, the draw-call pass merges
    // freeze the world, hide everything drawn over the canvas
    await p.evaluate((NEAR) => {
      globalThis.__game.paused = true;
      const c = globalThis.__game.place.camera;
      c.near /= NEAR;
      c.updateProjectionMatrix();
      const st = globalThis.document.createElement('style');
      st.textContent = 'body * { visibility: hidden !important } canvas { visibility: visible !important }';
      globalThis.document.head.append(st);
    }, NEAR);
    const shots = [];
    for (let f = 0; f < 6; f++) {
      await p.evaluate((f) => {
        const c = globalThis.__game.place.camera,
          d = [0.001, -0.001, 0, 0.001, -0.001, 0][f];
        c.position.x += d;
        c.position.y += [0, 0.001, -0.001, 0.0005, 0, -0.0005][f];
        c.position.z += [0, 0, 0.001, -0.001, 0.0005, 0][f];
        c.updateMatrixWorld();
      }, f);
      await p.waitForTimeout(120);
      shots.push((await p.screenshot()).toString('base64'));
    }
    await p.close();
    const r = await lab.evaluate(async (shots) => {
      const load = async (b) => {
        const im = new globalThis.Image();
        im.src = 'data:image/png;base64,' + b;
        await im.decode();
        const c = globalThis.document.createElement('canvas');
        c.width = im.width;
        c.height = im.height;
        const g = c.getContext('2d');
        g.drawImage(im, 0, 0);
        return { c, g, d: g.getImageData(0, 0, c.width, c.height) };
      };
      const fr = [];
      for (const s of shots) fr.push(await load(s));
      const { c, g, d: d0 } = fr[0],
        w = c.width,
        h = c.height;
      const lum = (d, k) => 0.3 * d.data[k] + 0.59 * d.data[k + 1] + 0.11 * d.data[k + 2];
      // edges of the first frame (and a pixel round them): a millimetre's nudge may move an edge by a pixel
      const edge = new Uint8Array(w * h);
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const k = (y * w + x) * 4;
          const gx = Math.abs(lum(d0, k + 4) - lum(d0, k - 4)),
            gy = Math.abs(lum(d0, k + 4 * w) - lum(d0, k - 4 * w));
          if (gx + gy > 24)
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) edge[(y + dy) * w + x + dx] = 1;
        }
      const hot = new Uint8Array(w * h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          if (edge[y * w + x]) continue;
          const k = (y * w + x) * 4;
          let m = 0;
          for (let i = 1; i < fr.length; i++) m = Math.max(m, Math.abs(lum(fr[i].d, k) - lum(fr[i - 1].d, k)));
          if (m >= 20) hot[y * w + x] = 1;
        }
      // a z-fight flips a patch; a lone pixel or a one-pixel line is shimmer on a thin edge: count patches only
      let n = 0;
      const box = [w, h, 0, 0];
      const mark = g.getImageData(0, 0, w, h);
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          if (!hot[y * w + x]) continue;
          let c9 = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) c9 += hot[(y + dy) * w + x + dx];
          if (c9 < 6) continue;
          n++;
          mark.data.set([255, 0, 255, 255], (y * w + x) * 4);
          box[0] = Math.min(box[0], x);
          box[1] = Math.min(box[1], y);
          box[2] = Math.max(box[2], x);
          box[3] = Math.max(box[3], y);
        }
      g.putImageData(mark, 0, 0);
      return { n, box, png: c.toDataURL('image/png').split(',')[1] };
    }, shots);
    const name = `${String(i).padStart(2, '0')}-${place}-${eve ? 'eve-' : ''}${!at ? 'start' : typeof at === 'string' ? at : at.join('_')}-${W}`;
    fs.writeFileSync(`${out}/${name}.png`, Buffer.from(r.png, 'base64'));
    const bad = r.n > LIMIT;
    if (bad) fails.push(name);
    console.log(
      `${bad ? 'FAIL' : 'ok  '} ${name}: ${r.n} flickering pixels${r.n ? ` in x ${r.box[0]}-${r.box[2]}, y ${r.box[1]}-${r.box[3]}` : ''}${errs.length ? ' | errors: ' + errs.join(' | ') : ''}`,
    );
  }
}, WAIT);
console.log(
  fails.length
    ? `FAIL flicker: ${fails.join(', ')} (marked stills in ${out})`
    : `PASS flicker: ${CASES.length} cases at ${W}x${H}`,
);
process.exitCode = fails.length ? 1 : 0;
