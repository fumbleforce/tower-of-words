// Avenue 7, trim sheets: one atlas (1024 px) of horizontal strips of edge and panel detail, and UVs that map each
// prop face to a strip. Panel lines and screws on metal, vents on the monitor back and the PC, rubber edging on the
// desk, a skirting board with a scuffed top edge, bevelled frames on doors, windows and the wall cap, keys on the
// keyboard, label strips on binder spines, drawer fronts with a handle recess and a label holder, piping on the chair.
// The atlas is near-white, so each material's colour still sets the tone. Floors, walls and plants stay as they are:
// trim sheets are for the made things.
// The atlas is painted in code for this test; the real one would be painted once by hand or with our image models.
import * as THREE from 'three';

const N = 16, SW = 1024, SH = 64;
const S = { plainMetal: 0, panel: 1, vents: 2, rubber: 3, skirting: 4, bevel: 5, keys: 6, label: 7, seam: 8, piping: 9, drawer: 10, doorPanel: 11, plainPlastic: 12, lip: 13, blank: 15 };

function rng(seed) { let r = seed; return () => { r = (r * 16807) % 2147483647; return r / 2147483647; }; }

export function paintTrim() {
  const c = document.createElement('canvas'); c.width = SW; c.height = N * SH;
  const g = c.getContext('2d');
  const band = (k, fn) => { g.save(); g.translate(0, k * SH); g.beginPath(); g.rect(0, 0, SW, SH); g.clip(); fn(); g.restore(); g.filter = 'none'; };
  const fill = (col) => { g.fillStyle = col; g.fillRect(0, 0, SW, SH); };
  const line = (y, h, col) => { g.fillStyle = col; g.fillRect(0, y, SW, h); };
  const screw = (x, y, r = 5) => {
    g.fillStyle = '#8c9096'; g.beginPath(); g.arc(x, y, r + 1.5, 0, 7); g.fill();
    g.fillStyle = '#e4e6e8'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x - 1.5, y - 1.5, r * 0.45, 0, 7); g.fill();
    g.strokeStyle = '#6a6e75'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - r * 0.7, y + r * 0.3); g.lineTo(x + r * 0.7, y - r * 0.3); g.stroke();
  };
  const R = rng(5);
  // 0 plain metal: faint vertical streaks, a lit top edge, a dark bottom edge
  band(S.plainMetal, () => { fill('#f3f3f3'); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${R() > 0.5 ? '255,255,255' : '150,150,155'},0.12)`; g.fillRect(R() * SW, 0, 1 + R() * 2, SH); } line(0, 2, '#ffffff'); line(SH - 2, 2, '#b9bbbf'); });
  // 1 panel: a bevel and a groove along both edges with screws every 256 px, plain between
  band(S.panel, () => {
    fill('#f2f2f2');
    line(0, 3, '#ffffff'); line(9, 2, '#9ea2a8'); line(11, 1, '#ffffff');
    line(SH - 3, 3, '#aeb1b6'); line(SH - 12, 2, '#9ea2a8'); line(SH - 10, 1, '#ffffff');
    for (let x = 128; x < SW; x += 256) { screw(x, 5.5, 3.8); screw(x, SH - 6, 3.8); }
  });
  // 2 vents: rounded slots
  band(S.vents, () => {
    fill('#ededed'); line(0, 3, '#ffffff'); line(SH - 3, 3, '#b0b3b8');
    for (let x = 6; x < SW; x += 22) { g.fillStyle = '#4a4d53'; g.beginPath(); g.roundRect(x, 14, 11, 36, 5); g.fill(); g.fillStyle = '#9ca0a6'; g.fillRect(x + 2, 46, 7, 2); g.fillStyle = '#2e3035'; g.fillRect(x + 2, 16, 7, 4); }
  });
  // 3 rubber edging: a dark band with a moulded highlight
  band(S.rubber, () => { fill('#5d6066'); line(10, 3, '#8a8e95'); line(13, 1, '#4a4d52'); line(SH - 8, 2, '#46494e'); for (let i = 0; i < 80; i++) { g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(R() * SW, 16 + R() * 36, 20 + R() * 60, 1); } });
  // 4 skirting: rounded top with a highlight and a shadow, scuffs along the top third, shadow at the floor
  band(S.skirting, () => {
    fill('#efefef'); line(0, 2, '#b8bbc0'); line(2, 4, '#ffffff'); line(6, 3, '#c9ccd0'); line(SH - 3, 3, '#9ea2a8');
    g.filter = 'blur(1.5px)';
    for (let i = 0; i < 26; i++) { const x = R() * SW, y = 10 + R() * 26, l = 8 + R() * 40; g.strokeStyle = `rgba(40,42,48,${0.2 + R() * 0.3})`; g.lineWidth = 1.5 + R() * 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (R() - 0.5) * 6); g.stroke(); }
  });
  // 5 bevelled frame: highlight, flat, groove, shadow
  band(S.bevel, () => { fill('#efefef'); line(0, 4, '#ffffff'); line(4, 2, '#d7d9dc'); line(16, 2, '#a8acb2'); line(18, 1, '#ffffff'); line(SH - 18, 1, '#ffffff'); line(SH - 17, 2, '#a8acb2'); line(SH - 5, 5, '#b7babf'); });
  // 6 keys: four rows across the keyboard (the face maps to the whole strip)
  band(S.keys, () => {
    fill('#8f9398');
    const kw = SW / 14;
    for (let r = 0; r < 4; r++) for (let k = 0; k < 14; k++) {
      const x = k * kw + 3 + (r % 2) * 6, y = 2 + r * 15, w = kw - 7, h = 12;
      if (x + w > SW - 2) continue;
      g.fillStyle = '#fbfbfb'; g.beginPath(); g.roundRect(x, y, w, h, 3); g.fill(); g.fillStyle = '#d8dadd'; g.fillRect(x + 2, y + h - 3, w - 4, 2);
      g.fillStyle = '#9da1a7'; g.fillRect(x + w * 0.35, y + 4, w * 0.3, 2);
    }
  });
  // 7 label strip: a white paper label in a thin holder, hand-written lines
  band(S.label, () => {
    fill('#f0f0f0'); g.fillStyle = '#c9ccd0'; g.fillRect(0, 14, SW, 36); g.fillStyle = '#fbfbf8'; g.fillRect(0, 16, SW, 32);
    for (let x = 30; x < SW; x += 180) { g.strokeStyle = '#3a4054'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 30); for (let i = 1; i < 10; i++) g.lineTo(x + i * 10, 30 + (R() - 0.5) * 8); g.stroke(); g.lineWidth = 2; g.beginPath(); g.moveTo(x, 40); g.lineTo(x + 60, 40); g.stroke(); }
  });
  // 8 seam: plastic with a bezel inset near the top and a mould seam low down
  band(S.seam, () => { fill('#f1f1f1'); line(0, 2, '#ffffff'); line(6, 2, '#b3b6bb'); line(8, 1, '#ffffff'); line(40, 1, '#c3c6ca'); line(SH - 2, 2, '#b0b3b8'); });
  // 9 piping: a rolled edge with stitching along both sides
  band(S.piping, () => {
    fill('#f2f2f2'); line(0, 3, '#c9ccd0'); line(3, 5, '#ffffff'); line(8, 2, '#a9adb3'); line(SH - 10, 2, '#a9adb3'); line(SH - 8, 5, '#ffffff'); line(SH - 3, 3, '#c9ccd0');
    for (let x = 0; x < SW; x += 12) { g.fillStyle = '#9da1a7'; g.fillRect(x, 13, 7, 2); g.fillRect(x + 4, SH - 15, 7, 2); }
  });
  // 10 drawer front (stretched over the whole front): an inset line, a handle recess and a label holder
  band(S.drawer, () => {
    fill('#f1f1f1'); g.strokeStyle = '#a3a7ad'; g.lineWidth = 3; g.strokeRect(14, 4, SW - 28, SH - 8); g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.strokeRect(17, 7, SW - 34, SH - 14);
    g.fillStyle = '#6d7178'; g.beginPath(); g.roundRect(SW / 2 - 160, 20, 320, 14, 7); g.fill(); g.fillStyle = '#c7cacf'; g.fillRect(SW / 2 - 150, 31, 300, 3);
    g.strokeStyle = '#8b9096'; g.lineWidth = 3; g.strokeRect(SW / 2 - 90, 40, 180, 16); g.fillStyle = '#fbfbf8'; g.fillRect(SW / 2 - 86, 43, 172, 10);
  });
  // 11 door panel: a brushed kick plate with screws along the bottom band, a plain face above
  band(S.doorPanel, () => {
    fill('#f1f1f1'); g.fillStyle = '#dfe1e4'; g.fillRect(0, SH - 22, SW, 22); for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(R() * SW, SH - 22 + R() * 22, 30 + R() * 80, 1); }
    line(SH - 23, 2, '#9ea2a8'); for (let x = 64; x < SW; x += 256) screw(x, SH - 11, 3); line(0, 3, '#ffffff');
  });
  // 12 plain plastic: soft darkening toward both edges
  band(S.plainPlastic, () => { const gr = g.createLinearGradient(0, 0, 0, SH); gr.addColorStop(0, '#fdfdfd'); gr.addColorStop(0.15, '#f4f4f4'); gr.addColorStop(0.85, '#f1f1f1'); gr.addColorStop(1, '#d9dbde'); g.fillStyle = gr; g.fillRect(0, 0, SW, SH); });
  // 13 shelf lip: a folded edge
  band(S.lip, () => { fill('#efefef'); line(0, 4, '#ffffff'); line(30, 3, '#9ea2a8'); line(33, 2, '#ffffff'); line(SH - 4, 4, '#b3b6bb'); });
  band(14, () => fill('#ffffff'));
  band(S.blank, () => fill('#ffffff'));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 8;
  return t;
}

// rule per surface: face = { axis: 'x'|'y'|'z', sign, size } -> { s: strip, e: edge band in metres (0 = stretch the
// whole strip over the face), L: metres per atlas width (0 = fit the face), swap: run the strip along the face's height }
const RULES = {
  laminate: (f) => (f.axis === 'y' ? { s: S.blank, L: 0 } : { s: S.rubber, L: 1 }),
  metal: (f) => (f.axis === 'y' ? { s: S.plainMetal, L: 1 } : f.size.y < 0.06 ? { s: S.lip, L: 1 } : { s: S.panel, e: 0.045, L: 1 }),
  drawerfront: (f) => (f.axis === 'z' && f.size.y > 0.1 ? { s: S.drawer, L: 0 } : { s: S.plainMetal, L: 1 }),
  handle: () => ({ s: S.plainMetal, L: 0.5 }),
  monitor: (f) => (f.axis === 'z' ? (f.sign > 0 ? { s: S.seam, e: 0.02, L: 1 } : { s: S.vents, e: 0.06, L: 0.6 }) : f.axis === 'x' ? { s: S.seam, L: 1 } : { s: S.plainPlastic, L: 1 }),
  tower: (f) => (f.axis === 'y' ? { s: S.plainPlastic, L: 1 } : { s: S.vents, e: 0.05, L: 0.5 }),
  keys: (f) => (f.axis === 'y' && f.sign > 0 ? { s: S.keys, L: 0 } : { s: S.plainPlastic, L: 1 }),
  fabric: () => ({ s: S.piping, e: 0.022, L: 0.5 }),
  binder: (f) => (f.axis === 'z' ? { s: S.label, L: 0, swap: true } : { s: S.plainPlastic, L: 1 }),
  skirting: (f) => (f.axis === 'y' ? { s: S.plainPlastic, L: 1 } : { s: S.skirting, L: 1.2 }),
  wallcap: () => ({ s: S.bevel, L: 1 }),
  frame: () => ({ s: S.bevel, e: 0.02, L: 1 }),
  door: (f) => (f.axis === 'z' ? { s: S.doorPanel, e: 0.14, L: 1 } : { s: S.bevel, L: 1 }),
  plastic: () => ({ s: S.plainPlastic, L: 1 }),
};

const MARGIN = 3 / SH;
function stripV(s, t) { return 1 - (s + 1) / N + (MARGIN + t * (1 - 2 * MARGIN)) / N; }
// three-slice in v: the edge bands keep their size in metres, the middle stretches
function slice(y, h, e) {
  if (!e) return h > 0 ? y / h : 0;
  const E = Math.min(e, h / 2), a = 0.36;
  if (y < E) return (y / E) * a;
  if (y > h - E) return 1 - ((h - y) / E) * a;
  return a + ((y - E) / Math.max(1e-6, h - 2 * E)) * (1 - 2 * a);
}

function mapMesh(mesh, rule) {
  const g = mesh.geometry; g.computeBoundingBox();
  const bb = g.boundingBox, sc = mesh.scale, size = new THREE.Vector3(); bb.getSize(size); size.multiply(sc);
  const pos = g.attributes.position, nor = g.attributes.normal, n = pos.count, uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const x = (pos.getX(i) - bb.min.x) * sc.x, y = (pos.getY(i) - bb.min.y) * sc.y, z = (pos.getZ(i) - bb.min.z) * sc.z;
    const nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i), ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    const axis = ay >= ax && ay >= az ? 'y' : ax >= az ? 'x' : 'z', sign = axis === 'y' ? Math.sign(ny) : axis === 'x' ? Math.sign(nx) : Math.sign(nz);
    let u, v, U, H;
    if (axis === 'z') { u = x; U = size.x; v = y; H = size.y; }
    else if (axis === 'x') { u = z; U = size.z; v = y; H = size.y; }
    else if (size.x >= size.z) { u = x; U = size.x; v = z; H = size.z; }
    else { u = z; U = size.z; v = x; H = size.x; }
    const r = rule({ axis, sign, size });
    if (r.swap) { [u, v] = [v, u]; [U, H] = [H, U]; }
    uv[i * 2] = r.L ? u / r.L : u / Math.max(1e-6, U);
    uv[i * 2 + 1] = stripV(r.s, THREE.MathUtils.clamp(slice(v, H, r.e || 0), 0, 1));
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

export function trimRoom(root) {
  const atlas = paintTrim(), cache = new Map();
  let n = 0;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const rule = RULES[o.userData.surf];
    if (!rule || !o.geometry.attributes.normal || !o.material.isMeshStandardMaterial || o.material.map) return;
    o.geometry = o.geometry.clone();
    mapMesh(o, rule);
    const k = o.material.uuid;
    if (!cache.has(k)) { const m = o.material.clone(); m.map = atlas; cache.set(k, m); }
    o.material = cache.get(k); n++;
  });
  return { atlas, n };
}
