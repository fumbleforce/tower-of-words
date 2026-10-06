// The rest of Eric's building that he can walk (docs/game/places.md, Eric's dorm building): on 2F the kitchen at the
// corridor's west end and the notice board by the stairs; 3F (upper.js) and the roof (roof.js), each built in its own
// frame, in its own group set down at its x (layout.js LEVEL_DX), with the walk grid's blocks shifted to match. The
// walk grid is one for all three: nothing joins them but the stairs, which are watched moves (places/dorms.js).
import * as THREE from 'three';
import { Kit } from './kit.js';
import { upperFloor } from './upper.js';
import { roof, ROOF } from './roof.js';
import { kitchen, SHARED } from './shared.js';
import { noticeBoard } from './doors.js';
import { X0, X1, BACK, NEAR, T, PITCH, CORR, RETURN, STAIR, LANDING, SHARED_K, WEST_END, LEVEL_DX } from './layout.js';

// the walk grid seen from a level's own frame
const navAt = (nav, dx) => ({ block: (a, b, c, d) => nav.block(a + dx, b + dx, c, d) });

// the walk on a corridor floor, in its own frame: the corridor from the end wall to the landing, the landing, the
// shared room through its door; on 2F (eric) also his flat, behind his front, which only the walk in goes through
export function corridorNav(n, eric) {
  const s1 = SHARED_K * PITCH + X1 + T; // the shared room's east wall
  if (eric) {
    n.block(s1 - 0.08, X0 + 0.08, BACK, CORR[0] + 0.1); // the flats left of his
    n.block(X1 - 0.08, RETURN + 0.08, BACK, CORR[0] + 0.1); // right of it, to the return
    n.block(X0 - 0.2, X1 + 0.2, NEAR - 0.1, CORR[0] + 0.12); // his front wall and door: in only on the way in
  } else n.block(s1 - 0.08, RETURN + 0.08, BACK, CORR[0] + 0.1);
  n.block(RETURN, STAIR.east, BACK, STAIR.back + 0.12); // behind the landing
  n.block(WEST_END - 1, RETURN + 0.06, CORR[1] - 0.12, STAIR.top); // the parapet
  n.block(WEST_END - 1, WEST_END + 0.02, BACK, STAIR.top); // the end wall
  n.block(STAIR.east - 0.3, STAIR.east, 1.3, 1.7); // the fire hose cabinet
}

// a corridor floor's stairs, in the place's frame: the landing, the top of the flight down (lane A) and the foot of
// the flight up (lane B), both a step short of the edge
export function stairSpots(dx) {
  const z = STAIR.top - 0.32;
  return {
    landing: [LANDING[0] + dx, LANDING[1]],
    down: [(STAIR.a[0] + STAIR.a[1]) / 2 + dx, z],
    up: [(STAIR.b[0] + STAIR.b[1]) / 2 + dx, z],
    lanes: { a: STAIR.a.map((x) => x + dx), b: STAIR.b.map((x) => x + dx) },
  };
}

export function buildLevels(kit, root, nav) {
  // 2F: the kitchen, the notice board between 201 and the stairs
  const kitchen2 = kitchen(kit, root, nav);
  const board = noticeBoard(kit, root, RETURN - 0.65);
  // 3F
  const d3 = LEVEL_DX['3f'],
    g3 = new THREE.Group(),
    k3 = new Kit(),
    n3 = navAt(nav, d3);
  g3.position.x = d3;
  corridorNav(n3, false);
  const f3 = upperFloor(k3, g3, n3);
  n3.block(STAIR.east - 1.05, STAIR.east, STAIR.back, STAIR.back + 0.55); // the drinks machine and its bin
  k3.flush(g3);
  root.add(g3);
  // the roof
  const dr = LEVEL_DX.roof,
    gr = new THREE.Group(),
    kr = new Kit(),
    nr = navAt(nav, dr);
  gr.position.x = dr;
  nr.block(ROOF.x0 - 1, ROOF.x0 + 0.14, BACK - 1, STAIR.top); // the parapets: west, back, front
  nr.block(ROOF.x0 - 1, ROOF.x1, BACK - 1, ROOF.z0 + 0.14);
  nr.block(ROOF.x0 - 1, ROOF.x1, ROOF.z1 - 0.14, STAIR.top);
  const r = roof(kr, gr, nr);
  kr.flush(gr);
  root.add(gr);
  // between the levels: nothing
  nav.block(STAIR.east - 0.12, d3 + WEST_END - 0.5, BACK - 1, STAIR.top + 1);
  nav.block(d3 + STAIR.east - 0.12, dr + ROOF.x0 - 0.5, BACK - 1, STAIR.top + 1);
  const at = (dx, [x, z]) => [x + dx, z];
  return {
    groups: { '3f': g3, roof: gr },
    kitchen: { at: kitchen2.at, spot: kitchen2.spot },
    board: { ...board },
    laundry: { at: at(d3, f3.room.at), spot: at(d3, f3.room.spot) },
    drinks: { at: [d3 + STAIR.east - 0.45, STAIR.back + 0.2], spot: [d3 + STAIR.east - 1.2, STAIR.back + 0.8] },
    lights: { '3f': f3.light.clone().setX(f3.light.x + d3), roof: r.light.clone().setX(r.light.x + dr) },
    roof: {
      door: r.door,
      out: at(dr, r.out),
      in: at(dr, r.in),
      washing: { at: at(dr, r.washing.at), spot: at(dr, r.washing.spot) },
      planters: { at: at(dr, r.planters.at), spot: at(dr, r.planters.spot) },
    },
    // the nooks: kept for later secrets (docs/game/places.md, Nooks)
    nooks: {
      dorm_2f_end: [WEST_END + 0.45, (CORR[0] + CORR[1]) / 2],
      dorm_kitchen_shelf: kitchen2.nook,
      dorm_3f_end: [d3 + WEST_END + 0.45, (CORR[0] + CORR[1]) / 2],
      dorm_laundry_box: at(d3, f3.room.nook),
      dorm_roof_chairs: at(dr, [r.bench[0], r.bench[1] + 0.55]),
      dorm_roof_units: at(dr, r.units),
    },
    // the shared rooms' tall fronts, faded while he is inside (places/dorm-floors.js): the room's x range per floor
    fronts: [
      { level: '2f', group: kitchen2.front, x0: SHARED.x0, x1: SHARED.x1 },
      { level: '3f', group: f3.room.front, x0: SHARED.x0 + d3, x1: SHARED.x1 + d3 },
    ],
    bounds: { x0: WEST_END, x1: STAIR.east, roof: ROOF },
  };
}
