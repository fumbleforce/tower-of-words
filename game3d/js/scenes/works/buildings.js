// The old works' buildings (works/plan.js), in the island frame, all outside only, nothing behind their doors:
//   the factory: three storeys of faded green-grey corrugated walls on a concrete base, rows of steel-framed works
//   windows with a few panes gone dark, four saw-tooth roofs with their glazing to the north, rust under the gutters;
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

// steel works windows on a face: a dark frame, panes in a grid, a few dark (broken or open)
function worksWindow(p, f, t0, t1, y0, y1, seed) {
  onFace(p, C.frame, f, t0 - 0.06, t1 + 0.06, y0 - 0.06, y1 + 0.06, -0.02, 0.03, NO);
  const nx = Math.max(2, Math.round((t1 - t0) / 0.6)),
    ny = Math.max(2, Math.round((y1 - y0) / 0.55));
  const pw = (t1 - t0) / nx,
    ph = (y1 - y0) / ny;
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) {
      const dark = (i * 7 + j * 13 + seed * 5) % 17 < 2;
      onFace(
        p,
        dark ? C.gone : C.pane,
        f,
        t0 + i * pw + 0.03,
        t0 + (i + 1) * pw - 0.03,
        y0 + j * ph + 0.03,
        y0 + (j + 1) * ph - 0.03,
        0.03,
        0.04,
        NO,
      );
    }
}
// rust running down from a point on a face
const rust = (p, f, t, y, len) => onFace(p, C.rust, f, t - 0.05, t + 0.05, y - len, y, 0.03, 0.045, NO);

// corrugated walls: the body, ribs every 0.5 on the faces asked for
function ribbed(p, rect, h, wall, rib, sides, y = 0) {
  const [x0, x1, z0, z1] = rect;
  p.box(wall, x1 - x0, h, z1 - z0, (x0 + x1) / 2, y, (z0 + z1) / 2, { surf: 'metal' });
  const F = faces(rect);
  for (const s of sides)
    for (let t = 0.25; t < F[s].L; t += 0.5)
      onFace(p, rib, F[s], t - 0.04, t + 0.04, y + 0.05, y + h - 0.05, 0, 0.04, NO);
}

function* factory(p, plain) {
  const R = P.FACTORY,
    [x0, x1, z0, z1] = R,
    H = 6.4,
    F = faces(R);
  p.box(C.base, x1 - x0 + 0.1, 1.0, z1 - z0 + 0.1, (x0 + x1) / 2, 0, (z0 + z1) / 2, { surf: 'concrete' });
  ribbed(p, R, H - 1.0, C.wall, C.rib, ['s', 'w', 'e'], 1.0);
  onFace(p, C.frame, F.s, -0.05, F.s.L + 0.05, H - 0.2, H, 0, 0.12); // the gutter's line
  // the saw-tooth roofs: teeth across the depth, each a vertical glazed face to the north and a slope down south
  const n = 4,
    D = (z1 - z0) / n,
    TH = 1.9;
  for (let k = 0; k < n; k++) {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.lineTo(-D, 0);
    sh.lineTo(0, TH);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0 + 0.3, bevelEnabled: false })
      .rotateY(Math.PI / 2)
      .translate(x0 - 0.15, H, z0 + k * D);
    p.geo(C.roof, g, { surf: 'metal' });
    p.box(C.pane, x1 - x0 - 0.6, TH - 0.4, 0.05, (x0 + x1) / 2, H + 0.2, z0 + k * D - 0.03, NO);
    // the mullions stand 5 mm over the glass's top edge
    for (let x = x0 + 0.6; x < x1 - 0.4; x += 1.2)
      p.box(C.frame, 0.06, TH - 0.395, 0.07, x, H + 0.2, z0 + k * D - 0.04, NO);
  }
  yield;
  // the south face: two rows of works windows either side of the gates, rust under the gutter, downpipes
  const gt = P.GATES.x - x0,
    gw = P.GATES.w;
  for (let t = 1.2; t + 2.2 < F.s.L - 0.6; t += 3.0) {
    const inGate = t + 2.2 > gt - gw / 2 - 0.6 && t < gt + gw / 2 + 0.6;
    if (!inGate) worksWindow(p, F.s, t, t + 2.2, 1.7, 3.3, Math.round(t));
    worksWindow(p, F.s, t, t + 2.2, 4.0, 5.6, Math.round(t) + 3);
    if (Math.round(t) % 2) rust(p, F.s, t + 1.1, H - 0.2, 1.4 + (t % 3) * 0.4);
  }
  for (const t of [0.5, F.s.L - 0.5]) onFace(p, C.frame, F.s, t - 0.07, t + 0.07, 0, H, 0.04, 0.16);
  for (const f of [F.w, F.e])
    for (let t = 1.0; t + 2.2 < f.L - 0.6; t += 3.2) worksWindow(p, f, t, t + 2.2, 4.0, 5.6, Math.round(t) + 7);
  yield;
  // the gates: two sliding leaves under a track, ribbed, chained at the meeting stiles
  const f = F.s;
  onFace(p, C.frame, f, gt - gw / 2 - 0.15, gt + gw / 2 + 0.15, 0, P.GATES.h + 0.15, -0.02, 0.05);
  for (const s of [-1, 1]) {
    const [a, b] = s < 0 ? [gt - gw / 2, gt - 0.02] : [gt + 0.02, gt + gw / 2];
    onFace(p, C.gate, f, a, b, 0.05, P.GATES.h, 0.05, 0.12, { surf: 'metal' });
    for (let y = 0.4; y < P.GATES.h; y += 0.5) onFace(p, C.gateRib, f, a + 0.05, b - 0.05, y, y + 0.06, 0.12, 0.15, NO);
    rust(p, f, (a + b) / 2 + s * 0.6, 1.2, 1.0);
  }
  onFace(p, STEEL.dark, f, gt - gw - 0.3, gt + gw + 0.3, P.GATES.h + 0.15, P.GATES.h + 0.35, 0.02, 0.2); // the track
  for (let k = -3; k <= 3; k++)
    onFace(p, '#2b2e33', f, gt - 0.07 + k * 0.001, gt + 0.07, 1.05 + k * 0.09, 1.11 + k * 0.09, 0.15, 0.2, NO);
  for (const s of [-1, 1])
    rod(p, '#2b2e33', [P.GATES.x + s * 0.5, 1.05, z1 + 0.18], [P.GATES.x, 0.75, z1 + 0.19], 0.025);
  p.box('#b8a24a', 0.14, 0.18, 0.08, P.GATES.x, 0.6, z1 + 0.2, NO); // the padlock
  plain.card('立入禁止', 'KEEP OUT', 0.62, 0.4, [P.GATES.x - gw / 4, 1.55, z1 + 0.13], 0);
  plain.board('安全第一', 'SAFETY FIRST', '#3d6a4e', 3.4, 0.9, [P.GATES.x, P.GATES.h + 1.05, z1 + 0.06], 0);
  yield;
}

function* plant(p, plain) {
  const R = P.PLANT,
    [x0, x1, z0, z1] = R,
    H = 8.4,
    F = faces(R);
  p.box(C.concrete, x1 - x0, H, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, { surf: 'concrete' });
  p.box(C.pier, x1 - x0 + 0.3, 0.5, z1 - z0 + 0.3, (x0 + x1) / 2, H, (z0 + z1) / 2, { surf: 'concrete' });
  // the boiler house on the roof
  p.box(C.concrete, (x1 - x0) * 0.45, 2.6, (z1 - z0) * 0.5, x0 + (x1 - x0) * 0.35, H + 0.5, z0 + (z1 - z0) * 0.4, {
    surf: 'concrete',
  });
  for (const [id, f] of Object.entries(F)) {
    if (id === 'n') continue; // its back, never seen
    const n = Math.round(f.L / 2.2),
      bw = f.L / n;
    for (let i = 0; i <= n; i++) onFace(p, C.pier, f, i * bw - 0.2, i * bw + 0.2, 0, H, 0, 0.14, { surf: 'concrete' });
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
  onFace(p, C.frame, f, t - w / 2 - 0.12, t + w / 2 + 0.12, 0, 2.5, 0.0, 0.18);
  onFace(p, '#5d6871', f, t - w / 2, t + w / 2, 0, 2.4, 0.18, 0.22, { surf: 'metal' });
  onFace(p, C.frame, f, t - 0.02, t + 0.02, 0, 2.4, 0.22, 0.24, NO);
  onFace(p, C.pier, f, t - w / 2 - 0.5, t + w / 2 + 0.5, 2.6, 2.8, 0, 0.9, { surf: 'concrete' }); // the hood
  for (let k = -2; k <= 2; k++)
    onFace(
      p,
      '#2b2e33',
      f,
      t - 0.25 + k * 0.1,
      t - 0.17 + k * 0.1,
      1.15 - Math.abs(k) * 0.05,
      1.21 - Math.abs(k) * 0.05,
      0.24,
      0.27,
      NO,
    );
  p.box('#b8a24a', 0.08, 0.16, 0.14, x1 + 0.3, 0.98, P.PLANT_DOOR.z, NO);
  onFace(p, C.base, f, t - w / 2 - 0.3, t + w / 2 + 0.3, 0, 0.12, 0, 0.7, { surf: 'concrete' }); // the step
  plain.board(
    'はつでんしょ',
    'No.1 POWER PLANT',
    '#5a5f66',
    1.5,
    0.48,
    [x1 + 0.06, 1.75, P.PLANT_DOOR.z + w / 2 + 1.0],
    Math.PI / 2,
  );
  // ivy up the south-east corner
  for (let k = 0; k < 26; k++) {
    const u = (k * 0.37) % 1.8,
      y = ((k * 0.61) % 1) * (2.6 + u * 1.6);
    p.box(C.ivy[k % 3], 0.5, 0.55, 0.12, x1 - 0.2 - u, y, z1 + 0.08, NO);
    if (k % 2) p.box(C.ivy[(k + 1) % 3], 0.12, 0.5, 0.5, x1 + 0.08, y * 0.9, z1 - 0.3 - u * 0.8, NO);
  }
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
  p.box(C.base, x1 - x0 + 0.1, 0.3, z1 - z0 + 0.1, cx, 0, cz, { surf: 'concrete' });
  ribbed(p, R, H - 0.3, C.shed, C.shedRib, ['s', 'w', 'e'], 0.3);
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
  // the roller door, a personnel door, a window; rust; the shed's number on its east gable
  const f = F.s,
    dt = 3.4;
  onFace(p, C.frame, f, dt - 1.7, dt + 1.7, 0, 3.3, 0, 0.05, NO);
  onFace(p, '#7e8790', f, dt - 1.55, dt + 1.55, 0.05, 3.15, 0.05, 0.08, { surf: 'metal' });
  for (let y = 0.25; y < 3.1; y += 0.18) onFace(p, '#6f7780', f, dt - 1.55, dt + 1.55, y, y + 0.025, 0.08, 0.1, NO);
  onFace(p, C.frame, f, dt - 1.85, dt + 1.85, 3.3, 3.6, 0, 0.3);
  rust(p, f, dt - 0.8, 1.6, 1.2);
  rust(p, f, dt + 1.0, 1.4, 0.9);
  onFace(p, '#5b616b', f, 6.4, 7.3, 0.3, 2.3, 0.04, 0.08, { surf: 'metal' });
  worksWindow(p, f, 7.6, 8.4, 1.4, 2.4, 4);
  plain.board('２', 'No.2', '#3e4a52', 0.7, 0.7, [x1 + 0.04, H - 0.9, cz], Math.PI / 2);
  yield;
}

function kiosk(p, plain) {
  const R = P.KIOSK,
    [x0, x1, z0, z1] = R,
    H = 2.8,
    F = faces(R);
  p.box(C.kiosk, x1 - x0, H, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, { surf: 'concrete' });
  p.box('#a9a69e', x1 - x0 + 0.6, 0.2, z1 - z0 + 0.6, (x0 + x1) / 2, H, (z0 + z1) / 2, { surf: 'concrete' });
  // the counter window onto the apron: dark glass, a sliding pane, a shelf under it, the plate
  const f = F.w,
    t = P.KIOSK_WINDOW.z - z0,
    w = P.KIOSK_WINDOW.w;
  onFace(p, C.frame, f, t - w / 2 - 0.08, t + w / 2 + 0.08, 0.95, 2.1, 0, 0.04);
  onFace(p, '#47525c', f, t - w / 2, t + w / 2, 1.0, 2.05, 0.04, 0.05, NO);
  onFace(p, '#6b7781', f, t - w / 2 + 0.05, t + 0.02, 1.02, 2.03, 0.05, 0.07, NO);
  onFace(p, '#a9a69e', f, t - w / 2 - 0.1, t + w / 2 + 0.1, 0.9, 0.98, 0, 0.35);
  plain.board('うけつけ', 'RECEPTION', '#5a5f66', 1.2, 0.36, [x0 - 0.03, 2.35, P.KIOSK_WINDOW.z], -Math.PI / 2);
  // a door and a window on the yard
  onFace(p, '#5b616b', F.s, 0.8, 1.7, 0, 2.05, 0.02, 0.06, { surf: 'metal' });
  onFace(p, C.frame, F.s, 2.6, 4.4, 1.0, 2.0, 0, 0.04);
  onFace(p, '#47525c', F.s, 2.65, 4.35, 1.05, 1.95, 0.04, 0.05, NO);
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
  if (only.includes('factory')) yield* factory(p, plain);
  if (only.includes('plant')) yield* plant(p, plain);
  if (only.includes('chimney')) chimney(p);
  if (only.includes('shed')) yield* shed(p, plain);
  if (only.includes('kiosk')) kiosk(p, plain);
  if (only.includes('hall')) yield* hall(p, sets, signs, lights);
}
