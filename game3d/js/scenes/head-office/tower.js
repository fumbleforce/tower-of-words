// The head office's shell (scenes/head-office.js): the upper floors' curtain wall, fins, bands, roof and plant, the
// lobby's glass front and the canopy, and the ground floor that stays when they fade (service block, sill, floor, apron).
import { PAL, mat, textTexture, plane, JP_FONT } from '../../props.js';
import { lightPool } from '../../places/life.js';
import { monument } from '../forecourt/details.js';
import { GF, T, TOP, LU, LN, DOOR_U, DOOR_W, parts, hash } from './frame.js';

// the upper floors: curtain wall with floor bands on every face, pale fins on the two faces the camera sees
// (south and east), the roof with its parapet and plant; plus the lobby's glass front above the sill
export function upper(glass, lit, frame) {
  const { W, D, storeys, fh } = T;
  const F = storeys - 1;
  // faces: [start u, start n, direction along (du, dn), length, outward (ou, on), fins?]
  const faces = [
    { id: 's', p: [0, 0], d: [1, 0], L: W, out: [0, -1], fins: true },
    { id: 'e', p: [W, 0], d: [0, 1], L: D, out: [1, 0], fins: true },
    { id: 'n', p: [W, D], d: [-1, 0], L: W, out: [0, 1], fins: false },
    { id: 'w', p: [0, D], d: [0, -1], L: D, out: [-1, 0], fins: false },
  ];
  // a box on a face: s0..s1 along it, y0..y1, o0..o1 out from it
  const onFace = (b, f, s0, s1, y0, y1, o0, o1) => {
    const P = (s, o) => [f.p[0] + f.d[0] * s + f.out[0] * o, f.p[1] + f.d[1] * s + f.out[1] * o];
    const [a, c] = [P(s0, o0), P(s1, o1)];
    b.box(Math.min(a[0], c[0]), Math.max(a[0], c[0]), y0, y1, Math.min(a[1], c[1]), Math.max(a[1], c[1]));
  };
  for (const f of faces) {
    const bays = f.fins ? Math.round(f.L / 1.48) : 1,
      bw = f.L / bays;
    for (let k = 0; k < F; k++) {
      const y = GF + k * fh;
      onFace(frame, f, -0.04, f.L + 0.04, y, y + 0.42, -0.02, 0.05); // the floor band
      for (let i = 0; i < bays; i++) {
        const g = f.fins && hash(`${f.id}|${k}|${i}`) < 0.3 ? lit : glass;
        onFace(g, f, i * bw + 0.02, (i + 1) * bw - 0.02, y + 0.42, y + fh, -0.08, -0.02);
        if (f.fins) onFace(frame, f, (i + 0.5) * bw - 0.02, (i + 0.5) * bw + 0.02, y + 0.42, y + fh, -0.02, 0.04);
      }
    }
    if (f.fins)
      for (let i = 0; i <= bays; i++) onFace(frame, f, i * bw - 0.045, i * bw + 0.045, GF, TOP + 0.3, -0.02, 0.26);
    onFace(frame, f, -0.04, f.L + 0.04, TOP, TOP + 0.42, -0.05, 0.1); // parapet
  }
  frame.box(0, W, TOP - 0.1, TOP, 0, D); // roof
  // roof plant: a lift overrun over the core, an air-handling box, a smaller unit
  for (const [u0, u1, n0, n1, h] of [
    [3.6, 7.2, 4.2, 6.8, 1.7],
    [8.4, 11.2, 2.2, 5.6, 1.1],
    [11.8, 13.4, 5.6, 7.4, 0.8],
  ])
    frame.box(u0, u1, TOP, TOP + h, n0, n1);
  // the lobby's glass front above the sill, its mullions, the transom and the door posts
  const posts = [DOOR_U - DOOR_W / 2, DOOR_U + DOOR_W / 2];
  for (const [u0, u1] of [
    [0.1, posts[0]],
    [posts[1], LU],
  ]) {
    glass.box(u0, u1, 0.5, 2.12, 0.04, 0.1);
    for (let u = u0 + 1.2; u < u1 - 0.3; u += 1.2) frame.box(u - 0.03, u + 0.03, 0.5, 2.12, 0.0, 0.12);
  }
  frame.box(0, LU, 2.12, GF, -0.02, 0.14);
  for (const u of posts) frame.box(u - 0.05, u + 0.05, 0, 2.12, -0.02, 0.14);
}

// the ground floor that stays: the service block (its faces are the lobby's east and back walls), the lobby's west
// wall and sill, the floor and the apron; the canopy goes in `frame` and, with its fascia and the name (returned),
// fades with the upper floors
export function ground(g, frame) {
  const { W, D } = T;
  const wallP = parts(),
    sillP = parts(),
    floorP = parts(),
    apronP = parts(),
    fasciaP = parts();
  wallP.box(LU, W, 0, GF, 0, D);
  wallP.box(0, LU, 0, GF, LN, D);
  wallP.box(0, 0.18, 0, GF, 0, LN);
  sillP.box(0, DOOR_U - DOOR_W / 2, 0, 0.5, 0, 0.16);
  sillP.box(DOOR_U + DOOR_W / 2, LU, 0, 0.5, 0, 0.16);
  floorP.box(0.18, LU, -0.04, 0.012, 0.16, LN);
  floorP.box(DOOR_U - DOOR_W / 2, DOOR_U + DOOR_W / 2, -0.04, 0.012, -0.02, 0.2);
  apronP.box(-0.8, W + 0.8, -0.06, 0.004, -2.4, 0);
  // the canopy: cantilevered over the door, a dark fascia on its front edge carrying the name
  const [c0, c1] = [DOOR_U - 2.0, DOOR_U + 2.0];
  frame.box(c0, c1, 2.36, 2.5, -1.7, 0);
  fasciaP.box(c0 - 0.02, c1 + 0.02, 2.06, 2.56, -1.78, -1.66);
  for (const [p, color, name] of [
    [wallP, '#8f949b', 'ho:service'],
    [sillP, '#5b616b', 'ho:sill'],
    [floorP, PAL.floor, 'ho:floor'],
    [apronP, '#8e8a86', 'ho:apron'],
  ]) {
    const m = p.mesh(mat(color, name === 'ho:floor' ? { roughness: 0.35, metalness: 0.04 } : {}), name);
    if (name === 'ho:floor' || name === 'ho:apron') m.castShadow = false;
    g.add(m);
  }
  const fascia = fasciaP.mesh(mat('#3f4650'), 'ho:fascia');
  g.add(fascia);
  const name = textTexture(
    (ctx, w, h) => {
      ctx.fillStyle = '#3f4650';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e8e9e6';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      ctx.font = '700 92px ' + JP_FONT;
      ctx.fillText('本社', w * 0.42, h / 2 + 4);
      ctx.textAlign = 'left';
      ctx.font = '600 58px sans-serif';
      ctx.fillText('HEAD OFFICE', w * 0.47, h / 2 + 4);
    },
    1024,
    128,
  );
  const sign = plane(3.6, 0.45, name);
  sign.position.set(DOOR_U, 2.31, 1.785);
  sign.name = 'ho:name';
  g.add(sign);
  // under the canopy, a pool of light at the door; the name stone beside it
  g.add(lightPool(DOOR_U, 1.0, 1.1, { k: 0.26, sx: 1.4 }));
  const stone = monument('本社', 'HEAD OFFICE');
  stone.position.set(DOOR_U + 3.1, 0, 1.2);
  g.add(stone);
  return [fascia, sign];
}
