// Laid shadows for the outdoor kit (scenes/outdoor/): backdrop beyond a place's sun shadow box casts nothing, so
// its trees and blocks would float. Here each one gets its shadow laid flat on the ground along the sun
// (scenes/town.js SUN): a block's footprint swept away from the sun by its height, a tree's crown as a soft disc
// thrown off its foot. Two meshes, one for the morning sun and one for after work; follow(sun.position) shows the
// one for the side the sun is on (call it each frame: the evening moves the sun, the island map doesn't).
//   const sh = shade();
//   sh.block(rect, height)        rect [x0, x1, z0, z1]
//   sh.tree(x, z, s)              a tree of the kit's planting.js at scale s
//   const { follow } = sh.build(root)
import * as THREE from 'three';
import { SUN } from '../town.js';

const Y = 0.045, // just over the paving and the beds
  TONE = '#1d212b',
  ALPHA = 0.3;

// the ground offset per unit of height for a sun direction
const lean = ([x, y, z]) => [-x / y, -z / y];

// the convex hull of points [x, z] (monotone chain)
function hull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => {
    const out = [];
    for (const q of list) {
      while (out.length > 1 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop();
      out.push(q);
    }
    return out.slice(0, -1);
  };
  return [...half(p), ...half([...p].reverse())];
}

// a flat polygon on the ground (x, z), facing up
function flat(poly) {
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  return new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, Y, 0);
}

export function shade() {
  const sets = { morning: [], evening: [] };
  const both = (fn) => {
    for (const k of Object.keys(sets)) sets[k].push(fn(lean(SUN[k])));
  };
  return {
    block([x0, x1, z0, z1], h) {
      const corners = [
        [x0, z0],
        [x1, z0],
        [x1, z1],
        [x0, z1],
      ];
      both(([dx, dz]) => flat(hull([...corners, ...corners.map(([x, z]) => [x + dx * h, z + dz * h])])));
    },
    tree(x, z, s = 1) {
      // the crown's middle about 2.6 up, 1.3 across
      const r = 1.3 * s,
        h = 2.6 * s;
      both(([dx, dz]) => {
        const g = new THREE.CircleGeometry(r, 14).rotateX(-Math.PI / 2);
        // stretched along the sun's lean, as a low sun draws it
        const L = Math.hypot(dx, dz) || 1;
        g.scale(1 + 0.35 * L, 1, 1).rotateY(-Math.atan2(dz, dx));
        return g.translate(x + dx * h, Y, z + dz * h);
      });
    },
    build(root) {
      const mats = {},
        meshes = {};
      for (const [k, list] of Object.entries(sets)) {
        if (!list.length) continue;
        const geo = mergeAll(list);
        mats[k] = new THREE.MeshBasicMaterial({
          color: TONE,
          transparent: true,
          opacity: ALPHA,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        meshes[k] = new THREE.Mesh(geo, mats[k]);
        meshes[k].name = `shade:${k}`; // named, so the static merge leaves it alone
        meshes[k].renderOrder = 1;
        root.add(meshes[k]);
      }
      if (meshes.evening) meshes.evening.visible = false;
      return {
        follow(sunPos) {
          const morning = Math.sign(sunPos.x) === Math.sign(SUN.morning[0]);
          if (meshes.morning) meshes.morning.visible = morning;
          if (meshes.evening) meshes.evening.visible = !morning;
        },
      };
    },
  };
}

function mergeAll(list) {
  const pos = [];
  for (const g of list) {
    const n = g.index ? g.toNonIndexed() : g;
    pos.push(...n.attributes.position.array);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // all facing up: the post passes (ambient occlusion, outlines) read normals off every mesh
  const up = new Float32Array(pos.length);
  for (let i = 1; i < up.length; i += 3) up[i] = 1;
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(up, 3));
  return geo;
}
