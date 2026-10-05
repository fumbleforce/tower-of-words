// Small modelled detail (texture avenue 8, game3d/design/style/AVENUES.md): the props of props.js with more geometry
// where the eye lands. Chamfered edges (rounded boxes with one segment, so the bevel is one flat face), door and
// window frames and skirting in relief, rims on cups, paper piles of separate sheets, handles and hinges. Same colours
// and the same footprints as props.js, so the places don't change. props.js hands its builders (wall, door, desk,
// monitor, officeChair, filingCabinet, shelf, plant) to these while LOOK.detail is on (look/flags.js, ?detail=0 turns
// it off); cast.js does the same for mug(). The showcase room uses them for its look 8 and for the extras here
// (window frame, switch, socket, cables, tower, bin, pins, clock rim).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, PED, mat, emissive, rbox, plainPlant as basePlant, plainMonitor as baseMonitor, sh } from '../props.js';

// chamfered box: one-segment rounded box, so the edge is a single flat bevel
const cbox = (w, h, d, color, o = {}) => rbox(w, h, d, color, { seg: 1, r: 0.012, ...o });
const cyl = (rt, rb, h, color, { x = 0, y = 0, z = 0, seg = 12, rx = 0, rz = 0, m } = {}) => {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m || mat(color));
  c.position.set(x, y, z);
  c.rotation.set(rx, 0, rz);
  return sh(c);
};
// many small boxes as one mesh (keys, slats), all one colour
function boxes(list, color, { cast = true } = {}) {
  const gs = list.map(([w, h, d, x, y, z]) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z));
  const m = new THREE.Mesh(mergeGeometries(gs), mat(color));
  gs.forEach((g) => g.dispose());
  return sh(m, cast, true);
}

// ---------- walls: slab, a skirting board in relief with a chamfered top, a chamfered cap ----------
export function wall(axis, a, b, c, h, t, { holes = [], color = PAL.wall, top = PAL.wallTop } = {}) {
  const g = new THREE.Group();
  const cuts = [...new Set([0, b - a, ...holes.flatMap(([f, tt]) => [f - a, tt - a])])].sort((p, q) => p - q);
  const segs = [];
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
  const put = (m, cU, y) => {
    m.position.x = axis === 'x' ? cU : c;
    m.position.z = axis === 'x' ? c : cU;
    m.position.y += y;
    if (axis !== 'x') m.rotation.y = Math.PI / 2;
    g.add(m);
  };
  for (const [u0, u1, y0, y1] of segs) {
    const L = u1 - u0,
      cU = a + (u0 + u1) / 2;
    const slab = sh(new THREE.Mesh(new THREE.BoxGeometry(L, y1 - y0, t), mat(color)));
    put(slab, cU, (y0 + y1) / 2);
    if (y0 < 0.001 && y1 > 0.3) {
      // skirting: a board proud of the wall on both faces, chamfered along the top
      const sk = rbox(L, 0.11, t + 0.036, PAL.skirting, { seg: 1, r: 0.01, cast: false });
      put(sk, cU, 0);
      const bead = rbox(L, 0.012, t + 0.044, PAL.trim, { seg: 1, r: 0.004, cast: false });
      put(bead, cU, 0.105);
    }
    if (y1 >= h - 0.001) {
      const cap = rbox(L + 0.002, 0.035, t + 0.03, top, { seg: 1, r: 0.012, cast: false });
      put(cap, cU, h);
    }
  }
  return g;
}

// ---------- window: casing, architrave on the room side, mullion, transom, a deep chamfered sill ----------
export function windowFrame(w, h) {
  const g = new THREE.Group(),
    f = 0.045,
    t = 0.2,
    zi = 0.08 + 0.012; // zi: room-side face of the wall (T/2) plus a little
  g.add(cbox(w, 0.02, t, PAL.trim, { y: -0.02 }));
  g.add(cbox(w, 0.02, t, PAL.trim, { y: h }));
  for (const s of [-1, 1]) g.add(cbox(0.02, h, t, PAL.trim, { x: s * (w / 2 + 0.01) }));
  // architrave: a flat moulding around the opening on the room side
  const A = 0.065;
  g.add(cbox(w + A * 2, A, 0.022, PAL.trim, { y: h, z: zi }));
  for (const s of [-1, 1]) g.add(cbox(A, h, 0.022, PAL.trim, { x: s * (w / 2 + A / 2), z: zi }));
  // sill: proud of the wall, chamfered, with a small apron under it
  g.add(cbox(w + 0.2, 0.034, 0.13, PAL.trim, { y: -0.034, z: zi + 0.02 }));
  g.add(cbox(w + 0.1, 0.05, 0.02, PAL.trim, { y: -0.084, z: zi }));
  // glazing: a mullion, a transom and thin beads round each light
  const zg = -0.02;
  g.add(cbox(f * 0.8, h, 0.05, PAL.trim, { z: zg, r: 0.008 }));
  g.add(cbox(w, f * 0.7, 0.05, PAL.trim, { y: h * 0.68, z: zg, r: 0.008 }));
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -w / 2 : 0.018,
      x1 = s < 0 ? -0.018 : w / 2,
      cx = (x0 + x1) / 2,
      bw = x1 - x0;
    for (const [y, hh] of [
      [0, h * 0.68],
      [h * 0.68 + 0.03, h - h * 0.68 - 0.03],
    ]) {
      g.add(
        boxes(
          [
            [bw, 0.012, 0.012, cx, y, zg + 0.02],
            [bw, 0.012, 0.012, cx, y + hh - 0.012, zg + 0.02],
            [0.012, hh, 0.012, x0 + 0.006, y, zg + 0.02],
            [0.012, hh, 0.012, x1 - 0.006, y, zg + 0.02],
          ],
          PAL.doorFrame,
          { cast: false },
        ),
      );
    }
    const latch = cbox(0.05, 0.018, 0.018, PAL.metal, { x: s * 0.06, y: h * 0.55, z: zg + 0.035, r: 0.005 });
    g.add(latch);
  }
  return g;
}

// ---------- door: architrave, leaves with raised panel mouldings, a window with a bead, lever handles with a rose,
// hinges and a kick plate. children[0] is the frame (a group), as in props.js (the office takes it off the
// machine-room door). depth: null for a door mounted on a wall's face (the game: the frame is a 6 cm backing slab,
// leaves at z +0.01, fittings on the front), or the wall's thickness for a door set in a hole (the showcase room:
// frame through the wall, architrave and fittings on both sides) ----------
export function door(w = 0.8, h = 1.25, { double = false, windows = true, depth = null } = {}) {
  const g = new THREE.Group(),
    frame = new THREE.Group();
  g.add(frame);
  const inHole = depth != null,
    A = 0.07;
  if (inHole) {
    frame.add(cbox(w + 0.06, 0.03, depth, PAL.doorFrame, { y: h }));
    for (const s of [-1, 1]) frame.add(cbox(0.03, h, depth, PAL.doorFrame, { x: s * (w / 2 + 0.015) }));
  } else frame.add(rbox(w + 0.12, h + 0.06, 0.06, PAL.doorFrame, { r: 0.02 }));
  const faces = inHole ? [-1, 1] : [1],
    zf = inHole ? depth / 2 : 0.03;
  for (const zs of faces) {
    frame.add(cbox(w + 2 * A + (inHole ? 0.06 : 0), A, 0.024, PAL.doorFrame, { y: h, z: zs * zf }));
    for (const s of [-1, 1])
      frame.add(cbox(A, h + A, 0.024, PAL.doorFrame, { x: s * (w / 2 + A / 2 + (inHole ? 0.03 : 0)), z: zs * zf }));
  }
  const leaves = double ? 2 : 1,
    lw = (w - 0.02) / leaves,
    z0 = inHole ? 0 : 0.01,
    T = 0.05;
  for (let i = 0; i < leaves; i++) {
    const x = -w / 2 + lw * (i + 0.5) + 0.01,
      hs = double ? (i ? -1 : 1) : 1; // hs: the side the handle is on (-x for a single door)
    g.add(cbox(lw - 0.012, h - 0.012, T, PAL.door, { x, y: 0.006, z: z0, r: 0.008 }));
    for (const zs of faces) {
      const z = z0 + zs * (T / 2 + 0.003),
        M = 0.016,
        pw = lw - 0.2;
      const fr = (y0, y1) => [
        [pw, M, M, x, y0, z],
        [pw, M, M, x, y1 - M, z],
        [M, y1 - y0, M, x - pw / 2 + M / 2, y0, z],
        [M, y1 - y0, M, x + pw / 2 - M / 2, y0, z],
      ];
      g.add(boxes([...fr(0.12, h * 0.46), ...fr(h * 0.52, h - 0.1)], '#525862', { cast: false }));
      g.add(
        cbox(lw - 0.06, 0.13, 0.006, PAL.metal, { x, y: 0.02, z: z0 + zs * (T / 2 + 0.003), r: 0.003, cast: false }),
      ); // kick plate
    }
    if (windows)
      g.add(
        cbox(double ? 0.1 : 0.2, 0.34, T + 0.006, null, {
          x: x + (double ? hs * lw * 0.22 : 0),
          y: h * 0.6,
          z: z0,
          r: 0.006,
          m: mat(PAL.doorWin, { roughness: 0.3 }),
        }),
      );
    // lever handle and a rose on each face
    const hx = double ? x + hs * (lw / 2 - 0.08) : x - lw / 2 + 0.09,
      hy = h * 0.47,
      dir = double ? -hs : 1;
    for (const zs of faces) {
      const z = z0 + zs * (T / 2 + 0.011);
      g.add(cyl(0.022, 0.022, 0.008, PAL.metal, { x: hx, y: hy, z, rx: Math.PI / 2 }));
      g.add(cyl(0.008, 0.008, 0.04, PAL.metal, { x: hx, y: hy, z: z + zs * 0.02, rx: Math.PI / 2, seg: 8 }));
      g.add(cbox(0.1, 0.016, 0.018, PAL.metal, { x: hx + dir * 0.05, y: hy - 0.008, z: z + zs * 0.04, r: 0.006 }));
    }
    // hinges on the far edge
    const ex = double ? x - hs * (lw / 2 - 0.005) : x + lw / 2 - 0.005;
    for (const y of [0.15, h * 0.5, h - 0.2])
      g.add(cyl(0.012, 0.012, 0.08, PAL.metal, { x: ex, y, z: z0 + (inHole ? 0.03 : T / 2), seg: 8 }));
  }
  return g;
}

export function switchPlate() {
  const g = new THREE.Group();
  g.add(cbox(0.08, 0.08, 0.012, '#e7e8e6', { r: 0.006, cast: false }));
  g.add(cbox(0.034, 0.05, 0.012, '#d6d8d6', { y: 0.015, z: 0.006, r: 0.005, cast: false }));
  return g;
}
export function socket() {
  const g = new THREE.Group();
  g.add(cbox(0.15, 0.08, 0.014, '#e7e8e6', { r: 0.006, cast: false }));
  for (const x of [-0.035, 0.035])
    g.add(cyl(0.022, 0.022, 0.006, '#d0d2d0', { x, y: 0.04, z: 0.01, rx: Math.PI / 2, seg: 14 }));
  return g;
}

// ---------- desk: chamfered top, pedestals with inset drawer fronts and bar handles, a modesty panel,
// a keyboard with keys, a mouse, a tray with a lip, a pen cup with pens, binders with a ring hole (open: props.js) ---
export function desk({ w = 1.4, d = 0.72, mon = true, clutter = 1, seed = 1, open = false } = {}) {
  const g = new THREE.Group();
  const H = 0.42;
  g.add(cbox(w, 0.04, d, PAL.deskTop, { y: H - 0.04, r: 0.014 }));
  for (const sx of open ? [-1] : [-1, 1]) {
    const px = sx * (w / 2 - 0.02 - PED / 2),
      pd = d - 0.06;
    g.add(cbox(PED, H - 0.05, pd, PAL.drawer, { x: px, r: 0.01 }));
    g.add(cbox(PED + 0.01, 0.03, pd + 0.004, PAL.dark, { x: px, r: 0.006, cast: false })); // plinth
    const fronts = [
      [0.04, 0.1],
      [0.15, 0.1],
      [0.26, 0.1],
    ];
    for (const [y, fh] of fronts) {
      g.add(cbox(PED - 0.04, fh - 0.012, 0.014, PAL.drawer, { x: px, y, z: pd / 2 + 0.006, r: 0.006, cast: false }));
      g.add(cbox(0.14, 0.012, 0.012, '#c9cdd2', { x: px, y: y + fh * 0.62, z: pd / 2 + 0.022, r: 0.005, cast: false }));
      for (const hx of [-0.06, 0.06])
        g.add(
          cbox(0.01, 0.01, 0.014, '#c9cdd2', { x: px + hx, y: y + fh * 0.6, z: pd / 2 + 0.016, r: 0.003, cast: false }),
        );
    }
  }
  if (!open) g.add(cbox(w - 2 * (PED + 0.02), 0.22, 0.022, PAL.drawer, { y: 0.15, z: -d / 2 + 0.05 }));
  // monitor: bezel frame, inset screen, a stand with a round foot and a hinge
  if (mon) {
    const m = monitor();
    m.position.set(0, H, -d * 0.2);
    g.add(m);
  }
  // keyboard with keys, mouse on a pad
  const kx = 0,
    kz = d * 0.12;
  g.add(cbox(0.37, 0.016, 0.13, '#cfd1d4', { x: kx, y: H, z: kz, r: 0.006 }));
  const keys = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 14; c++)
      keys.push([0.019, 0.008, 0.019, kx - 0.165 + c * 0.0254, H + 0.016, kz - 0.042 + r * 0.026]);
  keys.push([0.15, 0.008, 0.019, kx, H + 0.016, kz + 0.062]); // space bar
  g.add(boxes(keys, '#e6e7e8', { cast: false }));
  g.add(cbox(0.2, 0.004, 0.17, PAL.charcoal, { x: kx + 0.3, y: H, z: kz, r: 0.003, cast: false }));
  const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 6), mat('#d8dadc'));
  mouse.scale.set(0.8, 0.45, 1.2);
  mouse.position.set(kx + 0.3, H + 0.008, kz);
  g.add(sh(mouse));
  if (!clutter) return g;
  // tray with a lip and paper in it
  const tx = -w * 0.36,
    tz = -0.05;
  g.add(cbox(0.21, 0.01, 0.27, PAL.dark, { x: tx, y: H, z: tz, r: 0.004 }));
  g.add(
    boxes(
      [
        [0.21, 0.045, 0.01, tx, H, tz - 0.13],
        [0.21, 0.03, 0.01, tx, H, tz + 0.13],
        [0.01, 0.045, 0.27, tx - 0.1, H, tz],
        [0.01, 0.045, 0.27, tx + 0.1, H, tz],
      ],
      PAL.dark,
    ),
  );
  for (let i = 0; i < 4; i++) {
    const s = cbox(0.19, 0.004, 0.25, PAL.paper, {
      x: tx + (i % 2 ? 0.004 : -0.003),
      y: H + 0.01 + i * 0.005,
      z: tz,
      r: 0.001,
      cast: false,
    });
    s.rotation.y = (i - 1.5) * 0.02;
    g.add(s);
  }
  // pen cup with a rim and pens
  const cx = w * 0.33,
    cz = -0.12;
  g.add(cyl(0.035, 0.03, 0.08, '#4a5b78', { x: cx, y: H + 0.04, z: cz }));
  {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.004, 5, 16), mat('#4a5b78'));
    rim.position.set(cx, H + 0.08, cz);
    rim.rotation.x = Math.PI / 2;
    g.add(rim);
  }
  for (const [dx, dz, col, tilt] of [
    [0.01, 0.005, '#2c4f9a', 0.15],
    [-0.012, 0.004, '#1d1f24', -0.12],
    [0.002, -0.012, '#c24a4a', 0.05],
  ]) {
    const p = cyl(0.005, 0.005, 0.13, col, { x: cx + dx, y: H + 0.1, z: cz + dz, seg: 6 });
    p.rotation.z = tilt;
    g.add(p);
  }
  // binders standing at the end, with a ring hole and a label
  const bcol = ['#4a6490', '#6a7a8c', '#3d4d6b'][seed % 3];
  for (const [bx, col] of [
    [w * 0.42, bcol],
    [w * 0.42 - 0.055, '#5b6f86'],
  ]) {
    g.add(cbox(0.05, 0.22, 0.2, col, { x: bx, y: H, z: -0.2, r: 0.008 }));
    g.add(cbox(0.03, 0.06, 0.004, '#f1efe9', { x: bx, y: H + 0.12, z: -0.098, r: 0.002, cast: false }));
    g.add(cyl(0.009, 0.009, 0.006, PAL.charcoal, { x: bx, y: H + 0.05, z: -0.099, rx: Math.PI / 2, seg: 10 }));
  }
  return g;
}
export function monitor(o = {}) {
  const g = baseMonitor(o);
  // drop the base monitor's body and stand, keep its screen (live, or off)
  const screen = g.children.find((c) => c.geometry && c.geometry.type === 'PlaneGeometry');
  g.clear();
  g.add(screen);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.014, 20), mat(PAL.monitor));
  foot.scale.z = 0.7;
  foot.position.y = 0.007;
  g.add(sh(foot));
  g.add(cbox(0.05, 0.14, 0.022, PAL.monitor, { y: 0.01, z: -0.03, r: 0.008 }));
  g.add(cyl(0.014, 0.014, 0.06, PAL.charcoal, { y: 0.135, z: -0.03, rz: Math.PI / 2, seg: 10 }));
  g.add(cbox(0.46, 0.3, 0.02, PAL.monitor, { y: 0.1, z: -0.006, r: 0.01 })); // shell
  g.add(cbox(0.24, 0.16, 0.03, PAL.monitor, { y: 0.17, z: -0.022, r: 0.02 })); // back bulge
  g.add(
    boxes(
      [
        [0.46, 0.022, 0.012, 0, 0.1, 0.009],
        [0.46, 0.022, 0.012, 0, 0.378, 0.009],
        [0.024, 0.3, 0.012, -0.218, 0.1, 0.009],
        [0.024, 0.3, 0.012, 0.218, 0.1, 0.009],
      ],
      PAL.monitor,
      { cast: false },
    ),
  ); // bezel frame
  screen.position.set(0, 0.25, 0.012);
  const led = cbox(0.01, 0.005, 0.004, null, {
    x: 0.19,
    y: 0.104,
    z: 0.016,
    r: 0.002,
    cast: false,
    m: emissive('#6fd0c6', '#6fd0c6', 1.4),
  });
  g.add(led);
  return g;
}

// centre: the origin at the middle of the cup, like cast.js's plain mug (the game places mugs by their middle)
export function mug(color = '#e9e6df', { centre = false } = {}) {
  const g = new THREE.Group(),
    c = centre ? new THREE.Group() : g;
  if (centre) {
    c.position.y = -0.044;
    g.add(c);
  }
  const prof = [
    [0, 0],
    [0.034, 0],
    [0.037, 0.004],
    [0.04, 0.08],
    [0.043, 0.084],
    [0.043, 0.088],
    [0.036, 0.088],
    [0.034, 0.012],
    [0, 0.012],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 18), mat(color, { roughness: 0.5 }));
  c.add(sh(body));
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), mat('#33282a', { roughness: 0.3 }));
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.07;
  c.add(coffee);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 6, 10, Math.PI), mat(color, { roughness: 0.5 }));
  hd.rotation.z = -Math.PI / 2;
  hd.position.set(0.041, 0.045, 0);
  c.add(sh(hd));
  return g;
}
export function paperPile(n = 6) {
  const g = new THREE.Group();
  let r = 7;
  const rnd = () => {
    r = (r * 16807) % 2147483647;
    return r / 2147483647;
  };
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.0035, 0.297), mat(i % 3 === 2 ? '#e9ecef' : PAL.paper));
    s.position.set((rnd() - 0.5) * 0.02, 0.002 + i * 0.0042, (rnd() - 0.5) * 0.02);
    s.rotation.y = (rnd() - 0.5) * 0.14;
    g.add(sh(s, i === n - 1, true));
  }
  // a clip on the top sheet
  g.add(cbox(0.03, 0.006, 0.012, PAL.charcoal, { x: -0.07, y: n * 0.0042 + 0.001, z: -0.14, r: 0.002, cast: false }));
  return g;
}

// ---------- chair: five-star base with casters, gas lift, seat and back on shells, armrests ----------
export function chair(color = PAL.chair) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2,
      arm = new THREE.Group();
    arm.rotation.y = a;
    arm.add(cbox(0.03, 0.022, 0.21, PAL.dark, { y: 0.04, z: 0.1, r: 0.008 }));
    const cw = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mat(PAL.charcoal));
    cw.position.set(0, 0.022, 0.2);
    arm.add(sh(cw));
    g.add(arm);
  }
  g.add(cyl(0.035, 0.04, 0.05, PAL.dark, { y: 0.06 }));
  g.add(cyl(0.018, 0.018, 0.09, '#9aa0aa', { y: 0.12, m: mat('#9aa0aa', { roughness: 0.35, metalness: 0.5 }) }));
  g.add(cbox(0.3, 0.025, 0.28, PAL.dark, { y: 0.16, r: 0.008 })); // seat shell
  g.add(rbox(0.37, 0.065, 0.35, color, { y: 0.18, r: 0.03, seg: 3 })); // cushion
  g.add(cbox(0.06, 0.2, 0.03, PAL.dark, { y: 0.17, z: -0.16, r: 0.008 })); // spine
  g.add(cbox(0.33, 0.33, 0.025, PAL.dark, { y: 0.27, z: -0.2, r: 0.01 })); // back shell
  g.add(rbox(0.34, 0.34, 0.06, color, { y: 0.27, z: -0.175, r: 0.028, seg: 3 }));
  for (const s of [-1, 1]) {
    g.add(cbox(0.025, 0.12, 0.03, PAL.dark, { x: s * 0.19, y: 0.17, z: -0.02, r: 0.006 }));
    g.add(cbox(0.05, 0.022, 0.2, PAL.dark, { x: s * 0.19, y: 0.29, z: 0.0, r: 0.009 }));
  }
  return g;
}

export function tower() {
  const g = new THREE.Group();
  g.add(cbox(0.2, 0.42, 0.44, '#3a3f49', { r: 0.014 }));
  g.add(cbox(0.19, 0.4, 0.012, '#30343d', { y: 0.01, z: 0.222, r: 0.006, cast: false })); // front bezel
  g.add(
    boxes(
      Array.from({ length: 9 }, (_, i) => [0.13, 0.006, 0.006, 0, 0.06 + i * 0.022, 0.229]),
      '#23262d',
      { cast: false },
    ),
  ); // intake slats
  g.add(cbox(0.14, 0.018, 0.006, '#23262d', { y: 0.34, z: 0.229, r: 0.002, cast: false })); // drive slot
  g.add(cyl(0.013, 0.013, 0.008, '#555b66', { x: -0.05, y: 0.385, z: 0.23, rx: Math.PI / 2, seg: 14 }));
  g.add(
    cbox(0.012, 0.012, 0.006, null, {
      x: 0.05,
      y: 0.385,
      z: 0.23,
      r: 0.003,
      cast: false,
      m: emissive('#6fd0c6', '#6fd0c6', 1.4),
    }),
  );
  for (const x of [-0.06, 0.06]) g.add(cbox(0.03, 0.012, 0.3, PAL.charcoal, { x, y: -0.006, r: 0.004, cast: false })); // feet
  return g;
}
export function bin() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.11, 0.3, 18, 1, true),
    mat('#4f5866', { side: THREE.DoubleSide }),
  );
  m.position.y = 0.15;
  g.add(sh(m));
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.11, 18), mat('#4f5866'));
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = 0.01;
  g.add(bottom);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.008, 5, 22), mat('#4f5866'));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.3;
  g.add(sh(rim));
  for (const [x, z, s] of [
    [0.03, 0.02, 1],
    [-0.04, -0.03, 0.8],
  ]) {
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045 * s, 0), mat(PAL.paper));
    p.position.set(x, 0.24, z);
    p.rotation.set(x * 20, z * 30, 1);
    g.add(sh(p));
  }
  return g;
}

// the monitor's cable down the back of the desk to the floor and along the wall to the socket, and the PC's
export function cables(DESK, wallZ, towerXZ) {
  const g = new THREE.Group(),
    m = mat('#2a2d33', { roughness: 0.6 });
  const back = DESK.z - DESK.d / 2 - 0.03,
    sx = DESK.x + 0.3;
  const runs = [
    [
      [DESK.x, 0.56, DESK.z - DESK.d * 0.2 - 0.04],
      [DESK.x + 0.02, 0.45, back + 0.02],
      [DESK.x + 0.05, 0.3, back],
      [DESK.x + 0.08, 0.05, back - 0.02],
      [DESK.x + 0.14, 0.012, wallZ + 0.05],
      [sx - 0.04, 0.012, wallZ + 0.02],
      [sx - 0.035, 0.1, wallZ + 0.015],
    ],
    [
      [towerXZ[0], 0.3, towerXZ[1] - 0.22],
      [towerXZ[0] + 0.02, 0.2, towerXZ[1] - 0.26],
      [towerXZ[0] + 0.06, 0.012, wallZ + 0.06],
      [DESK.x - 0.2, 0.012, wallZ + 0.03],
      [sx - 0.1, 0.012, wallZ + 0.03],
      [sx + 0.03, 0.1, wallZ + 0.015],
    ],
  ];
  for (const pts of runs) {
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 40, 0.006, 5),
      m,
    );
    g.add(sh(tube, false, true));
  }
  return g;
}

// ---------- shelf: folded lips on each shelf, cross bracing at the back, binders with ring holes and labels ----------
// ---------- shelf: posts, folded lips on each shelf, cross bracing at the back; binders with ring holes and labels,
// or boxes or paper as in props.js ----------
export function shelf(w = 0.9, h = 1.1, d = 0.36, { fill = 'binders', seed = 1 } = {}) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) {
    g.add(cbox(0.04, h, 0.04, PAL.metal, { x: sx * (w / 2 - 0.02), z: d / 2 - 0.02, r: 0.008 }));
    g.add(cbox(0.04, h, 0.04, PAL.metal, { x: sx * (w / 2 - 0.02), z: -d / 2 + 0.02, r: 0.008 }));
    g.add(cbox(0.02, 0.02, d - 0.06, PAL.metal, { x: sx * (w / 2 - 0.02), y: 0.3, r: 0.005 }));
  }
  const br = [];
  const L = Math.hypot(w - 0.08, h - 0.2),
    ang = Math.atan2(h - 0.2, w - 0.08);
  for (const s of [-1, 1]) {
    const b = cbox(L, 0.012, 0.006, PAL.metal, { r: 0.002, cast: false });
    b.position.set(0, h / 2 - 0.006, -d / 2 + 0.01);
    b.rotation.z = s * ang;
    br.push(b);
  }
  g.add(...br);
  let r = seed;
  const rnd = () => {
    r = (r * 16807) % 2147483647;
    return r / 2147483647;
  };
  const levels = 4;
  for (let i = 0; i < levels; i++) {
    const y = 0.06 + (i * (h - 0.1)) / (levels - 1);
    g.add(cbox(w - 0.02, 0.02, d, '#a3a9b2', { y, r: 0.006 }));
    g.add(cbox(w - 0.02, 0.035, 0.012, '#a3a9b2', { y: y - 0.015, z: d / 2 - 0.004, r: 0.004, cast: false })); // folded lip
    if (i === levels - 1) continue;
    const gap = (h - 0.1) / (levels - 1) - 0.05;
    if (fill === 'box') {
      let x = -w / 2 + 0.08;
      while (x < w / 2 - 0.2) {
        const bw = 0.22 + rnd() * 0.1,
          bh = Math.min(gap, 0.16 + rnd() * 0.08);
        if (rnd() > 0.2) {
          const col = rnd() > 0.5 ? PAL.box : PAL.boxDark;
          g.add(cbox(bw, bh, d * 0.8, col, { x: x + bw / 2, y: y + 0.013, r: 0.008 }));
          g.add(
            cbox(bw * 0.3, 0.02, 0.004, '#3e434d', {
              x: x + bw / 2,
              y: y + 0.013 + bh * 0.62,
              z: d * 0.4 + 0.001,
              r: 0.002,
              cast: false,
            }),
          );
        } // a hand hole
        x += bw + 0.04;
      }
      continue;
    }
    if (fill === 'paper') {
      for (let k = 0; k < 3; k++) {
        const pile = paperPile(8 + ((rnd() * 5) | 0));
        pile.scale.set((w * 0.26) / 0.21, 1.5, (d * 0.75) / 0.297);
        pile.position.set(-w * 0.3 + k * w * 0.3, y + 0.013, 0);
        g.add(pile);
      }
      continue;
    }
    let x = -w / 2 + 0.06;
    const cols = ['#4a6490', '#6a7a8c', '#3d4d6b', '#7f8ea3', '#56657e'];
    const labels = [],
      holes = [];
    while (x < w / 2 - 0.08) {
      const bh = gap * 0.85,
        col = cols[(rnd() * 5) | 0],
        lean = x > w / 2 - 0.2 && i === 1 ? 0.18 : 0;
      const b = cbox(0.05, bh, d * 0.7, col, { x: x + 0.025, y: y + 0.013, r: 0.006 });
      b.rotation.z = -lean;
      g.add(b);
      if (!lean) {
        labels.push([0.032, bh * 0.28, 0.004, x + 0.025, y + 0.013 + bh * 0.45, d * 0.35 + 0.001]);
        holes.push([x + 0.025, y + 0.013 + bh * 0.2]);
      }
      x += 0.055 + (lean ? 0.03 : 0);
    }
    g.add(boxes(labels, '#eeece6', { cast: false }));
    for (const [hx, hy] of holes)
      g.add(cyl(0.008, 0.008, 0.005, PAL.charcoal, { x: hx, y: hy, z: d * 0.35 + 0.001, rx: Math.PI / 2, seg: 8 }));
  }
  return g;
}

// ---------- filing cabinet: inset drawers with gaps, recessed bar handles, label holders, a lock, a plinth ----------
export function filingCabinet(drawers = 3, color = '#8a909a') {
  const g = new THREE.Group();
  const h = 0.22 * drawers + 0.04;
  g.add(cbox(0.42, h, 0.46, color, { r: 0.012 }));
  g.add(cbox(0.4, 0.035, 0.44, PAL.dark, { r: 0.006, cast: false }));
  for (let i = 0; i < drawers; i++) {
    const y = 0.045 + i * 0.22;
    g.add(cbox(0.38, 0.2, 0.014, '#9aa0a9', { y, z: 0.232, r: 0.006, cast: false }));
    g.add(cbox(0.14, 0.03, 0.01, '#6f757f', { y: y + 0.12, z: 0.24, r: 0.004, cast: false })); // recess
    g.add(cbox(0.12, 0.014, 0.022, '#c9cdd2', { y: y + 0.125, z: 0.246, r: 0.005, cast: false })); // bar
    g.add(
      boxes(
        [
          [0.08, 0.004, 0.006, 0, y + 0.155, 0.242],
          [0.08, 0.004, 0.006, 0, y + 0.185, 0.242],
          [0.004, 0.034, 0.006, -0.038, y + 0.155, 0.242],
          [0.004, 0.034, 0.006, 0.038, y + 0.155, 0.242],
        ],
        '#c9cdd2',
        { cast: false },
      ),
    ); // label holder
    g.add(cbox(0.072, 0.026, 0.004, '#f1efe9', { y: y + 0.158, z: 0.241, r: 0.001, cast: false }));
  }
  g.add(cyl(0.012, 0.012, 0.01, '#c9cdd2', { x: 0.15, y: h - 0.03, z: 0.232, rx: Math.PI / 2, seg: 12 }));
  return g;
}

// ---------- plant: the base plant plus a rolled rim on the pot, a saucer and pebbles on the soil ----------
export function plant(o = {}) {
  const g = basePlant(o),
    s = o.size || 1;
  g.add(
    boxes(
      [
        [0.39 * s, 0.03, 0.03, 0, 0.33 * s, 0.18 * s],
        [0.39 * s, 0.03, 0.03, 0, 0.33 * s, -0.18 * s],
        [0.03, 0.03, 0.39 * s, 0.18 * s, 0.33 * s, 0],
        [0.03, 0.03, 0.39 * s, -0.18 * s, 0.33 * s, 0],
      ],
      o.pot || PAL.planter,
    ),
  );
  g.add(cbox(0.42 * s, 0.02, 0.42 * s, '#b3aea5', { y: -0.004, r: 0.008, cast: false }));
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.015 * s, 0), mat('#8d8f93'));
    p.position.set(Math.cos(i * 2.1) * 0.1 * s, 0.35 * s + 0.008, Math.sin(i * 2.1) * 0.1 * s);
    g.add(p);
  }
  return g;
}
export function pins(w, h) {
  const g = new THREE.Group(),
    cols = ['#c24a4a', '#2c4f9a', '#e0b340', '#4a8f5a', '#c24a4a'];
  for (let i = 0; i < 5; i++) {
    const x = -w / 2 + ((30 + i * 90 + (i % 2) * 10 + 40) / 512) * w,
      y = 0.025 + h - ((30 + (i % 3) * 50 + 6) / 320) * h;
    g.add(cyl(0.008, 0.008, 0.012, cols[i], { x, y, z: 0.028, rx: Math.PI / 2, seg: 8 }));
  }
  return g;
}
export function clockRim() {
  const m = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.014, 6, 32), mat('#2c3038', { roughness: 0.5 }));
  m.position.z = 0.004;
  const g = new THREE.Group();
  g.add(sh(m, false, true));
  return g;
}
