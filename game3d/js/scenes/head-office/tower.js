// The head office's shell (scenes/head-office.js): the upper floors' curtain wall, fins, bands, roof and plant, the
// lobby's glass front and the canopy, and the ground floor that stays when they fade (service block, sill, floors).
import { PAL, mat, textTexture, plane, JP_FONT } from '../../props.js';
import { lightPool } from '../../places/life.js';
import { monument } from '../forecourt/details.js';
import { POOL_Y } from '../outdoor/parts.js';
import { GF, T, TOP, LU, LN, DOOR_U, DOOR_W, NU, NT, parts, hash, bayLines } from './frame.js';

// the upper floors: curtain wall with floor bands on every face, pale fins on the two faces the camera sees
// (south and east), the roof with its parapet and plant; plus the lobby's glass front above the sill
export function upper(glass, lit, frame, lobby) {
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
  // the cut's faces, where the tower stands on round the storeys that fade over the lobby (frame.js NOTCH): glazing
  // set back from the cut line, a pale slab edge at every floor and mullions on the bay lines, like an inner facade;
  // and the soffit of the first storey that stays
  for (let k = 0; k <= 3; k++) {
    const y = GF + k * fh,
      y0 = k ? y - 0.12 : y;
    frame.box(NU, NU + 0.16, y0, y + 0.22, 0, LN + 0.16);
    frame.box(0, NU, y0, y + 0.22, LN, LN + 0.16);
  }
  glass.box(NU + 0.1, NU + 0.16, GF, NT, 0, LN + 0.1);
  glass.box(0, NU + 0.1, GF, NT, LN + 0.1, LN + 0.16);
  for (const n of [1.55, 3.1, 4.65]) frame.box(NU, NU + 0.14, GF, NT, n - 0.03, n + 0.03);
  for (const u of bayLines(W)) if (u > 0.2 && u < NU - 0.2) frame.box(u - 0.03, u + 0.03, GF, NT, LN, LN + 0.14);
  frame.box(0, NU, NT, NT + 0.12, 0, LN);
  // the lobby's glass front above the sill, its mullions, the transom and the door posts
  const posts = [DOOR_U - DOOR_W / 2, DOOR_U + DOOR_W / 2];
  for (const [u0, u1] of [
    [0.18, posts[0]],
    [posts[1], LU],
  ]) {
    lobby.box(u0, u1, 0.5, 2.12, 0.04, 0.1);
    for (const u of bayLines(W)) if (u > u0 + 0.2 && u < u1 - 0.2) frame.box(u - 0.03, u + 0.03, 0.5, 2.12, 0.0, 0.12);
  }
  frame.box(0, LU, 2.12, GF, -0.02, 0.14);
  for (const u of posts) frame.box(u - 0.05, u + 0.05, 0, 2.12, -0.02, 0.14);
}

// the ground floor that stays: the service block (its faces are the lobby's east and back walls), the lobby's west
// wall and sill, and the floors; the court's paving (scenes/forecourt.js) runs up to the walls. The canopy goes in
// `frame` and, with its fascia and the name (returned), fades with the upper floors
export function ground(g, frame) {
  const { W, D } = T;
  const wallP = parts(),
    sillP = parts(),
    floorP = parts(),
    fasciaP = parts();
  // the ground floor round the lobby is rooms, not a solid block, so it reads when the floors above fade: the
  // outer walls with windows on the two faces the camera sees, the lobby's east and back walls, floors, and a
  // back office east of the lobby with its desks
  const glassP = parts(),
    deskP = parts();
  const wt = 0.18,
    SUNK = -0.12; // the outer walls start under the paving, so their shadows meet the ground with no lit seam
  // a wall along u (s = 'u', at n) or along n (s = 'n', at u), windows [a, b] along it from 0.55 to 2.05
  const windowed = (s, a0, a1, at, wins) => {
    const box = (p0, p1, y0, y1) =>
      s === 'u' ? wallP.box(p0, p1, y0, y1, at, at + wt) : wallP.box(at - wt, at, y0, y1, p0, p1);
    let p = a0;
    for (const [a, b] of wins) {
      box(p, a, SUNK, GF);
      box(a, b, SUNK, 0.5);
      box(a, b, 2.12, GF);
      if (s === 'u') glassP.box(a, b, 0.5, 2.12, at - 0.02, at + 0.04);
      else glassP.box(at - 0.04, at + 0.02, 0.5, 2.12, a, b);
      p = b;
    }
    box(p, a1, 0, GF);
  };
  // a window in every whole bay of the curtain wall above, between the piers
  const bays = (L, a0, a1) => {
    const lines = bayLines(L),
      out = [];
    for (let i = 0; i + 1 < lines.length; i++)
      if (lines[i] >= a0 - 1e-6 && lines[i + 1] <= a1 + 1e-6) out.push([lines[i] + 0.16, lines[i + 1] - 0.16]);
    return out;
  };
  windowed('u', LU, W, 0, bays(W, LU, W)); // south face, east of the lobby
  windowed('n', wt, D - wt, W, bays(D, 0, D)); // east face, between the south and north faces
  // the plinth: a stone pier under every fin of the two faces the camera sees, the full height of the ground
  // floor, so the grid above comes down to the ground (the entrance bay is double: no pier over the door)
  // (in front of the lobby they fade with its glass, so they never stand in the way of the room)
  const pierP = parts();
  for (const u of bayLines(W))
    if (u < DOOR_U - DOOR_W / 2 - 0.2 || u > DOOR_U + DOOR_W / 2 + 0.2) {
      pierP.box(u - 0.11, u + 0.11, SUNK, u < LU ? 0.5 : GF, -0.126, 0.02); // proud of the base course's face (-0.12)
      if (u < LU) frame.box(u - 0.11, u + 0.11, 0.5, GF, -0.12, 0.02);
    }
  for (const n of bayLines(D)) pierP.box(W - 0.02, W + 0.12, SUNK, GF, Math.max(0, n - 0.11), Math.min(D, n + 0.11));
  // the strip of the ground floor between the lobby's east wall and the cut's east face (frame.js NU): a pale cap
  // over it, like every cut wall's top, so the room next door stays closed
  const capP = parts();
  capP.box(LU, NU + 0.1, GF - 0.02, GF, 0.02, LN + 0.1);
  wallP.box(0, W, SUNK, GF, D - wt, D); // north face
  wallP.box(0, wt, SUNK, GF, 0, D - wt); // west face (the lobby's west wall)
  // the service door at the north end of the west face, where the service way from the court ends, under a hood
  const sd = D - 1.2;
  sillP.box(-0.04, 0, 0, 2.0, sd - 0.7, sd + 0.7);
  frame.box(-0.8, 0, 2.08, 2.16, sd - 0.95, sd + 0.95);
  wallP.box(LU, LU + wt, 0, GF, wt, D - wt); // the lobby's east wall, between the south and north faces
  wallP.box(wt, LU, 0, GF, LN, LN + wt); // the lobby's back wall, between its west and east walls
  floorP.box(LU, W, -0.04, 0.012, 0, D);
  floorP.box(0, LU, -0.04, 0.012, LN, D);
  // the back office: two rows of desks with their chairs, cabinets along the north wall
  for (const n of [2.0, 4.6])
    for (let u = LU + 0.9; u < W - 1; u += 1.5) {
      deskP.box(u - 0.6, u + 0.6, 0.68, 0.74, n - 0.35, n + 0.35);
      sillP.box(u - 0.2, u + 0.2, 0, 0.45, n + 0.55, n + 0.95);
    }
  for (let u = LU + 0.4; u < W - 0.5; u += 0.9) sillP.box(u, u + 0.8, 0, 1.3, D - 0.62, D - wt);
  sillP.box(wt, DOOR_U - DOOR_W / 2, SUNK, 0.5, 0, 0.16);
  sillP.box(DOOR_U + DOOR_W / 2, LU, SUNK, 0.5, 0, 0.16); // the south face's wall starts at LU
  floorP.box(0.18, LU, -0.04, 0.012, 0.16, LN);
  floorP.box(DOOR_U - DOOR_W / 2, DOOR_U + DOOR_W / 2, -0.04, 0.012, -0.02, 0.2);
  // a dark stone base course round the outside, 0.12 proud of the walls (broken for the door), where the walls meet
  // the court's paving
  const B = 0.12,
    BH = 0.16;
  sillP.box(-B, DOOR_U - DOOR_W / 2, SUNK, BH, -B, 0);
  sillP.box(DOOR_U + DOOR_W / 2, W + B, SUNK, BH, -B, 0);
  sillP.box(-B, W + B, SUNK, BH, D, D + B);
  sillP.box(-B, 0, SUNK, BH, 0, D);
  sillP.box(W, W + B, SUNK, BH, 0, D);
  // the canopy: cantilevered over the door, a dark fascia on its front edge carrying the name
  const [c0, c1] = [DOOR_U - 2.0, DOOR_U + 2.0];
  frame.box(c0, c1, 2.4, 2.5, -1.7, -0.02); // on the transom's top, in front of it
  fasciaP.box(c0 - 0.02, c1 + 0.02, 2.06, 2.56, -1.78, -1.66);
  for (const [p, color, name] of [
    [wallP, '#8f949b', 'ho:service'],
    [sillP, '#5b616b', 'ho:sill'],
    [floorP, PAL.floor, 'ho:floor'],
    [deskP, '#b9bdc2', 'ho:desks'],
  ]) {
    const m = p.mesh(mat(color, name === 'ho:floor' ? { roughness: 0.35, metalness: 0.04 } : {}), name);
    if (name === 'ho:floor') m.castShadow = false;
    g.add(m);
  }
  g.add(pierP.mesh(mat('#aaaba8'))); // unnamed: they merge with the rest
  const cap = capP.mesh(mat('#a3a9b3', { roughness: 0.8 }));
  cap.castShadow = false;
  g.add(cap);
  const gfGlass = glassP.mesh(mat('#8c9dad', { roughness: 0.45, metalness: 0.05 }), 'ho:gfGlass');
  gfGlass.castShadow = false;
  g.add(gfGlass);
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
  g.add(lightPool(DOOR_U, 1.0, 1.1, { k: 0.14, sx: 1.4, y: POOL_Y }));
  const stone = monument('本社', 'HEAD OFFICE');
  stone.position.set(DOOR_U + 4.35, 0, 1.2);
  g.add(stone);
  // the company's name in brushed steel letters standing on the canopy's front edge
  const letters = textTexture(
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = '700 116px sans-serif';
      ctx.letterSpacing = '18px';
      ctx.fillStyle = '#2e333a';
      ctx.fillText('AMAKAWA', w / 2 + 5, h - 9);
      ctx.fillStyle = '#e4e6e8';
      ctx.fillText('AMAKAWA', w / 2, h - 14);
    },
    1024,
    128,
  );
  const name2 = plane(3.4, 0.42, letters);
  name2.material.transparent = true;
  name2.material.alphaTest = 0.4;
  name2.position.set(DOOR_U, GF + 0.72, 0.11); // on the first floor's glass, over the canopy
  name2.name = 'ho:letters';
  g.add(name2);
  return [fascia, sign, name2];
}
