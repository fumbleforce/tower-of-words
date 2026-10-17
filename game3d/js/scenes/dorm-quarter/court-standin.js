// A plain stand-in for the dorm courtyard (scenes/dorm-court.js), for the places that see it but don't build it (the
// east lane, the east coast, the plaza): its paving, the walled and planted front bed open at the gate, the garden's
// trees, the drinks machines, bench, bins, lamps, bike shelter and garbage cage where the courtyard has them
// (dorm-court/plan.js), and the separate low roofs of the laundry, hall and sento. Laid in the courtyard's own frame
// and moved into the island's by its chunk (toIsland), so it follows the courtyard wherever it is turned.
import * as THREE from 'three';
import { KERB } from '../outdoor/edges.js';
import { keyaki, sakura, maple, mound, bed, LEAF } from '../outdoor/planting.js';
import { lamps, bench, bins } from '../outdoor/furniture.js';
import { laundryRoof, hallRoof, sentoRoofs } from '../dorm-court/frontages.js';
import { toIsland, CHUNKS } from '../island-layout.js';
import { pale, bike, shelter } from '../dorm-court/cluster-yards.js';
import * as P from '../dorm-court/plan.js';

// a rect [x0, x1, z0, z1] in the courtyard's frame in the island's
function fromCourt([x0, x1, z0, z1]) {
  const [a, b] = toIsland('dorm_court', x0, z0),
    [c, d] = toIsland('dorm_court', x1, z1);
  return [Math.min(a, c), Math.max(a, c), Math.min(b, d), Math.max(b, d)];
}
// a Parts collector that takes the courtyard's frame and lays it in the island's
function courtFrame(p) {
  const frame = CHUNKS.dorm_court,
    matrix = new THREE.Matrix4().makeRotationY((-frame.turn * Math.PI) / 180).setPosition(frame.at[0], 0, frame.at[1]);
  const turn = (-frame.turn * Math.PI) / 180;
  const local = {
    turn,
    at: (x, z) => toIsland('dorm_court', x, z),
    geo(color, g, opts) {
      p.geo(color, g.applyMatrix4(matrix), opts);
      return local;
    },
    box(color, w, h, d, x, y, z, opts = {}) {
      const g = new THREE.BoxGeometry(w, h, d);
      if (opts.ry) g.rotateY(opts.ry);
      return local.geo(color, g.translate(x, y + h / 2, z), opts);
    },
  };
  return local;
}

// the courtyard, plainly (the place it is built for lays the street in front of it); a generator that yields between
// parts, built in slices with the quarter
export function* standIn(pv, p, lights) {
  const L = courtFrame(p);
  const at = L.at;
  // the paving: the court from the garden's wall to the return, the apron in front of the return
  pale(pv, fromCourt([P.GARDEN_X, P.RETURN_X, P.BLOCK_Z, P.SOUTH_BED[2]]));
  pale(pv, fromCourt([P.RETURN_X, P.SOUTH_BED[1], P.RETURN_Z, P.SOUTH_BED[2]]));
  pale(pv, fromCourt([P.GATE[0], P.GATE[1], P.SOUTH_BED[2], P.STREET[2]])); // through the gate
  // the front bed's low walls, open at the gate, and the garden's along the street
  const [, bx1, bz0, bz1] = P.SOUTH_BED,
    [gx0] = P.GARDEN;
  const wall = (x0, x1, z0, z1) => L.box(KERB.wall, x1 - x0, 0.38, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2);
  const cope = (x0, x1, z0, z1) =>
    L.box(KERB.coping, x1 - x0 + 0.02, 0.04, z1 - z0 + 0.04, (x0 + x1) / 2, 0.38, (z0 + z1) / 2);
  for (const [x0, x1] of [
    [gx0, P.GATE[0]],
    [P.GATE[1], bx1],
  ]) {
    wall(x0, x1, bz1 - 0.22, bz1);
    cope(x0, x1, bz1 - 0.22, bz1);
    wall(x0, x1, bz0, bz0 + 0.18);
  }
  wall(bx1 - 0.22, bx1, bz0, bz1);
  // the bed planted along its length: clipped balls of mixed sizes and greens, nothing in the gateway
  const tones = [LEAF.mid, LEAF.fresh, LEAF.deep, LEAF.light];
  const zm = (bz0 + bz1) / 2;
  let k = 0;
  for (let x = gx0 + 0.35; x < bx1 - 0.3; x += 0.38 + ((k * 7) % 4) * 0.08, k++) {
    if (x > P.GATE[0] - 0.3 && x < P.GATE[1] + 0.3) continue;
    mound(L, x, zm - 0.15, 0.22 + ((k * 3) % 4) * 0.02, tones[k % 4], { y: 0.3 });
    if (k % 2) mound(L, x + 0.15, zm + 0.2, 0.2 + ((k * 5) % 3) * 0.03, tones[(k + 2) % 4], { y: 0.3 });
  }
  bed(p, fromCourt([gx0 + 0.1, bx1 - 0.2, bz0 + 0.18, bz1 - 0.22]), { y: 0.3 });
  yield;
  // the garden's ground and trees, the maples and the cherry in the bed
  bed(p, fromCourt([P.GARDEN[0] + 0.2, P.GARDEN[1], P.GARDEN[2], P.GARDEN[3] - 0.25]), { y: 0.02 });
  for (const [x, z, kind, sz, seed] of [
    [-9.2, -2.6, keyaki, 1.0, 4],
    [-12.6, -1.9, keyaki, 1.08, 7],
    [-9.6, 1.9, keyaki, 1.02, 9],
    [-11.8, 2.3, maple, 0.8, 7],
    [-5.0, zm, maple, 0.6, 3],
    [5.0, zm, maple, 0.62, 2],
    [9.6, zm, sakura, 0.6, 6],
  ]) {
    kind(p, ...at(x, z), sz, seed);
    yield;
  }
  // the two drinks machines by the laundry's end, side by side, their lit fronts to the court
  const mx = P.LAUNDRY.x0 + 0.6,
    mz = P.LAUNDRY.z + 0.45;
  for (const [dx, c] of [
    [-0.45, '#b8463f'],
    [0.4, '#3f6f9e'],
  ]) {
    L.box(c, 0.75, 1.8, 0.7, mx + dx, 0, mz);
    lights.glowParts.push(
      new THREE.BoxGeometry(0.55, 0.95, 0.02)
        .translate(mx + dx, 1.1, mz + 0.36)
        .applyMatrix4(
          new THREE.Matrix4()
            .makeRotationY(L.turn)
            .setPosition(...[CHUNKS.dorm_court.at[0], 0, CHUNKS.dorm_court.at[1]]),
        ),
    );
  }
  const [lx, lz] = at(mx, mz + 0.9);
  lights.lit.push([lx, lz, 1.0]);
  // air-conditioner units at the foot of the return, and two bikes on its apron
  for (const z of [-0.8, 0.2]) L.box('#c9cccb', 0.75, 0.55, 0.3, P.RETURN_X - 0.2, 0, z);
  bike(L, P.RETURN_X - 1.0, P.RETURN_Z + 0.6, 0, 0);
  bike(L, P.RETURN_X - 1.65, P.RETURN_Z + 0.65, 0.1, 2);
  bench(L, P.BENCH[0], P.BENCH[1], 0, { len: 1.6 });
  bins(L, P.BENCH[0] + 1.3, P.BENCH[1], 0);
  // the bike shelter against the block's return
  shelter(L, { glowParts: { push: () => {} }, lit: { push: () => {} } }, P.SHELTER, 's', 5);
  yield;
  // the garbage cage: a green steel frame, a lid, bars all round, bags inside
  const [g0, g1, g2, g3] = P.GARBAGE,
    gx = (g0 + g1) / 2,
    gz = (g2 + g3) / 2,
    gw = g1 - g0,
    gd = g3 - g2;
  for (const [x, z] of [
    [g0, g2],
    [g1, g2],
    [g0, g3],
    [g1, g3],
  ])
    L.box('#3f5f4a', 0.06, 1.3, 0.06, x, 0, z);
  L.box('#4f6b5a', gw + 0.08, 0.05, gd + 0.08, gx, 1.3, gz);
  for (let t = 0.15; t < 1; t += 0.14) {
    for (const z of [g2, g3]) L.box('#3f5f4a', 0.025, 1.25, 0.025, g0 + gw * t, 0, z);
    for (const x of [g0, g1]) L.box('#3f5f4a', 0.025, 1.25, 0.025, x, 0, g2 + gd * t);
  }
  for (const [dx, dz, c] of [
    [-0.2, -0.15, '#d9dcd8'],
    [0.15, 0.1, '#8fa2b4'],
    [0.25, -0.2, '#d9dcd8'],
  ])
    mound(L, gx + dx * gw, gz + dz * gd, 0.24, c, { squash: 0.8 });
  // the fronts: the laundry's, the hall's glass, the sento's noren, under their own roofs
  const volume = (color, x0, x1, z0, z1, h) => L.box(color, x1 - x0, h, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2);
  volume('#a3a6a9', P.LAUNDRY.x0, P.LAUNDRY.x1, P.BLOCK_Z, P.LAUNDRY.z, 2.1);
  volume('#8d969f', P.HALL[0], P.HALL[1], P.BLOCK_Z, P.FRONT_Z, 2.2);
  volume('#c9c6bf', P.SENTO.x0, P.EAST + 0.4, P.SENTO.z - 1.6, P.SENTO.z, 1.9);
  volume('#c9c6bf', P.SENTO.x0 + 0.3, P.EAST + 0.4, P.BLOCK_Z, P.SENTO.z - 1.6, 1.6);
  L.box(
    '#69849a',
    P.LAUNDRY.x1 - P.LAUNDRY.x0 - 0.5,
    1.3,
    0.025,
    (P.LAUNDRY.x0 + P.LAUNDRY.x1) / 2,
    0.15,
    P.LAUNDRY.z + 0.016,
    { cast: false },
  );
  L.box('#668298', P.HALL[1] - P.HALL[0] - 0.3, 1.85, 0.025, (P.HALL[0] + P.HALL[1]) / 2, 0.05, P.FRONT_Z + 0.016, {
    cast: false,
  });
  L.box('#34425c', 0.95, 0.5, 0.03, P.SENTO.x0 + 0.95, 1.2, P.SENTO.z + 0.04, { cast: false });
  laundryRoof(L, { ...P.LAUNDRY, back: P.BLOCK_Z });
  hallRoof(L, { x0: P.HALL[0], x1: P.HALL[1], back: P.BLOCK_Z, front: P.FRONT_Z, full: true });
  sentoRoofs(L, { east: P.EAST, back: P.BLOCK_Z });
  lamps(
    lights,
    p,
    P.LAMPS.map(([x, z]) => at(x, z)),
    { pool: 1.05 },
  );
  // the gate's two lanterns on their piers
  for (const x of P.PIERS) L.box(KERB.coping, 0.42, 0.75, 0.42, x, 0, (bz0 + bz1) / 2);
  lamps(
    lights,
    p,
    P.PIERS.map((x) => at(x, (bz0 + bz1) / 2)),
    { kind: 'lantern', y: 0.75, pool: 0.7 },
  );
}
