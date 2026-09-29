// Option dorm-route-claude: the outdoor walk from head office to the dorm, the dorm and Eric's room, built as a
// still diorama from the game's own code (props.js, look/ surface patterns and baked light, post.js grade), so it
// looks like the game. Not a runtime place: stills for review only.
//   index.html?shot=layout|route|walk|dorm|court|room[&time=day|dusk]
// Units as in the game: 1 unit is about 1.5 m. x runs east, z runs south (north is up on screen).
// Positions follow island-03 (art/candidates/island-map-3/07-overview.png): head office by the station in the west,
// the covered shopping street south of the fountain square, its east end (izakaya) next to the apartment blocks.
import * as THREE from 'three';
import { createRenderer, blob, Q } from '/game3d/js/engine.js';
import { makePost } from '/game3d/js/post.js';
import { RoomCam } from '/game3d/js/cam.js';
import { PAL, mat, emissive, rbox, textTexture, JP_FONT, lampPost, bench, plant, door } from '/game3d/js/props.js';
import { applyLook } from '/game3d/js/look/index.js';
import { PROC } from '/game3d/js/look/procedural.js';
import { loadEric } from '/game3d/js/avatar.js';

const SHOT = Q.get('shot') || 'route';
const DAY = (Q.get('time') || (SHOT === 'layout' ? 'day' : 'dusk')) === 'day';
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- the plan (also read by the layout labels) ----------
export const PLAN = {
  hq: { x0: -32, x1: -14, z0: -12, z1: 2, h: 4.5 },
  tower: { x0: -30, x1: -18, z0: -11, z1: -2, h: 26 },
  hqDoor: [-21, 2],
  racks: { x0: -31, x1: -24, z: 6.2 },
  north: { x0: -14, x1: 2, z0: 5, z1: 9 }, // shotengai north row (shops face south onto the lane)
  south: { x0: -14, x1: 2, z0: 13.2, z1: 17 }, // south row (shops face north into the arcade and south onto the promenade)
  lane: { z0: 9, z1: 13.2 },
  izakaya: { x0: 7, x1: 12.2, z0: -3.8, z1: 0.6 }, // faces south onto the courtyard
  A: { x0: 16, x1: 28, z0: 3, z1: 10, floors: 4 }, // dorm block A (entrance block)
  B: { x0: 16, x1: 28, z0: -5.3, z1: 1.7, floors: 5 }, // dorm block B, behind; the court between is 1.3 units (2 m)
  dormDoor: [16, 6.5],
  bath: { x0: 16, x1: 23, z0: 11, z1: 17 }, // coin laundry (north part) and sento (south part)
  shelter: { x0: 12.6, x1: 15.6, z0: -3, z1: 1.8 },
  room: { x0: 24.2, x1: 26.0, z0: 3.0, z1: 5.4, h: 1.7 }, // Eric's room: ground floor, north side of A
  fountain: [-4, -3.5],
};
const FH = 2.0; // storey height

// ---------- small builders ----------
function box(w, h, d, color, x, y, z, { surf, m, r = 0.02, cast = true } = {}) {
  const b = rbox(w, h, d, color, { x, y, z, r, seg: 1, m, cast });
  if (surf) b.userData.surf = surf;
  return b;
}
function flat(color, opts = {}) {
  return mat(color, { flatShading: true, ...opts });
}
const glowMat = (c, k = 1.3) => emissive(c, c, k);
const LIT = () => (DAY ? mat('#6f8398', { roughness: 0.3 }) : glowMat('#f2d7a4', 0.9));
const DARKWIN = () => mat(DAY ? '#56687c' : '#2c3544', { roughness: 0.35 });

function sign(text, w, h, { bg = '#f2efe8', fg = '#2b2f36', size = 0.62, glow = 0, font = JP_FONT, vertical = false } = {}) {
  const tex = textTexture(
    (g, W, H) => {
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      if (vertical) {
        const chars = [...text],
          fs = Math.min(W * size, (H / chars.length) * 0.9);
        g.font = `700 ${fs}px ${font}`;
        chars.forEach((c, i) => g.fillText(c, W / 2, (H / chars.length) * (i + 0.5)));
      } else {
        g.font = `700 ${H * size}px ${font}`;
        g.fillText(text, W / 2, H / 2 + H * 0.03);
      }
    },
    vertical ? 128 : 512,
    vertical ? 512 : Math.round((512 * h) / w),
  );
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
  if (glow) {
    m.emissive = new THREE.Color('#ffffff');
    m.emissiveMap = tex;
    m.emissiveIntensity = glow;
  }
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  p.userData.noLook = true;
  return p;
}
function light(scene, x, y, z, color = '#ffc98a', k = 2.4, dist = 6) {
  if (DAY) return;
  const p = new THREE.PointLight(color, k, dist, 1.8);
  p.position.set(x, y, z);
  scene.add(p);
}

// a row of windows on one face of a block. face: 'n' | 's' | 'e' | 'w'
function windows(g, b, face, { floors, from = 0, w = 0.9, h = 0.9, step = 1.6, sill = 0.55, lit = 0.35, seed = 1, skip = () => false, balcony = false } = {}) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const alongX = face === 'n' || face === 's';
  const a0 = alongX ? b.x0 : b.z0,
    a1 = alongX ? b.x1 : b.z1;
  const out = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[face];
  const plane = face === 'n' ? b.z0 : face === 's' ? b.z1 : face === 'e' ? b.x1 : b.x0;
  const n = Math.floor((a1 - a0) / step);
  const pad = (a1 - a0 - n * step) / 2;
  for (let f = from; f < floors; f++) {
    for (let i = 0; i < n; i++) {
      if (skip(f, i)) continue;
      const a = a0 + pad + step * (i + 0.5),
        y = f * FH + sill;
      const on = rnd() < lit;
      const px = alongX ? a : plane + out[0] * 0.02,
        pz = alongX ? plane + out[1] * 0.02 : a;
      const pane = box(alongX ? w : 0.06, h, alongX ? 0.06 : w, null, px, y, pz, { m: on ? LIT() : DARKWIN(), cast: false });
      pane.userData.noLook = on;
      g.add(pane);
      // frame and sill
      g.add(box(alongX ? w + 0.12 : 0.1, 0.06, alongX ? 0.1 : w + 0.12, '#c9c6bf', px + out[0] * 0.04, y - 0.06, pz + out[1] * 0.04, { surf: 'concrete' }));
      if (balcony) {
        const bx = alongX ? a : plane + out[0] * 0.45,
          bz = alongX ? plane + out[1] * 0.45 : a;
        g.add(box(alongX ? step - 0.1 : 0.9, 0.08, alongX ? 0.9 : step - 0.1, '#b9b4ab', bx, f * FH + 0.02, bz, { surf: 'concrete' }));
        const rx = alongX ? a : plane + out[0] * 0.88,
          rz = alongX ? plane + out[1] * 0.88 : a;
        g.add(box(alongX ? step - 0.1 : 0.06, 0.5, alongX ? 0.06 : step - 0.1, '#9aa0aa', rx, f * FH + 0.1, rz, { surf: 'metal' }));
      }
    }
  }
}

// ---------- roofs: a parapet, air-con units, a water tank or a stair hut, so roofs seen from above aren't blank ----------
function roofStuff(g, x0, x1, z0, z1, y, seed = 1) {
  let s = Math.abs(Math.round(seed * 97 + 13)) % 233280; // a negative seed would scatter units off the roof
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const w = x1 - x0,
    d = z1 - z0;
  for (const [pw, pd, px, pz] of [
    [w, 0.12, (x0 + x1) / 2, z0 + 0.06],
    [w, 0.12, (x0 + x1) / 2, z1 - 0.06],
    [0.12, d, x0 + 0.06, (z0 + z1) / 2],
    [0.12, d, x1 - 0.06, (z0 + z1) / 2],
  ])
    g.add(box(pw, 0.25, pd, '#9da1a6', px, y, pz, { surf: 'concrete', cast: false }));
  const n = Math.max(1, Math.round((w * d) / 14));
  for (let i = 0; i < n; i++) {
    const ux = x0 + 0.6 + rnd() * (w - 1.2),
      uz = z0 + 0.6 + rnd() * (d - 1.2);
    g.add(box(0.6, 0.4, 0.4, '#d3d4d0', ux, y, uz, { surf: 'plastic' }));
  }
  if (w * d > 30) {
    const k = rnd();
    if (k < 0.5) g.add(box(1.6, 1.0, 1.4, '#a9aba8', x0 + w * 0.3, y, z0 + d * 0.35, { surf: 'concrete' }));
    else {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 12), mat('#8fa6b8'));
      t.position.set(x0 + w * 0.7, y + 0.6, z0 + d * 0.4);
      t.castShadow = true;
      t.userData.surf = 'metal';
      g.add(t);
      for (const [a, b] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) g.add(box(0.06, 0.2, 0.06, PAL.dark, t.position.x + a, y, t.position.z + b, { surf: 'metal' }));
    }
  }
}
function lanePlanter(x, z, seed) {
  const g = new THREE.Group();
  g.add(box(0.8, 0.4, 0.4, '#b3aea5', 0, 0, 0, { surf: 'ceramic' }));
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), flat(PAL.leaf[(i + seed) % 5]));
    m.position.set(-0.22 + i * 0.22, 0.52, 0);
    m.castShadow = true;
    m.userData.surf = 'paint';
    g.add(m);
  }
  g.position.set(x, 0, z);
  return g;
}

// ---------- props of the outdoors ----------
function tree(x, z, s = 1, seed = 1) {
  const g = new THREE.Group();
  g.add(box(0.14 * s, 1.1 * s, 0.14 * s, '#5b4d43', 0, 0, 0, { surf: 'paint' }));
  const leaves = PAL.leaf;
  const k = [
    [0, 1.55, 0, 0.75],
    [0.35, 1.3, 0.15, 0.5],
    [-0.3, 1.35, -0.2, 0.55],
  ];
  k.forEach(([dx, dy, dz, r], i) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 0), flat(leaves[(i + seed) % leaves.length]));
    m.position.set(dx * s, dy * s, dz * s);
    m.rotation.set(seed + i, seed * 2 + i, 0);
    m.castShadow = m.receiveShadow = true;
    m.userData.surf = 'paint';
    g.add(m);
  });
  // a square tree pit
  g.add(box(0.9 * s, 0.05, 0.9 * s, '#6e6a66', 0, 0, 0, { surf: 'stone', cast: false }));
  g.add(box(0.7 * s, 0.06, 0.7 * s, '#4b3f38', 0, 0, 0, { surf: 'soil', cast: false }));
  g.position.set(x, 0, z);
  return g;
}
function streetLamp(scene, x, z) {
  const g = new THREE.Group();
  g.add(box(0.1, 2.5, 0.1, PAL.dark, 0, 0, 0, { surf: 'metal' }));
  g.add(box(0.5, 0.06, 0.1, PAL.dark, 0.2, 2.45, 0, { surf: 'metal' }));
  g.add(box(0.26, 0.08, 0.16, null, 0.4, 2.38, 0, { m: DAY ? mat('#d8d4c8') : glowMat('#ffe2b8', 2.0), cast: false }));
  g.position.set(x, 0, z);
  scene.add(g);
  light(scene, x + 0.4, 2.2, z, '#ffd6a0', 3.2, 7);
  return g;
}
const BIKE_COL = ['#39465e', '#b9bcc0', '#5d7058', '#d8d1bf', '#7a3d3a', '#2f333b', '#8b939e'];
function bike(color, x, z, ry = 0) {
  const g = new THREE.Group();
  const tyre = mat('#23262c');
  for (const dx of [-0.34, 0.34]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 16), tyre);
    w.position.set(dx, 0.23, 0);
    w.castShadow = true;
    w.userData.surf = 'plastic';
    g.add(w);
  }
  const fm = mat(color);
  const bar = (len, x0, y0, rz) => {
    const b = box(len, 0.04, 0.04, null, 0, 0, 0, { m: fm });
    b.position.set(x0, y0, 0);
    b.rotation.z = rz;
    g.add(b);
  };
  bar(0.5, 0, 0.36, 0);
  bar(0.34, -0.2, 0.3, 1.1);
  bar(0.34, 0.26, 0.3, -1.2);
  g.add(box(0.14, 0.04, 0.07, '#2c2f35', -0.14, 0.52, 0, { surf: 'plastic' })); // saddle
  g.add(box(0.04, 0.04, 0.34, PAL.metal, 0.3, 0.56, 0, { surf: 'metal' })); // handlebar
  g.add(box(0.16, 0.1, 0.16, '#9aa0aa', 0.44, 0.44, 0, { surf: 'metal' })); // front basket
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  return g;
}
function bikeRow(scene, x0, x1, z, ry, seed = 0, fill = 0.8) {
  const g = new THREE.Group();
  // the rack: a low steel rail with slots
  g.add(box(x1 - x0, 0.12, 0.08, PAL.metal, (x0 + x1) / 2, 0.08, z, { surf: 'metal' }));
  for (let x = x0 + 0.1; x < x1; x += 0.36) g.add(box(0.03, 0.2, 0.3, PAL.metal, x, 0, z, { surf: 'metal' }));
  let i = seed;
  for (let x = x0 + 0.2; x < x1 - 0.1; x += 0.36) {
    i++;
    if ((i * 37) % 10 >= fill * 10) continue;
    g.add(bike(BIKE_COL[i % BIKE_COL.length], x, z + 0.32, ry));
  }
  scene.add(g);
}
function vending(color, x, z, ry) {
  const g = new THREE.Group();
  g.add(box(0.62, 1.2, 0.5, color, 0, 0, 0, { surf: 'metal' }));
  g.add(box(0.5, 0.55, 0.02, null, 0, 0.5, 0.26, { m: DAY ? mat('#dfe6ea') : glowMat('#eef3f5', 1.1), cast: false }));
  g.add(box(0.5, 0.12, 0.04, '#2f333b', 0, 0.12, 0.26, { surf: 'plastic' }));
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  return g;
}

// ---------- shotengai shop bays ----------
// kind: konbini | bakery | ramen | shop | shutter | tea
function shopBay(scene, g, x0, x1, zFace, dir, kind, h1 = 2.2) {
  const w = x1 - x0,
    cx = (x0 + x1) / 2,
    zf = zFace + dir * 0.03;
  const lit = kind !== 'shutter';
  if (kind === 'shutter') {
    const sh = new THREE.Group();
    sh.add(box(w - 0.2, 1.9, 0.06, '#9ca1a8', cx, 0, zf, { surf: 'metal' }));
    for (let y = 0.1; y < 1.9; y += 0.16) sh.add(box(w - 0.2, 0.02, 0.02, '#858b95', cx, y, zf + dir * 0.04, { cast: false }));
    g.add(sh);
  } else {
    // shop window: lit interior colour behind glass, a counter and shelves as blocks
    const inside = { konbini: '#f4f6f2', bakery: '#f3dcae', ramen: '#f0cf9e', shop: '#efe2c6', tea: '#e9dcc0' }[kind];
    const glass = box(w - 0.3, 1.75, 0.05, null, cx, 0.05, zf, { m: DAY ? mat('#8fa3b4', { roughness: 0.25 }) : glowMat(inside, kind === 'konbini' ? 0.75 : 0.85), cast: false });
    glass.userData.noLook = true;
    g.add(glass);
    for (let x = x0 + 0.5; x < x1 - 0.3; x += 0.7) g.add(box(0.04, 1.75, 0.07, PAL.trim, x, 0.05, zf + dir * 0.01, { surf: 'metal', cast: false }));
    light(scene, cx, 1.4, zFace + dir * 0.9, kind === 'konbini' ? '#f4f7ff' : '#ffcf92', kind === 'konbini' ? 2.2 : 2.0, 4.5);
  }
  // fascia sign
  const signs = {
    konbini: ['コンビニ', '#f7f7f4', '#2c6f8a'],
    bakery: ['パン', '#f0e2c4', '#6a4a36'],
    ramen: ['ラーメン', '#b8403a', '#fff7ec'],
    shop: ['文具', '#e7e2d6', '#333a46'],
    tea: ['お茶', '#3e5a4a', '#f2efe6'],
    shutter: [null, '#7e848c', null],
  }[kind];
  const fascia = box(w - 0.1, 0.42, 0.12, signs[1], cx, 1.95, zFace + dir * 0.06, { surf: 'paint' });
  g.add(fascia);
  if (signs[0]) {
    const s = sign(signs[0], Math.min(w * 0.6, 1.6), 0.34, { bg: signs[1], fg: signs[2], glow: DAY ? 0 : 0.8 });
    s.position.set(cx, 2.16, zFace + dir * 0.125);
    if (dir < 0) s.rotation.y = Math.PI;
    g.add(s);
  }
  if (kind === 'konbini') {
    // the stripe the shops use, three colours, no brand
    [['#2c6f8a', 0], ['#e0a040', 1], ['#4f9a6a', 2]].forEach(([c, i]) =>
      g.add(box(w - 0.1, 0.05, 0.13, c, cx, 1.9 - i * 0.06, zFace + dir * 0.065, { cast: false })),
    );
  }
  if (kind === 'ramen' || kind === 'tea') {
    // a noren over the door
    const nc = kind === 'ramen' ? '#7a2e2a' : '#2f4a5e';
    for (let i = 0; i < 3; i++) g.add(box(0.28, 0.5, 0.02, nc, x0 + 0.6 + i * 0.3, 1.35, zFace + dir * 0.2, { surf: 'fabric', cast: false }));
  }
}

// ---------- the world ----------
function buildWorld(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const P = PLAN;

  // ground: plain paving everywhere, lighter tiles where people walk
  root.add(box(140, 0.1, 76.5, '#7f828a', 0, -0.1, -16.75, { surf: 'concrete', r: 0.01, cast: false }));
  const pave = (x0, x1, z0, z1, c, surf = 'tile') => {
    const b = box(x1 - x0, 0.04, z1 - z0, c, (x0 + x1) / 2, -0.03, (z0 + z1) / 2, { surf, r: 0.01, cast: false });
    b.userData.tile = [x0, z0, 1.0];
    root.add(b);
  };
  pave(-34, -12, 2, 9, '#a4a2a7'); // head office forecourt
  pave(-14, 2, 9, 13.2, '#a39d94'); // the covered lane
  pave(2, 16, -4, 17, '#99968f'); // the courtyard at the east end
  pave(-12, 16, 2.2, 4.8, '#92959c', 'stone'); // the street along the fountain square
  // sea and seawall to the south
  root.add(box(140, 0.1, 30, '#2f5f80', 0, -0.6, 36, { m: mat('#2f5f80', { roughness: 0.2 }), cast: false }));
  root.add(box(56, 0.7, 0.8, '#8d8f93', 6, -0.6, 21.2, { surf: 'stone' }));
  pave(-22, 34, 17, 21, '#8f8b84', 'tile'); // the promenade (the walk)
  pave(-22, -12, 9, 17, '#a4a2a7'); // from the forecourt down to the promenade

  // --- head office: glass podium with the lobby, tower above ---
  const hq = new THREE.Group();
  const { x0, x1, z0, z1, h } = P.hq;
  hq.add(box(x1 - x0, h, z1 - z0, '#5c6778', (x0 + x1) / 2, 0, (z0 + z1) / 2, { surf: 'plaster' }));
  // lobby glass front: tall panes, the doors, a canopy
  for (let x = x0 + 1; x < x1 - 0.5; x += 1.2) {
    const pane = box(1.1, 2.6, 0.05, null, x + 0.55, 0.05, z1 + 0.03, { m: DAY ? mat('#8ea4b8', { roughness: 0.2 }) : glowMat('#e7cfa2', 0.55), cast: false });
    pane.userData.noLook = true;
    hq.add(pane);
    hq.add(box(0.06, 2.7, 0.08, PAL.dark, x, 0, z1 + 0.05, { surf: 'metal', cast: false }));
  }
  hq.add(box(x1 - x0, 0.2, 0.12, PAL.dark, (x0 + x1) / 2, 2.65, z1 + 0.06, { surf: 'metal' }));
  const [dx] = P.hqDoor;
  hq.add(box(3.4, 0.14, 2.0, '#474d57', dx, 2.9, z1 + 1.0, { surf: 'metal' })); // canopy
  for (const s of [-1, 1]) hq.add(box(0.1, 2.9, 0.1, PAL.dark, dx + s * 1.6, 0, z1 + 1.9, { surf: 'metal' }));
  hq.add(box(2.4, 0.02, 1.4, '#2f3a52', dx, 0, z1 + 0.8, { surf: 'carpet', cast: false })); // the navy mat, as in the lobby
  const hs = sign('本社', 1.4, 0.45, { bg: '#2f333b', fg: '#eef0f4', glow: DAY ? 0 : 0.6 });
  hs.position.set(dx, 3.25, z1 + 2.01);
  hq.add(hs);
  for (const s of [-1, 1]) {
    const lp = lampPost();
    lp.position.set(dx + s * 1.3, 0, z1 + 2.5);
    hq.add(lp);
  }
  light(scene, dx, 2.5, z1 + 1.2, '#ffd6a0', 3.0, 6);
  // tower
  const T = P.tower;
  hq.add(box(T.x1 - T.x0, T.h, T.z1 - T.z0, '#687588', (T.x0 + T.x1) / 2, h, (T.z0 + T.z1) / 2, { surf: 'plaster' }));
  roofStuff(hq, x0, x1, T.z1 + 0.2, z1, h, 2);
  roofStuff(hq, T.x0, T.x1, T.z0, T.z1, h + T.h, 5);
  windows(hq, { ...T, x0: T.x0, x1: T.x1 }, 's', { floors: 11, from: 3, w: 0.9, h: 1.2, step: 1.2, sill: 0.4, lit: 0.45, seed: 3 });
  windows(hq, T, 'e', { floors: 11, from: 3, w: 0.9, h: 1.2, step: 1.2, sill: 0.4, lit: 0.3, seed: 5 });
  // the covered link west to the station (a stub, the station is out of frame)
  hq.add(box(4, 1.6, 2.2, '#8ea4b8', x0 - 2, 2.2, -6, { m: mat('#8ea4b8', { roughness: 0.2 }) }));
  root.add(hq);

  // forecourt: bike racks, benches, planters
  bikeRow(root, P.racks.x0, P.racks.x1, P.racks.z, Math.PI / 2, 1, 0.75);
  bikeRow(root, P.racks.x0, P.racks.x1, P.racks.z + 1.4, -Math.PI / 2, 4, 0.6);
  const rs = sign('駐輪場', 1.1, 0.3, { bg: '#e8e6e0', fg: '#2c3a52' });
  const rsg = new THREE.Group();
  rsg.add(box(0.06, 1.1, 0.06, PAL.dark, 0, 0, 0, { surf: 'metal' }));
  rs.position.set(0, 1.2, 0.04);
  rsg.add(rs);
  rsg.position.set(P.racks.x1 + 0.4, 0, P.racks.z + 0.7);
  root.add(rsg);
  for (const [x, z] of [[-16, 3.2], [-26, 3.2]]) {
    const b = bench(1.6);
    b.position.set(x, 0, z);
    root.add(b);
  }
  for (const x of [-33, -13.5]) root.add(tree(x, 8.2, 1.1, 2));
  root.add(tree(-24, 3.4, 1.0, 1));

  // --- the fountain square, north of the street (only its south edge matters) ---
  const [fx, fz] = P.fountain;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.4, 0.45, 24), mat('#b3aea5'));
  rim.position.set(fx, 0.2, fz);
  rim.userData.surf = 'stone';
  rim.castShadow = rim.receiveShadow = true;
  root.add(rim);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 0.05, 24), mat('#5d8fb0', { roughness: 0.15 }));
  water.position.set(fx, 0.42, fz);
  water.userData.noLook = true;
  root.add(water);
  root.add(box(0.6, 1.0, 0.6, '#c7c3bb', fx, 0.4, fz, { surf: 'stone' }));
  pave(-12, 4, -11, 2.2, '#9d9a94', 'stone');
  for (const [x, z] of [[-10, -1], [2, -1], [-10, -7], [2, -7]]) root.add(tree(x, z, 1.0, (x + z) & 3));
  for (const x of [-8, 0]) {
    const b = bench(1.6);
    b.position.set(x, 0, 1.2);
    b.rotation.y = Math.PI;
    root.add(b);
  }
  // blocks behind the square (the office district), plain, to fill the top of the frame
  for (const [bx0, bx1, bz0, bz1, bh, c] of [
    [-12, -4, -22, -13, 7, '#7a8494'],
    [-2, 7, -21, -13, 9, '#6f7a8b'],
    [8, 14, -18, -9, 6, '#7f8898'],
    [30, 40, -16, -6, 8, '#b7b1a6'],
    [30, 40, 4, 14, 8, '#bdb7ac'],
  ]) {
    const g = new THREE.Group();
    g.add(box(bx1 - bx0, bh, bz1 - bz0, c, (bx0 + bx1) / 2, 0, (bz0 + bz1) / 2, { surf: 'plaster' }));
    roofStuff(g, bx0, bx1, bz0, bz1, bh, bx0 + bz0);
    windows(g, { x0: bx0, x1: bx1, z0: bz0, z1: bz1 }, 's', { floors: Math.floor(bh / FH), lit: 0.3, seed: bx0 & 7 });
    windows(g, { x0: bx0, x1: bx1, z0: bz0, z1: bz1 }, 'w', { floors: Math.floor(bh / FH), lit: 0.25, seed: bz0 & 7 });
    root.add(g);
  }

  // --- the shotengai: two rows of two-storey shops, a glass canopy over the lane ---
  const N = P.north,
    S = P.south;
  // arcade-facing shop kinds, five bays a row; the south row also has a front onto the promenade (the walk)
  const rowKinds = {
    n: ['shop', 'ramen', 'shutter', 'bakery', 'shutter'],
    s: ['tea', 'shutter', 'shop', 'shutter', 'shop'],
    sea: ['tea', 'shutter', 'shop', 'konbini', 'konbini'],
  };
  const BAYS = 5;
  const rowCols = ['#b7b0a4', '#a9a49c', '#bdb6a9', '#9fa3a8', '#b3ada2', '#aaa59b'];
  for (const [key, R, face, dir] of [
    ['n', N, N.z1, 1],
    ['s', S, S.z0, -1],
  ]) {
    const g = new THREE.Group();
    const bw = (R.x1 - R.x0) / BAYS;
    for (let i = 0; i < BAYS; i++) {
      const bx0 = R.x0 + i * bw,
        bx1 = bx0 + bw,
        hh = 4.2 + ((i * 7 + (key === 's' ? 1 : 0)) % 3) * 0.35;
      g.add(box(bw - 0.04, hh, R.z1 - R.z0, rowCols[(i + (key === 's' ? 2 : 0)) % 6], (bx0 + bx1) / 2, 0, (R.z0 + R.z1) / 2, { surf: 'plaster' }));
      g.add(box(bw - 0.02, 0.12, R.z1 - R.z0 + 0.1, '#8b939e', (bx0 + bx1) / 2, hh, (R.z0 + R.z1) / 2, { surf: 'concrete' }));
      roofStuff(g, bx0 + 0.05, bx1 - 0.05, R.z0, R.z1, hh + 0.12, i + (key === 's' ? 7 : 0));
      shopBay(scene, g, bx0, bx1, face, dir, rowKinds[key][i]);
      const win = box(1.2, 0.8, 0.05, null, (bx0 + bx1) / 2, 2.8, face + dir * 0.03, { m: (i + key.length) % 3 === 0 ? LIT() : DARKWIN(), cast: false });
      win.userData.noLook = true;
      g.add(win);
      if (key === 's') {
        // the seaward front: the walk passes these; the konbini takes the last two bays as one shop
        const kind = rowKinds.sea[i];
        if (!(kind === 'konbini' && i === BAYS - 1)) shopBay(scene, g, bx0, kind === 'konbini' ? bx1 + bw : bx1, R.z1, 1, kind);
        const up = box(1.2, 0.8, 0.05, null, (bx0 + bx1) / 2, 2.8, R.z1 + 0.03, { m: (i * 2) % 3 === 0 ? LIT() : DARKWIN(), cast: false });
        up.userData.noLook = true;
        g.add(up);
      }
    }
    if (key === 'n') {
      // the north row's back onto the fountain street: small windows and air-con units
      for (let x = R.x0 + 1.5; x < R.x1 - 1; x += 3.2) {
        g.add(box(0.7, 0.5, 0.05, null, x, 2.9, R.z0 - 0.03, { m: DARKWIN(), cast: false }));
        g.add(box(0.7, 0.5, 0.35, '#d6d6d2', x + 1.0, 0.0, R.z0 - 0.2, { surf: 'plastic' }));
      }
    }
    root.add(g);
  }
  // konbini: its side onto the courtyard too, two vending machines and bins at the corner
  const kg = new THREE.Group(),
    kz = (S.z0 + S.z1) / 2 + 0.6;
  const kglass = box(0.05, 1.75, 2.4, null, S.x1 + 0.03, 0.05, kz, { m: DAY ? mat('#8fa3b4', { roughness: 0.25 }) : glowMat('#f4f6f2', 0.75), cast: false });
  kglass.userData.noLook = true;
  kg.add(kglass);
  kg.add(box(0.12, 0.42, S.z1 - S.z0 - 0.2, '#f7f7f4', S.x1 + 0.06, 1.95, (S.z0 + S.z1) / 2, { surf: 'paint' }));
  [['#2c6f8a', 0], ['#e0a040', 1], ['#4f9a6a', 2]].forEach(([c, i]) => kg.add(box(0.13, 0.05, S.z1 - S.z0 - 0.2, c, S.x1 + 0.065, 1.9 - i * 0.06, (S.z0 + S.z1) / 2, { cast: false })));
  const ks = sign('コンビニ', 1.6, 0.34, { bg: '#f7f7f4', fg: '#2c6f8a', glow: DAY ? 0 : 0.8 });
  ks.position.set(S.x1 + 0.125, 2.16, (S.z0 + S.z1) / 2);
  ks.rotation.y = Math.PI / 2;
  kg.add(ks);
  kg.add(vending('#c8423c', S.x1 + 0.4, S.z0 + 0.6, Math.PI / 2));
  kg.add(vending('#2f5f9a', S.x1 + 0.4, S.z0 + 1.3, Math.PI / 2));
  for (const [x, c] of [[S.x1 - 0.5, '#4f6f8a'], [S.x1 - 0.9, '#4f8a5f']]) kg.add(box(0.3, 0.6, 0.3, c, x, 0, S.z1 + 0.35, { surf: 'plastic' }));
  root.add(kg);
  light(scene, S.x1 + 1.0, 1.5, kz, '#f4f7ff', 3.2, 5);
  // the canopy: steel arches and ribs, a light glass roof above the shop fascias
  const cg = new THREE.Group();
  const L = P.lane,
    cz = (L.z0 + L.z1) / 2,
    cw = L.z1 - L.z0 + 0.4;
  const glassM = new THREE.MeshStandardMaterial({ color: '#cfe0ea', transparent: true, opacity: 0.18, roughness: 0.1, depthWrite: false });
  for (const s of [-1, 1]) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(N.x1 - N.x0, 0.03, cw / 2 + 0.1), glassM);
    pane.position.set((N.x0 + N.x1) / 2, 3.75, cz + (s * cw) / 4);
    pane.rotation.x = s * 0.18;
    pane.userData.noLook = true;
    cg.add(pane);
  }
  for (let x = N.x0; x <= N.x1 + 0.01; x += 2) {
    for (const s of [-1, 1]) {
      const rib = box(0.08, 0.08, cw / 2 + 0.1, '#7e8794', x, 0, 0, { surf: 'metal', cast: false });
      rib.position.set(x, 3.7, cz + (s * cw) / 4);
      rib.rotation.x = s * 0.18;
      cg.add(rib);
    }
  }
  cg.add(box(N.x1 - N.x0, 0.1, 0.1, '#7e8794', (N.x0 + N.x1) / 2, 3.95, cz, { surf: 'metal', cast: false }));
  // gate signs at both mouths
  for (const [gx, txt] of [[N.x0, '商店街'], [N.x1, '商店街']]) {
    cg.add(box(0.2, 0.7, cw, '#3e434d', gx, 3.3, cz, { surf: 'metal' }));
    const gs = sign(txt, 1.8, 0.5, { bg: '#3e434d', fg: '#f2e6c8', glow: DAY ? 0 : 0.7 });
    gs.position.set(gx + (gx < 0 ? -0.105 : 0.105), 3.65, cz);
    gs.rotation.y = gx < 0 ? -Math.PI / 2 : Math.PI / 2;
    cg.add(gs);
  }
  root.add(cg);
  for (let x = N.x0 + 2; x < N.x1; x += 5) light(scene, x, 3.3, cz, '#ffd9a8', 2.2, 6);
  for (let x = N.x0 + 2.5; x < N.x1 - 1; x += 5) root.add(lanePlanter(x, L.z1 - 0.5, Math.round(x)));

  // --- the courtyard at the east end: the izakaya, lamps, a tree ---
  const I = P.izakaya,
    ig = new THREE.Group();
  ig.add(box(I.x1 - I.x0, 3.0, I.z1 - I.z0, '#5d4f45', (I.x0 + I.x1) / 2, 0, (I.z0 + I.z1) / 2, { surf: 'door' }));
  ig.add(box(I.x1 - I.x0 + 0.5, 0.2, I.z1 - I.z0 + 0.5, '#3d4450', (I.x0 + I.x1) / 2, 3.0, (I.z0 + I.z1) / 2, { surf: 'stone' }));
  const iglass = box(2.0, 1.3, 0.05, null, (I.x0 + I.x1) / 2 + 1.2, 0.4, I.z1 + 0.03, { m: DAY ? mat('#8fa3b4') : glowMat('#f0c890', 1.0), cast: false });
  iglass.userData.noLook = true;
  ig.add(iglass);
  for (let i = 0; i < 4; i++) ig.add(box(0.3, 0.55, 0.02, '#2b3550', I.x0 + 0.8 + i * 0.32, 1.3, I.z1 + 0.08, { surf: 'fabric', cast: false }));
  const isg = sign('居酒屋', 1.8, 0.5, { bg: '#3b2f28', fg: '#f2e6c8', glow: DAY ? 0 : 0.5 });
  isg.position.set((I.x0 + I.x1) / 2, 2.4, I.z1 + 0.02);
  ig.add(isg);
  for (const x of [I.x0 + 0.6, I.x0 + 2.8]) {
    const lan = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.42, 10), DAY ? mat('#c0463c') : glowMat('#e0503c', 1.6));
    lan.position.set(x, 1.95, I.z1 + 0.25);
    lan.userData.noLook = true;
    ig.add(lan);
  }
  root.add(ig);
  light(scene, (I.x0 + I.x1) / 2, 1.8, I.z1 + 1.0, '#ffb070', 2.4, 5);
  root.add(tree(11, 3.6, 1.1, 3));
  for (const [x, z] of [[8, 13.5], [14, 0.5]]) streetLamp(scene, x, z);
  const cb = bench(1.6);
  cb.position.set(11, 0, 5.2);
  cb.rotation.y = Math.PI;
  root.add(cb);
  for (const [x, z] of [[-11, 3.6], [-3, 3.6], [5, 3.6]]) streetLamp(scene, x, z);

  // --- the promenade: a rail along the seawall, lamps, benches facing the sea, planters ---
  const rail = new THREE.Group();
  rail.add(box(56, 0.05, 0.05, PAL.metal, 6, 0.62, 20.85, { surf: 'metal', cast: false }));
  rail.add(box(56, 0.04, 0.04, PAL.metal, 6, 0.32, 20.85, { surf: 'metal', cast: false }));
  for (let x = -21.8; x <= 34; x += 1.2) rail.add(box(0.05, 0.65, 0.05, PAL.metal, x, 0, 20.85, { surf: 'metal', cast: false }));
  root.add(rail);
  for (const x of [-18, -9, 0, 9, 18, 27]) streetLamp(scene, x, 20.4);
  for (const x of [-13.5, -4.5, 13.5, 22.5]) {
    const b = bench(1.6);
    b.position.set(x, 0, 20.1);
    b.rotation.y = Math.PI; // facing the sea
    root.add(b);
  }
  for (const x of [-11, -2, 5, 25]) root.add(lanePlanter(x, 17.5, Math.round(x) & 7));
  // the park strip south-west of head office, and the beach below it (island-03's south-west cove)
  root.add(box(12, 0.06, 8, '#61794f', -28, -0.02, 13, { surf: 'soil', cast: false }));
  for (const [x, z, k] of [[-31, 10.5, 1.2], [-26, 11.5, 1.0], [-29, 15.5, 1.1], [-24, 15, 0.9], [-33, 14, 1.0]]) root.add(tree(x, z, k, Math.round(x + z) & 3));
  const sand = box(22, 0.6, 9, '#d8c9a4', -33, -0.62, 21.5, { surf: 'soil', cast: false });
  sand.rotation.x = 0.07; // the beach runs down into the water
  root.add(sand);
  // small things in front of the seaward shops: bikes parked by the konbini, a stand sign, an awning
  for (let i = 0; i < 4; i++) root.add(bike(BIKE_COL[(i * 3) % BIKE_COL.length], S.x1 - 5.8 + i * 0.4, S.z1 + 0.55, -Math.PI / 2 + 0.25));
  const aw = box(3.0, 0.06, 0.9, '#3f5f7a', 0, 0, 0, { surf: 'fabric' });
  aw.position.set(S.x0 + 3.2 * 2 + 1.6, 2.3, S.z1 + 0.42);
  aw.rotation.x = 0.28;
  root.add(aw);
  const stand = new THREE.Group();
  stand.add(box(0.5, 0.75, 0.08, '#2f3a34', 0, 0, 0, { surf: 'paint' }));
  const st = sign('営業中', 0.4, 0.5, { bg: '#2f3a34', fg: '#f2efe6', vertical: true, size: 0.7 });
  st.position.set(0, 0.42, 0.045);
  stand.add(st);
  stand.position.set(S.x0 + 2.6, 0, S.z1 + 0.5);
  stand.rotation.x = -0.12;
  root.add(stand);
  // the courtyard: two more trees and planters, so it isn't a bare square
  for (const [x, z, k] of [[4.5, 13.5, 0.9], [8.5, 9.5, 1.0]]) root.add(tree(x, z, k, Math.round(x)));
  for (const [x, z] of [[12.5, 16.2], [3.2, 5.4]]) root.add(lanePlanter(x, z, Math.round(x)));

  // --- the dorm: block A (entrance), block B behind it, a 2 m court between, a corridor bridge at the east end ---
  for (const [key, c] of [['A', '#c9c3b8'], ['B', '#c2bcb1']]) {
    const b = P[key],
      g = new THREE.Group(),
      hh = b.floors * FH;
    if (!(SHOT === 'room' && key === 'A')) {
      g.add(box(b.x1 - b.x0, hh, b.z1 - b.z0, c, (b.x0 + b.x1) / 2, 0, (b.z0 + b.z1) / 2, { surf: 'plaster' }));
      g.add(box(b.x1 - b.x0 + 0.1, 0.25, b.z1 - b.z0 + 0.1, '#a7a198', (b.x0 + b.x1) / 2, hh, (b.z0 + b.z1) / 2, { surf: 'concrete' }));
      roofStuff(g, b.x0, b.x1, b.z0, b.z1, hh + 0.25, key === 'A' ? 3 : 9);
    }
    if (key === 'A') {
      // south face: balconies; west face: the entrance; north face: the rooms that look at block B's wall
      windows(g, b, 's', { floors: b.floors, w: 0.9, h: 1.1, step: 1.8, sill: 0.3, lit: 0.4, seed: 7, balcony: true });
      windows(g, b, 'w', { floors: b.floors, from: 1, w: 0.7, h: 0.9, step: 1.8, lit: 0.3, seed: 11 });
      if (SHOT !== 'room')
        windows(g, b, 'n', {
          floors: b.floors,
          w: 0.8,
          h: 0.8,
          step: 1.8,
          lit: 0.3,
          seed: 13,
        });
      const [ex, ez] = P.dormDoor;
      const dd = door(1.1, 1.35, { double: true, windows: true });
      dd.position.set(ex - 0.02, 0, ez);
      dd.rotation.y = -Math.PI / 2;
      g.add(dd);
      g.add(box(1.4, 0.12, 2.4, '#8b939e', ex - 0.7, 1.75, ez, { surf: 'concrete' })); // canopy
      const ds = sign('寮', 0.5, 0.5, { bg: '#e9e6df', fg: '#2c3a52', glow: DAY ? 0 : 0.5 });
      ds.position.set(ex - 0.03, 1.5, ez + 1.1);
      ds.rotation.y = -Math.PI / 2;
      g.add(ds);
      // mailboxes by the door, a potted plant
      g.add(box(0.2, 0.9, 0.9, '#9aa0aa', ex - 0.12, 0.3, ez - 1.25, { surf: 'metal' }));
      const pl = plant({ size: 1.1, seed: 3 });
      pl.position.set(ex - 0.5, 0, ez + 1.5);
      g.add(pl);
      light(scene, ex - 0.8, 1.6, ez, '#ffd6a0', 2.6, 5);
    } else {
      // B: rooms face north and west; its south wall onto the court is bare concrete
      windows(g, b, 'w', { floors: b.floors, w: 0.7, h: 0.9, step: 1.8, lit: 0.3, seed: 17 });
      windows(g, b, 'n', { floors: b.floors, w: 0.9, h: 1.1, step: 1.8, lit: 0.35, seed: 19, balcony: true });
      // a drainpipe and air-con units on the court side
      g.add(box(0.1, hh, 0.1, '#8b939e', b.x0 + 3.1, 0, b.z1 + 0.06, { surf: 'metal' }));
      for (const x of [19.5, 23.0, 26.6]) g.add(box(0.6, 0.45, 0.3, '#d6d6d2', x, 0.02, b.z1 + 0.17, { surf: 'plastic' }));
    }
    root.add(g);
  }
  // the corridor bridge over the court at the east end (floors 2 to 4), so the court is a slot, not a street
  root.add(box(1.6, FH * 3, P.A.z0 - P.B.z1, '#bdb7ac', P.A.x1 - 0.8, FH, (P.A.z0 + P.B.z1) / 2, { surf: 'plaster' }));
  // the bike shelter by the dorm: posts and a flat roof
  const Sh = P.shelter,
    sg = new THREE.Group();
  for (const [x, z] of [[Sh.x0, Sh.z0], [Sh.x1, Sh.z0], [Sh.x0, Sh.z1], [Sh.x1, Sh.z1]]) sg.add(box(0.1, 1.6, 0.1, PAL.dark, x, 0, z, { surf: 'metal' }));
  sg.add(box(Sh.x1 - Sh.x0 + 0.4, 0.08, Sh.z1 - Sh.z0 + 0.4, '#6f7b8c', (Sh.x0 + Sh.x1) / 2, 1.6, (Sh.z0 + Sh.z1) / 2, { surf: 'metal' }));
  root.add(sg);
  for (let z = Sh.z0 + 0.3; z < Sh.z1; z += 0.36) root.add(bike(BIKE_COL[Math.round(z * 10) % BIKE_COL.length], (Sh.x0 + Sh.x1) / 2, z, 0));

  // --- coin laundry and sento: one low building beside the dorm, on the promenade ---
  const Bt = P.bath,
    bg = new THREE.Group();
  bg.add(box(Bt.x1 - Bt.x0, 2.6, Bt.z1 - Bt.z0, '#8a7a6a', (Bt.x0 + Bt.x1) / 2, 0, (Bt.z0 + Bt.z1) / 2, { surf: 'door' }));
  // a tiled roof, low pitch
  for (const s of [-1, 1]) {
    const r = box(Bt.x1 - Bt.x0 + 0.5, 0.14, (Bt.z1 - Bt.z0) / 2 + 0.5, '#3d4450', 0, 0, 0, { surf: 'stone' });
    r.position.set((Bt.x0 + Bt.x1) / 2, 2.85, (Bt.z0 + Bt.z1) / 2 + (s * (Bt.z1 - Bt.z0)) / 4);
    r.rotation.x = -s * 0.22;
    bg.add(r);
  }
  // both face south onto the promenade. Coin laundry: the west part, a glass front with the machines inside
  const lx = Bt.x0 + 1.6,
    bz = Bt.z1;
  const lglass = box(2.4, 1.7, 0.05, null, lx, 0.05, bz + 0.03, { m: DAY ? mat('#8fa3b4') : glowMat('#eef3f6', 1.2), cast: false });
  lglass.userData.noLook = true;
  bg.add(lglass);
  for (let i = 0; i < 3; i++) bg.add(box(0.5, 0.8, 0.5, '#e6e7e8', lx - 0.7 + i * 0.7, 0, bz - 0.4, { surf: 'plastic' }));
  const ls = sign('コインランドリー', 2.4, 0.36, { bg: '#e8eef2', fg: '#2c5f8a', glow: DAY ? 0 : 0.8 });
  ls.position.set(lx, 2.1, bz + 0.04);
  bg.add(ls);
  light(scene, lx, 1.5, bz + 0.9, '#f0f4ff', 2.6, 4.5);
  // sento: the east part, a timber front, a noren with ゆ, and the chimney at the back
  const sx = Bt.x1 - 1.9;
  bg.add(box(3.0, 2.2, 0.1, '#4e3f35', sx, 0, bz + 0.05, { surf: 'door' }));
  const noren = sign('ゆ', 1.0, 0.7, { bg: '#2f4a6e', fg: '#f2efe6', size: 0.8 });
  noren.position.set(sx, 1.25, bz + 0.12);
  bg.add(noren);
  const nsg = sign('銭湯', 1.5, 0.45, { bg: '#3b2f28', fg: '#f2e6c8', glow: DAY ? 0 : 0.5 });
  nsg.position.set(sx, 2.1, bz + 0.11);
  bg.add(nsg);
  light(scene, sx, 1.4, bz + 0.8, '#ffc98a', 2.4, 4.5);
  bg.add(box(0.8, 9, 0.8, '#b3aea5', Bt.x1 - 1.0, 0, Bt.z0 + 1.0, { surf: 'concrete' }));
  root.add(bg);
  root.add(tree(14.8, 15.6, 0.9, 2));

  return root;
}

// ---------- Eric's room: inside block A, ground floor, north side; the window looks at block B's wall ----------
function buildRoom(scene) {
  const R = PLAN.room,
    g = new THREE.Group(),
    t = 0.12,
    cx = (R.x0 + R.x1) / 2,
    cz = (R.z0 + R.z1) / 2,
    W = R.x1 - R.x0,
    Dp = R.z1 - R.z0;
  // floor: pale vinyl planks
  const fl = box(W, 0.04, Dp, '#b8b2a6', cx, -0.02, cz, { surf: 'laminate', cast: false });
  g.add(fl);
  const wallC = '#d3cfc6';
  // north wall with the window hole (sill 0.55, head 1.35, 1.0 wide, centred)
  const wx0 = cx - 0.5,
    wx1 = cx + 0.5;
  g.add(box(wx0 - R.x0, R.h, t, wallC, (R.x0 + wx0) / 2, 0, R.z0 - t / 2, { surf: 'plaster' }));
  g.add(box(R.x1 - wx1, R.h, t, wallC, (wx1 + R.x1) / 2, 0, R.z0 - t / 2, { surf: 'plaster' }));
  g.add(box(1.0, 0.55, t, wallC, cx, 0, R.z0 - t / 2, { surf: 'plaster' }));
  g.add(box(1.0, R.h - 1.35, t, wallC, cx, 1.35, R.z0 - t / 2, { surf: 'plaster' }));
  // aluminium sash, two panes, a sill
  for (const x of [wx0, cx, wx1]) g.add(box(0.04, 0.8, 0.06, '#b9bcc0', x, 0.55, R.z0 - t / 2, { surf: 'metal', cast: false }));
  for (const y of [0.55, 1.33]) g.add(box(1.0, 0.03, 0.06, '#b9bcc0', cx, y, R.z0 - t / 2, { surf: 'metal', cast: false }));
  g.add(box(1.1, 0.03, 0.12, '#e6e3dc', cx, 0.53, R.z0 + 0.02, { surf: 'paint' }));
  // other walls
  g.add(box(t, R.h, Dp + 2 * t, wallC, R.x0 - t / 2, 0, cz, { surf: 'plaster' }));
  g.add(box(t, R.h, Dp + 2 * t, wallC, R.x1 + t / 2, 0, cz, { surf: 'plaster' }));
  g.add(box(W, R.h, t, wallC, cx, 0, R.z1 + t / 2, { surf: 'plaster' }));
  g.add(box(W + 0.4, 0.06, Dp + 0.4, '#e4e1da', cx, R.h, cz, { surf: 'plaster', cast: true })); // ceiling
  // skirting
  for (const [w, d, x, z] of [[W, 0.02, cx, R.z0 + 0.01], [0.02, Dp, R.x0 + 0.01, cz], [0.02, Dp, R.x1 - 0.01, cz]]) g.add(box(w, 0.06, d, '#8b8f96', x, 0, z, { surf: 'skirting', cast: false }));
  // the door to the corridor (south wall, east end) and a small genkan step
  const dd = door(0.62, 1.3, { windows: false });
  dd.position.set(R.x1 - 0.45, 0, R.z1 - 0.01);
  dd.rotation.y = Math.PI;
  g.add(dd);
  g.add(box(0.75, 0.03, 0.4, '#9a9a96', R.x1 - 0.45, -0.02, R.z1 - 0.2, { surf: 'tile', cast: false }));
  // air-con unit above the window
  g.add(box(0.7, 0.2, 0.18, '#eeeeec', cx + 0.2, 1.42, R.z0 + 0.09, { surf: 'plastic' }));
  // bed along the west wall, pillow at the window end
  g.add(box(0.72, 0.28, 1.45, '#8a909a', R.x0 + 0.38, 0, R.z0 + 0.85, { surf: 'metal' }));
  g.add(box(0.68, 0.12, 1.4, '#e6e4de', R.x0 + 0.38, 0.28, R.z0 + 0.85, { surf: 'fabric' }));
  g.add(box(0.7, 0.07, 0.95, '#5b6f86', R.x0 + 0.38, 0.4, R.z0 + 1.08, { surf: 'fabric' }));
  g.add(box(0.4, 0.08, 0.22, '#f2f0ea', R.x0 + 0.38, 0.4, R.z0 + 0.3, { surf: 'fabric' }));
  // desk under the window, facing it, and a chair
  g.add(box(0.7, 0.04, 0.38, '#d8d9d5', R.x1 - 0.42, 0.48, R.z0 + 0.2, { surf: 'laminate' }));
  for (const [dx, dz] of [[-0.32, -0.16], [0.32, -0.16], [-0.32, 0.16], [0.32, 0.16]]) g.add(box(0.03, 0.48, 0.03, '#8b919b', R.x1 - 0.42 + dx, 0, R.z0 + 0.2 + dz, { surf: 'metal' }));
  g.add(box(0.3, 0.04, 0.3, PAL.chair, R.x1 - 0.42, 0.3, R.z0 + 0.55, { surf: 'fabric' }));
  g.add(box(0.3, 0.32, 0.04, PAL.chair, R.x1 - 0.42, 0.34, R.z0 + 0.7, { surf: 'fabric' }));
  g.add(box(0.03, 0.3, 0.03, '#8b919b', R.x1 - 0.42, 0, R.z0 + 0.55, { surf: 'metal' }));
  // a built-in closet by the door (sliding doors)
  g.add(box(0.5, R.h - 0.05, 0.62, '#e2ded5', R.x0 + 0.26, 0, R.z1 - 0.32, { surf: 'door' }));
  g.add(box(0.02, 1.4, 0.02, '#9aa0aa', R.x0 + 0.52, 0.2, R.z1 - 0.32, { surf: 'handle', cast: false }));
  // his things, sent ahead: moving boxes, taped
  for (const [x, z, w, h, d, y] of [
    [R.x0 + 0.36, R.z0 + 1.78, 0.42, 0.32, 0.32, 0],
    [R.x0 + 0.36, R.z0 + 1.78, 0.36, 0.26, 0.3, 0.32],
    [R.x0 + 1.02, R.z1 - 0.95, 0.4, 0.3, 0.34, 0],
    [R.x1 - 0.2, R.z0 + 1.45, 0.3, 0.24, 0.28, 0],
  ]) {
    g.add(box(w, h, d, PAL.box, x, y, z, { surf: 'card' }));
    g.add(box(w + 0.005, 0.005, 0.06, '#c9b48e', x, y + h, z, { cast: false }));
  }
  scene.add(g);
  // the ceiling light: a round fluorescent panel, on
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 20), glowMat('#f4f1ea', 0.8));
  lamp.position.set(cx, R.h - 0.05, cz);
  scene.add(lamp);
  const p = new THREE.PointLight('#f6efe2', 2.6, 5, 1.6);
  p.position.set(cx, R.h - 0.2, cz);
  p.castShadow = true;
  p.shadow.mapSize.set(1024, 1024);
  p.shadow.bias = -0.002;
  scene.add(p);
  // the court floor outside the window (concrete, a drain)
  scene.add(box(R.x1 - R.x0 + 6, 0.04, PLAN.A.z0 - PLAN.B.z1, '#7f828a', cx, -0.02, (PLAN.A.z0 + PLAN.B.z1) / 2, { surf: 'concrete', cast: false }));
  // the outside of the room's own wall, as seen from nowhere; plus bare concrete tie holes on block B's wall
  const tie = mat('#5e646c');
  for (let x = cx - 2; x <= cx + 2; x += 0.45)
    for (let y = 0.3; y < 3; y += 0.45) {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 8), tie);
      d.rotation.x = Math.PI / 2;
      d.position.set(x, y, PLAN.B.z1 + 0.011);
      scene.add(d);
    }
  // form-panel seams on the concrete
  for (let x = cx - 2.25; x <= cx + 2.3; x += 0.9) scene.add(box(0.012, 3.0, 0.01, '#6f757d', x, 0, PLAN.B.z1 + 0.006, { cast: false }));
  for (let y = 0.45; y < 3; y += 0.9) scene.add(box(4.6, 0.012, 0.01, '#6f757d', cx, y, PLAN.B.z1 + 0.006, { cast: false }));
  return g;
}

// ---------- light ----------
function lights(scene) {
  if (DAY) {
    scene.background = new THREE.Color('#a9b6c6');
    scene.add(new THREE.HemisphereLight('#c6d0de', '#6a625c', 1.6));
    const sun = new THREE.DirectionalLight('#fff0dc', 3.0);
    sun.position.set(-18, 40, -10);
    return sun;
  }
  // blue hour, about 18:10 in early October: sky light cool, the last warm light low from the west
  scene.background = new THREE.Color('#27303f');
  scene.add(new THREE.HemisphereLight('#9aa8c4', '#57524c', 2.1));
  const sun = new THREE.DirectionalLight('#f3b894', SHOT === 'room' ? 0.25 : 1.4);
  sun.position.set(-40, 14, -8);
  return sun;
}

// ---------- boot ----------
const canvas = document.getElementById('c');
const renderer = createRenderer(canvas);
const scene = new THREE.Scene();
const sun = lights(scene);
sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -50, right: 50, top: 40, bottom: -40, near: 1, far: 140 });
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.04;
sun.target.position.set(0, 0, 4);
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight('#dde6ff', DAY ? 0.5 : 0.25);
fill.position.set(0.3, 1, 0.9);
scene.add(fill);

const world = buildWorld(scene);
if (SHOT === 'room') buildRoom(scene);

// Eric, for scale (the game's Meshy model and the office's people scale)
const K = 1.18;
const ERIC_AT = {
  route: [-8.5, 18.9, Math.PI / 2, 'walk'],
  walk: [-5.5, 18.7, Math.PI / 2, 'walk'],
  dorm: [13.2, 8.2, Math.PI / 2 + 0.5, 'walk'],
  court: null,
  layout: null,
  room: [PLAN.room.x0 + 0.95, PLAN.room.z0 + 0.8, Math.PI, 'idle'],
};

const tier = 2;
// the dorm shot swings the camera west a little so the entrance (on the dorm's west face) shows
const cam = new RoomCam({ elev: 56, fov: 24, yaw: SHOT === 'dorm' ? -0.45 : 0 });
let camera = cam.camera;
function frame(aspect) {
  const P = PLAN;
  if (SHOT === 'layout') {
    // straight down, orthographic, north up
    const half = 23,
      cxm = -3,
      czm = 3.5;
    const oc = new THREE.OrthographicCamera(-half * aspect, half * aspect, half, -half, 1, 200);
    oc.position.set(cxm, 120, czm);
    oc.up.set(0, 0, -1);
    oc.lookAt(cxm, 0, czm);
    oc.updateProjectionMatrix();
    oc.updateMatrixWorld();
    camera = oc;
    return;
  }
  if (SHOT === 'room') {
    const R = P.room;
    const pc = new THREE.PerspectiveCamera(58, aspect, 0.05, 100);
    pc.position.set(R.x1 - 0.12, 1.55, R.z1 - 0.12);
    pc.lookAt(R.x0 + 0.8, 0.45, R.z0 - 0.2);
    pc.updateMatrixWorld();
    camera = pc;
    return;
  }
  if (SHOT === 'court') {
    // looking down into the court from above its west end, along it
    const pc = new THREE.PerspectiveCamera(40, aspect, 0.5, 200);
    pc.position.set(14.5, 12, 2.35);
    pc.lookAt(24.5, 0.6, 2.35);
    pc.updateMatrixWorld();
    camera = pc;
    return;
  }
  const boxes = {
    // the whole walk, head office doors to the dorm door
    route: [[-33, 0, 9], [28, 0, 9], [-33, 0, 23], [28, 0, 23], [-22, 4.5, -3], [22, 8, -5]],
    // the game's own zoom, around the konbini and the east mouth
    walk: [[-12, 0, 21.5], [4, 0, 21.5], [-12, 4.5, 13], [4, 4.5, 13]],
    // the dorm door, the courtyard, the laundry and sento
    dorm: [[6, 0, 18], [26, 0, 18], [6, 0, -3], [26, 6, -3]],
  }[SHOT];
  const centre = { route: V(-2, 0, 8), walk: V(-4, 0, 17.5), dorm: V(14, 0, 10) }[SHOT];
  cam.fit(aspect, boxes.map(([x, y, z]) => V(x, y, z)), centre, { limX: 0.97, limY: 0.95 });
  camera = cam.camera;
}

async function boot() {
  const at = ERIC_AT[SHOT];
  if (at) {
    const eric = await loadEric();
    eric.setState?.(at[3] === 'walk' ? 'walk' : 'idle');
    eric.update?.(at[3] === 'walk' ? 0.35 : 0.6);
    eric.root.add(blob(0.55, 0.4));
    eric.root.traverse((o) => {
      if (o.isMesh) {
        o.userData.surf = 'char';
        o.userData.noLook = true;
      }
    });
    eric.root.position.set(at[0], 0, at[1]);
    eric.root.rotation.y = at[2];
    eric.root.scale.setScalar(K);
    scene.add(eric.root);
  }
  // the game's look: surface patterns and soft baked light, on everything but the people
  PROC.on = true;
  applyLook({ scene, space: scene, sun }, null, { surf: true, bake: 'soft', tier });
  const [w, h] = [window.innerWidth, window.innerHeight];
  frame(w / h);
  const place = {
    scene,
    camera,
    sun,
    grade: DAY
      ? { exposure: 1.05, sat: 0.9, contrast: 1.04, vignette: 0.12, bloom: 0.2, focusBand: 1, blur: 0 }
      : {
          exposure: SHOT === 'room' ? 1.05 : 1.3,
          temp: 0.03,
          sat: 0.86,
          contrast: 1.06,
          lift: [0.012, 0.014, 0.024],
          shadowTint: [-0.008, -0.002, 0.024],
          highTint: [0.022, 0.01, -0.012],
          vignette: 0.24,
          bloom: 0.45,
          bloomThreshold: 0.78,
          focusBand: SHOT === 'route' ? 0.5 : 0.3,
        },
  };
  const post = makePost(renderer, place, tier);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, post.dpr(tier)));
  renderer.setSize(w, h);
  post.composer.setPixelRatio(renderer.getPixelRatio());
  post.composer.setSize(w, h);
  post.setQuality(tier);
  renderer.shadowMap.needsUpdate = true;
  for (let i = 0; i < 4; i++) {
    renderer.shadowMap.needsUpdate = true;
    post.render();
  }
  // screen positions of named points, for the layout labels
  window.__anchors = () => {
    const P = PLAN,
      pts = {
        hqDoor: [P.hqDoor[0], 0, P.hqDoor[1]],
        hq: [-23, 0, -5],
        racks: [(P.racks.x0 + P.racks.x1) / 2, 0, P.racks.z + 0.7],
        westMouth: [P.north.x0, 0, 11.1],
        konbini: [-1.2, 0, 17],
        arcade: [-6, 0, 11.1],
        eastMouth: [P.north.x1, 0, 11.1],
        izakaya: [9.6, 0, -1.6],
        fountain: [P.fountain[0], 0, P.fountain[1]],
        dormDoor: [P.dormDoor[0], 0, P.dormDoor[1]],
        blockA: [22, 0, 6.5],
        blockB: [22, 0, -2],
        court: [22, 0, 2.35],
        room: [(P.room.x0 + P.room.x1) / 2, 0, (P.room.z0 + P.room.z1) / 2],
        laundry: [P.bath.x0 + 1.6, 0, 16],
        sento: [P.bath.x1 - 1.9, 0, 16],
        shelter: [(P.shelter.x0 + P.shelter.x1) / 2, 0, (P.shelter.z0 + P.shelter.z1) / 2],
        promenade: [-10, 0, 19],
        beach: [-28, 0, 20.5],
        station: [-34, 0, -6],
        route: [
          [-21, 0, 2.6],
          [-18, 0, 9.5],
          [-17, 0, 18.8],
          [7, 0, 18.8],
          [10, 0, 12],
          [15.4, 0, 6.5],
        ],
      };
    const proj = ([x, y, z]) => {
      const v = V(x, y, z).project(camera);
      return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h];
    };
    const out = {};
    for (const [k, p] of Object.entries(pts)) out[k] = Array.isArray(p[0]) ? p.map(proj) : proj(p);
    out.unitPx = proj([1, 0, 0])[0] - proj([0, 0, 0])[0];
    return out;
  };
  window.__done = true;
}
boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre class="err">${e.message}\n${e.stack}</pre>`);
  window.__done = true;
});
