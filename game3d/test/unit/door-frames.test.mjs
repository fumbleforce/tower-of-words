// Door and lift frames must not share a plane with the faces of the wall opening they line: the head office
// lobby's receptionist's office door, stair door and lifts flickered there (Jørgen, 2026-10-10: "flickering on the
// inside of the frames of the doors, both elevator and doorway to secretary office"). This builds those walls as
// the game does and looks for faces of different colours facing the same way within a millimetre of each other and
// overlapping (what game3d/tools/flats-check.mjs finds in a running place, here without a browser).
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three')
      return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
    if (specifier.startsWith('three/addons/'))
      return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
    return next(specifier, context);
  },
});
// the signs draw on a canvas: a stand-in that takes every call
const ctx2d = new Proxy({}, { get: (t, k) => (k === 'width' ? 10 : () => ctx2d), set: () => true });
Object.assign(globalThis, {
  location: { search: '' },
  window: {},
  document: {
    body: { classList: { contains: () => false } },
    createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d }),
  },
});
const THREE = await import('three');
const { featureWall, core, liftLanding } = await import('../../js/scenes/head-office/core.js');

// every axis-aligned triangle in world space: its axis, the way it faces, its depth, its corners in the other two
// axes, and its colour (material and vertex colour)
function faces(root) {
  root.updateMatrixWorld(true);
  const out = [];
  const v = [0, 1, 2].map(() => new THREE.Vector3());
  const e1 = new THREE.Vector3(),
    e2 = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry,
      pos = g.attributes.position,
      col = g.attributes.color,
      idx = g.index;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (m.polygonOffset || m.depthWrite === false) return;
    const n = idx ? idx.count : pos.count;
    for (let i = 0; i + 2 < n; i += 3) {
      const ix = [i, i + 1, i + 2].map((k) => (idx ? idx.getX(k) : k));
      ix.forEach((k, j) => v[j].fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld));
      const nrm = e1.subVectors(v[1], v[0]).cross(e2.subVectors(v[2], v[0]));
      if (nrm.length() < 1e-9) continue;
      nrm.normalize();
      const axis = [0, 1, 2].find((a) => Math.abs(nrm.getComponent(a)) > 0.999);
      if (axis === undefined) continue;
      if (axis === 1 && nrm.y < 0 && v[0].y < 0.001) continue; // undersides on the floor: never seen
      const [a, b] = [0, 1, 2].filter((x) => x !== axis);
      const c = col ? [0, 1, 2].map((k) => col.getComponent(ix[0], k).toFixed(3)).join() : '';
      out.push({
        axis,
        sign: Math.sign(nrm.getComponent(axis)),
        d: v[0].getComponent(axis),
        tri: v.map((p) => [p.getComponent(a), p.getComponent(b)]),
        colour: m.color.getHexString() + '/' + c,
        name: o.name,
      });
    }
  });
  return out;
}

const area = (p) => p.reduce((s, q, i) => s + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0) / 2;
// the area two triangles in one plane share (one clipped by the other)
function overlap(A, B) {
  const ccw = (p) => (area(p) < 0 ? [...p].reverse() : p);
  let poly = ccw(A);
  const clip = ccw(B);
  for (let i = 0; i < clip.length && poly.length; i++) {
    const [p, q] = [clip[i], clip[(i + 1) % clip.length]];
    const side = (r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    const next = [];
    poly.forEach((r, j) => {
      const s = poly[(j + 1) % poly.length],
        sr = side(r),
        ss = side(s);
      if (sr >= 0) next.push(r);
      if (sr * ss < 0) {
        const t = sr / (sr - ss);
        next.push([r[0] + t * (s[0] - r[0]), r[1] + t * (s[1] - r[1])]);
      }
    });
    poly = next;
  }
  return poly.length > 2 ? Math.abs(area(poly)) : 0;
}

// pairs of faces of different colours, facing the same way, closer than tol (1 mm less a margin), overlapping
// (hidden: faces nobody sees, left out)
function fights(root, { tol = 0.0008, minArea = 1e-6, hidden = () => false } = {}) {
  const F = faces(root).filter((f) => !hidden(f)),
    found = [];
  for (let i = 0; i < F.length; i++)
    for (let j = i + 1; j < F.length; j++) {
      const [f, g] = [F[i], F[j]];
      if (f.axis !== g.axis || f.sign !== g.sign || f.colour === g.colour || Math.abs(f.d - g.d) > tol) continue;
      const a = overlap(f.tri, g.tri);
      if (a > minArea)
        found.push(`${f.name || 'mesh'} / ${g.name || 'mesh'}, axis ${'xyz'[f.axis]} at ${f.d.toFixed(4)}: ${(a * 1e4).toFixed(1)} cm²`);
    }
  return found;
}

test('the head office lobby: door and lift frames stand off the faces of their openings', () => {
  const root = new THREE.Group(),
    g = new THREE.Group();
  root.add(g);
  featureWall(g);
  core(root, g);
  liftLanding(root);
  const found = fights(root);
  assert.deepEqual(found.slice(0, 12), [], `${found.length} pairs of coplanar faces`);
});

test("the world kit's door (every variant, every level) has no frame in the plane of its reveal", async () => {
  const kit = await import('../../js/kit/index.js');
  const { Parts } = await import('../../js/kit/core/parts.js');
  for (const variant of Object.keys(kit.doorway.decl.variants))
    for (const level of kit.LEVELS) {
      const p = new Parts();
      kit.doorway(p, { at: [0, 0], variant, level, seed: 5 });
      const root = new THREE.Group();
      kit.buildKit(p, root);
      // its backs lie on the wall it is fixed to
      const found = fights(root, { hidden: (f) => f.axis === 2 && f.sign < 0 && Math.abs(f.d) < 0.001 });
      assert.deepEqual(found.slice(0, 12), [], `${variant} ${level}: ${found.length} pairs of coplanar faces`);
    }
});

// the office street's fronts (and the works' server hall): the canopy slab level with its dark front showed as a
// flickering line under the name (#215)
test("a block's front door under its deep canopy", async () => {
  const { Parts } = await import('../../js/scenes/outdoor/parts.js');
  const { faces: rectFaces } = await import('../../js/scenes/outdoor/block-face.js');
  const { frontDoor } = await import('../../js/scenes/outdoor/block-style.js');
  const sets = { p: new Parts(), glass: new Parts(), lit: new Parts() };
  frontDoor(sets, rectFaces([0, 12, 0, 8]).s, { t: 6, w: 1.6, canopy: { out: 1.3, side: 0.7 } });
  const root = new THREE.Group();
  for (const s of Object.values(sets)) s.build(root);
  // seen from the street and from above: faces looking into the building (z 8 its wall) or down are left out
  const found = fights(root, { hidden: (f) => (f.axis === 2 && f.sign < 0) || (f.axis === 1 && f.sign < 0) });
  assert.deepEqual(found.slice(0, 12), [], `${found.length} pairs of coplanar faces`);
});
