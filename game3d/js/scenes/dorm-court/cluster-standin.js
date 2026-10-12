// A plain stand-in for the dorm courtyard (scenes/dorm-court.js), for the plaza, which builds the dorm cluster
// (dorm-court/cluster.js) east of the dorm street but not the courtyard itself: its paving, the walled and planted
// front bed open at the gate, the garden's trees, the drinks machines, bench, bins, lamps, bike shelter and garbage
// cage where the courtyard has them (dorm-court/plan.js), and the separate low roofs of the laundry, hall and sento. In the
// island frame, like the cluster.
import * as THREE from 'three';
import { lowWall, KERB } from '../outdoor/edges.js';
import { keyaki, sakura, maple, mound, bed, LEAF } from '../outdoor/planting.js';
import { lamps, bench, bins } from '../outdoor/furniture.js';
import { laundryRoof, hallRoof, sentoRoofs } from './frontages.js';
import { toIsland, PATHS, CHUNKS } from '../island-layout.js';
import { pale, bike, shelter } from './cluster-yards.js';
import * as P from './plan.js';

// a rect [x0, x1, z0, z1] in the courtyard's frame (dorm-court/plan.js) in the island's
function fromCourt([x0, x1, z0, z1]) {
  const [a, b] = toIsland('dorm_court', x0, z0),
    [c, d] = toIsland('dorm_court', x1, z1);
  return [Math.min(a, c), Math.max(a, c), Math.min(b, d), Math.max(b, d)];
}
// the courtyard, plainly, for the plaza (the plaza lays the gate leg, 3 wide, off the dorm street); a generator
// that yields between parts, built in slices with the cluster
export function* standIn(pv, p, lights) {
  const gz = PATHS.find((q) => q.id === 'route_home').line.at(-1)[1],
    gate = [gz - 1.5, gz + 1.5];
  const bedR = fromCourt(P.SOUTH_BED),
    court = fromCourt([P.GARDEN_X, P.RETURN_X, P.BLOCK_Z, P.SOUTH_BED[2]]),
    apron = fromCourt([P.RETURN_X, P.SOUTH_BED[1], P.RETURN_Z, P.SOUTH_BED[2]]), // in front of the block's return
    garden = fromCourt(P.GARDEN);
  pale(pv, [court[0], court[1], court[2], gate[0]]);
  pale(pv, [bedR[0] + 3, court[1], gate[0], gate[1]]); // past the gate leg's end
  pale(pv, [court[0], court[1], gate[1], court[3]]);
  pale(pv, apron);
  // the front bed and the garden's wall on the street, open at the gate; the bed's end at the row
  lowWall(p, [bedR[0], garden[2]], [bedR[0], bedR[3]], { off: 0.11, gaps: [gate] });
  lowWall(p, [bedR[1], bedR[2]], [bedR[1], bedR[3]], { off: -0.11, gaps: [gate] });
  lowWall(p, [bedR[0], bedR[3]], [bedR[1], bedR[3]], { off: -0.11 });
  bed(p, [bedR[0] + 0.15, bedR[1] - 0.15, bedR[2], gate[0] - 0.1], { y: 0.3 });
  bed(p, [bedR[0] + 0.15, bedR[1] - 0.15, gate[1] + 0.1, bedR[3] - 0.15], { y: 0.3 });
  // the end wall's face on the row in the coping's pale stone
  p.box(KERB.coping, bedR[1] - bedR[0], 0.36, 0.03, (bedR[0] + bedR[1]) / 2, 0, bedR[3] + 0.015, { cast: false });
  // the bed planted along its length: clipped balls of mixed sizes and greens at uneven gaps, a small maple now and
  // then, nothing in the gateway
  const bx = (bedR[0] + bedR[1]) / 2,
    tones = [LEAF.mid, LEAF.fresh, LEAF.deep, LEAF.light];
  // planted all along: clipped shrubs touching, two deep, mixed sizes and greens, nothing in the gateway
  let k = 0;
  for (let z = garden[2] + 0.35; z < bedR[3] - 0.3; z += 0.38 + ((k * 7) % 4) * 0.08, k++) {
    if (z > gate[0] - 0.3 && z < gate[1] + 0.3) continue;
    mound(p, bx - 0.2, z, 0.24 + ((k * 3) % 4) * 0.05, tones[k % 4], { y: 0.3 });
    if (k % 2) mound(p, bx + 0.22, z + 0.15, 0.2 + ((k * 5) % 3) * 0.05, tones[(k + 2) % 4], { y: 0.3 });
  }
  yield;
  bed(p, [garden[0] + 0.2, garden[1], garden[2], garden[3]], { y: 0.3 });
  const zm = (P.SOUTH_BED[2] + P.SOUTH_BED[3]) / 2;
  for (const [x, z, k, sz, seed] of [
    [-9.2, -2.6, keyaki, 1.0, 4],
    [-12.6, -1.9, keyaki, 1.08, 7],
    [-9.6, 1.9, keyaki, 1.02, 9],
    [-11.8, 2.3, maple, 0.8, 7],
    [-5.0, zm, maple, 0.6, 3],
    [5.0, zm, maple, 0.62, 2],
    [9.6, zm, sakura, 0.6, 6],
  ]) {
    k(p, ...toIsland('dorm_court', x, z), sz, seed);
    yield;
  }
  // the court's things: the two drinks machines by the laundry's end, the bench and bins on the front bed, the lamps
  const [mx, mz] = toIsland('dorm_court', P.LAUNDRY.x0 + 0.6, P.LAUNDRY.z + 0.45);
  // side by side, their lit fronts to the court (west)
  for (const [dz, c] of [
    [-0.45, '#b8463f'],
    [0.4, '#3f6f9e'],
  ]) {
    p.box(c, 0.7, 1.8, 0.75, mx, 0, mz + dz);
    lights.glowParts.push(new THREE.BoxGeometry(0.02, 0.95, 0.55).translate(mx - 0.36, 1.1, mz + dz));
  }
  lights.lit.push([mx - 0.9, mz, 1.0]);
  // air-conditioner units at the foot of the return, and two bikes on its apron
  for (const t of [0.15, 0.4]) {
    const z = apron[2] + (apron[3] - apron[2]) * t;
    p.box('#c9cccb', 0.3, 0.55, 0.75, apron[1] - 0.2, 0, z);
  }
  bike(p, apron[1] - 1.0, apron[2] + 2.9, Math.PI / 2, 0);
  bike(p, apron[1] - 1.05, apron[2] + 3.55, Math.PI / 2 + 0.1, 2);
  const [bx2, bz2] = toIsland('dorm_court', P.BENCH[0], P.BENCH[1]);
  bench(p, bx2, bz2, Math.PI / 2, { len: 1.6 });
  bins(p, bx2, bz2 - 1.3, Math.PI / 2);
  // the bike shelter against the block's return, and the garbage cage in the south-east corner
  shelter(p, lights, fromCourt(P.SHELTER), 'n', 5);
  yield;
  // the garbage cage: a green steel frame, a lid, bars all round, bags inside
  const gc = fromCourt(P.GARBAGE),
    [gx, gcz] = [(gc[0] + gc[1]) / 2, (gc[2] + gc[3]) / 2],
    [gw, gd] = [gc[1] - gc[0], gc[3] - gc[2]];
  for (const [x, z] of [
    [gc[0], gc[2]],
    [gc[1], gc[2]],
    [gc[0], gc[3]],
    [gc[1], gc[3]],
  ])
    p.box('#3f5f4a', 0.06, 1.3, 0.06, x, 0, z);
  p.box('#4f6b5a', gw + 0.08, 0.05, gd + 0.08, gx, 1.3, gcz);
  for (let t = 0.15; t < 1; t += 0.14) {
    for (const z of [gc[2], gc[3]]) p.box('#3f5f4a', 0.025, 1.25, 0.025, gc[0] + gw * t, 0, z);
    for (const x of [gc[0], gc[1]]) p.box('#3f5f4a', 0.025, 1.25, 0.025, x, 0, gc[2] + gd * t);
  }
  for (const [dx, dz, c] of [
    [-0.2, -0.15, '#d9dcd8'],
    [0.15, 0.1, '#8fa2b4'],
    [0.25, -0.2, '#d9dcd8'],
  ])
    mound(p, gx + dx * gw, gcz + dz * gd, 0.24, c, { squash: 0.8 });
  // Front roofs retain the court's actual heights, sento gable and chimney. The
  // adapter places their shared local geometry into the cluster's island frame.
  const frame = CHUNKS.dorm_court,
    matrix = new THREE.Matrix4().makeRotationY((-frame.turn * Math.PI) / 180);
  matrix.setPosition(frame.at[0], 0, frame.at[1]);
  const local = {
    geo(color, g, opts) {
      p.geo(color, g.applyMatrix4(matrix), opts);
    },
    box(color, w, h, d, x, y, z, opts = {}) {
      const g = new THREE.BoxGeometry(w, h, d);
      if (opts.ry) g.rotateY(opts.ry);
      local.geo(color, g.translate(x, y + h / 2, z), opts);
    },
  };
  const volume = (color, x0, x1, z0, z1, h) => local.box(color, x1 - x0, h, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2);
  volume('#a3a6a9', P.LAUNDRY.x0, P.LAUNDRY.x1, P.BLOCK_Z, P.LAUNDRY.z, 2.1);
  volume('#8d969f', P.HALL[0], P.HALL[1], P.BLOCK_Z, P.FRONT_Z, 2.2);
  volume('#c9c6bf', P.SENTO.x0, P.EAST + 0.4, P.SENTO.z - 1.6, P.SENTO.z, 1.9);
  volume('#c9c6bf', P.SENTO.x0 + 0.3, P.EAST + 0.4, P.BLOCK_Z, P.SENTO.z - 1.6, 1.6);
  local.box(
    '#69849a',
    P.LAUNDRY.x1 - P.LAUNDRY.x0 - 0.5,
    1.3,
    0.025,
    (P.LAUNDRY.x0 + P.LAUNDRY.x1) / 2,
    0.15,
    P.LAUNDRY.z + 0.016,
    { cast: false },
  );
  local.box('#668298', P.HALL[1] - P.HALL[0] - 0.3, 1.85, 0.025, (P.HALL[0] + P.HALL[1]) / 2, 0.05, P.FRONT_Z + 0.016, {
    cast: false,
  });
  local.box('#34425c', 0.95, 0.5, 0.03, P.SENTO.x0 + 0.95, 1.2, P.SENTO.z + 0.04, { cast: false });
  laundryRoof(local, { ...P.LAUNDRY, back: P.BLOCK_Z });
  hallRoof(local, {
    x0: P.HALL[0],
    x1: P.HALL[1],
    back: P.BLOCK_Z,
    front: P.FRONT_Z,
    full: true,
  });
  sentoRoofs(local, { east: P.EAST, back: P.BLOCK_Z });
  lamps(
    lights,
    p,
    P.LAMPS.map(([x, z]) => toIsland('dorm_court', x, z)),
    { pool: 1.05 },
  );
}
