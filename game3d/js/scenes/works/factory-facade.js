import * as THREE from 'three';
import { faces, onFace } from '../outdoor/block-face.js';
import { rod, STEEL } from '../outdoor/furniture.js';
import * as P from './plan.js';
import { industrialShell, worksWindow, doorReveals, wallRust, WORKS_METAL } from './industrial-facades.js';

const NO = { cast: false };
export function factoryOpenings() {
  const [x0] = P.FACTORY,
    F = faces(P.FACTORY),
    gt = P.GATES.x - x0,
    gw = P.GATES.w;
  const holes = {
    s: [[gt - gw / 2, gt + gw / 2, 0.12, P.GATES.h]],
    w: [],
    e: [],
  };
  for (let t = 1.2; t + 2.2 < F.s.L - 0.6; t += 3) {
    if (!(t + 2.2 > gt - gw / 2 - 0.6 && t < gt + gw / 2 + 0.6)) holes.s.push([t, t + 2.2, 1.7, 3.3]);
    // The original upper grid ran through the sliding-door track and safety sign.
    // A solid wall head spans that existing mechanism; upper lights stay in the outer bays.
    if (t + 2.2 < gt - gw - 0.45 || t > gt + gw + 0.45) holes.s.push([t, t + 2.2, 4, 5.6]);
  }
  for (const side of ['w', 'e'])
    for (let t = 1; t + 2.2 < F[side].L - 0.6; t += 3.2) holes[side].push([t, t + 2.2, 4, 5.6]);
  return holes;
}

function northLights(p, C, R, H) {
  const [x0, x1, z0, z1] = R,
    D = (z1 - z0) / 4,
    rise = 1.9,
    angle = Math.atan2(rise, D);
  for (let k = 0; k < 4; k++) {
    const z = z0 + k * D;
    p.geo(
      C.roof,
      new THREE.BoxGeometry(x1 - x0 + 0.3, 0.1, Math.hypot(D, rise))
        .rotateX(angle)
        .translate((x0 + x1) / 2, H + rise / 2, z + D / 2),
      WORKS_METAL,
    );
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(-D, 0);
    shape.lineTo(0, rise);
    shape.closePath();
    for (const x of [x0 - 0.15, x1 + 0.07])
      p.geo(
        C.roof,
        new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false }).rotateY(Math.PI / 2).translate(x, H, z),
        WORKS_METAL,
      );
    const f = { a: [x1, z], d: [-1, 0], n: [0, -1], L: x1 - x0 };
    onFace(p, '#718084', f, 0, f.L, H, H + 0.2, -0.22, 0.015, WORKS_METAL);
    onFace(p, '#718084', f, 0, f.L, H + rise - 0.2, H + rise, -0.22, 0.015, WORKS_METAL);
    for (const [a, b] of [
      [0, 0.3],
      [f.L - 0.3, f.L],
    ])
      onFace(p, '#718084', f, a, b, H + 0.2, H + rise - 0.2, -0.22, 0.015, WORKS_METAL);
    worksWindow(p, f, 0.3, f.L - 0.3, H + 0.2, H + rise - 0.2, k);
  }
}

export function* factoryFacade(p, plain, C) {
  const R = P.FACTORY,
    [x0, x1, z0, z1] = R,
    H = 6.4,
    F = faces(R);
  const holes = factoryOpenings(),
    gt = P.GATES.x - x0,
    gw = P.GATES.w;
  p.box(C.base, x1 - x0 + 0.1, 0.12, z1 - z0 + 0.1, (x0 + x1) / 2, 0, (z0 + z1) / 2, { surf: 'concrete' });
  industrialShell(p, R, H, holes, {
    wall: C.wall,
    surf: 'metal',
    baseColor: C.base,
    baseHeight: 1,
    rib: C.rib,
    ribSides: ['s', 'w', 'e'],
    bottom: 0.12,
  });
  onFace(p, C.frame, F.s, -0.05, F.s.L + 0.05, H - 0.2, H, 0, 0.12, WORKS_METAL);
  northLights(p, C, R, H);
  yield;
  for (const [side, list] of Object.entries(holes))
    for (const [a, b, y0, y1] of list) if (y0 > 1) worksWindow(p, F[side], a, b, y0, y1, Math.round(a + y0));
  // Oxide stays on the wall strip under the gutter, clear of the real upper glazing.
  for (let t = 1.2; t + 2.2 < F.s.L - 0.6; t += 3) if (Math.round(t) % 2) wallRust(p, F.s, t + 1.1, H - 0.2, 0.45);
  for (const t of [0.5, F.s.L - 0.5]) onFace(p, C.frame, F.s, t - 0.07, t + 0.07, 0, H, 0.04, 0.16, WORKS_METAL);
  yield;
  // the gates: two sliding leaves under a track, ribbed, chained at the meeting stiles
  const f = F.s;
  doorReveals(p, f, gt - gw / 2, gt + gw / 2, 0.12, P.GATES.h);
  for (const s of [-1, 1]) {
    const [a, b] = s < 0 ? [gt - gw / 2, gt - 0.02] : [gt + 0.02, gt + gw / 2];
    onFace(p, C.gate, f, a, b, 0.12, P.GATES.h, 0.05, 0.12, WORKS_METAL);
    for (let y = 0.4; y < P.GATES.h; y += 0.5) onFace(p, C.gateRib, f, a + 0.05, b - 0.05, y, y + 0.06, 0.12, 0.15, NO);
  }
  // The meeting stiles overlap behind the narrow visible seam, so the closed doors have no slit through them.
  onFace(p, C.gateRib, f, gt - 0.055, gt + 0.055, 0.12, P.GATES.h, 0.01, 0.05, WORKS_METAL);
  onFace(p, STEEL.dark, f, gt - gw - 0.3, gt + gw + 0.3, P.GATES.h + 0.15, P.GATES.h + 0.35, 0.02, 0.2); // the track
  // Hangers reach the existing overhead track; leaves remain closed across the old gate opening.
  for (const dx of [-gw * 0.36, -gw * 0.12, gw * 0.12, gw * 0.36]) {
    p.box('#879296', 0.075, 0.24, 0.08, P.GATES.x + dx, P.GATES.h - 0.06, z1 + 0.13, WORKS_METAL);
    p.geo(
      '#a3abaa',
      new THREE.CylinderGeometry(0.065, 0.065, 0.08, 8)
        .rotateX(Math.PI / 2)
        .translate(P.GATES.x + dx, P.GATES.h + 0.22, z1 + 0.16),
      { ...WORKS_METAL, cast: false },
    );
  }
  for (let k = -3; k <= 3; k++)
    onFace(p, '#2b2e33', f, gt - 0.07 + k * 0.001, gt + 0.07, 1.05 + k * 0.09, 1.11 + k * 0.09, 0.15, 0.2, NO);
  for (const s of [-1, 1])
    rod(p, '#2b2e33', [P.GATES.x + s * 0.5, 1.05, z1 + 0.18], [P.GATES.x, 0.75, z1 + 0.19], 0.025);
  p.box('#b8a24a', 0.14, 0.18, 0.08, P.GATES.x, 0.6, z1 + 0.2, NO); // the padlock
  plain.card('立入禁止', 'KEEP OUT', 0.62, 0.4, [P.GATES.x - gw / 4, 1.55, z1 + 0.13], 0);
  plain.board('安全第一', 'SAFETY FIRST', '#3d6a4e', 3.4, 0.9, [P.GATES.x, P.GATES.h + 1.05, z1 + 0.06], 0);
  yield;
}
