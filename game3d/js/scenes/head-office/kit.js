// The head office lobby's building kit (head-office/lobby.js, core.js, office-room.js): boxes in the tower's frame
// (u east, n north, y up; in the group x = u, z = -n) gathered with their colours in the vertices (outdoor/parts.js),
// so a whole room of stone, steel, fabric and plants costs a mesh per finish, not one per colour. The finishes:
// matte (cast), flat (no shadow: floor bands, small things), gloss (the black desk, steel), glow (light slots).
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as THREE from 'three';
import { Parts } from '../outdoor/parts.js';

export const GLOSS = { roughness: 0.3, metalness: 0.25 },
  GLOW = { emissive: '#e6ebf2', emissiveIntensity: 0.55, roughness: 1 };
// the lobby's palette (Jørgen's pick, reviews/lobby-plan-1: marble and glass, a black desk, slate-blue seats)
export const C = {
  joint: '#c3bfb6', // the marble floor's joints (the floor itself is head-office/tower.js ho:floor)
  stone: '#d6d2ca', // the feature wall, planters, plinths
  bank: '#c5c7c9', // the lift wall and the atrium's side walls
  granite: '#6e7177', // the walks carried in from the court, the lift apron
  black: '#15171b', // the reception desk
  blackTop: '#24272d',
  steel: '#a7adb4',
  steelDark: '#5d636c',
  trim: '#2c3138',
  slate: '#4f6178', // the benches' cushions
  slateDark: '#3c4a5c',
  tactile: '#b3a063', // the guide line, as the court's
  cap: '#a3a9b3', // the tops of cut walls, as everywhere
  paper: '#f2f0ea',
};

export function kit() {
  const p = new Parts();
  // a box from u0..u1, y0..y1, n0..n1
  const B = (color, u0, u1, y0, y1, n0, n1, o = {}) =>
    p.box(color, u1 - u0, y1 - y0, n1 - n0, (u0 + u1) / 2, y0, -(n0 + n1) / 2, o);
  return {
    p,
    B,
    flat: (color, u0, u1, y0, y1, n0, n1) => B(color, u0, u1, y0, y1, n0, n1, { cast: false }),
    gloss: (color, u0, u1, y0, y1, n0, n1, cast = true) => B(color, u0, u1, y0, y1, n0, n1, { cast, opts: GLOSS }),
    glow: (u0, u1, y0, y1, n0, n1) => B('#ffffff', u0, u1, y0, y1, n0, n1, { cast: false, opts: GLOW }),
    // a rounded box (r: the edge radius), for the sleek pieces
    round(color, u0, u1, y0, y1, n0, n1, r, o = {}) {
      const g = new RoundedBoxGeometry(u1 - u0, y1 - y0, n1 - n0, 2, r);
      p.geo(color, g.translate((u0 + u1) / 2, (y0 + y1) / 2, -(n0 + n1) / 2), o);
    },
    // an upright cylinder standing on y0 at (u, n)
    cyl(color, u, n, r0, r1, y0, y1, o = {}, seg = 14) {
      const g = new THREE.CylinderGeometry(r1, r0, y1 - y0, seg);
      p.geo(color, g.translate(u, (y0 + y1) / 2, -n), o);
    },
    build: (group) => p.build(group),
  };
}
