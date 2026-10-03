// A cat's body, rigged (Jørgen, 2026-10-03: "Has the cat been animated yet or is it still just sliding around?"):
// faceted convex parts with one colour per face, built in code like the chibi people (train/hull.js), each part bound
// whole to one bone of a small skeleton, all in one skinned mesh (one draw call). Metres, facing +z, the paws at y = 0
// in the rest pose (standing square). The poses and the motion are in cat.js.
//   bones: base > hips > chest > head > ears, eyes, lids; hips > hind legs; chest > front legs; hips > tail (5)
// Coats: calico (Tama), black, tabby, ginger (the island's other cats).
import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { hull, beamHull, icoPoints } from '../train/hull.js';
import { V } from '../train/kit.js';

// the rest pose, in the cat's own space: where each joint is
export const REST = {
  hips: [0, 0.16, -0.075],
  chest: [0, 0.165, 0.075],
  head: [0, 0.22, 0.145],
  hind: [0.045, 0.135, -0.085], // the left one (+x); the right one mirrored
  front: [0.042, 0.135, 0.085],
  tail: [0, 0.175, -0.16],
};
export const L1 = 0.068, // upper leg
  L2 = 0.062, // lower leg, to the bottom of the paw (at y = 0.005)
  TAIL = 5,
  SEG = 0.052; // the tail's segments, from the base back

const WHITE = '#fbf7f0';
export const COATS = {
  // white with an orange back and crown, a black saddle on her left and a black tail tip
  calico: {
    coat: WHITE,
    chest: WHITE,
    eye: '#b9a43e',
    nose: '#e59a9a',
    ear: '#e8b2a8',
    tip: '#4a3e3a',
    patch: (p) => {
      if (p.y > 0.24 && p.z > 0.12) return p.x > 0.012 ? '#e59a52' : p.x < -0.03 && p.y > 0.27 ? '#4a3e3a' : undefined;
      if (p.y > 0.17 && p.x > -0.005 && p.z < 0.03 && p.z > -0.14) return '#e59a52';
      if (p.y > 0.16 && p.x < -0.02 && p.z > 0.0 && p.z < 0.12) return '#4a3e3a';
      if (p.z < -0.14 && p.y > 0.1) return p.z < -0.3 ? '#4a3e3a' : '#e59a52';
    },
  },
  black: {
    coat: '#2b2b31',
    chest: '#2b2b31',
    eye: '#d8c34a',
    nose: '#3a3236',
    ear: '#4a3a40',
    tip: '#232328',
  },
  tabby: {
    coat: '#8f8c88',
    chest: '#d9d4cc',
    eye: '#9cc06a',
    nose: '#c98a86',
    ear: '#b88783',
    tip: '#5d5a58',
    patch: (p) => (p.y > 0.12 && Math.sin(p.z * 70 + p.y * 30) > 0.55 ? '#5d5a58' : undefined),
  },
  ginger: {
    coat: '#e09a55',
    chest: '#f6efe4',
    eye: '#c9b048',
    nose: '#d68e86',
    ear: '#d99c8f',
    tip: '#c27a3c',
  },
};

// a rounder faceted ball than icoPoints' twelve points: an icosphere split once (42 points), jittered a little
let _ball;
function ball(c, [rx, ry, rz], jitter = 0.03, seed = 1) {
  if (!_ball) {
    const g = new THREE.IcosahedronGeometry(1, 1).toNonIndexed(),
      a = g.attributes.position,
      seen = new Map();
    for (let i = 0; i < a.count; i++)
      seen.set(`${a.getX(i).toFixed(4)},${a.getY(i).toFixed(4)},${a.getZ(i).toFixed(4)}`, [
        a.getX(i),
        a.getY(i),
        a.getZ(i),
      ]);
    _ball = [...seen.values()];
  }
  let r = seed * 9301;
  const j = () => 1 + jitter * (((r = (r * 16807) % 2147483647) / 2147483647) * 2 - 1);
  return _ball.map(([x, y, z]) => V(c.x + x * rx * j(), c.y + y * ry * j(), c.z + z * rz * j()));
}

let _mat;
export function catMaterial() {
  _mat ||= new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
  });
  _mat.userData.noLook = true; // its own colours (look/index.js)
  return _mat;
}

const cache = new Map();
// { mesh, bones: { base, hips, chest, head, ears: [l, r], eyes, lids, legs: { fl, fr, hl, hr: [upper, lower, paw] },
// tail: [...] } }: a new skeleton each time, the geometry shared per coat
export function catBody(coat = 'calico') {
  const c = COATS[coat] || COATS.calico;
  const B = (name, parent, [x, y, z]) => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    if (parent) parent.add(b);
    return b;
  };
  const rel = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const base = B('base', null, [0, 0, 0]),
    hips = B('hips', base, REST.hips),
    chest = B('chest', hips, rel(REST.chest, REST.hips)),
    head = B('head', chest, rel(REST.head, REST.chest));
  const eyesAt = [0, 0.04, 0.075];
  const ears = [1, -1].map((s) => B(s > 0 ? 'earL' : 'earR', head, [s * 0.048, 0.08, 0.02])),
    eyes = B('eyes', head, eyesAt),
    lids = B('lids', head, eyesAt);
  const leg = (name, parent, at, s) => {
    const j = [s * at[0], at[1], at[2]];
    const up = B(name, parent, rel(j, parent === hips ? REST.hips : REST.chest)),
      lo = B(name + 'lo', up, [0, -L1, 0]),
      paw = B(name + 'paw', lo, [0, -L2, 0.012]);
    return [up, lo, paw];
  };
  const legs = {
    fl: leg('fl', chest, REST.front, 1),
    fr: leg('fr', chest, REST.front, -1),
    hl: leg('hl', hips, REST.hind, 1),
    hr: leg('hr', hips, REST.hind, -1),
  };
  const tail = [];
  for (let i = 0; i < TAIL; i++)
    tail.push(B('tail' + i, i ? tail[i - 1] : hips, i ? [0, 0, -SEG] : rel(REST.tail, REST.hips)));
  const bones = [];
  base.traverse((b) => bones.push(b));
  let geo = cache.get(coat);
  if (!geo) cache.set(coat, (geo = buildGeometry(c, bones)));
  const mesh = new THREE.SkinnedMesh(geo, catMaterial());
  mesh.add(base);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.frustumCulled = false; // the pose moves her parts well outside the rest pose's bounds
  return {
    mesh,
    bones: { base, hips, chest, head, ears, eyes, lids, legs, tail },
  };
}

// every part in the rest pose, bound whole to its bone (by name, in the skeleton's order)
function buildGeometry(c, bones) {
  const idx = (n) => bones.findIndex((b) => b.name === n);
  const coat = (p) => (c.patch && c.patch(p)) || undefined;
  const parts = []; // [Geo, bone index]
  const add = (bone, ...gs) => gs.forEach((g) => parts.push([g, idx(bone)]));
  const [hx, hy, hz] = REST.hips,
    [cx, cy, cz] = REST.chest,
    [ex, ey, ez] = REST.head;
  // the body: rump and haunches on the hips, the ribcage and shoulders on the chest, white underneath
  const under = (p) => (p.y < 0.13 ? c.chest : coat(p));
  add(
    'hips',
    hull(ball(V(hx, hy + 0.006, hz + 0.015), [0.074, 0.068, 0.1], 0.03, 41), c.coat, { grad: 0.14, colorOf: under }),
  );
  add(
    'chest',
    hull(ball(V(cx, cy + 0.006, cz - 0.02), [0.07, 0.072, 0.095], 0.03, 42), c.coat, {
      grad: 0.14,
      colorOf: (p) => (p.z > 0.11 && p.y < 0.19 ? c.chest : under(p)),
    }),
  );
  add(
    'chest',
    hull(ball(V(0, 0.205, 0.125), [0.052, 0.055, 0.05], 0.03, 43), c.coat, {
      grad: 0.1,
      colorOf: (p) => (p.z > 0.15 ? c.chest : coat(p)),
    }),
  );
  // the head: big and round, like the chibi cast's
  const H = V(ex, ey + 0.035, ez + 0.03);
  add(
    'head',
    hull(ball(H, [0.088, 0.075, 0.078], 0.03, 44), c.coat, {
      grad: 0.1,
      colorOf: (p) => (p.z > H.z + 0.04 && p.y < H.y - 0.01 ? c.chest : coat(p)),
    }),
  );
  add('head', hull(icoPoints(V(0, H.y - 0.025, H.z + 0.06), [0.04, 0.026, 0.026], 0, 45), c.chest, { grad: 0.05 }));
  add('head', hull(icoPoints(V(0, H.y - 0.011, H.z + 0.083), [0.011, 0.008, 0.006], 0, 3), c.nose, { grad: 0 }));
  for (const s of [1, -1]) {
    const ear = hull(
      [
        [s * 0.022, H.y + 0.05, H.z - 0.012],
        [s * 0.03, H.y + 0.05, H.z + 0.03],
        [s * 0.075, H.y + 0.04, H.z + 0.005],
        [s * 0.058, H.y + 0.112, H.z + 0.004],
        [s * 0.048, H.y + 0.06, H.z + 0.02],
      ],
      c.coat,
      { grad: 0.05, colorOf: (p, n) => (n.z > 0.5 ? c.ear : coat(p)) },
    );
    add(s > 0 ? 'earL' : 'earR', ear);
    // open eyes (with a dark slit) on the eyes bone; shut ones, a dark arc, on the lids bone
    const ox = s * 0.034,
      oy = H.y + 0.008,
      oz = H.z + 0.066;
    add(
      'eyes',
      hull(icoPoints(V(ox, oy, oz), [0.016, 0.017, 0.009], 0, 3), c.eye, {
        grad: 0,
      }),
    );
    add('eyes', hull(icoPoints(V(ox, oy, oz + 0.006), [0.005, 0.014, 0.005], 0, 3), '#121214', { grad: 0 }));
    const a = (dx, dy) => V(ox + dx, oy + dy, oz + 0.004 - Math.abs(dx) * 0.2);
    add('lids', beamHull(a(-0.015, 0.002), a(0, -0.006), 0.006, 0.007, '#3a302c', V(0, 0, 1)));
    add('lids', beamHull(a(0, -0.006), a(0.015, 0.002), 0.006, 0.007, '#3a302c', V(0, 0, 1)));
  }
  // the legs: an upper part (a haunch behind), a lower part and a paw
  for (const [k, s] of [
    ['fl', 1],
    ['fr', -1],
    ['hl', 1],
    ['hr', -1],
  ]) {
    const front = k[0] === 'f',
      j = front ? REST.front : REST.hind,
      x = s * j[0],
      knee = V(x, j[1] - L1, j[2]),
      foot = V(x, j[1] - L1 - L2 + 0.012, j[2]);
    const leg = (p) => (front ? c.chest : p.y > 0.1 ? coat(p) || c.coat : c.chest);
    if (front) add(k, beamHull(V(x, j[1] + 0.02, j[2]), knee, 0.04, 0.042, c.chest, V(0, 0, 1)));
    else
      add(
        k,
        hull(ball(V(x * 1.1, j[1] - 0.005, j[2] + 0.005), [0.04, 0.058, 0.06], 0.03, 46 + s), c.coat, {
          grad: 0.12,
          colorOf: leg,
        }),
      );
    add(k + 'lo', beamHull(knee, foot, 0.032, 0.034, front ? c.chest : leg(V(0, 0.05, 0)), V(0, 0, 1)));
    add(k + 'lo', hull(icoPoints(V(x, 0.016, j[2] + 0.012), [0.022, 0.016, 0.028], 0, 4), c.chest, { grad: 0 }));
  }
  // the tail: tapering, the last part the tip colour
  for (let i = 0; i < TAIL; i++) {
    const z = REST.tail[2] - i * SEG,
      w = 0.034 - i * 0.003;
    const col = i === TAIL - 1 ? c.tip : coat(V(0, 0.18, z - SEG / 2)) || c.coat;
    add(
      'tail' + i,
      beamHull(
        V(0, REST.tail[1], z + 0.006),
        V(0, REST.tail[1], z - SEG - (i === TAIL - 1 ? 0.004 : 0.006)),
        w,
        w,
        col,
      ),
    );
  }
  // one geometry: creased normals per part, then the skin attributes
  const geos = parts.map(([g, b]) => {
    const x = toCreasedNormals(g.build(), 0.7),
      n = x.attributes.position.count;
    x.setAttribute(
      'skinIndex',
      new THREE.Uint16BufferAttribute(
        new Uint16Array(n * 4).map((_, i) => (i % 4 ? 0 : b)),
        4,
      ),
    );
    x.setAttribute(
      'skinWeight',
      new THREE.Float32BufferAttribute(
        new Float32Array(n * 4).map((_, i) => (i % 4 ? 0 : 1)),
        4,
      ),
    );
    return x;
  });
  const out = new THREE.BufferGeometry();
  for (const [name, size] of [
    ['position', 3],
    ['normal', 3],
    ['color', 3],
    ['skinIndex', 4],
    ['skinWeight', 4],
  ]) {
    const arr = new (name === 'skinIndex' ? Uint16Array : Float32Array)(
      geos.reduce((s, g) => s + g.attributes[name].array.length, 0),
    );
    let o = 0;
    for (const g of geos) (arr.set(g.attributes[name].array, o), (o += g.attributes[name].array.length));
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  out.computeBoundingSphere();
  return out;
}
