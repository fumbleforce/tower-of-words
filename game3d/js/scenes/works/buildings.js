// The old works' buildings (works/plan.js), in the island frame, all outside only, nothing behind their doors:
//   the factory: three storeys of faded green-grey corrugated walls on a concrete base, rows of steel-framed works
//   recessed reflective windows, four saw-tooth roofs with their glazing to the north, rust under the gutters;
//   its gates a pair of teal sliding leaves, chained, a 立入禁止 KEEP OUT plate, 安全第一 SAFETY FIRST over them
//   the power plant: a tall concrete-framed hall, piers between tall windows, a boiler house on the roof, ivy up its
//   south-east corner; its door on the lane a chained steel pair under a concrete hood, はつでんしょ on a plate
//   the chimney: round and tapering on a plinth, banded red and white at the top, a caged ladder up its south side
//   the works shed: pale blue-grey corrugated, a low gable roof, a roller door to the yard, its number on the gable
//   the gatehouse: a pale concrete box under a slab roof, its counter window onto the factory apron, a raised barrier
//   the server hall: low, pale panels with a blue band round the top, louvres, condensers on the roof; its door a
//   glazed pair under a canopy on its east face, サーバーとう SERVER HALL, shut with the 準備中 card (the office row's
//   fittings, office-quarter/row.js)
// The works are disused: after work only the server hall's door and two of its high windows are lit.
import * as THREE from 'three';
import { onFace, faces } from '../outdoor/block-face.js';
import { frontDoor } from '../outdoor/block-style.js';
import { STEEL, rod } from '../outdoor/furniture.js';
import { fittings } from '../office-quarter/row.js';
import * as P from './plan.js';
import { hallFittings } from './yard-details.js';
import { industrialShell, worksWindow, doorReveals, WORKS_METAL } from './industrial-facades.js';
import { plantIvy } from './ivy.js';
import { factoryFacade } from './factory-facade.js';

export const C = {
  base: '#8c8d8c',
  wall: '#8a958c',
  rib: '#7d887f',
  roof: '#727b82',
  frame: '#3b4148',
  pane: '#5d6c78',
  gone: '#2c3036',
  rust: '#9a705c',
  gate: '#4e7c78',
  gateRib: '#436c68',
  concrete: '#b9b6ad',
  pier: '#a8a59d',
  shed: '#8796a0',
  shedRib: '#7a8892',
  kiosk: '#c9c6bd',
  hall: '#c4c3bb',
  band: '#41607e',
  red: '#b5524a',
  white: '#e6e3dc',
  ivy: ['#4f6b45', '#5b7a4e', '#46603f'],
};
const NO = { cast: false };

function* plant(p, plain) {
  const R = P.PLANT,
    [x0, x1, z0, z1] = R,
    H = 8.4,
    F = faces(R);
  const holes = { s: [], w: [], e: [] };
  for (const [side, f] of Object.entries(F)) {
    if (side === 'n') continue;
    const n = Math.round(f.L / 2.2),
      bw = f.L / n;
    for (let i = 0; i < n; i++) {
      const a = i * bw + 0.45,
        b = (i + 1) * bw - 0.45;
      const door = side === 'e' && Math.abs((a + b) / 2 - (z1 - P.PLANT_DOOR.z)) < bw / 2;
      holes[side].push([a, b, door ? 3.6 : 1.6, 7.4]);
    }
  }
  const doorT = z1 - P.PLANT_DOOR.z,
    doorW = P.PLANT_DOOR.w;
  holes.e.push([doorT - doorW / 2, doorT + doorW / 2, 0.12, 2.4]);
  industrialShell(p, R, H, holes, { wall: C.concrete });
  p.box(C.pier, x1 - x0 + 0.3, 0.5, z1 - z0 + 0.3, (x0 + x1) / 2, H, (z0 + z1) / 2, { surf: 'concrete' });
  // the boiler house on the roof
  p.box(C.concrete, (x1 - x0) * 0.45, 2.6, (z1 - z0) * 0.5, x0 + (x1 - x0) * 0.35, H + 0.5, z0 + (z1 - z0) * 0.4, {
    surf: 'concrete',
  });
  for (const [id, f] of Object.entries(F)) {
    if (id === 'n') continue; // its back, never seen
    const n = Math.round(f.L / 2.2),
      bw = f.L / n;
    for (let i = 0; i <= n; i++) {
      const a = i * bw - 0.2,
        b = i * bw + 0.2;
      const left = doorT - doorW / 2 - 0.04,
        right = doorT + doorW / 2 + 0.04;
      // The inset door exposes the old pier. Carry it over the lintel, never across the door leaves.
      const parts =
        id === 'e' && b > left && a < right
          ? [[a, b, 2.42, H], ...(a < left ? [[a, left, 0, 2.42]] : []), ...(b > right ? [[right, b, 0, 2.42]] : [])]
          : [[a, b, 0, H]];
      for (const [from, to, low, high] of parts)
        onFace(p, C.pier, f, from, to, low, high, 0, 0.14, { surf: 'concrete' });
    }
    for (let i = 0; i < n; i++) {
      const [a, b] = [i * bw + 0.45, (i + 1) * bw - 0.45];
      if (id === 'e' && Math.abs((a + b) / 2 - (z1 - P.PLANT_DOOR.z)) < bw / 2) {
        worksWindow(p, f, a, b, 3.6, 7.4, i + 11);
        continue;
      }
      worksWindow(p, f, a, b, 1.6, 7.4, i + (id === 'n' ? 3 : 9));
    }
  }
  yield;
  // the door on the lane: a steel pair under a concrete hood, chained; the name plate; a dark lamp over it
  const f = F.e,
    t = z1 - P.PLANT_DOOR.z,
    w = P.PLANT_DOOR.w;
  doorReveals(p, f, t - w / 2, t + w / 2, 0.12, 2.4);
  onFace(p, '#a1afb6', f, t - w / 2, t + w / 2, 0.12, 2.4, -0.2, -0.12, {
    surf: 'metal',
    opts: { finish: 'painted', roughness: 0.46 },
  });
  onFace(p, C.frame, f, t - 0.02, t + 0.02, 0.12, 2.4, -0.12, -0.09, NO);
  onFace(p, C.pier, f, t - w / 2 - 0.5, t + w / 2 + 0.5, 2.6, 2.8, 0, 0.9, {
    surf: 'concrete',
  }); // the hood
  for (let k = -2; k <= 2; k++)
    onFace(
      p,
      '#bac3c5',
      f,
      t - 0.25 + k * 0.1,
      t - 0.17 + k * 0.1,
      1.15 - Math.abs(k) * 0.05,
      1.21 - Math.abs(k) * 0.05,
      -0.11,
      -0.08,
      NO,
    );
  p.box('#b8a24a', 0.08, 0.16, 0.14, x1 - 0.05, 0.98, P.PLANT_DOOR.z, NO);
  onFace(p, C.base, f, t - w / 2 - 0.3, t + w / 2 + 0.3, 0, 0.12, 0, 0.7, {
    surf: 'concrete',
  }); // the step
  plain.board('はつでんしょ', 'No.1 POWER PLANT', '#5a5f66', 1.5, 0.48, [x1 + 0.16, 3.15, P.PLANT_DOOR.z], Math.PI / 2);
  plantIvy(p, x1, z1, C.ivy);
  yield;
}

function chimney(p) {
  const { x, z, r, top, h, plinth } = P.CHIMNEY;
  p.box(C.base, plinth, 1.2, plinth, x, 0, z, { surf: 'concrete' });
  const at = (y) => r + (top - r) * (y / h); // the radius at a height
  const seg = (y0, y1, color) =>
    p.geo(
      color,
      new THREE.CylinderGeometry(at(y1), at(y0), y1 - y0, 16, 1, true).translate(x, 1.2 + (y0 + y1) / 2, z),
      { surf: 'concrete' },
    );
  seg(0, h - 6, C.concrete);
  for (let k = 0; k < 6; k++) seg(h - 6 + k, h - 5 + k, k % 2 ? C.white : C.red);
  p.geo('#2c3036', new THREE.CylinderGeometry(top + 0.06, top + 0.06, 0.25, 16).translate(x, 1.2 + h, z));
  // the caged ladder up its south side, to the first platform ring
  const lz = (y) => z + at(y) + 0.18;
  for (const s of [-0.22, 0.22]) rod(p, STEEL.dark, [x + s, 1.2, lz(0)], [x + s, 1.2 + 12, lz(12)], 0.025);
  for (let y = 2.4; y < 12; y += 1.1)
    p.geo(
      STEEL.dark,
      new THREE.TorusGeometry(0.42, 0.025, 4, 10, Math.PI).rotateX(Math.PI / 2).translate(x, 1.2 + y, lz(y)),
      NO,
    );
  p.geo(
    STEEL.dark,
    new THREE.TorusGeometry(at(12) + 0.3, 0.05, 4, 20).rotateX(Math.PI / 2).translate(x, 1.2 + 12, z),
    NO,
  );
}

function* shed(p, plain) {
  const R = P.SHED,
    [x0, x1, z0, z1] = R,
    H = 4.0,
    RISE = 0.9,
    F = faces(R),
    cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  p.box(C.base, x1 - x0 + 0.1, 0.3, z1 - z0 + 0.1, cx, 0, cz, {
    surf: 'concrete',
  });
  industrialShell(
    p,
    R,
    H,
    {
      s: [
        [1.85, 4.95, 0.3, 3.15],
        [6.4, 7.3, 0.3, 2.3],
        [7.6, 8.4, 1.4, 2.4],
      ],
    },
    {
      wall: C.shed,
      surf: 'metal',
      bottom: 0.3,
      rib: C.shedRib,
      ribSides: ['s', 'w', 'e'],
    },
  );
  const half = (z1 - z0) / 2 + 0.3,
    a = Math.atan2(RISE, half);
  for (const s of [-1, 1])
    p.geo(
      C.roof,
      new THREE.BoxGeometry(x1 - x0 + 0.4, 0.1, Math.hypot(half, RISE))
        .rotateX(s * a)
        .translate(cx, H + RISE / 2, cz + (s * half) / 2),
      { surf: 'metal' },
    );
  for (const x of [x0 - 0.01, x1 + 0.01]) {
    const sh = new THREE.Shape();
    sh.moveTo(-(z1 - z0) / 2, 0);
    sh.lineTo((z1 - z0) / 2, 0);
    sh.lineTo(0, RISE);
    sh.closePath();
    for (const ry of [Math.PI / 2, -Math.PI / 2])
      p.geo(C.shed, new THREE.ShapeGeometry(sh).rotateY(ry).translate(x, H, cz), NO);
  }
  // the inset roller door, personnel door and window; the shed's number on its east gable
  const f = F.s,
    dt = 3.4;
  doorReveals(p, f, dt - 1.55, dt + 1.55, 0.3, 3.15);
  onFace(p, '#7e8790', f, dt - 1.55, dt + 1.55, 0.3, 3.15, -0.2, -0.12, WORKS_METAL);
  for (let y = 0.45; y < 3.1; y += 0.18)
    onFace(p, '#6f7780', f, dt - 1.55, dt + 1.55, y, y + 0.025, -0.12, -0.1, {
      ...WORKS_METAL,
      cast: false,
    });
  onFace(p, C.frame, f, dt - 1.85, dt + 1.85, 3.3, 3.6, 0, 0.3);
  onFace(p, '#9aa3a2', f, dt - 0.18, dt + 0.18, 1.1, 1.17, -0.125, -0.075, WORKS_METAL);
  doorReveals(p, f, 6.4, 7.3, 0.3, 2.3);
  onFace(p, '#5b616b', f, 6.4, 7.3, 0.3, 2.3, -0.2, -0.12, WORKS_METAL);
  onFace(p, '#abb4b7', f, 7.02, 7.16, 1.23, 1.27, -0.12, -0.04, { ...WORKS_METAL, cast: false });
  worksWindow(p, f, 7.6, 8.4, 1.4, 2.4, 4);
  plain.board('２', 'No.2', '#3e4a52', 0.7, 0.7, [x1 + 0.04, H - 0.9, cz], Math.PI / 2);
  yield;
}

function kiosk(p, plain) {
  const R = P.KIOSK,
    [x0, x1, z0, z1] = R,
    H = 2.8,
    F = faces(R);
  const wt = P.KIOSK_WINDOW.z - z0,
    ww = P.KIOSK_WINDOW.w;
  industrialShell(
    p,
    R,
    H,
    {
      w: [[wt - ww / 2, wt + ww / 2, 1, 2.05]],
      s: [
        [0.8, 1.7, 0, 2.05],
        [2.65, 4.35, 1.05, 1.95],
      ],
    },
    { wall: C.kiosk },
  );
  p.box('#a9a69e', x1 - x0 + 0.6, 0.2, z1 - z0 + 0.6, (x0 + x1) / 2, H, (z0 + z1) / 2, { surf: 'concrete' });
  // the counter window onto the apron: dark glass, a sliding pane, a shelf under it, the plate
  const f = F.w,
    t = P.KIOSK_WINDOW.z - z0,
    w = P.KIOSK_WINDOW.w;
  worksWindow(p, f, t - w / 2, t + w / 2, 1, 2.05, 2);
  onFace(p, '#a9a69e', f, t - w / 2 - 0.1, t + w / 2 + 0.1, 0.9, 0.98, 0, 0.35);
  plain.board('うけつけ', 'RECEPTION', '#5a5f66', 1.2, 0.36, [x0 - 0.03, 2.35, P.KIOSK_WINDOW.z], -Math.PI / 2);
  // a door and a window on the yard
  doorReveals(p, F.s, 0.8, 1.7, 0, 2.05);
  onFace(p, '#5b616b', F.s, 0.8, 1.7, 0, 2.05, -0.2, -0.12, WORKS_METAL);
  onFace(p, '#abb4b7', F.s, 1.42, 1.56, 1, 1.04, -0.12, -0.04, { ...WORKS_METAL, cast: false });
  worksWindow(p, F.s, 2.65, 4.35, 1.05, 1.95, 3);
  // the barrier at the apron's mouth, raised: its post and the arm up, red and white
  const bx = x0 + 0.2,
    bz = P.GATE[3] - 0.4;
  p.box('#d9d6cf', 0.35, 1.0, 0.35, bx, 0, bz);
  for (let k = 0; k < 6; k++)
    p.geo(
      k % 2 ? C.white : C.red,
      new THREE.BoxGeometry(0.1, 0.62, 0.1)
        .translate(0, 0.31 + k * 0.62, 0)
        .rotateZ(0.22)
        .translate(bx, 0.95, bz),
      NO,
    );
}

function* hall(p, sets, signs, lights) {
  const R = P.HALL,
    [x0, x1, z0, z1] = R,
    H = 3.2,
    F = faces(R);
  p.box(C.hall, x1 - x0 - 0.15, H, z1 - z0, (x0 + x1) / 2 - 0.075, 0, (z0 + z1) / 2, { surf: 'concrete' });
  p.box(C.band, x1 - x0 + 0.06, 0.4, z1 - z0 + 0.06, (x0 + x1) / 2, H - 0.4, (z0 + z1) / 2);
  p.box('#a9aaa5', x1 - x0 + 0.1, 0.22, z1 - z0 + 0.1, (x0 + x1) / 2, H, (z0 + z1) / 2);
  for (const id of ['n', 's', 'w'])
    for (let t = 1.2; t < F[id].L; t += 1.2) onFace(p, '#b3b2aa', F[id], t - 0.02, t + 0.02, 0.1, H - 0.4, 0, 0.02, NO);
  // louvres on the north face, two high windows (lit after work: some racks still run)
  for (const t of [1.5, 4.0, 6.5]) {
    onFace(p, C.frame, F.n, t - 0.6, t + 0.6, 0.6, 1.8, 0, 0.04, NO);
    for (let y = 0.7; y < 1.75; y += 0.15) onFace(p, '#6d747c', F.n, t - 0.55, t + 0.55, y, y + 0.05, 0.04, 0.08, NO);
  }
  for (const t of [8.6, 9.8]) {
    onFace(p, C.frame, F.n, t - 0.4, t + 0.4, 2.0, 2.6, 0, 0.03, NO);
    onFace(sets.lit, '#b9d3e3', F.n, t - 0.34, t + 0.34, 2.05, 2.55, 0.03, 0.04, NO);
    onFace(p, '#3f4b55', F.n, t - 0.34, t + 0.34, 2.05, 2.55, 0.025, 0.03, NO);
  }
  hallFittings(p);
  // condensers and a duct on the roof
  for (let k = 0; k < 3; k++) {
    const x = x0 + 2.2 + k * 2.6;
    p.box('#c6c9c7', 1.6, 0.9, 1.0, x, H + 0.22, z0 + 1.4);
    p.geo('#6f747b', new THREE.CylinderGeometry(0.36, 0.36, 0.04, 12).translate(x, H + 1.14, z0 + 1.4), NO);
  }
  // the east face: wall either side of the door, the glazed pair, its canopy, name and card
  const f = F.e,
    t = z1 - P.HALL_DOOR.z,
    w = P.HALL_DOOR.w;
  for (const [a, b] of [
    [-0.02, t - w / 2 - 0.06],
    [t + w / 2 + 0.06, f.L + 0.02],
  ])
    onFace(p, C.hall, f, a, b, 0, H - 0.4, -0.15, 0, { surf: 'concrete' });
  onFace(p, C.hall, f, t - w / 2 - 0.06, t + w / 2 + 0.06, 2.12, H - 0.4, -0.15, 0);
  onFace(p, '#3a4048', f, t - w / 2, t + w / 2, 0, 2.12, -0.16, -0.12);
  const canopy = frontDoor(sets, f, { t, w, canopy: { out: 1.2, side: 0.5 } });
  fittings(
    p,
    signs,
    lights,
    { sign: ['サーバーとう', 'SERVER HALL', '#2f5568'], place: 'server_hall' },
    { f, t, canopy },
  );
  yield;
}

// p: a Parts collector (casting); sets: outdoor/block.js blockSets() (the hall's door glass and lit windows);
// signs: the lit signSet (the hall's name); plain: an unlit signSet (the works' faded plates and boards);
// lights: a lightSet; only: which of them (the harbour builds the ones it sees up the works lane, scenes/harbour.js)
export const BUILDING_IDS = ['factory', 'plant', 'chimney', 'shed', 'kiosk', 'hall'];
export function* buildingsSteps(p, sets, signs, plain, lights, only = BUILDING_IDS) {
  if (only.includes('factory')) yield* factoryFacade(p, plain, C);
  if (only.includes('plant')) yield* plant(p, plain);
  if (only.includes('chimney')) chimney(p);
  if (only.includes('shed')) yield* shed(p, plain);
  if (only.includes('kiosk')) kiosk(p, plain);
  if (only.includes('hall')) yield* hall(p, sets, signs, lights);
}
