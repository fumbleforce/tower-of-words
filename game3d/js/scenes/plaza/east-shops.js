// The named shops along the east lane (docs/game/island.md, "East lane"): the café, the liquor and rice shop, the
// barber and Amakawa Travel, the blocks with a `shop` in plaza/east-plan.js BLOCKS and north-plan.js E2. Their
// fronts are plaza/east-fronts.js's; this adds what makes each one a shop with a name: its sign (the kana large, the
// English small, as the shop street's), a white 準備中 CLOSED card on the door's glass (本日休業 CLOSED TODAY
// after work on day 2), and by the door the liquor shop's cedar ball (sugidama) and the barber's striped pole.
// Built for the plaza's backdrop and the east lane's own chunk (scenes/east-lane.js) alike.
//
//   shopFittings(p, signs, blocks)     p: a Parts collector; signs: a shop-signs.js signSet (one draw call for all)
//   shopDoor(k)                        the door's middle on its face [x, z], the face's outward normal, the face
import * as THREE from 'three';
import { faces, faceAt, tOf } from '../outdoor/block.js';
import { STEEL } from '../outdoor/furniture.js';

const CEDAR = '#55693f',
  POLE = { white: '#eceae4', red: '#b0433f', blue: '#3e5a8c' };

export function shopDoor(k) {
  const F = faces(k.rect)[k.face],
    u = tOf(F, k.at);
  return { at: faceAt(F, u, 0), n: F.n, F, u };
}

// the barber's pole on a bracket off the wall: a pale drum with a red and a blue stripe winding up it, dark caps
function barberPole(p, F, u) {
  const [x, z] = faceAt(F, u, 0.24),
    y0 = 1.05,
    h = 0.8,
    r = 0.1;
  p.geo(POLE.white, new THREE.CylinderGeometry(r, r, h, 10).translate(x, y0 + h / 2, z));
  for (const y of [y0 - 0.06, y0 + h])
    p.geo(STEEL.dark, new THREE.CylinderGeometry(r + 0.02, r + 0.02, 0.06, 10).translate(x, y + 0.03, z));
  p.geo(STEEL.dark, new THREE.SphereGeometry(0.06, 8, 6).translate(x, y0 + h + 0.1, z));
  for (const [c, ph] of [
    [POLE.red, 0],
    [POLE.blue, Math.PI],
  ]) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24,
        a = ph + t * Math.PI * 2 * 2.5;
      pts.push(
        new THREE.Vector3(x + Math.cos(a) * (r + 0.008), y0 + 0.03 + t * (h - 0.06), z + Math.sin(a) * (r + 0.008)),
      );
    }
    p.geo(c, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, 0.02, 4), { cast: false });
  }
  // the bracket back to the wall
  const [bx, bz] = faceAt(F, u, 0.12);
  p.box(STEEL.dark, F.d[0] ? 0.05 : 0.2, 0.05, F.d[0] ? 0.2 : 0.05, bx, y0 + h - 0.1, bz);
}

// the liquor shop's cedar ball, hung from a short bracket by the door
function sugidama(p, F, u) {
  const [x, z] = faceAt(F, u, 0.32);
  p.geo(CEDAR, new THREE.IcosahedronGeometry(0.22, 1).translate(x, 1.62, z));
  p.geo(STEEL.dark, new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4).translate(x, 1.92, z), { cast: false });
  // and a small paper tag on a string beneath it (the new sake: story/day2/east_lane.js reads it)
  p.geo(STEEL.dark, new THREE.CylinderGeometry(0.004, 0.004, 0.1, 3).translate(x, 1.36, z), { cast: false });
  p.box('#f3eee2', 0.07, 0.12, 0.01, x, 1.19, z, { cast: false, ry: Math.atan2(F.n[0], F.n[1]) });
  const [bx, bz] = faceAt(F, u, 0.16);
  p.box(STEEL.dark, F.d[0] ? 0.04 : 0.34, 0.04, F.d[0] ? 0.34 : 0.04, bx, 2.0, bz);
}

export function shopFittings(p, signs, blocks) {
  for (const k of blocks.filter((b) => b.shop)) {
    const { F, u } = shopDoor(k),
      ry = Math.atan2(F.n[0], F.n[1]),
      fh = k.row.floorH,
      [kana, en, colour] = k.shop.sign;
    const at = (o, y, t = 0) => {
      const [x, z] = faceAt(F, u + t, o);
      return [x, y, z];
    };
    if (k.shop.mount === 'face') {
      // on the wall over the ground floor, up from the awnings and the door's light, over the door
      signs.board(kana, en, colour, Math.min(F.L - 1, 2.6), 0.5, at(0.08, fh + 0.4), ry);
    } else if (k.shop.mount === 'roof') {
      // standing on the tiled roof's front slope over the door, on two short posts
      const [rx, , rz] = at(-0.35, 0);
      signs.board(kana, en, colour, Math.min(F.L - 1.4, 2.0), 0.5, [rx, fh + 0.72, rz], ry);
      for (const s of [-0.7, 0.7]) {
        const [px, pz] = faceAt(F, u + s, -0.42);
        p.box(STEEL.dark, 0.06, 0.6, 0.06, px, fh + 0.2, pz, { cast: false });
      }
      sugidama(p, F, u - 0.95);
    } else {
      // standing on the door's canopy's front edge, as the training centre's
      signs.board(kana, en, colour, 2.4, 0.6, at(1.08, 2.72), ry);
    }
    // the door's glass: shut, a card on it
    signs.card('準備中', 'CLOSED', 0.46, 0.3, at(0.09, 1.2, 0.28), ry, { when: 'prep', door: k.shop.id });
    signs.card('本日休業', 'CLOSED TODAY', 0.46, 0.3, at(0.09, 1.2, 0.28), ry, { when: 'evening2', door: k.shop.id }); // day 2 after work
    if (k.shop.id === 'barber') barberPole(p, F, u - 0.85);
  }
}
