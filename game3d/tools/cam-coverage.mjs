// Camera coverage: is Eric's whole body on screen wherever he can stand? For every place (and the train cruising and
// stopped), it floods the walk grid from the place's start, stands him on every reachable spot (a grid of STRIDE m),
// checks his body's box against the settled frame and each requested grid point with a margin, at phone, laptop and full HD
// sizes. Scripted close-ups (conversations, the lift ride) are not sampled: nothing closes the camera in ?cap.
//   node game3d/tools/cam-coverage.mjs                   all places, all sizes; exit 1 on any failure
//   PLACES=office,plaza SIZES=390x844 node game3d/tools/cam-coverage.mjs
// STRIDE=0.35 (m), MARGIN=12 (px), OUT=<file.json> for every failing spot. BASE=.claude/worktrees/<name>/game3d for a
// worktree. When to run it: docs/game/controls-and-ui.md, Camera.
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';

const base = process.env.BASE || 'game3d';
const sizes = (process.env.SIZES || '390x844,1366x860,1920x1080').split(',').map((s) => s.split('x').map(Number));
const STRIDE = +(process.env.STRIDE || 0.35),
  MARGIN = +(process.env.MARGIN || 12),
  SETTLE = +(process.env.SETTLE || 2.5); // seconds of game time after the camera snaps
// keepTags: keep the tagged blockers (doors, gates) as they are at the start; otherwise they count as open. start: flood
// from here instead of the place's start. close: a story close-up on that person left up while he walks (the office
// greeting holds on Mori until he answers; issue #121). stride: a finer grid for narrow walks.
const VARIANTS = [
  { name: 'train', place: 'train', keepTags: true },
  { name: 'train-stopped', place: 'train', st: 'stopped' },
  { name: 'gate', place: 'gate' },
  { name: 'forecourt', place: 'forecourt' },
  { name: 'office', place: 'office' },
  { name: 'office-held', place: 'office', close: 'mori' },
  { name: 'plaza', place: 'plaza' },
  { name: 'dorm_court', place: 'dorm_court' },
  { name: 'dorms', place: 'dorms', stride: 0.15 },
  { name: 'dorms-room', place: 'dorms', start: [-0.1, -0.2] },
];
const only = process.env.PLACES?.split(',');
const variants = VARIANTS.filter((v) => !only || only.includes(v.name) || only.includes(v.place));

// in the page: sample the reachable grid and return the spots where his body leaves the frame
async function sample({ st, keepTags, start, close, stride, margin, settle }) {
  const { sampleCameraFrames } = await import('./test/support/camera-coverage-sample.mjs');
  const g = globalThis.__game,
    P = g.place,
    nav = P.nav,
    root = g.player.root;
  if (st) await P.capState(st);
  const V = root.position.constructor;
  // the walkable cells reachable from the start (tagged blockers open unless keepTags)
  const rects = nav.rects;
  if (!keepTags) nav.rects = rects.filter((r) => !r.tag);
  nav.grid = null;
  nav.build();
  const grid = nav.grid,
    nx = nav.nx,
    nz = nav.nz,
    s0 = nav.nearestFree(...nav.cellOf(...(start || P.start)));
  nav.rects = rects;
  nav.grid = null;
  const seen = new Uint8Array(nx * nz);
  const queue = [s0[1] * nx + s0[0]];
  seen[queue[0]] = 1;
  while (queue.length) {
    const c = queue.pop(),
      i = c % nx,
      k = (c / nx) | 0;
    for (const [di, dk] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const a = i + di,
        b = k + dk,
        n = b * nx + a;
      if (a < 0 || b < 0 || a >= nx || b >= nz || seen[n] || !grid[n]) continue;
      seen[n] = 1;
      queue.push(n);
    }
  }
  if (close) P.cam.closeOn(g.posOf(close), 1.6);
  const step = Math.max(1, Math.round(stride / nav.cell)),
    spots = [];
  for (let k = 0; k < nz; k += step)
    for (let i = 0; i < nx; i += step)
      if (seen[k * nx + i]) spots.push([nav.x0 + (i + 0.5) * nav.cell, nav.z0 + (k + 0.5) * nav.cell]);
  // far side first: a place that changes framing when he walks in (the dorm flat) goes corridor, then room
  spots.sort((a, b) => b[1] - a[1] || a[0] - b[0]);

  // his body: the box of his visible meshes (not the ground shadow), in his own space
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(),
    lo = new V(1e9, 1e9, 1e9),
    hi = new V(-1e9, -1e9, -1e9),
    v = new V();
  root.traverse((o) => {
    if (!o.isMesh || !o.visible || !o.geometry) return;
    // a skinned mesh's own box follows its bones (the geometry's box is the bind pose)
    if (o.isSkinnedMesh) o.computeBoundingBox();
    else if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const bb = o.isSkinnedMesh ? o.boundingBox : o.geometry.boundingBox;
    if (bb.max.y - bb.min.y < 0.03 && o.position.y < 0.05) return; // the blob shadow
    for (const x of [bb.min.x, bb.max.x])
      for (const y of [bb.min.y, bb.max.y])
        for (const z of [bb.min.z, bb.max.z]) {
          v.set(x, y, z).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
          lo.min(v);
          hi.max(v);
        }
  });
  const corners = [];
  for (const x of [lo.x, hi.x])
    for (const y of [lo.y, hi.y]) for (const z of [lo.z, hi.z]) corners.push(new V(x, y, z));

  const camera = P.camera,
    W = globalThis.innerWidth,
    H = globalThis.innerHeight,
    mx = 1 - (2 * margin) / W,
    my = 1 - (2 * margin) / H,
    fails = [];
  const displaced = [];
  const measure = () => {
    let worst = 0,
      side = '';
    for (const c of corners) {
      v.copy(c).applyMatrix4(root.matrixWorld).project(camera);
      const ox = Math.abs(v.x) - mx,
        oy = Math.abs(v.y) - my;
      if (v.z > 1) {
        worst = 9;
        side = 'behind';
      }
      if (ox > worst) {
        worst = ox;
        side = v.x < 0 ? 'left' : 'right';
      }
      if (oy > worst) {
        worst = oy;
        side = v.y < 0 ? 'bottom' : 'top';
      }
    }
    return { worst, side };
  };
  for (const [x, z] of spots) {
    const result = sampleCameraFrames({
      root,
      walker: g.walker,
      camera,
      cam: P.cam,
      advance: globalThis.__advance,
      x,
      z,
      settle,
      measure,
    });
    if (result.displacement > 1e-9)
      displaced.push({
        requested: [x, z],
        actual: result.actual,
        distance: result.displacement,
      });
    for (const { stage, worst, side, unverified } of result.frames)
      if (worst > 0 || unverified)
        fails.push({
          x: +x.toFixed(2),
          z: +z.toFixed(2),
          stage,
          actual: result.actual,
          ...(unverified
            ? { unverified }
            : {
                side,
                px: Math.round((worst * (side === 'top' || side === 'bottom' ? H : W)) / 2),
              }),
        });
  }
  return {
    n: spots.length,
    body: [lo.y, hi.y].map((y) => +y.toFixed(2)),
    displaced,
    maxDisplacement: displaced.reduce((max, spot) => Math.max(max, spot.distance), 0),
    fails,
  };
}

const results = [],
  errors = [];
await withBrowserJob(
  'cam-coverage',
  async (browser) => {
    for (const [w, h] of sizes) {
      const phone = w < 700;
      const context = await browser.newContext({
        viewport: { width: w, height: h },
        isMobile: phone,
        hasTouch: phone,
      });
      for (const vr of variants) {
        const page = await context.newPage();
        page.on('pageerror', (e) => errors.push(`${vr.name} ${w}x${h}: ${e.message}`));
        await page.goto(`http://127.0.0.1:8771/${base}/index.html?cap&q=0&place=${vr.place}`, { timeout: 60000 });
        await page.waitForFunction(() => globalThis.__done, null, {
          timeout: 120000,
        });
        const r = await page.evaluate(sample, {
          st: vr.st,
          keepTags: !!vr.keepTags,
          start: vr.start,
          close: vr.close,
          stride: vr.stride || STRIDE,
          margin: MARGIN,
          settle: SETTLE,
        });
        results.push({ place: vr.name, size: `${w}x${h}`, ...r });
        const f = r.fails;
        console.log(
          `${vr.name.padEnd(14)} ${`${w}x${h}`.padEnd(10)} ${String(f.length).padStart(4)} / ${r.n} spots out of frame; ${r.displaced.length} displaced during settle` +
            (f.length
              ? `  e.g. ${f
                  .slice(0, 4)
                  .map((s) => `(${s.x}, ${s.z}) ${s.stage}: ${s.unverified || `${s.side} ${s.px}px`}`)
                  .join(', ')}`
              : ''),
        );
        await page.close();
      }
      await context.close();
    }
  },
  { timeoutMs: 1500000, gpuWaitMs: 900000, loadWaitMs: 900000 },
);
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(results, null, 1));
if (errors.length) console.log('page errors:\n' + errors.join('\n'));
const total = results.reduce((s, r) => s + r.fails.length, 0);
console.log(total ? `FAIL: ${total} spots with Eric out of frame` : 'PASS: Eric in frame everywhere');
process.exit(total || errors.length ? 1 : 0);
