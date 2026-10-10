// Finds flat faces lying on top of each other: two faces of different colours facing the same way (up, or square to
// x or z: walls, fronts, signs) at (nearly) the same depth, overlapping. That is the striped flicker (z-fighting)
// Jørgen saw under the pocket park's tree (2026-10-03) and on the kitchen tray (8afe1f52). flicker-check.mjs looks
// for it in pixels from a few camera spots; this reads a whole place's geometry, so it finds the ones no spot shows.
// Left out: faces drawn with polygonOffset (look/decal.js DECAL), pairs that both write no depth, colours too close to
// see a fight between, up faces over the camera, and overlaps hidden under an opaque face up to 30 cm in front.
// Prints each place's fights grouped by mesh pair and depth, with a point to look at, and FAILs a place with any
// group overlapping by more than MIN_AREA (marked !).
//   node game3d/tools/flats-check.mjs [place ...]     default: every outdoor place
//   TOL=0.0008      faces closer than this fight (a 1 mm gap held at phone depth precision, flicker-check NEAR=16)
//   MIN_AREA=0.1    m² per group to FAIL; smaller slivers are listed only
//   QS='&nobatch'   added to the query (each mesh on its own, with its own name)
//   FACES=all       walls, fronts and signs too (faces square to x or z); by default only faces looking up. Their
//                   list still holds fights below ground level (a kerb's side against its paving bed's), which
//                   nobody sees
//   BASE=.claude/worktrees/<name>/game3d for a worktree
//   GPU_WAIT=600   wait up to that many seconds for a GPU slot (default 60)
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

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
const places = process.argv.slice(2).length ? process.argv.slice(2) : OUTDOOR;
const base = process.env.BASE || 'game3d';
const TOL = +(process.env.TOL || 0.0008);
const MIN_AREA = +(process.env.MIN_AREA || 0.1);
const QS = process.env.QS || '';
const FACES = process.env.FACES || 'up';
const fails = [];

await withBrowserJob(
  'flats-check',
  async (browser) => {
    const ctx = await browser.newContext({
      viewport: { width: 1366, height: 860 },
    });
    for (const place of places) {
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', (e) => errs.push(e.message));
      await p.goto(`http://127.0.0.1:8771/${base}/index.html?q=1&place=${place}${QS}`, { timeout: 60000 });
      await p.waitForFunction((pl) => globalThis.__game?.place?.name === pl, place, { timeout: 90000 });
      await p.waitForTimeout(4000); // places finish building over a few frames
      const r = await p.evaluate(scan, { TOL, FACES });
      await p.close();
      const big = r.groups.filter((g) => g.area > MIN_AREA),
        small = r.groups.length - big.length;
      if (big.length) fails.push(place);
      console.log(
        `${big.length ? 'FAIL' : 'ok  '} ${place}: ${r.tris} flat faces, ${big.length} fighting over ${MIN_AREA} m², ${small} slivers under it${errs.length ? ' | errors: ' + errs.join(' | ') : ''}`,
      );
      for (const g of r.groups.slice(0, 40))
        console.log(
          `  ${g.area > MIN_AREA ? '!' : ' '}  ${g.dir === 'up' ? 'y' : g.dir[1]} ${g.y.toFixed(3)} dy ${(g.dy * 1000).toFixed(1)}mm  ${g.a} on ${g.b}  ${g.area.toFixed(2)} m² in ${g.n} pairs  at ${g.dir === 'up' ? 'x' : g.dir[1] === 'x' ? 'z' : 'x'} ${g.at[0].toFixed(2)} ${g.dir === 'up' ? 'z' : 'y'} ${g.at[1].toFixed(2)}`,
        );
    }
  },
  { gpuWaitMs: +(process.env.GPU_WAIT || 60) * 1000, timeoutMs: +(process.env.GPU_WAIT || 60) * 1000 + 290000 },
);
console.log(fails.length ? `FAIL flats: ${fails.join(', ')}` : `PASS flats: ${places.length} places`);
process.exitCode = fails.length ? 1 : 0;

// in the page: every face of every visible mesh that faces up or square to x or z, in world space, then the pairs
// of one facing within TOL of each other
function scan({ TOL, FACES }) {
  const G = globalThis.__game;
  const scene = G.place.scene || G.scene;
  scene.updateMatrixWorld(true);
  const camY = G.place.camera.position.y;
  const shown = (o) => {
    for (let q = o; q; q = q.parent) if (!q.visible) return false;
    return true;
  };
  // as the code writes it (sRGB hex); three keeps colours linear
  const srgb = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  const hex = (r, g, b) =>
    '#' +
    [r, g, b]
      .map((v) =>
        Math.round(Math.min(1, srgb(v)) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('');
  // faces by the way they face: up, or square to x or z (walls, signs, fronts), each in its own frame: h along the
  // normal (so higher h is in front), then the three corners in the plane's two other axes
  const DIRS = { up: [1, 0, 2, 1], '+x': [0, 2, 1, 1], '-x': [0, 2, 1, -1], '+z': [2, 0, 1, 1], '-z': [2, 0, 1, -1] };
  const bucket = Object.fromEntries(Object.keys(DIRS).map((d) => [d, { T: [], info: [] }]));
  let mid = 0;
  const v = [0, 0, 0].map(() => ({ x: 0, y: 0, z: 0 }));
  scene.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || !shown(o)) return;
    if (o.name === 'perf-shadow' || !(o.layers.mask & 1)) return; // drawn only into shadows, or hidden in a batch
    const g = o.geometry,
      pos = g?.attributes?.position;
    if (!pos) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const groups =
      Array.isArray(o.material) && g.groups.length
        ? g.groups
        : [
            {
              start: 0,
              count: g.index ? g.index.count : pos.count,
              materialIndex: 0,
            },
          ];
    const e = o.matrixWorld.elements;
    const col = g.attributes.color;
    const id = mid++;
    const name = (() => {
      const out = [];
      for (let q = o; q && q !== scene && out.length < 3; q = q.parent) if (q.name) out.push(q.name);
      if (o.userData.surf) out.unshift(o.userData.surf);
      return out.join('<') || o.type;
    })();
    for (const gr of groups) {
      const m = mats[gr.materialIndex ?? 0];
      if (!m || !m.visible || m.colorWrite === false || (m.transparent && m.opacity < 0.05)) continue;
      const flags =
        (m.polygonOffset && m.polygonOffsetFactor + m.polygonOffsetUnits < 0 ? 1 : 0) |
        (m.depthWrite === false ? 2 : 0);
      if (flags & 1) continue;
      const mc = m.color || { r: 1, g: 1, b: 1 };
      const tex = !!m.map;
      const end = Math.min(gr.start + gr.count, g.index ? g.index.count : pos.count);
      for (let i = gr.start; i + 2 < end; i += 3) {
        const ix = [i, i + 1, i + 2].map((k) => (g.index ? g.index.getX(k) : k));
        for (let k = 0; k < 3; k++) {
          const x = pos.getX(ix[k]),
            y = pos.getY(ix[k]),
            z = pos.getZ(ix[k]);
          v[k].x = e[0] * x + e[4] * y + e[8] * z + e[12];
          v[k].y = e[1] * x + e[5] * y + e[9] * z + e[13];
          v[k].z = e[2] * x + e[6] * y + e[10] * z + e[14];
        }
        const ax = v[1].x - v[0].x,
          ay = v[1].y - v[0].y,
          az = v[1].z - v[0].z,
          bx = v[2].x - v[0].x,
          by = v[2].y - v[0].y,
          bz = v[2].z - v[0].z;
        const nx = ay * bz - az * by,
          ny = az * bx - ax * bz,
          nz = ax * by - ay * bx;
        const len = Math.hypot(nx, ny, nz);
        if (len < 1e-6) continue;
        const dir =
          ny / len > 0.999
            ? 'up'
            : nx / len > 0.999
              ? '+x'
              : nx / len < -0.999
                ? '-x'
                : nz / len > 0.999
                  ? '+z'
                  : nz / len < -0.999
                    ? '-z'
                    : null;
        if (!dir || (FACES === 'up' && dir !== 'up')) continue; // slopes, undersides, curved faces
        if (dir === 'up' && (v[0].y + v[1].y + v[2].y) / 3 > camY) continue; // over the camera: its top is never seen
        let c = mc;
        if (col && m.vertexColors)
          c = {
            r: mc.r * col.getX(ix[0]),
            g: mc.g * col.getY(ix[0]),
            b: mc.b * col.getZ(ix[0]),
          };
        const [hA, uA, vA, sg] = DIRS[dir],
          q = v.map((w) => [w.x, w.y, w.z]);
        bucket[dir].T.push(
          sg * ((q[0][hA] + q[1][hA] + q[2][hA]) / 3),
          q[0][uA],
          q[0][vA],
          q[1][uA],
          q[1][vA],
          q[2][uA],
          q[2][vA],
        );
        bucket[dir].info.push({
          c: hex(c.r, c.g, c.b) + (tex ? '+tex' : ''),
          id,
          name,
          flags,
        });
      }
    }
  });
  const groups = [];
  let tris = 0;
  for (const [dir, { T, info }] of Object.entries(bucket)) {
    tris += info.length;
    groups.push(...fights(dir, T, info));
  }
  return { tris, groups: groups.sort((p, q) => q.area - p.area) };

  // the pairs of faces of one facing that lie level and overlap (h: along their normal, [u, v]: in their plane)
  function fights(dir, T, info) {
    const n = info.length;
    const at = (i, k) => T[i * 7 + k];
    // a grid in x, z per height cell; faces over many cells go on a list checked against all of their height
    const C = 1,
      cells = new Map(),
      wide = new Map();
    const box = (i) => {
      const xs = [at(i, 1), at(i, 3), at(i, 5)],
        zs = [at(i, 2), at(i, 4), at(i, 6)];
      return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
    };
    for (let i = 0; i < n; i++) {
      const h = Math.floor(at(i, 0) / TOL);
      const [x0, x1, z0, z1] = box(i);
      const cx0 = Math.floor(x0 / C),
        cx1 = Math.floor(x1 / C),
        cz0 = Math.floor(z0 / C),
        cz1 = Math.floor(z1 / C);
      if ((cx1 - cx0 + 1) * (cz1 - cz0 + 1) > 64) {
        if (!wide.has(h)) wide.set(h, []);
        wide.get(h).push(i);
        continue;
      }
      for (let cx = cx0; cx <= cx1; cx++)
        for (let cz = cz0; cz <= cz1; cz++) {
          const k = `${h},${cx},${cz}`;
          if (!cells.has(k)) cells.set(k, []);
          cells.get(k).push(i);
        }
    }
    // the overlap of two triangles in x, z (convex clipping), m²
    const tri = (i) => [
      [at(i, 1), at(i, 2)],
      [at(i, 3), at(i, 4)],
      [at(i, 5), at(i, 6)],
    ];
    const area = (P) => {
      let s = 0;
      for (let k = 0; k < P.length; k++) {
        const [a, b] = [P[k], P[(k + 1) % P.length]];
        s += a[0] * b[1] - b[0] * a[1];
      }
      return s / 2;
    };
    const ccw = (P) => (area(P) < 0 ? [...P].reverse() : P);
    function overlap(i, j) {
      let P = ccw(tri(i));
      const Q = ccw(tri(j));
      for (let k = 0; k < 3 && P.length; k++) {
        const [a, b] = [Q[k], Q[(k + 1) % 3]];
        const side = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
        const out = [];
        for (let m = 0; m < P.length; m++) {
          const p = P[m],
            q = P[(m + 1) % P.length],
            sp = side(p),
            sq = side(q);
          if (sp >= 0) out.push(p);
          if (sp >= 0 !== sq >= 0) {
            const t = sp / (sp - sq);
            out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
          }
        }
        P = out;
      }
      return P.length < 3 ? [0, P] : [Math.abs(area(P)), P];
    }
    // faces by their x, z cell at any height, for covered()
    const plan = new Map(),
      planWide = [];
    for (let i = 0; i < n; i++) {
      if (info[i].flags & 2) continue; // see-through: covers nothing
      const [x0, x1, z0, z1] = box(i);
      if ((Math.floor(x1 / C) - Math.floor(x0 / C) + 1) * (Math.floor(z1 / C) - Math.floor(z0 / C) + 1) > 64) {
        planWide.push(i);
        continue;
      }
      for (let cx = Math.floor(x0 / C); cx <= Math.floor(x1 / C); cx++)
        for (let cz = Math.floor(z0 / C); cz <= Math.floor(z1 / C); cz++) {
          const k = cx + ',' + cz;
          if (!plan.has(k)) plan.set(k, []);
          plan.get(k).push(i);
        }
    }
    const inside = (i, x, z) => {
      const T3 = tri(i);
      let pos = 0,
        neg = 0;
      for (let k = 0; k < 3; k++) {
        const [a, b] = [T3[k], T3[(k + 1) % 3]];
        const c = (b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]);
        if (c > 0) pos++;
        if (c < 0) neg++;
      }
      return !(pos && neg);
    };
    // a fight nobody sees: the overlap lies under an opaque face up to 30 cm higher (a wall's top under its coping, a body's top under its roof slab)
    const covered = (P, y) => {
      const cx = P.reduce((s, q) => s + q[0], 0) / P.length,
        cz = P.reduce((s, q) => s + q[1], 0) / P.length;
      const pts = [[cx, cz], ...P.map(([x, z]) => [x + (cx - x) * 0.1, z + (cz - z) * 0.1])];
      return pts.every(([x, z]) =>
        [...(plan.get(Math.floor(x / C) + ',' + Math.floor(z / C)) || []), ...planWide].some(
          (i) => at(i, 0) > y + 1e-3 && at(i, 0) < y + 0.3 && inside(i, x, z),
        ),
      );
    };
    // colours a fight between wouldn't show (a batch bakes its colours a hair differently)
    const same = (a, b) => {
      if (a.endsWith('+tex') !== b.endsWith('+tex')) return false;
      for (let k = 1; k < 7; k += 2)
        if (Math.abs(parseInt(a.slice(k, k + 2), 16) - parseInt(b.slice(k, k + 2), 16)) > 16) return false;
      return true;
    };
    const seen = new Set(),
      groups = new Map();
    const sgn = DIRS[dir][3];
    const test = (i, j) => {
      if (i === j) return;
      const [a, b] = i < j ? [i, j] : [j, i];
      const key = a * n + b;
      if (seen.has(key)) return;
      seen.add(key);
      const A = info[a],
        B = info[b];
      const dy = Math.abs(at(a, 0) - at(b, 0));
      if (dy >= TOL || same(A.c, B.c) || (A.flags & 2 && B.flags & 2)) return;
      const [ax0, ax1, az0, az1] = box(a),
        [bx0, bx1, bz0, bz1] = box(b);
      if (ax1 <= bx0 || bx1 <= ax0 || az1 <= bz0 || bz1 <= az0) return;
      const [s, P] = overlap(a, b);
      if (s < 1e-4 || covered(P, Math.max(at(a, 0), at(b, 0)))) return;
      const [lo, hi] = at(a, 0) <= at(b, 0) ? [A, B] : [B, A];
      // one group per pair of meshes, height (mm) and gap (0.1 mm): a merged mesh's many colours of one thing stay one line
      const gk = `${hi.name}|${lo.name}|${Math.round(Math.max(at(a, 0), at(b, 0)) * 1000)}|${Math.round(dy * 1e4)}`;
      let gr = groups.get(gk);
      if (!gr)
        groups.set(
          gk,
          (gr = {
            a: `${hi.c} (${hi.name})`,
            b: `${lo.c} (${lo.name})`,
            y: sgn * Math.max(at(a, 0), at(b, 0)),
            dy,
            area: 0,
            n: 0,
            at: [at(a, 1), at(a, 2)],
            best: 0,
          }),
        );
      gr.area += s;
      gr.n++;
      if (s > gr.best) {
        gr.best = s;
        gr.a = `${hi.c} (${hi.name})`;
        gr.b = `${lo.c} (${lo.name})`;
        gr.at = [(at(a, 1) + at(a, 3) + at(a, 5)) / 3, (at(a, 2) + at(a, 4) + at(a, 6)) / 3];
      }
    };
    for (const [k, list] of cells) {
      const [h, cx, cz] = k.split(',').map(Number);
      for (const dh of [-1, 0, 1]) {
        const other = cells.get(`${h + dh},${cx},${cz}`);
        if (other) for (const i of list) for (const j of other) test(i, j);
      }
    }
    for (const [h, list] of wide)
      for (const dh of [-1, 0, 1]) {
        for (const [k, other] of cells)
          if (+k.split(',')[0] === h + dh) for (const i of list) for (const j of other) test(i, j);
        for (const i of list) for (const j of wide.get(h + dh) || []) test(i, j);
      }
    return [...groups.values()].map((g) => ({ ...g, dir }));
  }
}
