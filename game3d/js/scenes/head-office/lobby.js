// The head office lobby (scenes/head-office.js): the reception counter, sofas, plants and umbrella stand in the
// tower's frame; the lift core square to the camera with the B2 car's doorway, the second car, the stair door, the
// directory and the sign strip; and the lift's landing doors.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, mat, rbox, plant, textTexture, plane, JP_FONT, wallLamp } from '../../props.js';
import { lightPool } from '../../places/life.js';
import { mergeStatic } from '../merge-static.js';
import { LU, LN, DOOR_U, OUT, CZ, CORE, CAR2_X, STAIR_X, GF } from './frame.js';

// the reception counter's middle (u, n); Kuro stands 0.65 behind it
export const RECEPTION = [1.3, 1.9];

// the lobby's furniture, in the tower's frame: reception counter, sofas round a low table, plants, umbrella stand
export function furniture(g) {
  const counter = new THREE.Group();
  counter.add(
    rbox(2.0, 0.54, 0.52, '#8c929c', { r: 0.03 }),
    rbox(2.08, 0.05, 0.6, '#c9ccd0', { y: 0.54, r: 0.02 }),
    rbox(2.0, 0.06, 0.01, '#5b7ea8', {
      y: 0.27,
      z: 0.265,
      r: 0.004,
      cast: false,
    }),
    rbox(0.32, 0.2, 0.03, PAL.monitor, { x: -0.5, y: 0.59, z: -0.1, r: 0.01 }),
    rbox(0.3, 0.03, 0.22, PAL.paper, { x: 0.4, y: 0.59, z: 0.08, r: 0.005 }),
  );
  const cp = plant({ size: 0.42, seed: 12 });
  cp.position.set(RECEPTION[0] + 0.82, 0.59, -RECEPTION[1] - 0.02);
  g.add(cp);
  const recept = textTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#2a2f38';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e9ecf0';
      ctx.textBaseline = 'middle';
      ctx.font = '700 54px ' + JP_FONT;
      ctx.fillText('受付', 22, h / 2 + 2);
      ctx.fillStyle = '#9aa3b0';
      ctx.font = '600 32px sans-serif';
      ctx.fillText('RECEPTION', 150, h / 2 + 4);
    },
    420,
    100,
  );
  const rp = plane(0.84, 0.2, recept);
  rp.position.set(0, 0.36, 0.268);
  counter.add(rp);
  counter.position.set(RECEPTION[0], 0, -RECEPTION[1]);
  g.add(counter);
  // sofas facing each other across a low table, side on to the camera
  const sofa = (u, n, facing) => {
    const s = new THREE.Group();
    s.add(
      rbox(1.5, 0.22, 0.72, '#465261', { y: 0.06, r: 0.04 }),
      rbox(1.42, 0.12, 0.6, '#5a6878', { y: 0.28, z: 0.05, r: 0.05 }),
      rbox(1.5, 0.42, 0.16, '#465261', { y: 0.28, z: -0.28, r: 0.05 }),
    );
    for (const x of [-0.71, 0.71]) s.add(rbox(0.12, 0.26, 0.7, '#3d4856', { x, y: 0.26, r: 0.04 }));
    s.position.set(u, 0, -n);
    s.rotation.y = facing;
    g.add(s);
  };
  sofa(6.75, 2.75, Math.PI / 2);
  sofa(9.0, 2.75, -Math.PI / 2);
  g.add(rbox(0.9, 0.3, 1.2, '#b7b1a8', { x: 7.88, z: -2.75, r: 0.03 }));
  g.add(
    rbox(0.3, 0.02, 0.2, PAL.paper, {
      x: 7.8,
      y: 0.3,
      z: -2.6,
      r: 0.004,
      cast: false,
    }),
  );
  for (const [u, n, s, seed] of [
    [0.6, 0.62, 1.1, 3],
    [LU - 0.55, 0.62, 1.1, 5],
    [LU - 0.55, LN - 0.55, 1.2, 7],
  ]) {
    const p = plant({ size: s, seed });
    p.position.set(u, 0, -n);
    g.add(p);
  }
  // umbrella stand inside the door, three umbrellas in it
  const stand = new THREE.Group();
  stand.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.42, 10), mat('#7d848e')));
  stand.children[0].position.y = 0.21;
  for (const [i, color] of ['#2f3440', '#5b6f86', '#7a6570'].entries()) {
    const u = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.035, 0.78, 6), mat(color));
    u.position.set(Math.cos(i * 2.1) * 0.05, 0.42, Math.sin(i * 2.1) * 0.05);
    u.rotation.set(Math.sin(i * 1.7) * 0.12, 0, Math.cos(i * 1.3) * 0.12);
    stand.add(u);
  }
  stand.position.set(DOOR_U + 1.15, 0, -0.5);
  g.add(stand);
}
// the same pieces as walk-grid rectangles in (u, n), and the name stone outside
export const FURNITURE = [
  [RECEPTION[0] - 1.1, RECEPTION[0] + 1.1, RECEPTION[1] - 0.32, RECEPTION[1] + 1.0], // counter, Kuro behind it
  [6.2, 9.55, 1.95, 3.55], // sofas and table
  [0.35, 0.85, 0.37, 0.87],
  [LU - 0.8, LU - 0.3, 0.37, 0.87],
  [LU - 0.8, LU - 0.3, LN - 0.8, LN - 0.3],
  [DOOR_U + 1.0, DOOR_U + 1.3, 0.35, 0.65],
  [DOOR_U + 2.4, DOOR_U + 3.8, -1.35, -1.05], // name stone (outside)
];

// the lift core, square to the camera: front wall with the B2 car's doorway (its middle pieces are named so the lift
// can cut them down during the ride), two lamps, the second car's closed doors, the stair door, the directory
export function core(root) {
  const [x0, x1, zb, zf] = CORE,
    X = OUT[0],
    H = GF;
  const clad = mat('#6f7682');
  const g = new THREE.Group();
  const add = (w, h, d, x, y, z, m = clad) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), m);
    b.position.set(x, y, z);
    b.castShadow = b.receiveShadow = true;
    g.add(b);
    return b;
  };
  const span = (a, b, y0, y1, z0, z1, m) => add(b - a, y1 - y0, z1 - z0, (a + b) / 2, y0, (z0 + z1) / 2, m);
  // front wall, west of the B2 car and east of it (with the car-2 and stair openings)
  span(x0, X - 0.8, 0, H, zf - 0.18, zf);
  const c2 = [CAR2_X - 0.55, CAR2_X + 0.55],
    st = [STAIR_X - 0.44, STAIR_X + 0.44];
  span(X + 0.8, c2[0], 0, H, zf - 0.18, zf);
  span(c2[0], c2[1], 1.42, H, zf - 0.18, zf);
  span(c2[1], st[0], 0, H, zf - 0.18, zf);
  span(st[0], st[1], 1.55, H, zf - 0.18, zf);
  span(st[1], x1, 0, H, zf - 0.18, zf);
  // round the car: the west side and the back; east of it the second car's shaft, the stairwell and a service riser,
  // with walls between them. The tower above fades while Eric is in the lobby, so the core's top is where the
  // building is cut: pale caps on every wall (like every cut wall in the office), the shafts dark below them, the
  // stair's upper flight and the riser's ducts showing in the cut. The lift's lid covers the B2 car in the shafts'
  // dark (CAP), and a separate cap runs over it on the front wall (it goes down with the wall during the ride).
  const W0 = X + 1.42, // the B2 shaft's east wall, the second car's shaft, the stairwell, the riser
    C2 = [W0 + 0.14, W0 + 1.24],
    SW = [C2[1] + 0.14, C2[1] + 1.26],
    RS = [SW[1] + 0.14, x1 - 0.18],
    rim = [],
    wallTop = mat('#a3a9b3', { roughness: 0.8 }),
    void_ = mat('#23272e', { roughness: 0.95 }),
    stepM = mat('#8f949b'),
    duct = mat('#7d848e', { roughness: 0.6, metalness: 0.2 });
  const wall = (a, b, z0, z1) => {
    span(a, b, 0, H, z0, z1);
    rim.push([a, b, z0, z1]);
  };
  wall(x0, x0 + 0.18, zb, zf - 0.18);
  wall(x0, x1, zb, zb + 0.18);
  wall(x1 - 0.18, x1, zb + 0.18, zf - 0.18);
  for (const [a, b] of [
    [W0 - 0.12, C2[0]],
    [C2[1], SW[0]],
    [SW[1], RS[0]],
  ])
    wall(a, b, zb + 0.18, zf - 0.18);
  // the front wall's caps, beside the B2 car (over the car the separate cap below)
  rim.push([x0, X - 1.42, zf - 0.18, zf], [W0, x1, zf - 0.18, zf]);
  for (const [a, b, z0, z1] of rim) span(a, b, H, H + 0.014, z0, z1, wallTop);
  const zi = [zb + 0.18, zf - 0.18]; // inside the front and back walls
  // the second car's shaft: dark, a counterweight rail down its back
  span(C2[0], C2[1], 0, H - 0.3, zi[0], zi[1], void_);
  span(C2[0] + 0.2, C2[0] + 0.26, H - 0.3, H - 0.02, zi[0], zi[0] + 0.08, duct);
  span(C2[1] - 0.26, C2[1] - 0.2, H - 0.3, H - 0.02, zi[0], zi[0] + 0.08, duct);
  // the stairwell: from the door at the front a flight climbs to a landing at the back, and the return flight climbs
  // toward the front, cut off at the top
  const half = (SW[1] - SW[0]) / 2,
    rise = 0.2,
    run = (zi[1] - zi[0] - 0.5) / 7;
  span(SW[0], SW[1], 0, 0.02, zi[0], zi[1], void_);
  for (let i = 0; i < 7; i++) {
    const zA = zi[1] - (i + 1) * run;
    span(SW[0], SW[0] + half - 0.03, 0, (i + 1) * rise, zA, zA + run, stepM); // up, toward the back
    const y = 7 * rise + (i + 1) * rise;
    if (y > H - 0.02) break;
    const zB = zi[0] + 0.5 + i * run;
    span(SW[0] + half + 0.03, SW[1], y - rise, y, zB, zB + run, stepM); // and up again, toward the front
  }
  span(SW[0], SW[1], 7 * rise - 0.12, 7 * rise, zi[0], zi[0] + 0.5, stepM); // the landing
  span(SW[0] + half - 0.03, SW[0] + half + 0.03, 0, H - 0.1, zi[0] + 0.5, zi[1], void_); // the wall between
  // the riser: a dark floor below the cut, two ducts and a pipe run up through it
  span(RS[0], RS[1], 0, H - 0.3, zi[0], zi[1], void_);
  span(RS[0] + 0.1, RS[0] + 0.62, H - 0.3, H - 0.03, zi[0] + 0.1, zi[0] + 0.72, duct);
  span(RS[0] + 0.1, RS[0] + 0.52, H - 0.3, H - 0.03, zi[0] + 0.95, zi[0] + 1.3, duct);
  for (const dx of [0.85, 1.05])
    span(RS[0] + dx, RS[0] + dx + 0.1, H - 0.3, H - 0.03, zi[0] + 0.12, zi[0] + 0.22, duct);
  // the second car: closed doors in a frame, a call button
  const leaf = mat('#8e949d');
  span(c2[0] + 0.02, CAR2_X - 0.005, 0.02, 1.4, zf - 0.08, zf - 0.03, leaf);
  span(CAR2_X + 0.005, c2[1] - 0.02, 0.02, 1.4, zf - 0.08, zf - 0.03, leaf);
  for (const x of c2) span(x - 0.05, x + 0.05, 0, 1.48, zf - 0.02, zf + 0.04, mat(PAL.trim));
  span(c2[0] - 0.05, c2[1] + 0.05, 1.42, 1.5, zf - 0.02, zf + 0.04, mat(PAL.trim));
  span(c2[1] + 0.12, c2[1] + 0.2, 0.55, 0.71, zf, zf + 0.025, mat(PAL.metal));
  // the stair door: a plain dark door with a narrow window
  span(st[0] + 0.03, st[1] - 0.03, 0.02, 1.52, zf - 0.1, zf - 0.05, mat(PAL.door));
  span(STAIR_X - 0.08, STAIR_X + 0.08, 0.85, 1.3, zf - 0.05, zf - 0.035, mat(PAL.doorWin));
  span(st[1] - 0.16, st[1] - 0.08, 0.7, 0.74, zf - 0.05, zf - 0.02, mat(PAL.metal));
  for (const x of st) span(x - 0.04, x + 0.04, 0, 1.58, zf - 0.02, zf + 0.03, mat(PAL.doorFrame));
  span(st[0] - 0.04, st[1] + 0.04, 1.55, 1.6, zf - 0.02, zf + 0.03, mat(PAL.doorFrame));
  mergeStatic(g);
  g.traverse((o) => o.isMesh && (o.userData.liftKeep = true));
  // the B2 car's doorway: jambs and lintel in one mesh, cut down with the wall while Eric rides (named: never merged)
  const jambs = [
    [X - 0.8, X - 0.62, 0],
    [X + 0.62, X + 0.8, 0],
    [X - 0.62, X + 0.62, 1.45],
  ].map(([a, b, y0]) => new THREE.BoxGeometry(b - a, H - y0, 0.18).translate((a + b) / 2, (y0 + H) / 2, zf - 0.09));
  const doorway = new THREE.Mesh(mergeGeometries(jambs), clad);
  doorway.name = 'ho:liftWall';
  doorway.castShadow = doorway.receiveShadow = true;
  g.add(doorway);
  span(X - 1.42, W0, H + 0.006, H + 0.02, zf - 0.18, zf, mat('#a3a9b3', { roughness: 0.8 })).name = 'ho:liftWallCap';
  // over the B2 shaft, on the lid: the lift's machine on two steel beams across the shaft, and its ropes' sheave
  // (not kept: like the cap, they go with the wall while the car is in view during the ride)
  const machine = new THREE.Group(),
    steel = mat('#4b515b', { roughness: 0.6, metalness: 0.3 });
  const piece = (a, b, y0, y1, z0, z1) =>
    machine.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(b - a, y1 - y0, z1 - z0).translate((a + b) / 2, (y0 + y1) / 2, (z0 + z1) / 2),
        steel,
      ),
    );
  for (const z of [zb + 0.55, zb + 1.35]) piece(X - 1.36, X + 1.36, H + 0.004, H + 0.07, z - 0.07, z + 0.07);
  piece(X - 0.75, X + 0.15, H + 0.07, H + 0.36, zb + 0.5, zb + 1.4); // the machine
  piece(X + 0.3, X + 0.75, H + 0.07, H + 0.2, zb + 0.75, zb + 1.15); // its controller
  machine.children.forEach((m) => (m.castShadow = m.receiveShadow = true));
  mergeStatic(machine);
  g.add(machine);
  root.add(g);
  // two warm lamps beside the B2 car, a pool of light in front of the lifts
  for (const s of [-1, 1]) {
    const l = wallLamp(0.5, 0.1);
    l.position.set(X + s * 1.15, 0.72, zf + 0.01);
    l.traverse((o) => o.isMesh && (o.userData.liftKeep = true));
    root.add(l);
  }
  root.add(lightPool(X + 0.9, zf + 1.0, 1.3, { k: 0.26, sx: 1.7 }));
  // one sign strip over the three doors, and the floor directory east of the stair door
  const strip = textTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#3f4650';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e8e9e6';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const px = (x) => ((x - (X - 0.7)) / (STAIR_X + 0.6 - (X - 0.7))) * w;
      ctx.font = '600 40px sans-serif';
      ctx.fillText('B2 - 5F', px(X), h / 2 + 2);
      ctx.fillText('6F - 10F', px(CAR2_X), h / 2 + 2);
      ctx.font = '600 34px ' + JP_FONT;
      ctx.fillText(['階段', 'STAIRS'].join(' '), px(STAIR_X), h / 2 + 2);
    },
    1024,
    64,
  );
  const sw = STAIR_X + 0.6 - (X - 0.7);
  const sp = plane(sw, sw / 16, strip);
  sp.position.set(X - 0.7 + sw / 2, 1.86, zf + 0.012);
  root.add(sp);
  // the directory: every floor as a grey bar except the two that matter today, written large enough to read
  const dir = textTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#2d333c';
      ctx.fillRect(0, 0, w, h);
      const rows = ['10F', '9F', '8F', '7F', '6F', '5F', '4F', '3F', '2F', '1F', 'B1', 'B2'];
      const big = { '5F': 'Sales', B2: 'IT Support' };
      let y = 22;
      rows.forEach((f, i) => {
        const rh = big[f] ? 104 : 23;
        const mid = y + rh / 2;
        if (big[f]) {
          ctx.fillStyle = '#eef0f2';
          ctx.textBaseline = 'middle';
          ctx.font = '700 78px sans-serif';
          ctx.fillText(f, 24, mid + 3);
          ctx.font = '600 78px sans-serif';
          ctx.fillText(big[f], 170, mid + 3, w - 190);
        } else {
          ctx.fillStyle = '#58606b';
          ctx.fillRect(24, mid - 6, 70, 12);
          ctx.fillRect(170, mid - 6, 200 + ((i * 53) % 150), 12);
        }
        y += rh;
      });
    },
    640,
    480,
  );
  const board = plane(1.6, 1.2, dir);
  board.position.set(x1 - 0.95, 0.35 + 0.6, zf + 0.012);
  root.add(board);
  // Kuro's lobby light: warm, from over the core
  const light = new THREE.PointLight('#ffd8a8', 2.2, 4.4, 1.6); // short: it never reaches past the lobby's west wall
  light.position.set(X + 1.4, 2.0, zf + 1.6);
  root.add(light);
}

// the lift's landing doors, in the core's front wall (they open with the car's)
export function liftLanding(root) {
  const group = new THREE.Group();
  group.position.set(OUT[0], 0, CZ + 0.1);
  root.add(group);
  group.add(rbox(1.44, 0.1, 0.08, PAL.trim, { y: 1.44, seg: 1 }));
  for (const s of [-1, 1]) group.add(rbox(0.1, 1.44, 0.08, PAL.trim, { x: s * 0.67, seg: 1 }));
  group.add(rbox(1.28, 0.012, 0.24, PAL.metal, { y: 0.003, seg: 1, r: 0.003 }));
  const leaves = [-1, 1].map((s) => {
    const leaf = rbox(0.6, 1.36, 0.045, '#8e949d', {
      x: s * 0.31,
      z: -0.03,
      seg: 1,
    });
    group.add(leaf);
    return leaf;
  });
  group.add(rbox(0.08, 0.16, 0.025, PAL.metal, { x: 0.85, y: 0.6, seg: 1 }));
  const landing = { leaves, k: 0, want: 0 };
  landing.update = (dt) => {
    landing.k += (landing.want - landing.k) * Math.min(1, dt * 5);
    for (let i = 0; i < 2; i++) leaves[i].position.x = (i ? 1 : -1) * (0.31 + 0.6 * landing.k);
  };
  return landing;
}
