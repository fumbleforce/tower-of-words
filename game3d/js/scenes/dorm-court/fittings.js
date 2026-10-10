// The dorm courtyard's fittings (scenes/dorm-court.js): the bike shelter against the block's return (steel posts
// on the wall side, a frosted roof on cantilever beams falling toward the court, a rack with painted bays, a lit
// strip under the roof and the blue bike sign), the two drinks machines in front of the coin laundry, the garbage
// point by the street, the air-conditioner units at the foot of the return, and the things people leave by the
// sento door. Positions come from the plan (dorm-court/plan.js). The shelter stands on the court's east side, not
// the south: from the camera, anything tall on the south side stands between it and Eric.
import * as THREE from 'three';
import { textTexture, plane } from '../../props.js';
import { lightPool } from '../../places/life.js';
import { drinksFace } from '../outdoor/vending-face.js';
import { STEEL, PAINTED } from '../outdoor/furniture.js';
import { mound, LEAF } from '../outdoor/planting.js';
import { bikeRow } from '../forecourt/details.js';
import * as P from './plan.js';

const ROOF_Y = [2.12, 1.96]; // the roof's back (the wall side, east) and front (the court side) edges

// the shelter: posts on the wall side (the last one past the return's corner), a beam out from each to the front,
// frosted panels between, a fascia
export function shelter(root, p, set, block) {
  const [x0, x1, z0, z1] = P.SHELTER;
  const xb = x1 - 0.08,
    xf = x0 + 0.02;
  const posts = [z0 + 0.08, (2 * z0 + z1) / 3, (z0 + 2 * z1) / 3, z1 - 0.08];
  const run = xb - xf,
    fall = ROOF_Y[0] - ROOF_Y[1],
    tilt = Math.atan2(fall, run),
    len = Math.hypot(run, fall);
  for (const z of posts) {
    p.box(STEEL.dark, 0.08, ROOF_Y[0], 0.08, xb, 0, z);
    const g = new THREE.BoxGeometry(len, 0.09, 0.06).rotateZ(tilt); // the beam, falling toward the court
    p.geo(STEEL.dark, g.translate((xb + xf) / 2, (ROOF_Y[0] + ROOF_Y[1]) / 2 - 0.05, z));
  }
  // the fascia along the front and the gutter along the wall
  p.box(STEEL.mid, 0.06, 0.1, z1 - z0 + 0.1, xf, ROOF_Y[1] - 0.06, (z0 + z1) / 2);
  p.box(STEEL.mid, 0.1, 0.08, z1 - z0 + 0.1, xb, ROOF_Y[0] - 0.05, (z0 + z1) / 2);
  // the roof: frosted panels between the beams, see-through enough to show the bikes under it
  const roofMat = new THREE.MeshStandardMaterial({
    color: '#c9d6dc',
    transparent: true,
    opacity: 0.4,
    roughness: 0.35,
    depthWrite: false,
  });
  for (let i = 0; i + 1 < posts.length; i++) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(len + 0.08, 0.02, posts[i + 1] - posts[i] - 0.06), roofMat);
    panel.rotation.z = tilt;
    panel.position.set((xb + xf) / 2, (ROOF_Y[0] + ROOF_Y[1]) / 2 + 0.01, (posts[i] + posts[i + 1]) / 2);
    panel.renderOrder = 2;
    root.add(panel);
  }
  // the rack along the wall: six places, five bikes in them, noses out to the aisle, all well under the roof
  const n = 6,
    [r0, r1] = P.RACK,
    step = (r1 - r0) / (n - 1);
  const row = bikeRow(n, { step, gaps: [3], seed: 2 });
  row.rotation.y = Math.PI / 2; // places run north from the rack's south end, the rack on the wall side
  row.position.set(x1 - 0.75, 0, r1);
  root.add(row);
  // the painted bays on the brick, one line between each pair of places
  for (let i = 0; i <= n; i++)
    p.box('#c3c5c1', 1.2, 0.004, 0.03, x1 - 0.7, 0.008, r1 + step / 2 - i * step, { cast: false });
  // the lit strip under the roof, over the aisle side
  set.glowParts.push(
    new THREE.BoxGeometry(0.08, 0.04, z1 - z0 - 0.5).translate(xf + 0.35, ROOF_Y[1] - 0.03, (z0 + z1) / 2),
  );
  set.lit.push([x0 + 0.5, (z0 + z1) / 2, 1.2]);
  root.add(bikeSign(xb, z1 - 0.03));
  block(x0, x1 + 0.1, z0 - 0.05, z1 + 0.05);
}

// the blue parking sign with a white bike, on the shelter's south post, facing the court
function bikeSign(x, z) {
  const sign = plane(
    0.34,
    0.34,
    textTexture(
      (ctx, w, h) => {
        ctx.fillStyle = '#2f5d9a';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#f2f4f5';
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const c = (x, y, r) => (ctx.beginPath(), ctx.arc(x, y, r, 0, Math.PI * 2), ctx.stroke());
        c(62, 150, 38);
        c(194, 150, 38);
        ctx.beginPath();
        ctx.moveTo(62, 150);
        ctx.lineTo(110, 92);
        ctx.lineTo(170, 92);
        ctx.lineTo(194, 150);
        ctx.moveTo(110, 92);
        ctx.lineTo(128, 150);
        ctx.lineTo(170, 92);
        ctx.moveTo(98, 76);
        ctx.lineTo(124, 76);
        ctx.moveTo(170, 92);
        ctx.lineTo(162, 66);
        ctx.lineTo(182, 62);
        ctx.stroke();
      },
      256,
      220,
    ),
    { emissiveK: 0.25 },
  );
  sign.position.set(x, 1.5, z + 0.05);
  return sign;
}

// a drinks machine: a pale body, a lit front with three shelves of bottles and cans, the buttons, the coin panel
// and the pick-up slot. `accent` colours the body's face frame.
export function vending(root, p, block) {
  const x0 = P.LAUNDRY.x0 + 0.1,
    z = P.LAUNDRY.z;
  const W = 0.9,
    H = 1.83,
    D = 0.72;
  [
    ['#d9dcdf', '#b8453d', 1],
    ['#e3e6e8', '#3f6f9e', 4],
  ].forEach(([body, accent, seed], i) => {
    const x = x0 + W / 2 + i * (W + 0.04);
    p.box(body, W, H, D, x, 0, z + D / 2, PAINTED); // painted steel (kit/materials/)
    const face = plane(W - 0.06, H - 0.12, drinksFace(accent, seed), { emissiveK: 0.75 });
    face.position.set(x, H / 2 + 0.02, z + D + 0.006);
    root.add(face);
  });
  // the glow on the paving in front, white against the lamps' warm pools
  root.add(lightPool(x0 + W + 0.02, z + D + 0.7, 1.3, { color: '#dfeaff', k: 0.34, sx: 1.25, y: 0.02 }));
  block(x0 - 0.05, x0 + 2 * W + 0.1, z, z + D + 0.15);
}

// by the sento door: a potted plant and a stand of umbrellas west of it; by the laundry door, another pot
export function doorstep(p, block) {
  const pot = (x, z, r, col = '#6c7079') => {
    p.geo(col, new THREE.CylinderGeometry(r, r * 0.8, r * 1.4, 8).translate(x, r * 0.7, z));
    mound(p, x, z, r * 1.25, LEAF.fresh, { y: r * 1.3 });
  };
  const z = P.SENTO.z + 0.22;
  pot(2.98, z, 0.19, '#5d6570');
  p.geo('#8d939b', new THREE.CylinderGeometry(0.11, 0.11, 0.45, 8).translate(3.32, 0.225, z));
  for (const [dx, col] of [
    [-0.04, '#3f4652'],
    [0.05, '#b8453d'],
    [0.0, '#e0e2e0'],
  ])
    p.geo(col, new THREE.CylinderGeometry(0.015, 0.015, 0.85, 5).translate(3.32 + dx, 0.5, z + dx));
  pot(P.LAUNDRY.x1 - 0.12, P.LAUNDRY.z + 0.25, 0.16);
  block(2.75, 3.45, P.SENTO.z, z + 0.25);
  block(P.LAUNDRY.x1 - 0.35, P.LAUNDRY.x1 + 0.1, P.LAUNDRY.z, P.LAUNDRY.z + 0.5);
}

// the dorm's garbage point by the street: a steel cage with a lid, its sorting sign on the front, two bags in it
export function garbage(root, p, block) {
  const [x0, x1, z0, z1] = P.GARBAGE;
  const cx = (x0 + x1) / 2,
    H = 0.95;
  const frame = '#3f5a4c',
    net = '#5f7f69';
  for (const [x, z] of [
    [x0, z0],
    [x1, z0],
    [x0, z1],
    [x1, z1],
  ])
    p.box(frame, 0.05, H, 0.05, x, 0, z);
  p.box(frame, x1 - x0 + 0.1, 0.05, z1 - z0 + 0.1, cx, H, (z0 + z1) / 2); // the lid
  p.box(net, x1 - x0 + 0.06, 0.02, z1 - z0 + 0.06, cx, H + 0.05, (z0 + z1) / 2);
  // mesh sides: bars all round
  for (let x = x0 + 0.1; x < x1 - 0.05; x += 0.1) {
    p.box(net, 0.02, H - 0.1, 0.02, x, 0.05, z0);
    p.box(net, 0.02, H - 0.1, 0.02, x, 0.05, z1);
  }
  for (let z = z0 + 0.1; z < z1 - 0.05; z += 0.1) {
    p.box(net, 0.02, H - 0.1, 0.02, x0, 0.05, z);
    p.box(net, 0.02, H - 0.1, 0.02, x1, 0.05, z);
  }
  p.box(frame, x1 - x0, 0.04, 0.03, cx, 0.5, z0);
  p.geo('#d9dee2', new THREE.DodecahedronGeometry(0.24, 0).scale(1, 0.8, 1).translate(x0 + 0.35, 0.2, z0 + 0.4));
  p.geo('#c7d3dc', new THREE.DodecahedronGeometry(0.2, 0).scale(1, 0.8, 1).translate(x0 + 0.72, 0.17, z0 + 0.45));
  const sign = plane(
    0.46,
    0.3,
    textTexture(
      (ctx, w, h) => {
        ctx.fillStyle = '#f0f1ee';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#3f6f9e';
        ctx.fillRect(0, 0, w, h * 0.24);
        ctx.fillStyle = '#9aa0a8';
        for (let i = 0; i < 4; i++) ctx.fillRect(w * 0.1, h * (0.36 + i * 0.15), w * (0.8 - (i % 2) * 0.25), h * 0.06);
      },
      128,
      84,
    ),
  );
  sign.position.set(cx, 0.62, z1 + 0.03);
  root.add(sign);
  block(x0 - 0.1, x1 + 0.1, z0 - 0.1, P.NEAR + 0.2);
  // the air-conditioner units at the foot of the return, on its front
  for (const x of [6.5, 7.4, 8.6])
    p.box('#c9cbc8', 0.75, 0.55, 0.3, x, 0, P.RETURN_Z + 0.2).box(
      '#8d9197',
      0.44,
      0.44,
      0.02,
      x - 0.1,
      0.05,
      P.RETURN_Z + 0.36,
    );
}
