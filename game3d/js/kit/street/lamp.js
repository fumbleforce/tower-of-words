// A street lamp, in the street style: its head glows after dark and throws a pool of light on the ground (both
// through kit/core/build.js buildKit and the place's light rig, kit/light/glow.js).
//   lamp(p, { at: [x, z], face, variant, y })   face: the way an arm lamp's head reaches (over the path)
// Variants: post (a slim post with a lantern on top, for courts and squares), arm (a taller pole whose arm curves
// out over the road with a flat head), bollard (a waist-high light bollard along a path), wall (a lantern on a
// bracket on a wall, h over the floor at y), lantern (a lantern alone, standing on a gatepost `y` high), flood (a
// court's floodlight mast, its heads tipped down over the court; lit: false for a court left dark).
// Reports its base as blocked (none for wall and lantern, which stand on something else).
import * as THREE from 'three';
import { piece } from '../core/piece.js';
import { STEEL, PAINT } from '../core/palette.js';

const POLES = [STEEL.dark, STEEL.dark, PAINT.green, '#2f3338'];

export const lamp = piece({
  id: 'street/lamp',
  family: 'lighting',
  label: 'Street lamp',
  fidelity: 'finished',
  use: "lamp(p, { at: [x, z], face, variant: 'post' })",
  variants: {
    post: { h: 2.9, pool: 1.3 },
    arm: { h: 4.4, reach: 0.9, pool: 1.8 },
    bollard: { h: 0.85, pool: 0.75 },
    wall: { h: 2.4, pool: 0.9 },
    lantern: { h: 0, pool: 0.9 },
    flood: { h: 7.2, pool: 0.9, heads: 2, lit: true },
  },
  vary: { tone: 0.03, wear: [0, 0.3], scale: [0.98, 1.02] },
  preview: (variant) => (variant === 'wall' ? { wall: [1.6, 3.0] } : {}), // the Asset library shows the wall lamp on a wall
  build(k, o) {
    const r = k.r,
      pole = o.pole || POLES[Math.floor(r() * POLES.length)];
    const base = () => {
      k.cyl(pole, 0.11, 0.13, 0.12, 0, 0, 0, { n: 10, surf: 'metal' });
      if (!k.phone) k.cyl(pole, 0.075, 0.1, 0.12, 0, 0.12, 0, { n: 10, surf: 'metal' });
    };
    // a lantern: collar, glass (lit), four corner posts on the high level, a cap with a knob
    const lantern = (y, s = 1, v = 0) => {
      k.cyl(pole, 0.08 * s, 0.06 * s, 0.06 * s, 0, y, v, { n: 8, surf: 'metal' });
      const glass = new THREE.CylinderGeometry(0.1 * s, 0.085 * s, 0.3 * s, k.seg(8, 6));
      k.lamp(glass.translate(0, y + 0.21 * s, v), [0, v + (v ? 0.4 : 0), o.pool]);
      if (k.high)
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          k.box(pole, 0.016, 0.3 * s, 0.016, Math.cos(a) * 0.1 * s, y + 0.06 * s, v + Math.sin(a) * 0.1 * s);
        }
      k.cyl(pole, 0.03 * s, 0.16 * s, 0.09 * s, 0, y + 0.36 * s, v, { n: 8, surf: 'metal' });
      if (!k.phone) k.cyl(pole, 0.02 * s, 0.025 * s, 0.06 * s, 0, y + 0.45 * s, v, { n: 6 });
    };
    if (o.variant === 'post') {
      base();
      k.cyl(pole, 0.035, 0.05, o.h - 0.24, 0, 0.24, 0, { n: 8, surf: 'metal' });
      lantern(o.h);
    } else if (o.variant === 'arm') {
      base();
      k.cyl(pole, 0.045, 0.07, o.h - 0.24, 0, 0.24, 0, { n: 10, surf: 'metal' });
      // the arm: a curve from the pole's top out over the path (+v), a flat head at its end
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, o.h - 0.25, 0),
        new THREE.Vector3(0, o.h + 0.12, 0.05),
        new THREE.Vector3(0, o.h + 0.05, o.reach),
      );
      if (k.phone) k.bar(pole, [0, o.h - 0.05, 0], [0, o.h + 0.05, o.reach], 0.035);
      else k.geo(pole, new THREE.TubeGeometry(curve, k.high ? 14 : 8, 0.035, k.seg(8, 5)), { surf: 'metal' });
      k.box(pole, 0.26, 0.07, 0.5, 0, o.h - 0.02, o.reach + 0.1, { round: 0.02, surf: 'metal' });
      k.lamp(new THREE.BoxGeometry(0.2, 0.025, 0.42).translate(0, o.h - 0.035, o.reach + 0.1), [
        0,
        o.reach + 0.3,
        o.pool,
      ]);
    } else if (o.variant === 'bollard') {
      k.cyl(pole, 0.09, 0.1, o.h - 0.16, 0, 0, 0, { n: 12, surf: 'metal' });
      k.lamp(new THREE.CylinderGeometry(0.085, 0.085, 0.1, k.seg(12)).translate(0, o.h - 0.11, 0), [0, 0, o.pool]);
      k.cyl(pole, 0.1, 0.095, 0.06, 0, o.h - 0.06, 0, { n: 12, surf: 'metal' });
      if (!k.phone)
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          k.box(pole, 0.02, 0.1, 0.02, Math.cos(a) * 0.088, o.h - 0.16, Math.sin(a) * 0.088);
        }
    } else if (o.variant === 'wall') {
      // a bracket out from the wall (at v = 0) at height h, and a lantern hanging under its end
      const y = o.h;
      k.box(pole, 0.12, 0.2, 0.03, 0, y - 0.1, 0.015, { surf: 'metal' });
      k.bar(pole, [0, y, 0.02], [0, y + 0.04, 0.3], 0.018);
      k.bar(pole, [0, y - 0.08, 0.02], [0, y + 0.02, 0.2], 0.012);
      lantern(y - 0.45, 0.8, 0.3);
      k.box(pole, 0.02, 0.07, 0.02, 0, y - 0.04, 0.3); // the hanger, from the arm's end to the lantern's knob
    } else if (o.variant === 'flood') {
      // a court's floodlight mast: a concrete foot, a tapered steel mast, a crossbar at the top with its heads tipped
      // down toward the court (+v); lit: false leaves the heads as dark glass (a court not lit tonight)
      k.box('#9a9c99', 0.42, 0.3, 0.42, 0, 0, 0, { round: 0.03, surf: 'concrete' });
      k.cyl(pole, 0.06, 0.11, o.h - 0.3, 0, 0.3, 0, { n: 10, surf: 'metal' });
      const top = o.h,
        span = 0.5 * o.heads;
      k.box(pole, span + 0.2, 0.08, 0.08, 0, top, 0.05, { surf: 'metal' });
      for (let i = 0; i < o.heads; i++) {
        const u = -span / 2 + span * ((i + 0.5) / o.heads),
          tilt = -0.55;
        const housing = new THREE.BoxGeometry(0.44, 0.3, 0.14).rotateX(tilt).translate(u, top - 0.08, 0.22);
        k.geo(pole, housing, { surf: 'metal' });
        const face = new THREE.BoxGeometry(0.38, 0.24, 0.02).rotateX(tilt).translate(u, top - 0.12, 0.3);
        // a small pool at the mast's foot, as every lamp has; the lit court is day 4's own light (court-light.js)
        if (o.lit) k.lamp(face, i === 0 ? [0, 0.9, o.pool] : null);
        else k.geo('#5d6670', face, { cast: false });
      }
      if (!k.phone) k.box('#3c4046', 0.12, 0.28, 0.08, 0, 1.1, 0.1, { surf: 'metal' }); // the timer box on the mast
    } else {
      lantern(0, 1.1);
    }
  },
  // the lantern's own pool is under it: for the wall lamp, out from the wall
  footprint: (o) =>
    o.variant === 'flood'
      ? [[-0.25, 0.25, -0.25, 0.25]]
      : o.variant === 'post' || o.variant === 'arm'
        ? [[-0.15, 0.15, -0.15, 0.15]]
        : o.variant === 'bollard'
          ? [[-0.12, 0.12, -0.12, 0.12]]
          : [],
});
