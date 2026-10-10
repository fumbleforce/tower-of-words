// A window in a wall, in the street style: a frame standing a little proud of the wall, glass set back in it (the
// street finish gives it reflections and a room behind it), mullions and a transom, a sill, and a blind drawn to
// its own height in each window. Some are lit after dark, chosen by the seed, so a facade at night has a few rooms
// on and the rest dark, and never the same pattern twice.
//   windowBay(p, { at: [x, z], face, y, variant })   at: the wall's outer face at the window's middle; face: the way
//   the wall faces (outward); y: the bottom of the glass (the floor for a shop window, which has its own riser).
// Everything stands on or proud of the wall's face (v >= 0), so it goes on any solid wall without cutting a hole.
// Variants: punched (an office or flat window), tall (a full-height window with a rail across it), shop (a shop
// window over a stone riser, three lights), frosted (a small frosted window: a stair or a washroom, never lit).
import * as THREE from 'three';
import { piece } from '../core/piece.js';
import { STEEL, STONE, TRIM } from '../core/palette.js';

const BLINDS = ['#d9d3c6', '#cfd3d6', '#e2ddd0', '#bfc5c9'];

export const windowBay = piece({
  id: 'building/window',
  family: 'building',
  label: 'Window',
  fidelity: 'finished',
  use: "windowBay(p, { at: [x, z], face, y: 1.0, variant: 'punched' })",
  variants: {
    punched: { w: 1.2, h: 1.4, lights: 2, transom: 0.74, sill: true, lit: 0.45, blind: 0.7 },
    tall: { w: 0.9, h: 2.1, lights: 1, transom: 0.8, sill: false, rail: true, lit: 0.4, blind: 0.5 },
    shop: { w: 2.4, h: 2.0, lights: 3, transom: 0.84, riser: 0.45, frame: STEEL.dark, lit: 0.85, blind: 0 },
    frosted: { w: 0.7, h: 0.6, lights: 1, transom: 0, sill: true, frosted: true, lit: 0, blind: 0 },
  },
  vary: { tone: 0.03, wear: [0, 0.25] },
  preview: { wall: [3.2, 3.2], y: 0.9 }, // the Asset library shows it on a plain wall, its glass 0.9 up
  build(k, o) {
    const { w, h, lights, transom } = o;
    const y0 = o.riser || 0,
      frame = o.frame || TRIM.frame,
      fw = 0.06; // the frame's width
    // the reveal: a dark recess the glass sits in
    k.box('#2c3136', w + 0.02, h + 0.02, 0.01, 0, y0 - 0.01, 0.012, { cast: false });
    // the glass, set back
    if (o.frosted) k.box(TRIM.frost, w, h, 0.02, 0, y0, 0.03, { worn: false, cast: false });
    else k.glass(new THREE.BoxGeometry(w, h, 0.02).translate(0, y0 + h / 2, 0.03));
    // the frame: stiles, head and foot, proud of the wall
    for (const s of [-1, 1]) k.box(frame, fw, h + 2 * fw, 0.09, (s * (w + fw)) / 2, y0 - fw, 0.055, { round: 0.008 });
    for (const yy of [y0 - fw, y0 + h]) k.box(frame, w + 2 * fw, fw, 0.09, 0, yy, 0.055, { round: 0.008 });
    // mullions between the lights, and the transom rail under the top light
    for (let i = 1; i < lights; i++) k.box(frame, 0.045, h, 0.06, -w / 2 + (w * i) / lights, y0, 0.05);
    if (transom) k.box(frame, w, 0.045, 0.06, 0, y0 + h * transom, 0.05);
    // a blind drawn down to its own height, just inside the glass (not on the phone)
    const r = k.r;
    if (!k.phone && r() < o.blind) {
      const down = 0.12 + r() * 0.5;
      k.box(BLINDS[Math.floor(r() * BLINDS.length)], w - 0.02, h * down, 0.01, 0, y0 + h * (1 - down), 0.043, {
        worn: false,
        cast: false,
      });
      if (k.high) k.box('#8d9298', w - 0.02, 0.025, 0.02, 0, y0 + h * (1 - down) - 0.02, 0.046, { cast: false });
    }
    // a room lit after dark, chosen by the seed
    if (r() < o.lit) k.lit(new THREE.PlaneGeometry(w - 0.04, h * 0.86).translate(0, y0 + h * 0.47, 0.041));
    if (o.sill) {
      k.box(TRIM.sill, w + 0.2, 0.05, 0.16, 0, y0 - fw - 0.05, 0.08, { round: 0.01, surf: 'concrete' });
      if (!k.phone) k.box('#2c3136', w + 0.16, 0.012, 0.01, 0, y0 - fw - 0.062, 0.155, { cast: false }); // its drip line
    }
    if (o.riser) {
      k.box(STONE.granite, w + 0.2, o.riser - fw, 0.16, 0, 0, 0.08, { surf: 'stone', round: 0.01 });
      k.box(STONE.dark, w + 0.24, 0.04, 0.2, 0, o.riser - fw - 0.04, 0.1, { cast: false });
    }
    if (o.rail) {
      // a rail across the lower part: a top bar, a bottom bar and balusters
      const top = y0 + 0.95,
        n = Math.round(w / (k.phone ? 0.24 : 0.12));
      k.bar(STEEL.dark, [-w / 2 - 0.04, top, 0.22], [w / 2 + 0.04, top, 0.22], 0.02);
      k.box(STEEL.dark, w + 0.08, 0.03, 0.03, 0, y0 + 0.08, 0.22);
      for (let i = 0; i <= n; i++) k.box(STEEL.dark, 0.016, 0.87, 0.016, -w / 2 + (w * i) / n, y0 + 0.08, 0.22);
      for (const s of [-1, 1]) k.box(STEEL.dark, 0.03, 0.03, 0.12, s * (w / 2 + 0.04), top - 0.015, 0.13);
    }
    // a handle on one light (high only)
    if (k.high && !o.riser) k.box(STEEL.pale, 0.02, 0.12, 0.03, w / 2 - 0.1, y0 + h * 0.45, 0.05, { cast: false });
  },
  footprint: () => [],
});
