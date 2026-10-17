// 2D puppet idle for a dialogue portrait (animated-portraits-1, the animate-still skill's puppet route).
// One subdivided plane over the approved cut-out, deformed on the CPU each drawing:
//   breathing  the chest region rises `breath_px` and settles, fading to nothing at the bottom cut
//   head       rides the chest and tilts about the neck pivot (under a degree), a slow and a breath-rate component
//   hair       listed regions add a small offset that follows the head's tilt `lag_s` later, growing toward the tips
//   blink      a second mesh on the same geometry with the closed-eye drawing, shown for `blink_s` at `blinks`
// The picture's pixels are only moved, never redrawn: the body stays the source's. Every channel is periodic over
// `loop` seconds, so the loop has no seam. On twos = 12 drawings a second.
import * as THREE from '../../game3d/vendor/three/three.module.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function boundaryY(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return pts[pts.length - 1][1];
}

// per-vertex weights from the rig description
function weights(cfg, x, y) {
  const h = cfg.head;
  const head = 1 - sstep(boundaryY(h.boundary, x) - h.band / 2, boundaryY(h.boundary, x) + h.band / 2, y);
  const chest = 1 - sstep(cfg.chest.full, cfg.chest.zero, y);
  const hair = cfg.hair.map((r) => {
    const d = Math.hypot((x - r.c[0]) / r.r[0], (y - r.c[1]) / r.r[1]);
    const inside = 1 - sstep(0.55, 1, d);
    const tip = sstep(0, 1, Math.hypot(x - r.root[0], y - r.root[1]) / r.reach);
    return inside * tip;
  });
  return { head, chest, hair };
}

export function signals(cfg, t) {
  const L = cfg.loop, u = (((t / L) % 1) + 1) % 1;
  const breath = 0.5 - 0.5 * Math.cos(TAU * cfg.breaths * u);          // 0..1, 0 at the loop point
  const h = cfg.head;
  const tiltN = (tt) => {                                               // -1..1, the head's tilt shape
    const v = ((((tt - h.lag_s) / L) % 1) + 1) % 1;
    return h.slow_share * Math.sin(TAU * v) + (1 - h.slow_share) * Math.sin(TAU * cfg.breaths * v + 0.7);
  };
  const tilt = h.tilt_deg * tiltN(t);
  const hair = cfg.hair.map((r) => tiltN(t - r.lag_s));
  const blink = cfg.blinks.some((b) => u * L >= b && u * L < b + cfg.blink_s);
  return { breath, tilt, hair, blink };
}

export async function createPuppet(cfg, opts = {}) {
  const base = opts.base || '../../';
  const canvas = opts.canvas || document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: !!opts.capture });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;   // pass-through: the textures are not converted either
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(0, cfg.W, 0, cfg.H, -10, 10);
  const loader = new THREE.TextureLoader();
  const load = (f) => new Promise((res, rej) => loader.load(base + f, (t) => {
    t.colorSpace = THREE.NoColorSpace; t.premultiplyAlpha = true; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; res(t);
  }, undefined, rej));
  const [tex, blinkTex] = await Promise.all([load(cfg.texture), cfg.blink ? load(cfg.blink).catch(() => null) : null]);

  const nx = Math.ceil(cfg.W / cfg.cell), ny = Math.ceil(cfg.H / cfg.cell);
  const geo = new THREE.PlaneGeometry(1, 1, nx, ny);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const n = pos.count, rest = new Float32Array(n * 2), W = [];
  for (let k = 0; k < n; k++) {
    const x = (pos.getX(k) + 0.5) * cfg.W, y = (0.5 - pos.getY(k)) * cfg.H;
    rest[k * 2] = x; rest[k * 2 + 1] = y; pos.setXYZ(k, x, y, 0); uv.setXY(k, x / cfg.W, 1 - y / cfg.H);
    W.push(weights(cfg, x, y));
  }
  // premultiplied textures (no dark fringes from mipmaps over transparent pixels), blended as premultiplied
  const mat = (map) => new THREE.MeshBasicMaterial({ map, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor });
  const body = new THREE.Mesh(geo, mat(tex)); body.frustumCulled = false; scene.add(body);
  let blinkMesh = null;
  if (blinkTex) { blinkMesh = new THREE.Mesh(geo, mat(blinkTex)); blinkMesh.renderOrder = 1; blinkMesh.frustumCulled = false; scene.add(blinkMesh); }
  const wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x4fc3d9, wireframe: true, transparent: true, opacity: 0.25, depthTest: false }));
  wire.renderOrder = 2; wire.visible = false; wire.frustumCulled = false; scene.add(wire);

  const P = cfg.head.pivot, chestAtPivot = 1 - sstep(cfg.chest.full, cfg.chest.zero, P[1]);
  const amps = cfg.hair.map((r) => r.amp);
  let deformMs = 0;

  function deform(t) {
    const t0 = performance.now();
    const s = signals(cfg, t);
    const dy = -cfg.breath_px * s.breath;
    const a = (s.tilt * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
    const px = P[0], py = P[1] + dy * chestAtPivot;
    for (let k = 0; k < n; k++) {
      const x = rest[k * 2], y = rest[k * 2 + 1], w = W[k];
      // body: the chest lift, fading to the cut
      const bx = x, by = y + dy * w.chest;
      // head: rides the lift at the pivot, tilted about it
      const rx = x - P[0], ry = y - P[1];
      const hx = px + c * rx - sn * ry, hy = py + sn * rx + c * ry;
      let X = bx + (hx - bx) * w.head, Y = by + (hy - by) * w.head;
      for (let i = 0; i < amps.length; i++) {
        const wi = w.hair[i];
        if (wi > 1e-3) { X += amps[i][0] * s.hair[i] * wi; Y += amps[i][1] * s.hair[i] * wi; }
      }
      pos.setXY(k, X, Y);
    }
    pos.needsUpdate = true;
    if (blinkMesh) blinkMesh.visible = s.blink;
    deformMs = performance.now() - t0;
    return s;
  }

  const api = {
    cfg, renderer, canvas, twos: true,
    get deformMs() { return deformMs; },
    setSize(w, h, dpr = 1) { renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); },
    setWire(on) { wire.visible = on; },
    renderAt(t, twos = api.twos) {
      const tq = twos ? Math.floor(t * 12 + 1e-6) / 12 : t;
      const s = deform(tq);
      renderer.render(scene, cam);
      return s;
    },
    dispose() { geo.dispose(); tex.dispose(); blinkTex?.dispose(); renderer.dispose(); },
  };
  api.setSize(cfg.W, cfg.H);
  return api;
}
