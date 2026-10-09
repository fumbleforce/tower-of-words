// The outdoor planting and the park bench, modelled in Blender (tools/grounds/planting.py,
// game3d/assets/outdoor/planting.glb; issue #362): tree trunks with root flare, taper, branch junctions and bark,
// leafy bush masses, clipped hedge plants, and the bench's cast-iron ends and timber slats. Each node's vertex colours
// are shading multipliers (0.5 = as given): the builders in outdoor/planting.js, outdoor/furniture.js and
// diorama/planting.js still choose the greens, bark and timber, and hand these geometries to their Parts collector
// with { shade: true }, so a court's trees, hedges and benches stay a few merged meshes.
// loadPlantModels() is awaited before a place is built (places/lifecycle.js). Until it has loaded, or if the file
// can't be fetched (patchy signal) or the code runs outside a browser (unit tests), plantModels() is null and the
// builders make their older code-built shapes instead.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from '../../../vendor/loaders/GLTFLoader.js';
import { rng } from './parts.js';

let parts = null,
  loading = null,
  lean = false;

// lighter: build with the phone's lighter copies (the <name>_lo nodes: trunks and hedge plants with about half the
// triangles), and keep the small bushes faceted balls (perf/phone.js has the phone's budget)
export function loadPlantModels({ lighter = false } = {}) {
  lean = lighter;
  if (typeof document === 'undefined') return Promise.resolve();
  return (loading ??= new GLTFLoader()
    .loadAsync(new URL('../../../assets/outdoor/planting.glb', import.meta.url).href)
    .then((g) => {
      const out = {};
      g.scene.traverse((o) => {
        if (!o.isMesh) return;
        out[o.name] = { geometry: o.geometry, tips: o.userData.tips ? JSON.parse(o.userData.tips) : [] };
      });
      parts = out;
    })
    .catch((e) => console.warn('planting.glb', e)));
}

// Set directly (tests).
export function setPlantModels(p) {
  parts = p;
}
export const plantModels = () => parts;
// the smallest bush mass worth its triangles (radius): on a phone only the big crowns and shrubs get one
export const bushFrom = () => (lean ? 0.6 : 0.3);

const _m = new THREE.Matrix4(),
  _q = new THREE.Quaternion(),
  _v = new THREE.Vector3(),
  _s = new THREE.Vector3(),
  UP = new THREE.Vector3(0, 1, 0);
const pose = ([x, y, z], scale, ry) =>
  _m.compose(
    _v.set(x, y, z),
    _q.setFromAxisAngle(UP, ry),
    typeof scale === 'number' ? _s.setScalar(scale) : _s.set(...scale),
  );

// A copy of one node's geometry, scaled (a number or [sx, sy, sz] in its own frame), turned ry about y and moved to
// `at`; null without the models.
export function plantGeometry(name, at = [0, 0, 0], scale = 1, ry = 0) {
  const p = (lean && parts?.[name + '_lo']) || parts?.[name];
  return p ? p.geometry.clone().applyMatrix4(pose(at, scale, ry)) : null;
}

// Where a trunk's crowns sit, in the same pose: [[x, y, z, k]], k their relative size.
export function plantTips(name, at = [0, 0, 0], scale = 1, ry = 0) {
  const m = pose(at, scale, ry);
  return (parts?.[name]?.tips || []).map(([x, y, z, k]) => [..._v.set(x, y, z).applyMatrix4(m).toArray(), k]);
}

// A tree's trunk node for a species and seed: the two keyaki and sakura variants alternate.
export const trunkName = (species, seed) =>
  parts?.[`trunk_${species}_b`] && Math.abs(seed) % 2 ? `trunk_${species}_b` : `trunk_${species}`;

// A bush mass about a unit sphere for a seed (three shapes).
export const bushName = (seed) => 'bush_' + 'abc'[Math.abs(Math.floor(seed * 7.3)) % 3];

// A clipped hedge from a to b ([x, z], axis-aligned) as overlapping hedge plants, each a little different in height
// and shape: [{ geometry, i }] (i: the plant's index along the run), or null without the models.
export function hedgeGeometries(a, b, { w = 0.5, h = 0.55, y = 0, seed = 1 } = {}) {
  if (!parts?.hedge_a) return null;
  const alongX = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
  const L = alongX ? Math.abs(b[0] - a[0]) : Math.abs(b[1] - a[1]);
  const n = Math.max(1, Math.round(L / 0.95)),
    step = L / n;
  const q = rng(seed + 71);
  const s0 = alongX ? Math.min(a[0], b[0]) : Math.min(a[1], b[1]);
  const out = [];
  for (let i = 0; i < n; i++) {
    // each plant reaches 0.15 into its neighbours, so their rounded ends sink into the run; the run's own ends stay
    // rounded, where the old hedge ended
    const lo = s0 + step * i - (i ? 0.15 : 0.03),
      hi = s0 + step * (i + 1) + (i < n - 1 ? 0.15 : 0.03);
    const c = (lo + hi) / 2,
      hh = h * (0.95 + q() * 0.08);
    const name = 'hedge_' + 'abc'[Math.floor(q() * 3)];
    const ry = (alongX ? 0 : Math.PI / 2) + (q() < 0.5 ? Math.PI : 0);
    const at = alongX ? [c, y, a[1]] : [a[0], y, c];
    out.push({ geometry: plantGeometry(name, at, [hi - lo, hh / 0.6, w / 0.5], ry), i });
  }
  return out;
}

// The park bench in its own frame (x along the seat, the sitter looking along +z, standing on y = 0), len long:
// { iron, wood } geometries, or null without the models. The end frames stand 0.12 in from each end.
export function benchGeometries(len, back = true) {
  const end = parts?.[back ? 'bench_end' : 'bench_end_low'],
    seat = parts?.[back ? 'bench_seat' : 'bench_seat_low'];
  if (!end || !seat) return null;
  const u = len / 2 - 0.12;
  const iron = mergeGeometries([-u, u].map((x) => end.geometry.clone().translate(x, 0, 0)));
  return { iron, wood: seat.geometry.clone().scale(len, 1, 1) };
}
