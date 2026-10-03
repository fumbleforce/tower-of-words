// Eric's desk (docs/game/places.md, Eric's dorm room): a grey steel desk against the back wall, left of the window,
// with the company PC on it, set up and switched on before he arrived (the monitor showing a plain desktop, the
// keyboard, the mouse on its pad, a small tower in the corner with his headphones hung over it), the arm lamp, a mug
// and a welcome note on the screen; the desk chair in front of it, a seat facing the screen. The computer's parts go
// into their own group (its outline); the rest into the room's kit. The shared monitor and chair props are baked into
// the kits by colour, onto colours the room already has, so the whole setup costs a few draw calls.
import * as THREE from 'three';
import { monitor, officeChair, PAL } from '../../props.js';
import { screenMat } from '../../places/life.js';
import { X0, BACK } from './layout.js';

const STEEL = '#848a93',
  TOP = '#a4a8ae',
  DARK = PAL.monitor, // the computer's cases
  BLACK = '#2f343c', // the lamp, the chair's frame, the headphones
  KEYS = '#545b66',
  CUSHION = '#6f7785', // the coat's grey-blue
  LED = { emissive: '#6fd0c6', emissiveIntensity: 1.4 };

// a prop group's meshes into a kit, each by its material's colour (remapped where given); a mesh with a map (a lit
// screen) stays a mesh of its own, moved into keep
function bake(group, kit, keep, { remap = {}, surf = {} } = {}) {
  group.updateMatrixWorld(true);
  const meshes = [];
  group.traverse((o) => o.isMesh && meshes.push(o));
  for (const o of meshes) {
    if (o.material.map) {
      o.matrixWorld.decompose(o.position, o.quaternion, o.scale);
      keep.add(o);
      continue;
    }
    const hex = '#' + o.material.color.getHexString(),
      color = remap[hex] || hex,
      glow = o.material.emissive && o.material.emissive.getHex() !== 0;
    kit.add(color, o.geometry.clone().applyMatrix4(o.matrixWorld), {
      surf: surf[color] || null,
      cast: !glow,
      opts: glow ? LED : {},
    });
  }
}

// kit: the room's kit; own: the computer's kit, flushed into obj; obj: the computer's group (the screen added here)
export function desk(kit, own, obj, nav) {
  const x0 = X0 + 0.02,
    x1 = -0.46,
    z0 = BACK + 0.02,
    z1 = -2.3,
    top = 0.43,
    cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  // the desk: a laminate top on a steel frame, a back panel, a shallow drawer under the right end
  kit.box(TOP, x1 - x0, 0.03, z1 - z0, cx, top - 0.03, cz, { r: 0.006, surf: 'laminate' });
  kit.boxes(
    STEEL,
    [
      [0.03, top - 0.03, 0.03, x0 + 0.02, 0, z0 + 0.02],
      [0.03, top - 0.03, 0.03, x1 - 0.02, 0, z0 + 0.02],
      [0.03, top - 0.03, 0.03, x0 + 0.02, 0, z1 - 0.02],
      [0.03, top - 0.03, 0.03, x1 - 0.02, 0, z1 - 0.02],
      [x1 - x0 - 0.06, top - 0.16, 0.015, cx, 0.12, z0 + 0.02],
      [0.015, 0.03, z1 - z0 - 0.05, x0 + 0.02, 0.05, cz],
      [0.015, 0.03, z1 - z0 - 0.05, x1 - 0.02, 0.05, cz],
      [0.22, 0.055, z1 - z0 - 0.06, x1 - 0.15, top - 0.085, cz],
    ],
    { surf: 'metal' },
  );
  kit.box('#c9cdd2', 0.07, 0.01, 0.01, x1 - 0.15, top - 0.06, z1 - 0.025, { cast: false });

  // the monitor, switched on: the shared prop at a smaller size, its screen a plain desktop with a soft glow
  const m = monitor({ on: false }),
    S = 0.72,
    mx = -0.73,
    mz = -2.55;
  m.traverse((o) => o.isMesh && o.geometry.type === 'PlaneGeometry' && (o.material = screenMat('desktop', 0.65)));
  m.scale.setScalar(S);
  m.position.set(mx, top, mz);
  bake(m, own, obj, { remap: { [PAL.charcoal]: DARK }, surf: { [DARK]: 'plastic' } });
  // a welcome note stuck on the top corner of the screen
  kit.box('#f2f0ea', 0.045, 0.045, 0.003, mx + 0.13, top + 0.4 * S - 0.04, mz + 0.02 * S, {
    rz: 0.12,
    surf: 'paper',
    cast: false,
  });
  // the keyboard: a dark case, the key field in rows; the mouse on its pad
  const kz = -2.41;
  own.box(DARK, 0.27, 0.014, 0.086, mx, top, kz, { r: 0.004, surf: 'plastic' });
  for (let i = 0; i < 4; i++) {
    const w = i === 3 ? 0.14 : 0.25;
    own.box(KEYS, w, 0.005, 0.013, mx - (i === 3 ? 0.01 : 0), top + 0.014, kz - 0.026 + i * 0.017, { cast: false });
  }
  own.box(KEYS, 0.12, 0.003, 0.1, -0.53, top, kz, { cast: false });
  kit.box('#d8d8d2', 0.036, 0.02, 0.056, -0.525, top + 0.003, kz + 0.005, { r: 0.012, seg: 2, ry: -0.15, cast: false });
  // the tower, small, in the corner: a dark case, its front panel, a teal power light
  const tx = x0 + 0.06,
    tz = -2.57,
    th = 0.22;
  own.box(DARK, 0.085, th, 0.2, tx, top, tz, { r: 0.006, surf: 'plastic' });
  own.box(KEYS, 0.075, th - 0.02, 0.006, tx, top + 0.01, tz + 0.1, { cast: false });
  own.box('#6fd0c6', 0.012, 0.012, 0.004, tx + 0.02, top + th - 0.035, tz + 0.104, { cast: false, opts: LED });
  // his headphones, hung over the tower: the band across the top, a cup down each side
  const band = new THREE.TorusGeometry(0.066, 0.008, 6, 14, Math.PI);
  band.translate(tx, top + th - 0.06, tz - 0.02);
  kit.add(BLACK, band);
  for (const s of [-1, 1])
    kit.cyl(BLACK, 0.03, 0.03, 0.022, tx + s * 0.06, top + th - 0.075, tz - 0.02, { rz: Math.PI / 2, seg: 14 });
  // a mug in front of the tower
  kit.cyl('#e9e6df', 0.028, 0.026, 0.065, x0 + 0.07, top, -2.37, { surf: 'ceramic' });

  // the lamp: a round foot in the right back corner, a post, an arm reaching over the mouse, the shade hanging from it
  const lx = x1 - 0.05,
    lz = z0 + 0.06,
    ex = x1 - 0.05,
    ez = -2.39,
    py = top + 0.34,
    len = Math.hypot(ex - lx, ez - lz);
  kit.cyl(BLACK, 0.045, 0.05, 0.02, lx, top, lz, { seg: 14 });
  kit.cyl(BLACK, 0.011, 0.011, py - top, lx, top, lz, { seg: 6 });
  kit.box(BLACK, 0.018, 0.018, len, (lx + ex) / 2, py - 0.01, (lz + ez) / 2, { ry: Math.atan2(ex - lx, ez - lz) });
  kit.cyl(BLACK, 0.026, 0.065, 0.08, ex, py - 0.09, ez, { seg: 14 });
  kit.cyl('#fff1d6', 0.06, 0.06, 0.004, ex, py - 0.094, ez, {
    seg: 14,
    cast: false,
    opts: { emissive: '#ffd9a0', emissiveIntensity: 2.2 },
  });

  // a wall shelf on the left wall over the bed's head, clear of the desk, nearly empty: the company handbook and
  // today's forms lying flat, a few books, a small plant from the office
  const sy = 0.92,
    sz = -1.63,
    shx = X0 + 0.08;
  kit.box('#c3c6ca', 0.17, 0.025, 0.44, X0 + 0.085, sy, sz, { r: 0.005, surf: 'laminate' });
  kit.boxes('#8b919b', [
    [0.1, 0.06, 0.015, X0 + 0.05, sy - 0.06, sz - 0.18],
    [0.1, 0.06, 0.015, X0 + 0.05, sy - 0.06, sz + 0.18],
  ]);
  kit.box('#4a6490', 0.12, 0.17, 0.03, shx, sy + 0.025, sz - 0.17, { surf: 'binder' });
  kit.box('#c96a5a', 0.11, 0.15, 0.025, shx, sy + 0.025, sz - 0.14, { surf: 'binder' });
  kit.box('#f2f0ea', 0.13, 0.015, 0.17, shx + 0.01, sy + 0.025, sz + 0.03, { ry: 0.1, surf: 'paper' });
  kit.box('#4a6490', 0.12, 0.022, 0.16, shx + 0.01, sy + 0.04, sz + 0.03, { ry: -0.08, surf: 'binder' });
  kit.cyl('#b3aea5', 0.035, 0.028, 0.06, shx, sy + 0.025, sz + 0.16, { seg: 10, surf: 'ceramic' });
  kit.cyl('#577650', 0.01, 0.045, 0.08, shx, sy + 0.085, sz + 0.16, { seg: 7 });

  // the chair, a seat facing the screen, pulled out and turned a little toward the room: the shared office chair,
  // its cushions grey-blue like his coat, its frame in the lamp's black
  const seat = { x: -0.72, z: -2.17, top: 0.245, ry: Math.PI - 0.3, out: [-0.34, -2.17] };
  const chair = officeChair(CUSHION);
  chair.position.set(seat.x, 0, seat.z);
  chair.rotation.y = seat.ry;
  bake(chair, kit, null, {
    remap: { [PAL.dark]: BLACK, [PAL.charcoal]: BLACK, '#9aa0aa': STEEL },
    surf: { [CUSHION]: 'fabric', [STEEL]: 'metal' },
  });

  nav.block(X0, x1 + 0.03, BACK, z1 + 0.02);
  nav.block(seat.x - 0.22, seat.x + 0.24, seat.z - 0.22, seat.z + 0.22);
  return {
    lamp: new THREE.Vector3(ex, py - 0.13, ez),
    desk: { x: ex, z: ez, top },
    screen: { x: mx, z: mz + 0.13 }, // the screen's glow on the desk, in front of it
    monitor: { x: mx, y: top + 0.42 * S + 0.12, z: mz },
    seat,
  };
}
