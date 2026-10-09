import { deskKeyboard } from './desk-keyboard.js';
import * as THREE from 'three';
import { roundedBox } from './perf/rounded-box.js';
import { hull, icoPoints } from './train/hull.js';
import { V } from './train/kit.js';
import { screenMat, Screens } from './places/life.js';
import { LOOK } from './look/flags.js';
import { DECAL } from './look/decal.js';
import * as D from './look/detail.js';
import { crtHousing } from './look/crt.js';
import { mat } from './kit/core/mat.js';

// every lit monitor built here flickers and scrolls; the active place calls liveScreens.update(t)
export const liveScreens = new Screens();
const KINDS = ['sheet', 'mail', 'sheet', 'code', 'mail'];
let _kind = 0;

// Muted palette from game3d/ref/2-security-gate-muted.png
export const PAL = {
  floor: '#a4a2a7',
  floorSeam: '#918f95',
  floorDark: '#99979c',
  wall: '#6b7180',
  wallTop: '#a3a9b3',
  wallInner: '#6c7280',
  skirting: '#454a54',
  trim: '#565c67',
  door: '#474d57',
  doorFrame: '#666c77',
  doorWin: '#9fb1c2',
  bench: '#454956',
  benchBack: '#4a4e5b',
  benchFrame: '#858b96',
  metal: '#9aa0aa',
  dark: '#3e434d',
  charcoal: '#2f333b',
  glass: '#b9cbd6',
  planter: '#c7c3bb',
  soil: '#4b3f38',
  leaf: ['#4d6b47', '#577650', '#43603f', '#5f7d57', '#4a6645'],
  lamp: '#ffe2b8',
  lampEm: '#ffcf8a',
  desk: '#d5d6d3',
  deskTop: '#d8d9d5',
  deskLeg: '#8b919b',
  drawer: '#8e949e',
  chair: '#3a4254',
  chairDark: '#2c3242',
  screen: '#9cc3e8',
  monitor: '#2e323a',
  paper: '#f2f0ea',
  box: '#b99a73',
  boxDark: '#a3865f',
  tileWhite: '#d8dadb',
  tileBlue: '#8fa0b3',
};

// the material cache lives in the world kit (kit/core/mat.js); every props.js user keeps importing it from here
export { mat };
export function emissive(color, glow, k = 1.6) {
  return mat(color, { emissive: new THREE.Color(glow), emissiveIntensity: k });
}

export function sh(m, cast = true, recv = true) {
  m.castShadow = cast;
  m.receiveShadow = recv;
  return m;
}

// rounded box sitting on y0 (bottom), centred on x/z
export function rbox(w, h, d, color, { x = 0, y = 0, z = 0, r = 0.03, seg = 2, m, cast = true, recv = true } = {}) {
  const mesh = new THREE.Mesh(
    roundedBox(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)),
    m || mat(color),
  );
  mesh.position.set(x, y + h / 2, z);
  return sh(mesh, cast, recv);
}

// ---------- text on a plate (signs, posters, name cards) ----------
export function textTexture(draw, w = 512, h = 256) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
export const JP_FONT = '"Zen Kaku Gothic New", "Noto Sans CJK JP", "Noto Sans JP", sans-serif';

export function plane(w, h, tex, { emissiveK = 0 } = {}) {
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, ...DECAL }); // signs: on walls
  if (emissiveK) {
    m.emissive = new THREE.Color('#ffffff');
    m.emissiveMap = tex;
    m.emissiveIntensity = emissiveK;
  }
  return sh(new THREE.Mesh(new THREE.PlaneGeometry(w, h), m), false);
}

// ---------- plants: square planter and a crown of leaf blades (like the references) ----------
// the builders below hand over to look/detail.js (small modelled detail, same footprints) while LOOK.detail is on;
// the plain versions stay for ?detail=0 and the showcase room's other looks
export const plant = (o) => (LOOK.detail ? D.plant(o) : plainPlant(o));
export function plainPlant({ size = 1, seed = 1, pot = PAL.planter, tall = 1 } = {}) {
  const g = new THREE.Group();
  const s = size;
  g.add(rbox(0.36 * s, 0.34 * s, 0.36 * s, pot, { r: 0.03 }));
  g.add(rbox(0.3 * s, 0.02, 0.3 * s, PAL.soil, { y: 0.335 * s, r: 0.005, cast: false }));
  const leaves = new THREE.Group();
  leaves.position.y = 0.34 * s;
  g.add(leaves);
  let r = seed * 9301 + 49297;
  const rnd = () => {
    r = (r * 9301 + 49297) % 233280;
    return r / 233280;
  };
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.4;
    const up = i < 3 ? 0.9 : 0.35 + rnd() * 0.35; // a few stand up in the middle
    const L = (0.26 + rnd() * 0.12) * s * (i < 3 ? 1.1 * tall : 1);
    const dir = V(Math.cos(a) * Math.cos(up), Math.sin(up) * tall, Math.sin(a) * Math.cos(up)).normalize();
    const side = V(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(0.055 * s);
    const base = V(Math.cos(a) * 0.03, 0.02, Math.sin(a) * 0.03);
    const mid = base
      .clone()
      .addScaledVector(dir, L * 0.5)
      .add(V(0, 0.03 * s, 0));
    const tip = base.clone().addScaledVector(dir, L);
    tip.y -= (1 - Math.sin(up)) * 0.05 * s;
    const th = V(0, 0.012, 0);
    const pts = [
      base.clone().add(side.clone().multiplyScalar(0.3)),
      base.clone().sub(side.clone().multiplyScalar(0.3)),
      mid.clone().add(side),
      mid.clone().sub(side),
      mid.clone().add(side).add(th),
      mid.clone().sub(side).add(th),
      tip,
      tip.clone().add(th),
    ];
    const col = PAL.leaf[(i + seed) % PAL.leaf.length];
    const m = new THREE.Mesh(
      hull(pts, col, { grad: 0.25, name: 'leaf' }).build(),
      mat('#ffffff', { vertexColors: true, roughness: 0.85 }),
    );
    sh(m);
    leaves.add(m);
  }
  g.userData.leaves = leaves;
  return g;
}

// ---------- benches (dark navy, steel frame) ----------
export function bench(len = 2.0, { seats = 3 } = {}) {
  const g = new THREE.Group();
  const d = 0.5;
  for (const sx of [-1, 1]) {
    g.add(rbox(0.07, 0.42, d + 0.06, PAL.benchFrame, { x: sx * (len / 2 + 0.02), r: 0.025 }));
  }
  g.add(rbox(len, 0.05, d - 0.1, PAL.benchFrame, { y: 0.12, r: 0.02 }));
  const sw = len / seats;
  for (let i = 0; i < seats; i++) {
    const x = -len / 2 + sw * (i + 0.5);
    g.add(rbox(sw - 0.04, 0.09, d, PAL.bench, { x, y: 0.2, r: 0.04, seg: 3 }));
    g.add(rbox(sw - 0.04, 0.34, 0.09, PAL.benchBack, { x, y: 0.26, z: -d / 2 + 0.02, r: 0.04, seg: 3 }));
  }
  return g;
}

// ---------- wall lamp: a warm vertical strip ----------
export function wallLamp(h = 0.5, w = 0.1) {
  const g = new THREE.Group();
  g.add(rbox(w + 0.04, h + 0.04, 0.04, PAL.trim, { r: 0.015, cast: false }));
  const l = rbox(w, h, 0.05, null, { y: 0.02, r: 0.02, m: emissive(PAL.lamp, PAL.lampEm, 2.2), cast: false });
  g.add(l);
  return g;
}
// standing lamp post by the entrance
export function lampPost() {
  // a low square bollard, lit from the top only
  const g = new THREE.Group();
  g.add(rbox(0.2, 0.36, 0.2, PAL.dark, { r: 0.02 }));
  g.add(rbox(0.22, 0.04, 0.22, PAL.dark, { y: 0.36, r: 0.01 }));
  const top = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), emissive(PAL.lamp, PAL.lampEm, 2.4));
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.401;
  g.add(top);
  return g;
}

// ---------- doors ----------
export const door = (w, h, o) => (LOOK.detail ? D.door(w, h, o) : plainDoor(w, h, o));
export function plainDoor(w = 0.8, h = 1.25, { double = false, windows = true } = {}) {
  const g = new THREE.Group();
  g.add(rbox(w + 0.12, h + 0.06, 0.06, PAL.doorFrame, { r: 0.02 }));
  const leaves = double ? 2 : 1,
    lw = (w - 0.02) / leaves;
  for (let i = 0; i < leaves; i++) {
    const x = -w / 2 + lw * (i + 0.5) + 0.01;
    g.add(rbox(lw - 0.02, h - 0.02, 0.07, PAL.door, { x, z: 0.01, r: 0.02 }));
    if (windows)
      g.add(
        rbox(0.08, 0.34, 0.075, null, {
          x: x + (double ? (i ? -1 : 1) * lw * 0.22 : lw * 0.3),
          y: h * 0.52,
          z: 0.012,
          r: 0.02,
          m: mat(PAL.doorWin, { roughness: 0.3 }),
        }),
      );
    g.add(
      rbox(0.025, 0.12, 0.04, PAL.metal, {
        x: x + (double ? (i ? -1 : 1) * lw * 0.4 : -lw * 0.38),
        y: h * 0.45,
        z: 0.06,
        r: 0.01,
      }),
    );
  }
  return g;
}

// ---------- walls: a solid slab with an optional list of openings along its length ----------
// A wall along x (axis 'x') or along z (axis 'z') from a to b at c, height h, thickness t.
// holes: [[from, to, bottom, top]] measured along the wall
export const wall = (...a) => (LOOK.detail ? D.wall(...a) : plainWall(...a));
export function plainWall(axis, a, b, c, h, t, { holes = [], color = PAL.wall, top = PAL.wallTop } = {}) {
  const g = new THREE.Group();
  const segs = [];
  const len = b - a;
  // split into rectangles around the holes
  const xs = [0, len];
  for (const [f, tt] of holes) {
    xs.push(f - a, tt - a);
  }
  const cuts = [...new Set(xs)].sort((p, q) => p - q);
  for (let i = 0; i < cuts.length - 1; i++) {
    const u0 = cuts[i],
      u1 = cuts[i + 1],
      mid = (u0 + u1) / 2 + a;
    const hole = holes.find(([f, tt]) => mid > f && mid < tt);
    if (!hole) segs.push([u0, u1, 0, h]);
    else {
      if (hole[2] > 0.001) segs.push([u0, u1, 0, hole[2]]);
      if (hole[3] < h - 0.001) segs.push([u0, u1, hole[3], h]);
    }
  }
  const wm = mat(color),
    tm = mat(top);
  for (const [u0, u1, y0, y1] of segs) {
    const L = u1 - u0,
      cU = a + (u0 + u1) / 2;
    const geo = new THREE.BoxGeometry(axis === 'x' ? L : t, y1 - y0, axis === 'x' ? t : L);
    const mesh = new THREE.Mesh(geo, wm);
    mesh.position.set(axis === 'x' ? cU : c, (y0 + y1) / 2, axis === 'x' ? c : cU);
    g.add(sh(mesh));
    if (y0 < 0.001 && y1 > 0.3) {
      const sk = new THREE.Mesh(
        new THREE.BoxGeometry(axis === 'x' ? L : t + 0.012, 0.1, axis === 'x' ? t + 0.012 : L),
        mat(PAL.skirting),
      );
      sk.position.set(mesh.position.x, 0.05, mesh.position.z);
      g.add(sh(sk, false, true));
    }
    if (y1 >= h - 0.001) {
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(axis === 'x' ? L + 0.001 : t + 0.02, 0.03, axis === 'x' ? t + 0.02 : L + 0.001),
        tm,
      );
      cap.position.set(mesh.position.x, h + 0.015, mesh.position.z);
      g.add(sh(cap, false, true));
    }
  }
  return g;
}

// ---------- floor with tile seams ----------
export function tileFloor(
  x0,
  x1,
  z0,
  z1,
  tile = 1.2,
  { color = PAL.floor, seam = PAL.floorSeam, y = 0, seamW = 0.035, bands } = {},
) {
  const g = new THREE.Group();
  const f = new THREE.Mesh(
    new THREE.BoxGeometry(x1 - x0, 0.1, z1 - z0),
    mat(color, { roughness: 0.3, metalness: 0.04 }),
  );
  f.position.set((x0 + x1) / 2, y - 0.05, (z0 + z1) / 2);
  f.receiveShadow = true;
  f.name = 'floor';
  f.userData.surf = 'tile';
  f.userData.tile = [x0, z0, tile]; // the procedural look lines its tiles up with the seams
  g.add(f);
  const sm = mat(seam, { roughness: 0.7 });
  sm.userData.noInk = true; // the style study's ink pass leaves seams as colour only (else each seam gets two lines)
  const lines = [];
  for (let x = x0 + tile; x < x1 - 0.01; x += tile) lines.push(['z', x]);
  for (let z = z0 + tile; z < z1 - 0.01; z += tile) lines.push(['x', z]);
  for (const [ax, v] of lines) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(ax === 'x' ? x1 - x0 : seamW, 0.004, ax === 'x' ? seamW : z1 - z0),
      sm,
    );
    m.position.set(ax === 'x' ? (x0 + x1) / 2 : v, y + 0.002, ax === 'x' ? v : (z0 + z1) / 2);
    m.receiveShadow = true;
    m.userData.surf = 'grout';
    m.userData.tile = [x0, z0, tile];
    g.add(m);
  }
  // wide darker bands like the stone inlays in the lobby reference
  for (const [ax, v, w] of bands || []) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(ax === 'x' ? x1 - x0 : w, 0.004, ax === 'x' ? w : z1 - z0),
      mat(PAL.floorDark, { roughness: 0.6 }),
    );
    m.position.set(ax === 'x' ? (x0 + x1) / 2 : v, y + 0.003, ax === 'x' ? v : (z0 + z1) / 2);
    m.receiveShadow = true;
    m.userData.surf = 'stone';
    g.add(m);
  }
  return g;
}

// A shadow-only shell: full-height walls with window holes and a roof, seen only by the sun's shadow
// pass (as in the train), so warm window light lands on the floor of a cutaway room.
export function shadowProxy(parts) {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: '#000', colorWrite: false, depthWrite: false });
  for (const [w, h, d, x, y, z] of parts) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    b.castShadow = true;
    b.receiveShadow = false;
    g.add(b);
  }
  g.name = 'proxy';
  return g;
}

// ---------- office furniture ----------
export const officeChair = (c) => (LOOK.detail ? D.chair(c) : plainChair(c));
export function plainChair(color = PAL.chair) {
  const g = new THREE.Group();
  g.add(rbox(0.06, 0.03, 0.42, PAL.dark, { y: 0.03, r: 0.01 }));
  g.add(rbox(0.42, 0.03, 0.06, PAL.dark, { y: 0.03, r: 0.01 }));
  g.add(rbox(0.05, 0.15, 0.05, PAL.dark, { y: 0.05, r: 0.01 }));
  g.add(rbox(0.36, 0.07, 0.34, color, { y: 0.17, r: 0.03 }));
  g.add(rbox(0.34, 0.34, 0.07, color, { y: 0.26, z: -0.17, r: 0.035 }));
  return g;
}
export const monitor = (o) => (LOOK.detail ? D.monitor(o) : plainMonitor(o));
export function plainMonitor({ on = true, kind, crt = false } = {}) {
  const g = new THREE.Group();
  g.add(rbox(0.18, 0.02, 0.12, PAL.monitor, { r: 0.008 }));
  g.add(rbox(0.04, 0.12, 0.03, PAL.monitor, { y: 0.02, r: 0.01 }));
  g.add(rbox(0.46, 0.3, 0.035, PAL.monitor, { y: 0.1, r: 0.015 }));
  const s = new THREE.Mesh(
    new THREE.PlaneGeometry(0.41, 0.25),
    on ? liveScreens.add(screenMat(kind || KINDS[_kind++ % KINDS.length], 0.75)) : mat('#3a4150'),
  );
  s.position.set(0, 0.25, 0.019);
  g.add(s);
  return crt ? crtHousing(g, rbox, mat) : g;
}
export const PED = 0.26; // a desk's drawer pedestals: wide enough to leave room for seated knees (#240)
// desk facing +z (the sitter sits on the +z side). open: no front panel and one drawer unit, on the -x side, with two
// legs at the +x end, set in from the top's edges and 5 mm up into it, so a seated person's legs show (Emi's, #248)
export function desk(o = {}) {
  const g = LOOK.detail ? D.desk(o) : plainDesk(o);
  const { w = 1.4, d = 0.72 } = o;
  const leg = (sz) => rbox(0.04, 0.385, 0.04, PAL.metal, { x: w / 2 - 0.06, z: sz * (d / 2 - 0.06), r: 0.008 });
  if (o.open) g.add(leg(-1), leg(1));
  return g;
}
export function plainDesk({ w = 1.4, d = 0.72, mon = true, clutter = 1, seed = 1, open = false, crt = false } = {}) {
  const g = new THREE.Group();
  const H = 0.42;
  g.add(rbox(w, 0.04, d, PAL.deskTop, { y: H - 0.04, r: 0.012 }));
  // drawer pedestals both sides (open: one side)
  for (const sx of open ? [-1] : [-1, 1]) {
    g.add(rbox(PED, H - 0.05, d - 0.06, PAL.drawer, { x: sx * (w / 2 - 0.02 - PED / 2), r: 0.015 }));
    for (let k = 0; k < 3; k++)
      g.add(
        rbox(PED - 0.08, 0.012, 0.01, PAL.trim, {
          x: sx * (w / 2 - 0.02 - PED / 2),
          y: 0.08 + k * 0.1,
          z: (d - 0.06) / 2 + 0.003,
          r: 0.004,
          cast: false,
        }),
      );
  }
  if (!open) g.add(rbox(w - 2 * (PED + 0.02), 0.2, 0.03, PAL.drawer, { y: 0.16, z: -d / 2 + 0.05, r: 0.01 }));
  if (mon) {
    const m = plainMonitor({ crt });
    m.position.set(0, H, -d * 0.2);
    g.add(m);
  }
  deskKeyboard(g, rbox, d);
  if (clutter) {
    // a paper tray, a pen cup, a binder or two
    g.add(rbox(0.2, 0.05, 0.26, PAL.dark, { x: -w * 0.36, y: H, z: -0.05, r: 0.01 }));
    g.add(rbox(0.19, 0.03, 0.25, PAL.paper, { x: -w * 0.36, y: H + 0.03, z: -0.05, r: 0.004 }));
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.08, 10), mat('#4a5b78'));
    cup.position.set(w * 0.33, H + 0.04, -0.12);
    g.add(sh(cup));
    const bcol = ['#4a6490', '#6a7a8c', '#3d4d6b'][seed % 3];
    g.add(rbox(0.05, 0.22, 0.2, bcol, { x: w * 0.42, y: H, z: -0.2, r: 0.01 }));
    g.add(rbox(0.05, 0.22, 0.2, '#5b6f86', { x: w * 0.42 - 0.055, y: H, z: -0.2, r: 0.01 }));
  }
  return g;
}
export const filingCabinet = (n, c) => (LOOK.detail ? D.filingCabinet(n, c) : plainFilingCabinet(n, c));
export function plainFilingCabinet(drawers = 3, color = '#8a909a') {
  const g = new THREE.Group();
  const h = 0.22 * drawers + 0.04;
  g.add(rbox(0.42, h, 0.46, color, { r: 0.015 }));
  for (let i = 0; i < drawers; i++) {
    g.add(rbox(0.38, 0.19, 0.01, '#9aa0a9', { y: 0.03 + i * 0.22, z: 0.232, r: 0.004, cast: false }));
    g.add(rbox(0.1, 0.02, 0.02, '#c9cdd2', { y: 0.16 + i * 0.22, z: 0.24, r: 0.006, cast: false }));
  }
  return g;
}
export const shelf = (w, h, d, o = {}) =>
  LOOK.detail ? D.shelf(w, h, d, { fill: 'box', ...o }) : plainShelf(w, h, d, o);
export function plainShelf(w = 0.9, h = 1.1, d = 0.36, { fill = 'box', seed = 1 } = {}) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) g.add(rbox(0.04, h, d, PAL.metal, { x: sx * (w / 2 - 0.02), r: 0.01 }));
  const levels = 4;
  let r = seed;
  const rnd = () => {
    r = (r * 16807) % 2147483647;
    return r / 2147483647;
  };
  for (let i = 0; i < levels; i++) {
    const y = 0.06 + (i * (h - 0.1)) / (levels - 1);
    g.add(rbox(w - 0.02, 0.025, d, '#a3a9b2', { y, r: 0.008 }));
    if (i === levels - 1) continue;
    const gap = (h - 0.1) / (levels - 1) - 0.05;
    if (fill === 'box') {
      let x = -w / 2 + 0.08;
      while (x < w / 2 - 0.2) {
        const bw = 0.22 + rnd() * 0.1,
          bh = Math.min(gap, 0.16 + rnd() * 0.08);
        if (rnd() > 0.2)
          g.add(rbox(bw, bh, d * 0.8, rnd() > 0.5 ? PAL.box : PAL.boxDark, { x: x + bw / 2, y: y + 0.013, r: 0.01 }));
        x += bw + 0.04;
      }
    } else if (fill === 'paper') {
      for (let k = 0; k < 3; k++)
        g.add(
          rbox(w * 0.26, 0.05 + rnd() * 0.04, d * 0.75, PAL.paper, {
            x: -w * 0.3 + k * w * 0.3,
            y: y + 0.013,
            r: 0.006,
          }),
        );
    } else if (fill === 'binders') {
      let x = -w / 2 + 0.06;
      const cols = ['#4a6490', '#6a7a8c', '#3d4d6b', '#7f8ea3', '#56657e'];
      while (x < w / 2 - 0.08) {
        g.add(rbox(0.05, gap * 0.85, d * 0.7, cols[(rnd() * 5) | 0], { x: x + 0.025, y: y + 0.013, r: 0.008 }));
        x += 0.055;
      }
    }
  }
  return g;
}
export function pinboard(w = 0.7, h = 0.45) {
  const tex = textTexture(
    (g, W, H) => {
      g.fillStyle = '#9b8a72';
      g.fillRect(0, 0, W, H);
      const cols = ['#f1efe9', '#e8e2d2', '#dfe6ee', '#f1efe9'];
      for (let i = 0; i < 5; i++) {
        g.fillStyle = cols[i % 4];
        const x = 30 + i * 90 + (i % 2) * 10,
          y = 30 + (i % 3) * 50;
        g.fillRect(x, y, 80, 110);
        g.fillStyle = '#b8bcc4';
        for (let k = 0; k < 5; k++) g.fillRect(x + 10, y + 20 + k * 16, 58 - (k % 2) * 14, 5);
      }
    },
    512,
    320,
  );
  const g = new THREE.Group();
  g.add(rbox(w + 0.05, h + 0.05, 0.03, '#6e6255', { r: 0.01, cast: false }));
  const p = plane(w, h, tex);
  p.position.set(0, h / 2 + 0.025, 0.017);
  g.add(p);
  return g;
}
export function clock() {
  const tex = textTexture(
    (g, W, H) => {
      g.fillStyle = '#f4f3ef';
      g.beginPath();
      g.arc(W / 2, H / 2, W / 2 - 4, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#2c3038';
      g.lineWidth = 10;
      g.stroke();
      g.fillStyle = '#2c3038';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.fillRect(W / 2 + Math.cos(a) * 95 - 4, H / 2 + Math.sin(a) * 95 - 4, 8, 8);
      }
      g.lineCap = 'round';
      g.lineWidth = 10;
      g.beginPath();
      g.moveTo(W / 2, H / 2);
      g.lineTo(W / 2 + 40, H / 2 - 50);
      g.stroke();
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(W / 2, H / 2);
      g.lineTo(W / 2 - 5, H / 2 - 85);
      g.stroke();
    },
    256,
    256,
  );
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(0.16, 24),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }),
  );
  return m;
}
