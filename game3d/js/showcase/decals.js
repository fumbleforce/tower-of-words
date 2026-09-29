// Avenue 3, decals and wear: small painted marks from one atlas (4 x 4 cells), laid as flat quads just above the
// surfaces and merged into one mesh (one draw). Placed by hand at spots that make sense (a coffee ring by the mug,
// tape marks where a poster was, a water mark under the window, stickers on the cabinet, scuffs and shoe marks by the
// door) plus one rule: a worn path along the walk from the door to the chair. Light hand: the office is tidy.
// The atlas is painted in code for this test; the real one would be painted with our image models and approved.
import * as THREE from 'three';
import { R, DESK, WIN, DOOR } from './room.js';

const CELLS = ['scuff', 'scuff2', 'ring', 'tapemarks', 'corner', 'water', 'shoe', 'stickers', 'tape', 'wear', 'chips', 'grime', 'pen', 'smudge', 'casters', 'drip'];
const N = 4, S = 256;

function rng(seed) { let r = seed; return () => { r = (r * 16807) % 2147483647; return r / 2147483647; }; }

// soft irregular blob: many overlapping transparent ellipses
function blob(g, x, y, rx, ry, col, a, n, rnd) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${col},${a * (0.4 + rnd() * 0.6)})`;
    g.beginPath(); g.ellipse(x + (rnd() - 0.5) * rx, y + (rnd() - 0.5) * ry, rx * (0.2 + rnd() * 0.5), ry * (0.2 + rnd() * 0.5), rnd() * 3, 0, Math.PI * 2); g.fill();
  }
}
function stroke(g, pts, w, col, a) { g.strokeStyle = `rgba(${col},${a})`; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.stroke(); }

export function paintAtlas() {
  const c = document.createElement('canvas'); c.width = c.height = N * S;
  const g = c.getContext('2d');
  const DARK = '38,40,46', GREY = '70,72,78', PALE = '232,234,236', BROWN = '92,70,52', TAPE = '214,210,196';
  const paint = {
    scuff(rnd) { g.filter = 'blur(1.2px)'; for (let i = 0; i < 7; i++) { const x = 40 + rnd() * 170, y = 60 + rnd() * 130, l = 20 + rnd() * 60, a = -0.4 + rnd() * 0.5; stroke(g, [[x, y], [x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5 + rnd() * 4], [x + Math.cos(a) * l, y + Math.sin(a) * l]], 2 + rnd() * 5, DARK, 0.25 + rnd() * 0.35); } },
    scuff2(rnd) { g.filter = 'blur(2px)'; blob(g, 128, 128, 90, 40, GREY, 0.12, 24, rnd); g.filter = 'blur(0.8px)'; for (let i = 0; i < 9; i++) { const x = 50 + rnd() * 150, y = 100 + rnd() * 60; stroke(g, [[x, y], [x + 10 + rnd() * 30, y + (rnd() - 0.5) * 8]], 1.5 + rnd() * 2.5, DARK, 0.3); } },
    ring(rnd) {
      g.filter = 'blur(0.8px)';
      for (let k = 0; k < 2; k++) { const cx = 118 + k * 34, cy = 124 + k * 18, r = 62 - k * 6; for (let i = 0; i < 40; i++) { const a0 = rnd() * Math.PI * 2; g.strokeStyle = `rgba(${BROWN},${(0.18 + rnd() * 0.3) * (k ? 0.55 : 1)})`; g.lineWidth = 2 + rnd() * 5; g.beginPath(); g.arc(cx, cy, r + (rnd() - 0.5) * 4, a0, a0 + 0.3 + rnd() * 0.9); g.stroke(); } }
      g.filter = 'blur(6px)'; blob(g, 118, 124, 60, 60, BROWN, 0.05, 10, rnd);
    },
    tapemarks(rnd) {
      // a clean rectangle where a poster hung (slightly paler), with four torn tape bits and their grime
      g.filter = 'blur(3px)'; g.fillStyle = `rgba(${PALE},0.18)`; g.fillRect(34, 26, 188, 204);
      g.filter = 'blur(1px)'; g.strokeStyle = `rgba(${GREY},0.12)`; g.lineWidth = 6; g.strokeRect(34, 26, 188, 204);
      g.filter = 'none';
      for (const [x, y, a] of [[34, 26, -0.7], [222, 26, 0.7], [34, 230, 0.7], [222, 230, -0.7]]) {
        g.save(); g.translate(x, y); g.rotate(a + (rnd() - 0.5) * 0.3);
        g.fillStyle = `rgba(${TAPE},0.85)`; g.fillRect(-18, -8, 30 + rnd() * 10, 16);
        g.fillStyle = `rgba(${GREY},0.35)`; g.fillRect(-18, 6, 34, 2);
        g.restore();
      }
    },
    corner(rnd) {
      // a torn-off poster corner still taped on
      g.filter = 'none'; g.fillStyle = 'rgba(236,232,222,0.95)';
      g.beginPath(); g.moveTo(40, 40); g.lineTo(190, 40); for (let i = 0; i < 9; i++) g.lineTo(190 - i * 17 + rnd() * 8, 40 + i * 17 + rnd() * 10); g.lineTo(40, 190); g.closePath(); g.fill();
      g.fillStyle = 'rgba(70,110,160,0.8)'; g.beginPath(); g.moveTo(60, 60); g.lineTo(150, 60); g.lineTo(60, 150); g.closePath(); g.fill();
      g.save(); g.translate(44, 44); g.rotate(-0.78); g.fillStyle = `rgba(${TAPE},0.9)`; g.fillRect(-26, -9, 52, 18); g.restore();
      g.filter = 'blur(2px)'; stroke(g, [[190, 42], [40, 192]], 3, GREY, 0.15);
    },
    water(rnd) {
      g.filter = 'blur(4px)'; blob(g, 128, 110, 170, 90, '120,118,100', 0.07, 30, rnd);
      g.filter = 'blur(1px)'; g.strokeStyle = 'rgba(96,88,70,0.35)'; g.lineWidth = 3; g.beginPath();
      for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI; const x = 128 + Math.cos(a) * 110 * (0.9 + rnd() * 0.15), y = 60 + Math.sin(a) * 120 * (0.85 + rnd() * 0.2); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
      for (let i = 0; i < 5; i++) { const x = 60 + rnd() * 140; stroke(g, [[x, 70], [x + (rnd() - 0.5) * 6, 150 + rnd() * 80]], 3 + rnd() * 3, '96,88,70', 0.14); }
    },
    shoe(rnd) {
      g.filter = 'blur(1.5px)';
      for (const [x, y, a] of [[80, 90, 0.2], [150, 170, -0.1], [175, 70, 0.35]]) {
        g.save(); g.translate(x, y); g.rotate(a);
        g.fillStyle = `rgba(${DARK},0.16)`; g.beginPath(); g.ellipse(0, -18, 17, 26, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(0, 30, 13, 15, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = `rgba(${DARK},0.14)`; g.lineWidth = 2; for (let k = -30; k < 0; k += 7) { g.beginPath(); g.moveTo(-13, k); g.lineTo(13, k); g.stroke(); }
        g.restore();
      }
    },
    stickers() {
      g.filter = 'none';
      g.fillStyle = '#f0c24a'; g.beginPath(); g.arc(70, 80, 40, 0, Math.PI * 2); g.fill(); g.fillStyle = '#2b3140'; g.beginPath(); g.arc(56, 72, 6, 0, 7); g.arc(84, 72, 6, 0, 7); g.fill(); g.lineWidth = 5; g.strokeStyle = '#2b3140'; g.beginPath(); g.arc(70, 84, 20, 0.3, Math.PI - 0.3); g.stroke();
      g.save(); g.translate(170, 90); g.rotate(0.15); g.fillStyle = '#e9ecef'; g.fillRect(-60, -30, 120, 60); g.fillStyle = '#c24a4a'; g.fillRect(-60, -30, 120, 16); g.fillStyle = '#6a7080'; for (let k = 0; k < 3; k++) g.fillRect(-48, -2 + k * 10, 70 - k * 18, 5); g.restore();
      g.save(); g.translate(120, 190); g.rotate(-0.2); g.fillStyle = '#4e8fd1'; g.beginPath(); g.moveTo(0, -40); for (let i = 1; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 18 : 40; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.restore();
      g.filter = 'blur(1px)'; g.strokeStyle = 'rgba(40,40,40,0.25)'; g.lineWidth = 2; g.strokeRect(112, 62, 118, 58);   // a peeled edge line
    },
    tape(rnd) {
      // grey cable tape, horizontal through the middle band of the cell, a cable bulge down its centre
      g.filter = 'none'; g.fillStyle = 'rgba(128,132,138,0.95)'; g.fillRect(0, 100, 256, 56);
      g.fillStyle = 'rgba(96,100,106,0.9)'; g.fillRect(0, 122, 256, 12);
      g.fillStyle = 'rgba(160,164,170,0.7)'; g.fillRect(0, 118, 256, 3);
      g.filter = 'blur(1px)'; for (let i = 0; i < 12; i++) { const x = rnd() * 256; stroke(g, [[x, 102], [x + 6, 154]], 1, DARK, 0.15); }
      g.fillStyle = 'rgba(40,40,46,0.2)'; g.fillRect(0, 156, 256, 3);
    },
    wear(rnd) { g.filter = 'blur(10px)'; blob(g, 128, 128, 150, 150, PALE, 0.07, 40, rnd); g.filter = 'blur(2px)'; blob(g, 128, 128, 120, 120, PALE, 0.04, 30, rnd); },
    chips(rnd) {
      g.filter = 'none';
      for (let i = 0; i < 9; i++) { const x = 14 + rnd() * 228, w = 4 + rnd() * 14, h = 3 + rnd() * 10; g.fillStyle = 'rgba(210,212,214,0.95)'; g.beginPath(); g.moveTo(x, 40); g.lineTo(x + w, 40); g.lineTo(x + w * 0.6, 40 + h); g.lineTo(x - 2, 40 + h * 0.6); g.closePath(); g.fill(); g.fillStyle = `rgba(${DARK},0.35)`; g.fillRect(x, 40 + h, w * 0.6, 1.5); }
    },
    grime(rnd) { const gr = g.createRadialGradient(0, 256, 10, 0, 256, 240); gr.addColorStop(0, `rgba(${DARK},0.3)`); gr.addColorStop(1, `rgba(${DARK},0)`); g.filter = 'blur(2px)'; g.fillStyle = gr; g.fillRect(0, 0, 256, 256); blob(g, 40, 220, 60, 40, DARK, 0.05, 14, rnd); },
    pen(rnd) { g.filter = 'blur(0.5px)'; stroke(g, [[60, 120], [90, 110], [120, 126], [150, 112]], 2.5, '40,60,130', 0.55); stroke(g, [[70, 160], [110, 158]], 2, '40,60,130', 0.4); g.fillStyle = 'rgba(40,60,130,0.5)'; g.beginPath(); g.arc(180, 150, 4, 0, 7); g.fill(); void rnd; },
    smudge(rnd) { g.filter = 'blur(4px)'; for (let i = 0; i < 4; i++) blob(g, 90 + i * 22, 110 + (rnd() - 0.5) * 30, 26, 36, GREY, 0.07, 8, rnd); },
    casters(rnd) {
      g.filter = 'blur(1.2px)';
      for (let i = 0; i < 14; i++) { const r = 40 + rnd() * 80, a0 = rnd() * 6.28; g.strokeStyle = `rgba(${PALE},${0.12 + rnd() * 0.16})`; g.lineWidth = 3 + rnd() * 4; g.beginPath(); g.arc(128, 128, r, a0, a0 + 0.5 + rnd()); g.stroke(); }
    },
    drip(rnd) { g.filter = 'blur(1px)'; blob(g, 128, 110, 40, 30, BROWN, 0.25, 12, rnd); g.fillStyle = `rgba(${BROWN},0.25)`; g.beginPath(); g.arc(160, 160, 8, 0, 7); g.arc(92, 150, 5, 0, 7); g.fill(); },
  };
  CELLS.forEach((name, i) => {
    g.save(); g.translate((i % N) * S, Math.floor(i / N) * S);
    g.beginPath(); g.rect(0, 0, S, S); g.clip();
    paint[name](rng(i * 7919 + 13));
    g.restore(); g.filter = 'none';
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// one decal: cell name, centre, normal, size [w, h], rotation about the normal, opacity, optional [v0, v1] band
function quad(list, d) {
  const i = CELLS.indexOf(d.c), cu = (i % N) / N, cv = 1 - (Math.floor(i / N) + 1) / N;
  const n = new THREE.Vector3(...d.n).normalize();
  const up = Math.abs(n.y) > 0.9 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
  const t = new THREE.Vector3().crossVectors(up, n).normalize(), b = new THREE.Vector3().crossVectors(n, t);
  const a = d.r || 0, ca = Math.cos(a), sa = Math.sin(a);
  const T = t.clone().multiplyScalar(ca).addScaledVector(b, sa), B = b.clone().multiplyScalar(ca).addScaledVector(t, -sa);
  const p = new THREE.Vector3(...d.p).addScaledVector(n, d.lift ?? 0.0025);
  const [w, h] = d.s, [v0, v1] = d.band || [0, 1];
  const corners = [[-1, -1, 0, v0], [1, -1, 1, v0], [1, 1, 1, v1], [-1, 1, 0, v1]];
  const base = list.pos.length / 3;
  for (const [sx, sy, u, v] of corners) {
    const q = p.clone().addScaledVector(T, sx * w / 2).addScaledVector(B, sy * h / 2);
    list.pos.push(q.x, q.y, q.z); list.nrm.push(n.x, n.y, n.z); list.uv.push(cu + u / N, cv + v / N);
    list.alpha.push(d.o ?? 1);
  }
  list.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

export function placements() {
  const { X0, Z0, T } = R;
  const bw = Z0 + T / 2, lw = X0 + T / 2, up = [0, 1, 0], out = [0, 0, 1], east = [1, 0, 0];
  const fy = 0.0045, cy = 0.0125;   // floor tops: vinyl (above the seams) and carpet
  const L = [];
  // by the door: shoe marks, scuffs on the floor and on the skirting, grime in the corner
  L.push({ c: 'shoe', p: [-2.2, fy, 0.55], n: up, s: [0.55, 0.55], r: 0.4, o: 0.9 });
  L.push({ c: 'scuff', p: [-2.3, fy, 0.95], n: up, s: [0.4, 0.4], r: 1.2, o: 0.8 });
  L.push({ c: 'scuff2', p: [lw + 0.03, 0.06, 1.25], n: east, s: [0.3, 0.12], o: 0.7, lift: 0.024 });
  L.push({ c: 'grime', p: [lw + 0.2, fy, bw + 0.2], n: up, s: [0.4, 0.4], r: -Math.PI / 2, o: 0.7 });
  L.push({ c: 'smudge', p: [lw + 0.003, 0.62, DOOR.z0 - 0.14], n: east, s: [0.2, 0.16], o: 0.8 });
  L.push({ c: 'chips', p: [lw + 0.012, 0.9, DOOR.z0 - 0.02], n: east, s: [0.18, 0.12], r: Math.PI / 2, o: 0.9, lift: 0.04 });
  // the worn path from the door to the chair: scuffs on the vinyl, paler flattened pile on the carpet
  const A = [-2.2, 0.62], Bp = [DESK.x - 0.05, DESK.z + 0.62];
  const len = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]), ang = Math.atan2(Bp[1] - A[1], Bp[0] - A[0]);
  for (let s = 0.4; s < len - 0.2; s += 0.34) {
    const x = A[0] + (Bp[0] - A[0]) * s / len, z = A[1] + (Bp[1] - A[1]) * s / len, onCarpet = x > -0.2 && z < 0.33;
    L.push(onCarpet ? { c: 'wear', p: [x, cy, z], n: up, s: [0.62 + (s % 0.3), 0.5], r: s * 2.3, o: 0.3 } : { c: s % 0.68 < 0.34 ? 'scuff' : 'scuff2', p: [x, fy, z], n: up, s: [0.34, 0.34], r: s * 3, o: 0.35 });
  }
  L.push({ c: 'casters', p: [DESK.x - 0.05, cy, DESK.z + 0.62], n: up, s: [0.8, 0.8], o: 0.3 });
  // desk: a coffee ring by the mug and a pen mark
  L.push({ c: 'ring', p: [DESK.x + 0.22, 0.4215, DESK.z + 0.24], n: up, s: [0.13, 0.13], r: 0.6, lift: 0.0015 });
  L.push({ c: 'pen', p: [DESK.x - 0.4, 0.4215, DESK.z + 0.27], n: up, s: [0.1, 0.1], r: 0.3, o: 0.8, lift: 0.0015 });
  // back wall: tape marks and a poster corner where a poster was; a water mark under the window
  L.push({ c: 'tapemarks', p: [0.3, 0.98, bw], n: out, s: [0.36, 0.42], r: 0.03 });
  L.push({ c: 'corner', p: [0.14, 1.17, bw], n: out, s: [0.09, 0.09], r: 0.03, lift: 0.003 });
  L.push({ c: 'water', p: [(WIN.x0 + WIN.x1) / 2 + 0.2, WIN.y0 - 0.2, bw], n: out, s: [0.46, 0.3], o: 0.9 });
  L.push({ c: 'grime', p: [lw + 0.003, 0.12, bw + 0.14], n: east, s: [0.28, 0.24], o: 0.5 });
  // a taped cable run on the vinyl from the PC to the wall under the window
  { const a = [DESK.x - DESK.w / 2 - 0.3, -1.3], b = [-0.9, bw + 0.02], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    L.push({ c: 'tape', p: [(a[0] + b[0]) / 2, fy + 0.001, (a[1] + b[1]) / 2], n: up, s: [l, 0.06], r: -Math.atan2(b[1] - a[1], b[0] - a[0]), band: [100 / 256, 156 / 256] }); }
  // filing cabinet: stickers on its side facing the room, chipped paint along the top of its front
  L.push({ c: 'stickers', p: [-2.3, 0.44, -0.62 + 0.21], n: out, s: [0.2, 0.2], r: -0.05, lift: 0.002 });
  L.push({ c: 'chips', p: [-2.28 + 0.232, 0.66, -0.62], n: east, s: [0.36, 0.1], lift: 0.003, o: 0.9 });
  L.push({ c: 'drip', p: [1.9, cy, -1.05], n: up, s: [0.18, 0.18], r: 1, o: 0.6 });
  return L;
}

export function buildDecals() {
  const list = { pos: [], nrm: [], uv: [], alpha: [], idx: [] };
  for (const d of placements()) quad(list, d);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(list.pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(list.nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(list.uv, 2));
  // per-decal opacity through the vertex colour's alpha
  const col = []; for (const a of list.alpha) col.push(1, 1, 1, a);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  geo.setIndex(list.idx);
  const m = new THREE.MeshStandardMaterial({ map: paintAtlas(), transparent: true, vertexColors: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, roughness: 0.9 });
  m.userData.noStyle = true;
  const mesh = new THREE.Mesh(geo, m); mesh.receiveShadow = true; mesh.renderOrder = 2; mesh.name = 'decals'; mesh.userData.surf = 'decal';
  return mesh;
}
