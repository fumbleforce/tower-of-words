// The outdoor benches day 3 seats people on (scenes/outdoor/furniture.js bench, whose seats it notes on the place's
// objects; noted here once per place, before the draw-call pass merges them: places/lifecycle.js).
//   benchNear(P, [x, z], { skip })  the bench seat nearest a point, { x, z, top, ry }; skip n: the (n+1)th nearest
//   before(seat, d)                 the floor d in front of a seat
import * as THREE from 'three';

const SEAT_TOP = 0.34; // an outdoor bench's seat (scenes/outdoor/furniture.js)
const _m = new THREE.Matrix4(),
  _inv = new THREE.Matrix4(),
  _p = new THREE.Vector3(),
  _f = new THREE.Vector3();
// every bench seat in a place, found once (two along a long bench, one on a short one)
const lists = new WeakMap();
function benches(P) {
  if (lists.has(P)) return lists.get(P);
  const out = [];
  P.space.updateMatrixWorld(true);
  _inv.copy(P.space.matrixWorld).invert();
  P.space.traverse((o) => {
    for (const b of o.userData.seats || []) {
      _m.multiplyMatrices(_inv, o.matrixWorld);
      const c = Math.cos(b.facing),
        s = Math.sin(b.facing);
      for (const u of b.len >= 1.3 ? [-b.len * 0.22, b.len * 0.22] : [0]) {
        _p.set(b.x + u * c - 0.02 * s, SEAT_TOP, b.z - u * s - 0.02 * c).applyMatrix4(_m);
        _f.set(b.x + u * c + s, SEAT_TOP, b.z - u * s + c).applyMatrix4(_m);
        out.push({ x: _p.x, z: _p.z, top: _p.y, ry: Math.atan2(_f.x - _p.x, _f.z - _p.z) });
      }
    }
  });
  lists.set(P, out);
  return out;
}
export const noteBenches = (P) => void benches(P); // before the draw-call pass merges them (places/lifecycle.js)
export function benchNear(P, [x, z], { skip = 0 } = {}) {
  const sorted = [...benches(P)].sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
  return sorted[Math.min(skip, sorted.length - 1)] || null;
}
// a point d in front of a seat (where its sitter's feet are, and someone talking to them stands)
export const before = (s, d = 0.8) => [s.x + Math.sin(s.ry) * d, s.z + Math.cos(s.ry) * d];
