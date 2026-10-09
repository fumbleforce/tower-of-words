// The gym's ground floor (gym; docs/game/places.md "Gym"): the entrance lobby inside the main doors, and the sports
// hall behind its glass wall, looked into from the south over the cut-down front wall. In its own frame: x east, z
// toward the camera, the origin the middle of the south wall, inside (the main doors' middle).
//
//   the entrance: the glass doors in the south wall, a strip of grey tiles inside them where outdoor shoes come off,
//   a step up onto the lobby floor, a shoe locker either side of the tiles, a rack of green indoor slippers on the step
//   the reception (west of the entrance): a counter along the lobby's west side, its front facing the lobby, the
//   booking terminal, a tray of booking sheets, a bell and an old desk fan on it, 受付 RECEPTION over it; behind it
//   the attendant's chair and, along the west wall, a back counter with the printer, the key box over it; a gap at
//   the counter's north end into the staff side
//   the lobby (east of the entrance): an umbrella stand, a waiting bench and a drinks machine along the east wall,
//   another bench across the lobby facing the doors, the club board on a pier of the hall's glass wall, a plant
//   the changing block in the lobby's north-east corner, its front on the hall's line facing the lobby: the men's
//   changing room's door (blue noren, 男子更衣室), the women's (red noren, 女子更衣室), between them the pool's
//   notice, and the pool corridor's glass door (プール POOL); the block's walls run back into the hall, roofed
//   the hall's glass wall across the lobby's north side, its double doors open on the entrance's axis (アリーナ
//   SPORTS HALL over them)
//   the hall: a maple floor, the wainscot and high windows round its walls; the badminton court across its north
//   part in green, its net up; the red boundary line; two long benches down the west wall by the windows; the
//   equipment store in the north-west corner, its sliding door pushed open on the ball carts, the mats and the net
//   posts; the winter meeting corner north-east (folding chairs facing a whiteboard, a trolley of chairs); a cart of
//   volleyballs inside the doors; the basketball goal and the clock on the north wall
import * as THREE from 'three';
import { Kit } from '../dorms/kit.js';
import { signSet } from '../shop-signs.js';
import { shell, plankFloor, roomLights, roomNav } from './shell.js';
import { pinboard } from './machines.js';
import { entrance, reception, lobby } from './gym-lobby.js';
import { courtLines, hallWalls, store, benches, meeting } from './gym-hall.js';
import { gymWindowHoles } from './gym-fixtures.js';
import {
  C,
  R,
  DOOR,
  GLASS_Z,
  HALL_DOOR,
  PIER,
  BLOCK,
  CHANGING,
  COUNTER,
  FRONT,
  STORE,
  BENCHES,
  COURT,
  MEETING,
  TERM_Z,
} from './gym-plan.js';

export { POSTS } from './gym-plan.js';

export function buildGym() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color('#262a30');
  scene.add(root);
  const kit = new Kit(),
    signs = signSet();
  const nav = roomNav(R);
  shell(root, R, { holes: { ...gymWindowHoles(), s: [[DOOR[0], DOOR[1], 0, R.near]] }, color: C.wall });
  plankFloor(kit, R, { color: C.maple, seam: C.seam, w: 0.2, along: 'z' });
  courtLines(kit, nav);
  hallWalls(kit);
  const entry = entrance(kit, nav);
  const desk = reception(kit, nav, signs);
  const lob = lobby(kit, nav);
  glassWall(kit, nav, signs);
  changing(kit, nav, signs);
  store(kit, nav);
  benches(kit, nav);
  meeting(kit, nav);
  const board = pinboard(kit, (PIER[0] + PIER[1]) / 2, 0.62, GLASS_Z + 0.1, 0, 1.2, 0.62);
  nav.block(PIER[0], PIER[1], GLASS_Z - 0.1, GLASS_Z + 0.2);
  kit.flush(root);
  signs.build(root);
  const sun = roomLights(
    scene,
    root,
    {
      sky: '#eef2f6',
      ground: '#7d6a52',
      k: 1.05,
      key: { color: '#fff4e2', k: 1.0, at: [-5, 16, 8] },
      lamps: [
        ...[-6.4, 0, 6.4].map((x) => ({ at: [x, 1.9, -2.5], color: '#fff3df', k: 0.85, reach: 4.2 })),
        ...[-6.0, -0.5, 5.5].map((x) => ({ at: [x, 1.9, -9.6], color: '#f4f6f2', k: 0.9, reach: 4.6 })),
      ],
    },
    R,
  );
  const fz = GLASS_Z + 0.75; // in front of the changing block's doors
  return {
    root,
    scene,
    sun,
    nav,
    bounds: R,
    // the doors: where he stands inside them (edge), and where he walks in to (in)
    door: { edge: [0, 0.35], in: [0, -2.0], out: [0, -0.9] },
    // each changing room's door (edge, on its threshold) and the step in front of it (out)
    changing: {
      men: { edge: [CHANGING.men, GLASS_Z - 0.1], out: [CHANGING.men, fz] },
      women: { edge: [CHANGING.women, GLASS_Z - 0.1], out: [CHANGING.women, fz] },
    },
    terminal: desk.terminal,
    printer: desk.printer,
    fan: desk.fan,
    desk: { ry: Math.PI / 2, top: COUNTER.h }, // the machines face east, into the lobby
    board,
    spots: {
      gym_desk: [FRONT + 0.68, TERM_Z],
      gym_printer: [desk.printer[0] + 0.85, desk.printer[2]],
      gym_fan: [FRONT + 0.68, desk.fan[2]],
      gym_board: [board[0], GLASS_Z + 0.9],
      gym_lobby: lob.seats,
      gym_benches: [R.x0 + 1.3, -7.4],
      gym_meeting: [MEETING.x0 - 0.6, -10.8],
      gym_court: [COURT.x + 1.6, COURT.z + 0.4],
      gym_store: [STORE.door[0] + 0.4, STORE.z1 - 0.2],
      gym_lockers: entry.lockers,
    },
    seats: BENCHES.map(([x, z]) => ({ x: x + 0.02, z, top: 0.24, ry: Math.PI / 2 })),
    camera: { elev: 52, fov: 24 },
  };
}

// the hall's glass wall across the lobby's north side, from the west wall to the pier: a dark kick rail, mullions,
// a head rail, glass between; its double doors on the entrance's axis standing open into the hall; アリーナ SPORTS
// HALL over them
function glassWall(kit, nav, signs) {
  const z = GLASS_Z,
    h = R.h;
  const run = (a, b) => {
    kit.box(C.frame, b - a, 0.14, 0.08, (a + b) / 2, 0, z);
    kit.box(C.frame, b - a, 0.06, 0.08, (a + b) / 2, h - 0.06, z);
    const n = Math.max(1, Math.round((b - a) / 1.3));
    for (let i = 0; i <= n; i++) kit.box(C.frame, 0.05, h, 0.08, a + ((b - a) * i) / n, 0, z);
    kit.add(C.glass, new THREE.PlaneGeometry(b - a, h - 0.2).translate((a + b) / 2, 0.14 + (h - 0.2) / 2, z), {
      cast: false,
      opts: { transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false },
    });
    nav.block(a, b, z - 0.08, z + 0.08);
  };
  run(R.x0, HALL_DOOR[0]);
  run(HALL_DOOR[1], PIER[0]);
  // the door's head over the opening, and its two glass leaves standing open against the hall's side
  const [d0, d1] = HALL_DOOR;
  kit.box(C.frame, d1 - d0, 0.3, 0.08, 0, h - 0.3, z);
  for (const [x, s] of [
    [d0, 1],
    [d1, -1],
  ]) {
    kit.box(C.frame, 0.04, 1.5, 0.95, x + s * 0.05, 0, z - 0.52);
    kit.add(C.glass, new THREE.PlaneGeometry(0.85, 1.38).rotateY(Math.PI / 2).translate(x + s * 0.05, 0.75, z - 0.52), {
      cast: false,
      opts: { transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false },
    });
    nav.block(x + s * 0.05 - 0.06, x + s * 0.05 + 0.06, z - 1.0, z);
  }
  // the pier: solid wall, plaster to the head rail
  kit.box(C.wall, PIER[1] - PIER[0], h, 0.16, (PIER[0] + PIER[1]) / 2, 0, z, {
    surf: 'plaster',
  });
  signs.board('アリーナ', 'SPORTS HALL', '#3f8f6a', 1.4, 0.34, [0, h - 0.17, z + 0.06], 0);
}

// the changing block: its walls (the front on the hall's line, the west and north walls in the hall, a flat roof
// over), and in its front the men's and women's doors, a curtain hung in each open doorway over the dark beyond, the
// pool corridor's glass door, the pool's notice between
function changing(kit, nav, signs) {
  const { x0, x1, z0, z1 } = BLOCK,
    h = R.h,
    t = 0.14;
  kit.box(C.wall, x1 - x0, h, t, (x0 + x1) / 2, 0, z1 - t / 2, {
    surf: 'plaster',
  });
  kit.box(C.wall, t, h, z1 - z0, x0 + t / 2, 0, (z0 + z1) / 2, {
    surf: 'plaster',
  });
  kit.box(C.wall, x1 - x0, h, t, (x0 + x1) / 2, 0, z0 + t / 2, {
    surf: 'plaster',
  });
  kit.box(C.roof, x1 - x0 + 0.04, 0.05, z1 - z0 + 0.04, (x0 + x1) / 2, h, (z0 + z1) / 2, { surf: 'paint' });
  // the roof's parapet: a pale rim round its edge, and a vent box on it
  for (const [w, d, x, z] of [
    [x1 - x0 + 0.04, 0.08, (x0 + x1) / 2, z1 - 0.02],
    [x1 - x0 + 0.04, 0.08, (x0 + x1) / 2, z0 + 0.02],
    [0.08, z1 - z0, x0 + 0.02, (z0 + z1) / 2],
  ])
    kit.box(C.wall, w, 0.08, d, x, h + 0.05, z, { surf: 'plaster' });
  kit.box(C.locker, 0.9, 0.3, 0.6, x1 - 1.4, h + 0.05, z0 + 1.2, { r: 0.01, surf: 'metal' });
  kit.box(C.frame, 0.7, 0.02, 0.4, x1 - 1.4, h + 0.35, z0 + 1.2);
  // the hall's wainscot and rail on its two hall-side walls
  kit.box(C.wainscot, 0.03, 0.8, z1 - z0 - t, x0 - 0.015, 0, (z0 + z1) / 2, {
    surf: 'laminate',
  });
  kit.box(C.wainscot, x1 - x0, 0.8, 0.03, (x0 + x1) / 2, 0, z0 - 0.015, {
    surf: 'laminate',
  });
  nav.block(x0 - 0.08, x1, z0 - 0.08, z1 + 0.06);
  const { w, h: dh } = CHANGING,
    fz = z1 + 0.005;
  const doorway = (x, cloth, kana, en) => {
    kit.box(C.frame, w + 0.1, dh + 0.05, 0.03, x, 0, fz);
    kit.box(C.dark, w, dh, 0.032, x, 0, fz + 0.002, { cast: false });
    // the noren: two panels of cloth hung from a rod across the top of the opening, a slit between them
    kit.box(C.steel, w + 0.04, 0.02, 0.02, x, dh - 0.04, fz + 0.03);
    for (const s of [-1, 1])
      kit.box(cloth, w / 2 - 0.02, 0.55, 0.012, x + (s * w) / 4, dh - 0.6, fz + 0.035, { surf: 'fabric' });
    signs.board(kana, en, cloth, 0.86, 0.24, [x, dh + 0.2, fz + 0.03], 0);
  };
  doorway(CHANGING.men, C.blue, '男子更衣室', 'MEN · CHANGING');
  doorway(CHANGING.women, C.red, '女子更衣室', 'WOMEN · CHANGING');
  // the pool corridor's door: glass in a dark frame, shut
  const px = CHANGING.pool;
  kit.box(C.frame, w + 0.1, dh + 0.05, 0.04, px, 0, fz);
  kit.box('#9fb8c4', w - 0.08, dh - 0.12, 0.045, px, 0.06, fz, {
    opts: { emissive: '#9fb8c4', emissiveIntensity: 0.25 },
  });
  kit.box(C.steel, 0.03, 0.3, 0.03, px - w / 2 + 0.12, 0.5, fz + 0.04, {
    surf: 'metal',
  });
  signs.board('プール', 'POOL', '#2f8a9a', 0.86, 0.24, [px, dh + 0.2, fz + 0.03], 0);
  // the AED in its white box on the wall east of the pool door, in sight of the whole lobby
  const ax = (px + w / 2 + x1) / 2 + 0.03,
    az = z1 + 0.03;
  kit.box('#f2f2ee', 0.3, 0.34, 0.04, ax, 0.42, az, { surf: 'plastic' });
  kit.box(C.red, 0.3, 0.08, 0.045, ax, 0.68, az + 0.002);
  kit.box('#3f8f6a', 0.06, 0.06, 0.046, ax, 0.52, az + 0.003, {
    opts: { emissive: '#3f8f6a', emissiveIntensity: 0.6 },
  });
  // between the changing rooms: the pool's notice for the season, white
  const nx = (CHANGING.men + CHANGING.women) / 2;
  signs.drawn(poolNotice, 0.62, 0.5, [nx, 0.95, fz + 0.03], 0);
  return { men: CHANGING.men, women: CHANGING.women };
}
// the notice: the outdoor pool's last day this season, the hall from the week after (story/day3/gym.js d3_gym_board)
function poolNotice(g, W, H) {
  g.fillStyle = '#f4f2ec';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#2f8a9a';
  g.fillRect(0, 0, W, H * 0.24);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 ${Math.round(H * 0.15)}px sans-serif`;
  g.fillText('OUTDOOR POOL', W / 2, H * 0.125);
  g.fillStyle = '#2a2d33';
  g.font = `700 ${Math.round(H * 0.13)}px sans-serif`;
  g.fillText('Last swim: Sat 3 Oct', W / 2, H * 0.42);
  g.font = `${Math.round(H * 0.105)}px sans-serif`;
  g.fillText('Swimming club meets', W / 2, H * 0.64);
  g.fillText('in the hall from 10 Oct', W / 2, H * 0.8);
}
