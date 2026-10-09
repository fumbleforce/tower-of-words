// The palette and the face maths every backdrop block shares (outdoor/block.js and its style options,
// outdoor/block-style.js; the small blocks' fronts, plaza/east-fronts.js, take them through block.js).
export const BLOCK = {
  plinth: '#8f9092',
  core: '#5b616b', // the ground floor's wall behind the glass
  fascia: '#3f4650',
  band: '#a1a8b0',
  glassLow: '#8c9dad', // the ground floor's glass, as light as the tower's
  canopy: '#a3a9b3',
  glass: '#788a9b', // a shade darker than the tower's curtain wall
  lit: '#e8c89a',
  plate: '#d9dcdf',
  plant: '#8d9298',
};
const BAY = 1.45; // the bay pitch: piers below, mullions above

// the four faces of a rect: where each starts, its direction along, its outward normal, its length
export function faces([x0, x1, z0, z1]) {
  return {
    s: { a: [x0, z1], d: [1, 0], n: [0, 1], L: x1 - x0 },
    e: { a: [x1, z1], d: [0, -1], n: [1, 0], L: z1 - z0 },
    n: { a: [x1, z0], d: [-1, 0], n: [0, -1], L: x1 - x0 },
    w: { a: [x0, z0], d: [0, 1], n: [-1, 0], L: z1 - z0 },
  };
}
// the point t along a face and o out from it, [x, z]
export const faceAt = (f, t, o) => [f.a[0] + f.d[0] * t + f.n[0] * o, f.a[1] + f.d[1] * t + f.n[1] * o];
// a box on a face: t0..t1 along it, y0..y1, o0..o1 out from it
export function onFace(set, color, f, t0, t1, y0, y1, o0, o1, opts) {
  const [A, B] = [faceAt(f, t0, o0), faceAt(f, t1, o1)];
  const [xa, xb] = [Math.min(A[0], B[0]), Math.max(A[0], B[0])],
    [za, zb] = [Math.min(A[1], B[1]), Math.max(A[1], B[1])];
  set.box(color, xb - xa, y1 - y0, zb - za, (xa + xb) / 2, y0, (za + zb) / 2, opts);
}
// a face's position along it for a world coordinate (x on n and s, z on w and e), and back
export const tOf = (f, v) => (f.d[0] ? (v - f.a[0]) / f.d[0] : (v - f.a[1]) / f.d[1]);
export const vOf = (f, t) => (f.d[0] ? f.a[0] + f.d[0] * t : f.a[1] + f.d[1] * t);
export const bayOf = (L) => L / Math.max(1, Math.round(L / BAY));

const snap = (f, at) => {
  const bw = bayOf(f.L);
  return (Math.min(Math.round(f.L / bw) - 1, Math.max(0, Math.floor(tOf(f, at) / bw))) + 0.5) * bw;
};
// the middle of the bay nearest `at` on a face, in world x or z, and the width of a door that fills it
export function doorAt(rect, face, at) {
  const f = faces(rect)[face];
  return { at: vOf(f, snap(f, at)), w: bayOf(f.L) - 0.36 };
}
