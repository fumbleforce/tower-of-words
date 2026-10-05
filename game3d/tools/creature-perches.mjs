// Where the birds and animals can be (js/creatures/perches.js), surveyed from the built places: a grid of rays
// straight down over each place's walk grid (and a margin round it), each hit sorted into
//   ground  walkable paving (on the walk grid), where pigeons and sparrows feed and cats sit
//   low     a flat top 0.35 to 2.4 m up off the walk grid: walls, planters, benches, bollards, fences
//   high    a flat top 2.8 m up or more: roofs, canopies, shelters
//   hedge   the top of a hedge or a bush, up to 2.4 m (green, off the walk grid); tree: a tree's crown, higher
//   green   lawn and planting at ground level (green faces off the walk grid), where butterflies and dragonflies fly
//   water   the sea or the harbour, below the paving
// then thinned to an even spread. Raycasting a built place costs 1 to 12 ms a ray, so this runs here, once, not in
// the game. Run it after a place's geometry changes; --check only re-tests the stored points and fails on drift.
//   node game3d/tools/creature-perches.mjs [--check] [place ...]       (BASE=.claude/worktrees/<n>/game3d)
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), '../js/creatures/perches.js');
const CHECK = process.argv.includes('--check');
const ALL = ['forecourt', 'plaza', 'dorm_court', 'shotengai', 'east_lane', 'east_coast', 'sports', 'pool', 'office_quarter', 'harbour', 'works'];
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const places = args.length ? args : ALL;
const base = process.env.BASE || 'game3d';
const CAPS = { ground: 120, low: 50, high: 50, hedge: 30, tree: 30, green: 40, water: 24 };
const STEP = 1.2,
  MARGIN = 5;

const old = fs.existsSync(OUT) ? (await import(OUT + '?' + Date.now())).PERCHES : {};
const result = { ...old };
let drift = 0;

// in the page: survey the place (stored null), or re-test stored points
const survey = async ([STEP, MARGIN, stored, strict]) => {
  const THREE = await import('three');
  const g = globalThis.__game,
    P = g.place,
    nav = P.nav;
  g.player.root.visible = false;
  if (g.mioNpc) g.mioNpc.root.visible = false;
  P.scene.updateMatrixWorld(true);
  const shown = (o) => {
    for (; o; o = o.parent) if (!o.visible) return false;
    return true;
  };
  const solid = (h) => {
    const m = Array.isArray(h.object.material) ? h.object.material[0] : h.object.material;
    if (!m || m.userData?.noLook || h.object.userData.creature) return false; // people, the creatures
    if (m.transparent && (m.opacity < 0.9 || m.blending === THREE.AdditiveBlending)) return false; // light pools, glass
    if (m.depthWrite === false) return false;
    return shown(h.object);
  };
  const rc = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0),
    v = new THREE.Vector3(),
    n = new THREE.Vector3(),
    c = new THREE.Color();
  const hitAt = (x, z) => {
    v.set(x, 60, z);
    P.space.localToWorld(v);
    rc.set(v, down);
    const h = rc.intersectObject(P.scene, true).find(solid);
    if (!h) return null;
    const p = P.space.worldToLocal(h.point.clone());
    n.copy(h.face.normal).transformDirection(h.object.matrixWorld);
    const m = Array.isArray(h.object.material) ? h.object.material[0] : h.object.material;
    c.copy(m.color || new THREE.Color(1, 1, 1));
    const col = h.object.geometry.attributes.color;
    if (col) c.multiply(new THREE.Color(col.getX(h.face.a), col.getY(h.face.a), col.getZ(h.face.a)));
    if (h.object.isInstancedMesh && h.object.instanceColor && h.instanceId != null) {
      const ic = new THREE.Color();
      h.object.getColorAt(h.instanceId, ic);
      c.multiply(ic);
    }
    return { y: p.y, up: n.y, r: c.r, g: c.g, b: c.b };
  };
  const sort = (x, z, h) => {
    if (!h || h.up < 0.9) return null;
    const walk = nav.free(x, z, 0.12);
    if (walk && h.y > -0.05 && h.y < 0.5) return 'ground';
    if (walk) return null;
    if (h.y < -0.08) return h.b > h.r ? 'water' : null;
    const green = h.g > h.r * 1.08 && h.g > h.b * 1.05;
    if (green) return h.y < 0.45 ? 'green' : h.y < 2.4 ? 'hedge' : 'tree';
    if (h.y >= 0.35 && h.y <= 2.4) return 'low';
    if (h.y >= 2.8) return 'high';
    return null;
  };
  if (stored) {
    // re-test each stored point: still the same kind of surface at the same height?
    // strict (while surveying): the same 6 cm round it too, so no point sits on an edge
    const bad = [],
      badAt = {};
    const offs = strict ? [[0, 0], [0.06, 0], [-0.06, 0], [0, 0.06], [0, -0.06]] : [[0, 0]];
    for (const [kind, pts] of Object.entries(stored))
      for (let i = 0; i < pts.length; i += 3) {
        const [x, y, z] = [pts[i], pts[i + 1], pts[i + 2]];
        for (const [dx, dz] of offs) {
          const h = hitAt(x + dx, z + dz);
          if (sort(x + dx, z + dz, h) === kind && Math.abs(h.y - y) <= 0.06) continue;
          bad.push(`${kind} ${x},${y},${z} -> ${h ? sort(x, z, h) + ' ' + h.y.toFixed(2) : 'nothing'}`);
          (badAt[kind] ||= []).push(i / 3);
          break;
        }
      }
    return { bad, badAt };
  }
  const out = { ground: [], low: [], high: [], hedge: [], tree: [], green: [], water: [] };
  const t0 = performance.now();
  for (let x = nav.x0 - MARGIN; x <= nav.x1 + MARGIN; x += STEP)
    for (let z = nav.z0 - MARGIN; z <= nav.z1 + MARGIN; z += STEP) {
      // a little jitter, so rows of points don't line up on the paving's grid
      const jx = x + (Math.random() - 0.5) * STEP * 0.6,
        jz = z + (Math.random() - 0.5) * STEP * 0.6;
      const h = hitAt(jx, jz),
        k = sort(jx, jz, h);
      if (k) out[k].push([+jx.toFixed(2), +h.y.toFixed(2), +jz.toFixed(2)]);
    }
  return { out, ms: Math.round(performance.now() - t0) };
};

await withBrowserJob(
  'creature-perches',
  async (browser) => {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
    for (const place of places) {
      const page = await ctx.newPage();
      page.on('pageerror', (e) => console.log(place, 'page error', e.message));
      await page.goto(`http://127.0.0.1:8771/${base}/index.html?cap&q=1&place=${place}&nocreatures`);
      await page.waitForFunction(() => globalThis.__done, null, { timeout: 120000 });
      await page.waitForTimeout(1500);
      const got = await page.evaluate(survey, [STEP, MARGIN, CHECK ? old[place] || {} : null, false]);
      if (CHECK) {
        console.log(place, got.bad.length ? `${got.bad.length} moved:\n  ` + got.bad.join('\n  ') : 'ok');
        drift += got.bad.length;
      } else {
        const thin = {};
        for (const [k, pts] of Object.entries(got.out)) thin[k] = spread(pts, CAPS[k]).flat();
        // drop points on an edge (they would flicker between surfaces on the next survey)
        const { badAt } = await page.evaluate(survey, [STEP, MARGIN, thin, true]);
        for (const [k, idx] of Object.entries(badAt)) {
          const drop = new Set(idx);
          thin[k] = thin[k].filter((_, j) => !drop.has(Math.floor(j / 3)));
        }
        result[place] = thin;
        console.log(place, `${got.ms} ms`, Object.entries(got.out).map(([k, p]) => `${k} ${p.length}->${Math.min(p.length, CAPS[k])}`).join(', '));
      }
      await page.close();
    }
  },
  { timeoutMs: 1800000, gpuWaitMs: 1200000 },
);

// farthest-point sampling: an even spread of at most n points
function spread(pts, n) {
  if (pts.length <= n) return pts;
  const out = [pts[Math.floor(pts.length / 2)]];
  const d = pts.map(() => Infinity);
  while (out.length < n) {
    const last = out[out.length - 1];
    let best = 0;
    pts.forEach((p, i) => {
      d[i] = Math.min(d[i], Math.hypot(p[0] - last[0], p[2] - last[2]) + 0.3 * Math.abs(p[1] - last[1]));
      if (d[i] > d[best]) best = i;
    });
    out.push(pts[best]);
  }
  return out;
}

if (CHECK) process.exit(drift ? 1 : 0);
const body = Object.entries(result)
  .map(([p, kinds]) => `  ${p}: {\n${Object.entries(kinds).map(([k, a]) => `    ${k}: [${a.join(', ')}],`).join('\n')}\n  },`)
  .join('\n');
fs.writeFileSync(
  OUT,
  `// Where the birds and animals can be in each outdoor place: x, y, z triples in the place's own frame, surveyed from
// the built places by game3d/tools/creature-perches.mjs (which says what each kind is). Generated: run the tool again
// after a place's geometry changes, and \`--check\` to see whether any point has moved.
// prettier-ignore
export const PERCHES = {
${body}
};
`,
);
console.log('wrote', OUT);
