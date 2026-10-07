// The flat's shell and what is round it: tatami in the room, plank vinyl in the entry strip, the genkan, the walls
// (cut at the ceiling, the front ones low), the building cut away round the flat, the corridor outside the front
// door with the neighbours' doors, the window with its curtains and air conditioner, and the next block's bare end
// wall outside it.
import * as THREE from 'three';
import { wall, tileFloor, mat } from '../../props.js';
import { lightPool } from '../../places/life.js';
import * as L from './layout.js';
import { Kit } from './kit.js';
import { neighbours, shell, party, edge, veils, SPAN } from './neighbours.js';
import { plates } from './plates.js';
import { neighbourDoor, corridorLight, number, DOOR_C, DOORS_2F } from './doors.js';

const {
  X0,
  X1,
  BACK,
  PART,
  NEAR,
  H,
  LOW,
  FRONT_LOW,
  T,
  OUT,
  BATH_X,
  COUNTER_X,
  CORRIDOR,
  PITCH,
  WIN,
  DOOR,
  DOORWAY,
  DOORWAY_H,
  RETURN,
  SHARED_K,
  WEST_END,
  C,
} = L;

// six mats in the classic 6-jo layout (no four corners meet): [u0, u1, v0, v1] on a 1.5 x 2 mat-length grid
const MATS = [
  [0, 1, 0, 0.5],
  [1, 1.5, 0, 1],
  [0, 0.5, 0.5, 1.5],
  [0.5, 1, 0.5, 1.5],
  [1, 1.5, 1, 2],
  [0, 1, 1.5, 2],
];

export function floors(kit, root) {
  const ux = (X1 - X0) / 1.5,
    vz = (PART - BACK) / 2;
  MATS.forEach(([u0, u1, v0, v1], i) => {
    const x0 = X0 + u0 * ux,
      x1 = X0 + u1 * ux,
      z0 = BACK + v0 * vz,
      z1 = BACK + v1 * vz;
    const w = x1 - x0 - 0.008,
      d = z1 - z0 - 0.008,
      cx = (x0 + x1) / 2,
      cz = (z0 + z1) / 2;
    kit.box(C.tatami[i % 3], w, 0.03, d, cx, -0.03, cz, {
      r: 0.006,
      surf: 'fabric',
      cast: false,
    });
    // the cloth border along both long edges
    const along = w > d;
    for (const s of [-1, 1])
      if (along)
        kit.box(C.heri, w, 0.032, 0.03, cx, -0.03, cz + s * (d / 2 - 0.015), {
          surf: 'fabric',
          cast: false,
        });
      else
        kit.box(C.heri, 0.03, 0.032, d, cx + s * (w / 2 - 0.015), -0.03, cz, {
          surf: 'fabric',
          cast: false,
        });
  });
  // the entry strip: grey plank vinyl, the genkan a step down by the front door
  const g0 = COUNTER_X,
    g1 = BATH_X - 0.04,
    gz = L.GENKAN_Z;
  const planks = (x0, x1, z0, z1) => {
    kit.box(C.plank, x1 - x0, 0.03, z1 - z0, (x0 + x1) / 2, -0.03, (z0 + z1) / 2, { surf: 'laminate', cast: false });
    for (let x = x0 + 0.13; x < x1 - 0.05; x += 0.13)
      kit.box(C.plankSeam, 0.006, 0.002, z1 - z0, x, 0, (z0 + z1) / 2, {
        cast: false,
      });
  };
  planks(X0, X1, PART, gz);
  planks(X0, g0, gz, NEAR);
  planks(g1, X1, gz, NEAR);
  root.add(
    tileFloor(g0, g1, gz, NEAR + 0.05, 0.16, {
      color: C.genkan,
      seam: '#6a6f78',
      seamW: 0.008,
      y: -0.045,
    }),
  );
  // the step's edge (the kamachi): a slightly lighter board facing the door
  kit.box(C.step, g1 - g0, 0.05, 0.035, (g0 + g1) / 2, -0.045, gz + 0.012, {
    r: 0.004,
    surf: 'laminate',
    cast: false,
  });
}

export function walls(root) {
  const o = { color: C.wall, top: C.wallTop };
  root.add(wall('x', X0 - T, X1 + T, BACK - T / 2, H, T, { ...o, holes: [WIN] }));
  for (const x of [X0 - T / 2, X1 + T / 2]) root.add(wall('z', BACK - T, NEAR + T, x, H, T, o));
  root.add(
    wall('x', X0, X1, PART, LOW, 0.08, {
      ...o,
      holes: [[...DOORWAY, 0, DOORWAY_H]],
    }),
  );
  root.add(
    wall('x', X0 - T, X1 + T, NEAR + T / 2, FRONT_LOW, T, {
      ...o,
      holes: [[DOOR[0], DOOR[1], 0, 1]],
    }),
  );
}

// the rest of the floor: the neighbours' flats either side, cut open like Eric's (neighbours.js), and 207 past them
// on the left to the shared room (the kitchen, shared.js); on the right past 201 the building cut solid to the
// return's west face (the stairs, stairs.js); the corridor face runs the whole way, and the corridor with it
export function building(kit, root) {
  const zf = NEAR + T,
    e = X1 + T + SPAN * PITCH, // the outer face of the last opened flat
    s1 = SHARED_K * PITCH + X1 + T; // the shared room's east wall's outer face
  neighbours(kit, root);
  // 207, past 206: dark, its bed made
  shell(kit, -3 * PITCH);
  party(kit, X1 + T / 2 - 3 * PITCH);
  party(kit, X0 - T / 2 - 3 * PITCH);
  edge(kit, root, -3 * PITCH, false);
  veils(root, [[0.55, [-3 * PITCH]]]);
  cutFlats(kit, [[e, RETURN]]);
  facade(kit, [
    [s1, X0 - T],
    [X1 + T, RETURN],
  ]);
  corridor(kit);
  // the neighbours' front doors, a flat's width apart, every door's number over it, a light by each
  const ks = Object.keys(DOORS_2F).map(Number);
  for (const k of ks) neighbourDoor(kit, DOOR_C + k * PITCH, zf, DOORS_2F[k]);
  doorPlates(root, 2, ks);
  corridorLights(kit, root, ks);
  // Eric's own front door, cut low with the wall, and its frame. The leaf is its own group, hinged on its left
  // edge, so the trip in can swing it open onto the corridor and shut it behind him (places/dorms.js)
  const [d0, d1] = DOOR;
  kit.boxes(C.frame, [
    [0.035, FRONT_LOW, T + 0.02, d0 + 0.0175, 0, NEAR + T / 2],
    [0.035, FRONT_LOW, T + 0.02, d1 - 0.0175, 0, NEAR + T / 2],
  ]);
  const leaf = new Kit(),
    w = d1 - d0 - 0.04;
  leaf.box(C.steel, w, FRONT_LOW - 0.02, 0.045, w / 2, 0, 0, { surf: 'door' });
  leaf.box('#c9cdd2', 0.09, 0.022, 0.03, w - 0.08, FRONT_LOW - 0.08, -0.04, { r: 0.008, cast: false });
  const door = leaf.flush(new THREE.Group());
  door.position.set(d0 + 0.02, 0, NEAR + T / 2);
  return door;
}

// flats cut solid at the ceiling over x ranges [a, b]: the dark cut and its pale cap at each end
export function cutFlats(kit, spans) {
  const zf = NEAR + T;
  for (const [a, b] of spans) {
    kit.box(C.cut, b - a, H + 0.035, zf - (BACK - T), (a + b) / 2, 0, (zf + BACK - T) / 2, { cast: false });
    for (const x of [a + 0.015, b - 0.015])
      kit.box(C.wallTop, 0.03, 0.04, zf - (BACK - T), x, H, (zf + BACK - T) / 2, { cast: false });
  }
}

// the corridor face of the flats over x ranges [a, b]: the facade's skin, and the cap over the cut block's top
export function facade(kit, spans) {
  const zf = NEAR + T;
  for (const [a, b] of spans) {
    kit.box(C.facade, b - a, H, 0.012, (a + b) / 2, 0, zf + 0.006, { surf: 'plaster', cast: false });
    kit.box(C.wallTop, b - a, 0.04, T + 0.03, (a + b) / 2, H, zf - T / 2 + 0.015, { cast: false }); // over H + 0.035
  }
}

// the number over each door at k along a floor (the facade's face is at zf + 0.012)
export function doorPlates(root, floor, ks) {
  root.add(plates(ks.map((k) => [number(floor, k), DOOR_C + k * PITCH, 1.43, NEAR + T + 0.017, 0.24, 0.12])));
}

// a corridor light on the wall by every door at k, and the pools they throw
export function corridorLights(kit, root, ks) {
  const zf = NEAR + T;
  for (const k of ks) corridorLight(kit, DOOR_C + k * PITCH, zf);
  for (const k of ks)
    root.add(lightPool(DOOR_C + k * PITCH, zf + CORRIDOR / 2, 0.7, { color: '#dfe7f5', k: 0.12, y: -0.015 }));
}

// the open corridor from the block's west end to the return: concrete, a gutter along the parapet, the parapet cut
// low like the flat's front wall, the slab's edge under it. Across its west end the block's end wall, cut at the
// ceiling, with the fire escape's steel door in it under its green sign; past the wall, the escape's top landing.
export function corridor(kit) {
  const z0 = NEAR + T,
    z1 = z0 + CORRIDOR,
    x0 = WEST_END,
    cx = (RETURN + x0) / 2,
    len = RETURN - x0;
  kit.box('#737880', len, 0.2, CORRIDOR, cx, -0.22, (z0 + z1) / 2, { surf: 'concrete', cast: false });
  kit.box('#4f545b', len, 0.004, 0.07, cx, -0.02, z1 - 0.05, { cast: false });
  kit.box('#8b939e', len, 0.36, 0.1, cx, -0.03, z1 + 0.05, { surf: 'concrete' });
  kit.box(C.wallTop, len + 0.02, 0.03, 0.12, cx, 0.33, z1 + 0.05, { cast: false });
  kit.box('#5b6068', len, 0.22, 0.02, cx, -0.25, z1 + 0.105, { cast: false });
  // the end wall: across the corridor (its face), and the block's cut end behind it
  kit.box(C.facade, T, H, z1 + 0.1 - z0, x0 - T / 2, 0, (z0 + z1 + 0.1) / 2, { surf: 'plaster' });
  kit.box(C.cut, T, H + 0.035, z0 - (BACK - T), x0 - T / 2, 0, (z0 + BACK - T) / 2, { cast: false });
  kit.box(C.wallTop, T + 0.02, 0.035, z1 + 0.1 - (BACK - T), x0 - T / 2, H, (BACK - T + z1 + 0.1) / 2, {
    cast: false,
  });
  kit.box('#55606e', 0.04, 1.22, 0.5, x0 + 0.02, 0, z0 + 0.36, { surf: 'door' });
  kit.box('#c9cdd2', 0.04, 0.025, 0.1, x0 + 0.05, 0.62, z0 + 0.18, { r: 0.008, cast: false });
  kit.box('#3f8f5a', 0.014, 0.08, 0.2, x0 + 0.008, 1.33, z0 + 0.36, {
    cast: false,
    opts: { emissive: '#3fcf7a', emissiveIntensity: 0.8 },
  });
  // outside it, the escape's grey steel landing, its rail and the first steps down
  const ox = x0 - T - 0.48;
  kit.box('#6c737c', 0.9, 0.05, 0.95, ox, -0.06, z0 + 0.42, { cast: false });
  kit.boxes('#7f868f', [
    [0.04, 0.5, 0.04, ox - 0.43, 0, z0 - 0.03],
    [0.04, 0.5, 0.04, ox - 0.43, 0, z0 + 0.88],
    [0.9, 0.035, 0.035, ox, 0.5, z0 + 0.88],
    [0.035, 0.035, 0.9, ox - 0.43, 0.5, z0 + 0.42],
  ]);
  for (let i = 0; i < 4; i++) kit.box('#6c737c', 0.4, 0.03, 0.18, ox + 0.2, -0.2 - i * 0.17, z0 + 1.0 + i * 0.18);
}

// the window: aluminium frame and glass, curtains drawn back, the air conditioner over it
// own: the window's own kit (its frame and sill, the thing Eric looks at); obj: the group it goes into
export function window_(kit, own, obj) {
  const [a, b, y0, y1] = WIN,
    z = BACK - T / 2,
    cx = (a + b) / 2,
    zi = BACK;
  own.boxes(C.alu, [
    [b - a + 0.08, 0.056, 0.13, cx, y0 - 0.05, z], // its top just over the wall's sill in the hole (y0)
    [b - a + 0.08, 0.05, 0.13, cx, y1, z],
    [0.05, y1 - y0, 0.13, a - 0.015, y0, z],
    [0.05, y1 - y0, 0.13, b + 0.015, y0, z],
    [0.04, y1 - y0, 0.08, cx + 0.02, y0, z - 0.02],
  ]);
  own.box('#c3c6ca', b - a + 0.16, 0.025, 0.1, cx, y0 - 0.035, zi + 0.04, {
    r: 0.006,
    surf: 'laminate',
  });
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(b - a, y1 - y0),
    new THREE.MeshStandardMaterial({
      color: '#b9cbd6',
      transparent: true,
      opacity: 0.14,
      roughness: 0.1,
    }),
  );
  glass.position.set(cx, (y0 + y1) / 2, z);
  obj.add(glass);
  // curtain rail and the two curtains, gathered into folds either side
  const top = 1.29;
  kit.box('#c9cdd2', b - a + 0.56, 0.025, 0.04, cx, top, zi + 0.07, {
    cast: false,
  });
  // the left one's hem a little higher, clear of the desk top under it (dorms/desk.js)
  for (const [x0, dir, hem] of [
    [a - 0.25, 1, 0.46],
    [b + 0.25, -1, 0.43],
  ])
    for (let i = 0; i < 5; i++) {
      const x = x0 + dir * (0.025 + i * 0.052);
      kit.box(i % 2 ? '#56657e' : '#5e6d87', 0.058, top - hem, 0.035, x, hem, zi + 0.075 + (i % 2) * 0.022, {
        r: 0.012,
        surf: 'fabric',
      });
    }
  // the air conditioner, high on the wall: a white box, its louvre, a green standby light
  const ac = cx + 0.02;
  kit.box(C.white, 0.64, 0.19, 0.17, ac, 1.325, zi + 0.085, {
    r: 0.03,
    seg: 2,
    surf: 'plastic',
  });
  kit.box('#b8bbbe', 0.56, 0.02, 0.01, ac, 1.36, zi + 0.172, { cast: false });
  kit.box('#8fe39a', 0.018, 0.012, 0.005, ac + 0.26, 1.43, zi + 0.17, {
    cast: false,
    opts: { emissive: '#6dff84', emissiveIntensity: 1.2 },
  });
}

// outside: the gap between the blocks, and the next block's end wall about two metres off, lit by the dusk sky and
// a lamp on it; straight across from the window, a small lit bathroom window of the flat opposite
export function outside(root, kit) {
  const DROP = 4.2,
    W = 16,
    face = OUT + 0.003;
  kit.box('#3c4048', W, 0.06, BACK - OUT + 0.4, 0, -DROP, (OUT + BACK) / 2, {
    cast: false,
  });
  const wallMat = mat(C.concrete, {
    roughness: 0.95,
    emissive: new THREE.Color('#8e9bb4'),
    emissiveIntensity: 0.2,
  });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W, 12, 0.3), wallMat);
  slab.position.set(0, 6 - DROP, OUT - 0.15);
  slab.userData.surf = 'concrete';
  root.add(slab);
  // precast panel joints, floor lines, a drain pipe with its brackets, a vent
  const seams = [];
  for (let x = -7.5; x <= 7.5; x += 1.5) seams.push([0.018, 12, 0.01, x, -DROP, face]);
  for (let y = -DROP + 0.4; y < 8; y += 1.7) seams.push([W, 0.03, 0.012, 0, y, face]);
  kit.boxes('#80847f', seams, { cast: false });
  kit.box('#6c7073', 0.07, 12, 0.07, 1.35, -DROP, OUT + 0.05, { cast: false });
  for (let y = -DROP + 1; y < 8; y += 1.7) kit.box('#5a5e62', 0.12, 0.03, 0.08, 1.35, y, OUT + 0.04, { cast: false });
  kit.box('#7f8388', 0.22, 0.14, 0.06, -1.9, 1.95, OUT + 0.03, { cast: false });
  // the window opposite, a floor down, where the play camera sees it through Eric's window: a bathroom's, lit,
  // frosted, in two sliding panes. Behind the frosting the shapes of what's on its sill (shampoo, a bottle, a cup
  // with toothbrushes) and the shower head on its rail; the bathroom's fan grille beside it. The lamp above.
  const wx = (WIN[0] + WIN[1]) / 2 - 0.04,
    wy = -0.5,
    ww = 0.5,
    wh = 0.4;
  kit.box('#f6e6c8', ww, wh, 0.02, wx, wy, face, {
    cast: false,
    opts: { emissive: '#ffd89c', emissiveIntensity: 1.0 },
  });
  kit.boxes(C.alu, [
    [ww + 0.06, 0.035, 0.05, wx, wy - 0.035, face + 0.01],
    [ww + 0.06, 0.035, 0.05, wx, wy + wh, face + 0.01],
    [0.035, wh, 0.05, wx - ww / 2 - 0.012, wy, face + 0.01],
    [0.035, wh, 0.05, wx + ww / 2 + 0.012, wy, face + 0.01],
    [0.03, wh, 0.045, wx + 0.02, wy, face + 0.012],
  ]);
  // the soft shapes behind the glass, warm-grey against the light
  kit.boxes(
    '#b89f86',
    [
      [0.05, 0.13, 0.004, wx - 0.17, wy, face + 0.012],
      [0.045, 0.1, 0.004, wx - 0.11, wy, face + 0.012],
      [0.035, 0.16, 0.004, wx - 0.06, wy, face + 0.012],
      [0.05, 0.07, 0.004, wx + 0.12, wy, face + 0.012],
      [0.012, 0.07, 0.004, wx + 0.11, wy + 0.07, face + 0.012],
      [0.012, 0.08, 0.004, wx + 0.13, wy + 0.07, face + 0.012],
      [0.014, 0.26, 0.004, wx + 0.18, wy + 0.1, face + 0.012],
      [0.07, 0.035, 0.004, wx + 0.175, wy + 0.34, face + 0.012],
    ],
    { cast: false, opts: { emissive: '#8a6a4a', emissiveIntensity: 0.35 } },
  );
  kit.box('#8f949a', 0.16, 0.16, 0.03, wx + ww / 2 + 0.2, wy + 0.2, face + 0.015, { cast: false });
  kit.boxes(
    '#6c7076',
    [0, 1, 2, 3].map((i) => [0.13, 0.012, 0.035, wx + ww / 2 + 0.2, wy + 0.23 + i * 0.03, face + 0.02]),
    { cast: false },
  );
  kit.box('#e9e4d6', 0.1, 0.07, 0.07, wx - 0.45, wy + 0.52, face + 0.03, {
    r: 0.02,
    cast: false,
    opts: { emissive: '#ffe2b0', emissiveIntensity: 1.4 },
  });
  const glow = lightPool(wx - 0.3, face + 0.02, 0.8, {
    color: '#ffd7a0',
    k: 0.3,
  });
  glow.rotation.x = 0;
  glow.position.y = wy + 0.2;
  root.add(glow);
  const up = lightPool(-0.6, face + 0.02, 1.4, {
    color: '#ffd7a0',
    k: 0.1,
    sx: 1.4,
  });
  up.rotation.x = 0;
  up.position.y = 1.2;
  root.add(up);
}
