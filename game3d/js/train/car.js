// The monorail car: a roofless shell with window cut-outs, blue benches, poles, hand straps, racks,
// wall lamps and a plant, plus the neighbouring cars and the gangway bellows.
// Car-local space: floor top at y = 0, travel along +x, the camera-side wall at +z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { hull, icoPoints } from './hull.js';
import { V } from './kit.js';

export const LX = 4.0;   // inner half length
export const LZ = 1.2;   // inner half width
export const T = 0.1;    // wall thickness
const RI = 0.34;         // inner corner radius (plan)
export const HF = 1.45;  // full wall height
export const SEAT_Y = 0.22; // seat cushion top
export const BENCH_D = 0.4;
export const RAIL_Y = 1.42;
export const WIN = { xs: [-2.45, -1.1, 1.1, 2.45], w: 1.18 };
export const BENCHES = [[-3.05, -0.42], [0.42, 3.05]];
export const DOOR_X = 3.52, DOOR_W = 0.74;

export const COL = {
  shell: '#c9d4e2', shellDark: '#a7b3c3', inner: '#f2e9dc', floor: '#e6d5ba', stripe: '#4d86c4',
  seat: '#5a8fd6', seatBack: '#4f80c6', seatBase: '#b7c0cb', metal: '#cfd6de', strap: '#8d98a6', loop: '#f3f5f7',
  frame: '#d5dbe2', lamp: '#fff0cf', door: '#dde3e9', rack: '#c2cad3',
};

const mats = {};
export function mat(name, color, opts = {}) {
  if (!mats[name]) mats[name] = new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0, ...opts });
  return mats[name];
}

const shadowOn = (m, cast = true, recv = true) => { m.castShadow = cast; m.receiveShadow = recv; return m; };

function rrectPath(path, x0, y0, x1, y1, r) {
  r = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
  path.moveTo(x0 + r, y0);
  path.lineTo(x1 - r, y0); path.quadraticCurveTo(x1, y0, x1, y0 + r);
  path.lineTo(x1, y1 - r); path.quadraticCurveTo(x1, y1, x1 - r, y1);
  path.lineTo(x0 + r, y1); path.quadraticCurveTo(x0, y1, x0, y1 - r);
  path.lineTo(x0, y0 + r); path.quadraticCurveTo(x0, y0, x0 + r, y0);
  return path;
}

// Wall profile along u (-len/2..len/2), v up, with its top sloping down to hA / hB at the ends.
function wallShape(len, H, hA, hB, holes, slope = 0.7) {
  const s = new THREE.Shape();
  const a = -len / 2, b = len / 2;
  s.moveTo(a, 0); s.lineTo(b, 0);
  s.lineTo(b, hB);
  if (hB < H) s.lineTo(b - slope, H);
  if (hA < H) { s.lineTo(a + slope, H); } else s.lineTo(a, H);
  s.lineTo(a, hA);
  s.lineTo(a, 0);
  for (const [x0, y0, x1, y1, r] of holes) s.holes.push(rrectPath(new THREE.Path(), x0, y0, x1, y1, r));
  return s;
}

const EXT = (depth, bevel = 0.018) => ({ depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 });

function ringShape(x0, y0, x1, y1, r, w) {
  const s = rrectPath(new THREE.Shape(), x0 - w, y0 - w, x1 + w, y1 + w, r + w);
  s.holes.push(rrectPath(new THREE.Path(), x0, y0, x1, y1, r));
  return s;
}

// Plan-view quarter ring for a rounded corner. Shape y = -world z (see placePlan).
function cornerShape(cx, cz, sx, sz, r0, r1) {
  // shape space is (x, -z); the arc runs from the +-x direction to the +-z direction of this corner
  const C = [cx, -cz];
  const a1 = Math.atan2(0, sx), a2 = Math.atan2(-sz, 0);
  const d = Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1));
  const n = 10, s = new THREE.Shape();
  for (let i = 0; i <= n; i++) { const a = a1 + d * (i / n); const p = [C[0] + Math.cos(a) * r1, C[1] + Math.sin(a) * r1]; i ? s.lineTo(...p) : s.moveTo(...p); }
  for (let i = n; i >= 0; i--) { const a = a1 + d * (i / n); s.lineTo(C[0] + Math.cos(a) * r0, C[1] + Math.sin(a) * r0); }
  return s;
}
function placePlan(geo) { const m = new THREE.Matrix4().makeRotationX(-Math.PI / 2); geo.applyMatrix4(m); return geo; }

function planRRect(hx, hz, r) { return rrectPath(new THREE.Shape(), -hx, -hz, hx, hz, r); }

// ---------- poster (tiny canvas texture) ----------
function posterTexture(kind) {
  const c = document.createElement('canvas'); c.width = 192; c.height = 256;
  const g = c.getContext('2d');
  if (kind === 0) {
    const sky = g.createLinearGradient(0, 0, 0, 160); sky.addColorStop(0, '#9fd2f0'); sky.addColorStop(1, '#e8f4fb');
    g.fillStyle = sky; g.fillRect(0, 0, 192, 256);
    g.fillStyle = '#2f8fcf'; g.fillRect(0, 150, 192, 106);
    g.fillStyle = '#5ab0dd'; g.fillRect(0, 150, 192, 10);
    g.fillStyle = '#7bb37a'; g.beginPath(); g.ellipse(110, 152, 62, 22, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#f4f6f8'; for (const [x, w, h] of [[88, 12, 60], [104, 16, 84], [124, 12, 50], [140, 10, 36]]) g.fillRect(x, 150 - h, w, h);
    g.fillStyle = '#ffffff'; g.fillRect(0, 214, 192, 42);
    g.fillStyle = '#34496a'; g.font = 'bold 22px sans-serif'; g.fillText('AMAKAWA', 14, 243);
  } else {
    g.fillStyle = '#f7f1e6'; g.fillRect(0, 0, 192, 256);
    g.fillStyle = '#e46a5a'; g.beginPath(); g.arc(96, 96, 52, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(96, 96, 30, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e46a5a'; g.fillRect(90, 60, 12, 40); g.fillRect(96, 94, 26, 10);
    g.fillStyle = '#34496a'; g.fillRect(24, 182, 144, 12); g.fillRect(24, 204, 104, 10); g.fillRect(24, 224, 124, 10);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ---------- the shell ----------
// mode 'land': camera on the +z side, so the +z wall is cut low. 'port': camera at the -x end.
function buildShell(mode) {
  const g = new THREE.Group();
  g.name = 'shell';
  const low = mode === 'land' ? { zp: 0.62, xn: HF } : { zp: HF, xn: 0.86 };
  const H = { zn: HF, zp: low.zp, xn: low.xn, xp: HF };
  const inner = mat('inner', COL.inner), shell = mat('shell', COL.shell, { roughness: 0.55 }), frame = mat('frame', COL.frame, { roughness: 0.5 });
  const lampM = mat('lamp', COL.lamp, { emissive: new THREE.Color('#ffd08a'), emissiveIntensity: 2.4 });
  const straightX = 2 * (LX - RI), straightZ = 2 * (LZ - RI);
  const winTop = (h) => Math.min(h - 0.19, 1.22);
  const winBot = (h) => (h < HF ? 0.34 : 0.44);

  // long walls
  for (const side of [-1, 1]) {
    const h = side < 0 ? H.zn : H.zp;
    // end heights follow the neighbouring wall so corners line up
    const hA = Math.min(h, H.xn), hB = Math.min(h, H.xp);
    const holes = [];
    const wt = winTop(h);
    if (h > 0.8) for (const x of WIN.xs) holes.push([x - WIN.w / 2, winBot(h), x + WIN.w / 2, wt, 0.09]);
    if (side > 0) for (const dx of [-DOOR_X, DOOR_X]) holes.push([dx - DOOR_W / 2, 0.035, dx + DOOR_W / 2, Math.min(h - 0.1, 1.22), 0.06]);
    const shape = wallShape(straightX, h, hA, hB, holes);
    for (const [m, d0, d1] of [[inner, 0, 0.045], [shell, 0.045, T]]) {
      const geo = new THREE.ExtrudeGeometry(shape, EXT(d1 - d0 - 0.01));
      const mesh = new THREE.Mesh(geo, m);
      // extrusion goes along +z; far wall: interior skin nearest the inside
      if (side < 0) { mesh.position.z = -LZ - d1 + 0.005; }
      else { mesh.position.z = LZ + d0 + 0.005; }
      g.add(shadowOn(mesh, false, true));
    }
    // window frames on the inside of the far wall and the outside of the near wall
    if (h > 0.8) for (const x of WIN.xs) {
      const fr = new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape(x - WIN.w / 2, winBot(h), x + WIN.w / 2, wt, 0.09, 0.045), EXT(0.025, 0.012)), frame);
      fr.position.z = side < 0 ? -LZ + 0.0 : LZ + T;
      g.add(shadowOn(fr, false, true));
      // lamps between windows high on the wall
    }
    if (h >= HF) {
      for (const x of [-3.32, -1.78, 0, 1.78, 3.32]) {
        const lamp = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.1, 0.035, 2, 0.015), lampM);
        lamp.position.set(x, h - 0.15, side * (LZ - 0.005));
        g.add(lamp);
      }
    } else {
      // small warm lamps on the outside of the cut wall, like marker lights
      for (const x of [-3.32, -1.78, 0, 1.78, 3.32]) {
        if (Math.abs(Math.abs(x) - DOOR_X) < 0.5) continue;
        const lamp = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.09, 0.03, 2, 0.012), lampM);
        lamp.position.set(x, h - 0.19, side * (LZ + T + 0.012));
        g.add(lamp);
      }
    }
  }

  // end walls (with the gangway door opening)
  for (const side of [-1, 1]) {
    const h = side < 0 ? H.xn : H.xp;
    const hA = Math.min(h, H.zp), hB = Math.min(h, H.zn); // u = -len/2 is the +z end after rotation
    const holes = [[-0.4, 0.035, 0.4, Math.min(h - 0.1, 1.24), 0.07]];
    const shape = wallShape(straightZ, h, hA, hB, holes);
    for (const [m, d0, d1] of [[inner, 0, 0.045], [shell, 0.045, T]]) {
      const geo = new THREE.ExtrudeGeometry(shape, EXT(d1 - d0 - 0.01));
      const mesh = new THREE.Mesh(geo, m);
      // +x wall: rotate so u -> -z and the extrusion runs toward +x
      if (side > 0) { mesh.rotation.y = Math.PI / 2; mesh.position.x = LX + d0 + 0.005; }
      else { mesh.rotation.y = -Math.PI / 2; mesh.position.x = -LX - d0 - 0.005; mesh.scale.z = 1; }
      // fix mirrored u on the -x wall: u -> +z there, so flip the heights by mirroring in z
      if (side < 0) { mesh.scale.x = -1; }
      g.add(shadowOn(mesh, false, true));
    }
    // door leaf in the gangway opening, with a window
    const dh = Math.min(h - 0.1, 1.24) - 0.035;
    const leaf = new THREE.Shape(); rrectPath(leaf, -0.39, 0, 0.39, dh, 0.06);
    if (dh > 0.8) leaf.holes.push(rrectPath(new THREE.Path(), -0.24, dh * 0.5, 0.24, dh - 0.12, 0.06));
    const lm = new THREE.Mesh(new THREE.ExtrudeGeometry(leaf, EXT(0.04, 0.012)), mat('door', COL.door, { roughness: 0.5 }));
    lm.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    lm.position.set(side * (LX + 0.03), 0.035, 0);
    g.add(shadowOn(lm, false, true));
    // posters either side of the door
    if (h >= HF) {
      for (const [z, k] of [[-0.78, 0], [0.78, 1]]) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.45), new THREE.MeshStandardMaterial({ map: posterTexture((k + (side > 0 ? 1 : 0)) % 2), roughness: 0.7 }));
        p.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        p.position.set(side * (LX - 0.004), 0.95, z);
        g.add(shadowOn(p, false, true));
      }
      const lamp = new THREE.Mesh(new RoundedBoxGeometry(0.035, 0.1, 0.5, 2, 0.015), lampM);
      lamp.position.set(side * (LX - 0.005), h - 0.13, 0);
      g.add(lamp);
    }
  }

  // corners: quarter rings in plan, two skins
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const hw = sz < 0 ? H.zn : H.zp, he = sx < 0 ? H.xn : H.xp;
    const h = Math.min(hw, he);
    const cx = sx * (LX - RI), cz = sz * (LZ - RI);
    for (const [m, r0, r1] of [[inner, RI, RI + 0.045], [shell, RI + 0.045, RI + T]]) {
      const geo = placePlan(new THREE.ExtrudeGeometry(cornerShape(cx, cz, sx, sz, r0, r1), EXT(h - 0.036)));
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.y = 0.018;
      g.add(shadowOn(mesh, false, true));
    }
  }

  // near-side door leaves (sliding doors), with tall windows
  for (const dx of [-DOOR_X, DOOR_X]) {
    const h = Math.min(H.zp - 0.1, 1.22) - 0.035;
    for (const k of [-1, 1]) {
      const s = new THREE.Shape(); rrectPath(s, 0, 0, DOOR_W / 2 - 0.01, h, 0.04);
      if (h > 0.7) s.holes.push(rrectPath(new THREE.Path(), 0.08, 0.5, DOOR_W / 2 - 0.09, h - 0.1, 0.05));
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, EXT(0.035, 0.01)), mat('door', COL.door));
      m.position.set(dx + (k < 0 ? -DOOR_W / 2 + 0.005 : 0.005), 0.035, LZ + 0.03);
      g.add(shadowOn(m, false, true));
    }
  }
  return g;
}

// Full-height walls and a roof that only the key light sees (layer 1), so the sun comes in
// through the windows as patches on the floor even though the camera sees a roofless car.
function buildShadowProxy() {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: '#000', colorWrite: false, depthWrite: false });
  const holesLong = WIN.xs.map((x) => [x - WIN.w / 2, 0.44, x + WIN.w / 2, 1.22, 0.09]);
  for (const side of [-1, 1]) {
    const holes = side > 0 ? [...holesLong, ...[-DOOR_X, DOOR_X].map((dx) => [dx - 0.16, 0.55, dx + 0.16, 1.1, 0.05])] : holesLong;
    const s = wallShape(2 * (LX + T), HF + 0.05, HF + 0.05, HF + 0.05, holes);
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false }), m);
    mesh.position.z = side < 0 ? -LZ - T : LZ;
    g.add(mesh);
  }
  for (const side of [-1, 1]) {
    const s = wallShape(2 * LZ, HF + 0.05, HF + 0.05, HF + 0.05, [[-0.24, 0.62, 0.24, 1.12, 0.05]]);
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false }), m);
    mesh.rotation.y = Math.PI / 2;
    mesh.position.x = side < 0 ? -LX - T : LX;
    g.add(mesh);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2 * (LX + T), 0.06, 2 * (LZ + T)), m);
  roof.position.y = HF + 0.05;
  g.add(roof);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.userData.noAO = true; } });
  g.name = 'proxy';
  return g;
}

// ---------- props ----------
function pole(a, b, r, material) {
  const A = a.isVector3 ? a : V(...a), B = b.isVector3 ? b : V(...b);
  const len = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8, 1), material);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), B.clone().sub(A).normalize());
  return shadowOn(m);
}

function bench(x0, x1, side, withBack) {
  const g = new THREE.Group();
  const len = x1 - x0, cx = (x0 + x1) / 2;
  const zc = side * (LZ - BENCH_D / 2);
  const cushion = new THREE.Mesh(new RoundedBoxGeometry(len - 0.04, 0.1, BENCH_D, 3, 0.045), mat('seat', COL.seat, { roughness: 0.9 }));
  cushion.position.set(cx, SEAT_Y - 0.05, zc + side * 0.01);
  g.add(shadowOn(cushion));
  // seams between seats: gentle dips made by separate cushions look fussy from above; a thin line instead
  const base = new THREE.Mesh(new RoundedBoxGeometry(len - 0.16, SEAT_Y - 0.08, BENCH_D - 0.1, 2, 0.03), mat('seatBase', COL.seatBase));
  base.position.set(cx, (SEAT_Y - 0.08) / 2, zc + side * 0.04);
  g.add(shadowOn(base));
  if (withBack) {
    const back = new THREE.Mesh(new RoundedBoxGeometry(len - 0.06, 0.36, 0.09, 3, 0.04), mat('seatBack', COL.seatBack, { roughness: 0.9 }));
    back.position.set(cx, SEAT_Y + 0.2, side * (LZ - 0.06));
    back.rotation.x = side * -0.12;
    g.add(shadowOn(back));
  }
  // end panels
  for (const xe of [x0, x1]) {
    const p = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.42, BENCH_D + 0.02, 2, 0.02), mat('metal', COL.metal, { roughness: 0.4, metalness: 0.25 }));
    p.position.set(xe, 0.21 + 0.1, zc);
    g.add(shadowOn(p));
  }
  return g;
}

function rackAndRail(x0, x1, side, straps, rack) {
  const g = new THREE.Group();
  const metal = mat('metal', COL.metal, { roughness: 0.4, metalness: 0.25 });
  const zr = side * (LZ - 0.55);
  // bench end poles up to the rail, with a curved top into the rail
  for (const xe of [x0, x1]) {
    g.add(pole([xe, 0, side * (LZ - BENCH_D - 0.02)], [xe, RAIL_Y, side * (LZ - BENCH_D - 0.02)], 0.022, metal));
    g.add(pole([xe, RAIL_Y, side * (LZ - BENCH_D - 0.02)], [xe, RAIL_Y, zr], 0.02, metal));
    // armrest bar back to the wall
    g.add(pole([xe, 0.5, side * (LZ - BENCH_D - 0.02)], [xe, 0.5, side * LZ], 0.018, metal));
  }
  g.add(pole([x0 - 0.02, RAIL_Y, zr], [x1 + 0.02, RAIL_Y, zr], 0.021, metal));
  // hand straps: grey band + triangular loop, on a pivot at the rail so they can swing
  const bandGeo = new RoundedBoxGeometry(0.03, 0.14, 0.012, 1, 0.005);
  const loopGeo = new THREE.TorusGeometry(0.055, 0.011, 5, 3);
  const bandM = mat('strap', COL.strap), loopM = mat('loop', COL.loop, { roughness: 0.45 });
  for (let x = x0 + 0.24; x <= x1 - 0.2; x += 0.4) {
    const piv = new THREE.Group();
    piv.position.set(x, RAIL_Y, zr);
    const band = new THREE.Mesh(bandGeo, bandM); band.position.y = -0.08;
    const loop = new THREE.Mesh(loopGeo, loopM); loop.position.y = -0.2; loop.rotation.z = Math.PI / 2; // apex up
    piv.add(shadowOn(band), shadowOn(loop));
    g.add(piv);
    straps.push({ piv, ph: (straps.length * 2.39) % 6.28, a: 0, v: 0, b: 0, w: 0 });
  }
  if (rack) {
    // luggage rack on brackets at the top of the far wall
    const rz = side * (LZ - 0.17);
    for (const dz of [-0.1, 0.1]) g.add(pole([x0 + 0.05, HF - 0.1, rz + dz], [x1 - 0.05, HF - 0.1, rz + dz], 0.015, mat('rack', COL.rack, { roughness: 0.45, metalness: 0.2 })));
    for (let x = x0 + 0.2; x < x1; x += 0.8) g.add(pole([x, HF - 0.1, side * LZ], [x, HF - 0.1, rz - side * 0.12], 0.014, metal));
  }
  return g;
}

function plant() {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.24, 12, 1), mat('pot', '#f3f1ec', { roughness: 0.6 }));
  pot.position.y = 0.12;
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.02, 12), mat('soil', '#7a5a43'));
  soil.position.y = 0.235;
  g.add(shadowOn(pot), shadowOn(soil));
  const leaves = new THREE.Group();
  leaves.position.y = 0.24;
  const leafM = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.75 });
  const L = [[0, 0.26, 0, 0.13, '#5da35a'], [0.1, 0.17, 0.06, 0.1, '#6fb865'], [-0.11, 0.16, 0.03, 0.1, '#4f9450'], [0.02, 0.15, -0.11, 0.1, '#58a056'], [-0.04, 0.12, 0.12, 0.09, '#77c06b'], [0.12, 0.3, -0.04, 0.08, '#63ab5d'], [-0.1, 0.32, -0.03, 0.08, '#5aa057']];
  for (const [x, y, z, r, c] of L) {
    const geo = hull(icoPoints(V(x, y, z), [r, r * 0.8, r], 0.15, Math.round((x + 1) * 100)), c, { grad: 0.25, name: 'leaf' }).build();
    const m = new THREE.Mesh(geo, leafM);
    leaves.add(shadowOn(m));
  }
  g.add(leaves);
  g.userData.leaves = leaves;
  return g;
}

export function bagMesh(kind, color) {
  const g = new THREE.Group();
  const m = mat('bag-' + color, color, { roughness: 0.85 });
  if (kind === 'brief') {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.22, 0.09, 3, 0.03), m); b.position.y = 0.11;
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 5, 8, Math.PI), mat('bag-dk', '#3b2d26')); h.position.y = 0.22;
    g.add(shadowOn(b), shadowOn(h));
  } else if (kind === 'tote') {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.2, 0.11, 3, 0.04), m); b.position.y = 0.1;
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 5, 10, Math.PI), m); h.position.y = 0.2;
    g.add(shadowOn(b), shadowOn(h));
  } else if (kind === 'pack') {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.26, 0.14, 3, 0.06), m); b.position.y = 0.13;
    const p = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.11, 0.05, 2, 0.025), m); p.position.set(0, 0.09, 0.08);
    g.add(shadowOn(b), shadowOn(p));
  } else if (kind === 'case') {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.16, 0.24, 3, 0.05), m); b.position.y = 0.08;
    const h = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.03, 0.03, 1, 0.012), mat('bag-dk', '#3b2d26')); h.position.y = 0.17;
    g.add(shadowOn(b), shadowOn(h));
  }
  return g;
}

// ---------- the car ----------
export function buildCar(mode = 'land') {
  const root = new THREE.Group();
  root.name = 'car';
  const straps = [];
  const nodders = []; // things that nod a little with the motion: {obj, k}

  // floor and the body below it
  const floor = new THREE.Mesh(new RoundedBoxGeometry(2 * LX + 0.06, 0.08, 2 * LZ + 0.06, 2, 0.03), mat('floor', COL.floor, { roughness: 0.85 }));
  floor.position.y = -0.04;
  floor.name = 'floor';
  root.add(shadowOn(floor, false, true));

  const body = new THREE.Mesh(placePlan(new THREE.ExtrudeGeometry(planRRect(LX + T, LZ + T, RI + T), { depth: 0.42, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.06, bevelSegments: 3, curveSegments: 10 })), mat('shellDark', COL.shellDark, { roughness: 0.6 }));
  body.position.y = -0.46 - 0.12; // bevels grow the extrusion by 0.1 at each end; keep its top under the floor
  root.add(shadowOn(body, false, true));
  const stripeShape = planRRect(LX + T + 0.012, LZ + T + 0.012, RI + T + 0.012);
  stripeShape.holes.push(planRRect(LX + T - 0.02, LZ + T - 0.02, RI + T - 0.02));
  const stripe = new THREE.Mesh(placePlan(new THREE.ExtrudeGeometry(stripeShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 1, curveSegments: 10 })), mat('stripe', COL.stripe, { roughness: 0.5 }));
  stripe.position.y = 0.3;
  root.add(shadowOn(stripe, false, true));
  const stripe2 = stripe.clone(); stripe2.position.y = -0.02; stripe2.scale.y = 0.6;
  root.add(stripe2);
  // bogie housings straddling the beam
  for (const x of [-2.6, 2.6]) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.3, 1.0, 3, 0.1), mat('bogie', '#8e97a3', { roughness: 0.7 }));
    b.position.set(x, -0.56, 0);
    root.add(b);
  }

  const shellHolder = new THREE.Group();
  root.add(shellHolder);
  let shell = buildShell(mode);
  shellHolder.add(shell);
  const proxy = buildShadowProxy();
  root.add(proxy);

  // benches: far side always has backs; the near side has backs only in portrait
  const benchHolder = new THREE.Group();
  root.add(benchHolder);
  function furnish(md) {
    benchHolder.clear();
    straps.length = 0;
    for (const [x0, x1] of BENCHES) {
      benchHolder.add(bench(x0, x1, -1, true));
      benchHolder.add(bench(x0, x1, 1, true));
      benchHolder.add(rackAndRail(x0, x1, -1, straps, md === 'land'));
      benchHolder.add(rackAndRail(x0, x1, 1, straps, false));
    }
    // middle standing poles
    const metal = mat('metal', COL.metal, { roughness: 0.4, metalness: 0.25 });
    for (const z of [-0.5, 0.5]) benchHolder.add(pole([0, 0, z], [0, RAIL_Y, z], 0.022, metal));
    // grab poles either side of the doors
    for (const dx of [-DOOR_X, DOOR_X]) for (const k of [-1, 1]) benchHolder.add(pole([dx + k * 0.5, 0, LZ - 0.12], [dx + k * 0.5, RAIL_Y, LZ - 0.12], 0.02, metal));
    // bags up on the far rack
    if (md === 'land') {
    const r1 = bagMesh('case', '#4d4a52'); r1.position.set(-2.4, HF - 0.08, -(LZ - 0.17)); benchHolder.add(r1);
    const r2 = bagMesh('case', '#6a4f3e'); r2.position.set(2.15, HF - 0.08, -(LZ - 0.17)); r2.rotation.y = 0.05; benchHolder.add(r2);
    const r3 = bagMesh('pack', '#7a8a6a'); r3.position.set(-0.95, HF - 0.08, -(LZ - 0.17)); r3.rotation.set(-1.2, 0.3, 0); benchHolder.add(r3);
    const r4 = bagMesh('tote', '#9b6b54'); r4.position.set(2.75, HF - 0.08, -(LZ - 0.17)); benchHolder.add(r4);
    }
  }
  furnish(mode);

  const pl = plant();
  pl.position.set(-3.6, 0, -0.82);
  root.add(pl);
  nodders.push({ obj: pl.userData.leaves, k: 1 });

  // tiny glass panes, only a faint tint so the sea reads through them
  function setMode(md) {
    if (md === mode) return;
    mode = md;
    shellHolder.remove(shell);
    shell.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    shell = buildShell(md);
    shellHolder.add(shell);
    furnish(md);
  }

  return { root, straps, nodders, proxy, setMode, get mode() { return mode; } };
}

// Neighbouring car: a closed body with a roof, a touch darker and greyer, seen only at the frame edge.
export function buildNeighbour(side) {
  const g = new THREE.Group();
  const bodyM = mat('nb-body', '#98a3b0', { roughness: 0.7 });
  const roofM = mat('nb-roof', '#8793a1', { roughness: 0.8 });
  const winM = mat('nb-win', '#4f6784', { roughness: 0.3 });
  const L = LX + T, W = LZ + T;
  const body = new THREE.Mesh(placePlan(new THREE.ExtrudeGeometry(planRRect(L, W, RI + T), { depth: 1.72, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.08, bevelSegments: 4, curveSegments: 10 })), bodyM);
  body.position.y = -0.46;
  g.add(shadowOn(body));
  const roof = new THREE.Mesh(placePlan(new THREE.ExtrudeGeometry(planRRect(L - 0.22, W - 0.22, RI), { depth: 0.08, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 10 })), roofM);
  roof.position.y = 1.39;
  g.add(shadowOn(roof));
  for (const x of [-2.2, 0, 2.2]) {
    const v = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.1, 0.8, 2, 0.04), roofM);
    v.position.set(x, 1.5, 0);
    g.add(shadowOn(v));
  }
  // windows on both long sides and the gangway end
  for (const sz of [-1, 1]) for (const x of WIN.xs) {
    const w = new THREE.Mesh(new RoundedBoxGeometry(WIN.w, 0.56, 0.04, 2, 0.06), winM);
    w.position.set(x, 0.84, sz * (W + 0.07));
    g.add(w);
  }
  const stripe = new THREE.Mesh(placePlan(new THREE.ExtrudeGeometry((() => { const s = planRRect(L + 0.1, W + 0.1, RI + T + 0.1); s.holes.push(planRRect(L - 0.02, W - 0.02, RI + T - 0.02)); return s; })(), { depth: 0.05, bevelEnabled: false, curveSegments: 10 })), mat('nb-stripe', '#56779c', { roughness: 0.6 }));
  stripe.position.y = 0.3;
  g.add(stripe);
  // gangway end facing our car: a dark door with a small window
  const door = new THREE.Mesh(new RoundedBoxGeometry(0.05, 1.2, 0.8, 2, 0.05), mat('nb-door', '#6d7784', { roughness: 0.7 }));
  door.position.set(-side * (L + 0.12), 0.62, 0);
  const endWin = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.42, 0.44, 2, 0.06), winM);
  endWin.position.set(-side * (L + 0.15), 0.9, 0);
  g.add(door, endWin);
  for (const x of [-2.6, 2.6]) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.3, 1.0, 3, 0.1), mat('bogie', '#8e97a3', { roughness: 0.7 }));
    b.position.set(x, -0.56, 0);
    g.add(b);
  }
  return g;
}

// Gangway bellows between two cars: soft ribs.
export function buildBellows() {
  const g = new THREE.Group();
  const m1 = mat('bel1', '#7d8795', { roughness: 0.9 }), m2 = mat('bel2', '#8f99a6', { roughness: 0.9 });
  for (let i = 0; i < 5; i++) {
    const r = new THREE.Mesh(new RoundedBoxGeometry(0.09, 1.42, 1.5, 2, 0.04), i % 2 ? m1 : m2);
    r.position.set(-0.2 + i * 0.1, 0.62, 0);
    g.add(shadowOn(r));
  }
  return g;
}
