// Shared pieces for the three places: renderer and post chain (the same light model and AO as the train),
// contact shadows, a walk grid with A* for tap-to-move, the player controller and the talk markers.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const Q = new URLSearchParams(location.search);

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: Q.has('cap') });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
  renderer.userData = { gpu, software: /swiftshader|llvmpipe|software/i.test(gpu) };
  return renderer;
}

// One composer per place: render, ambient occlusion (quality 1 only), output.
export function makeComposer(renderer, scene, camera, { beforeAO } = {}) {
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, camera));
  if (beforeAO) composer.addPass(beforeAO);
  const gtao = new GTAOPass(scene, camera, 4, 4);
  gtao.updateGtaoMaterial({ radius: 0.55, distanceExponent: 1.0, thickness: 1.5, scale: 1.2, samples: 16, distanceFallOff: 1.0 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 16 });
  gtao.blendIntensity = 1.0;
  composer.addPass(gtao);
  composer.addPass(new OutputPass());
  return { composer, gtao };
}

let _blobTex;
export function blob(size, opacity = 0.42, color = '#1d1a22') {
  if (!_blobTex) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); _blobTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.8), new THREE.MeshBasicMaterial({ map: _blobTex, transparent: true, opacity, depthWrite: false, color }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.004; m.renderOrder = 1;
  return m;
}

// ---------- walk grid ----------
// Blockers are axis-aligned rectangles [x0, x1, z0, z1] in the place's local x/z.
export class Nav {
  constructor(x0, x1, z0, z1, cell = 0.1) {
    Object.assign(this, { x0, x1, z0, z1, cell });
    this.nx = Math.ceil((x1 - x0) / cell); this.nz = Math.ceil((z1 - z0) / cell);
    this.rects = [];
    this.extra = null; // optional fn(x, z) -> true if walkable (e.g. the train's rounded corners)
    this.grid = null;
    this.R = 0.17;
  }
  block(x0, x1, z0, z1) { this.rects.push([Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1)]); this.grid = null; return this; }
  unblock(tag) { this.rects = this.rects.filter((r) => r.tag !== tag); this.grid = null; }
  blockTagged(tag, x0, x1, z0, z1) { const r = [x0, x1, z0, z1]; r.tag = tag; this.rects.push(r); this.grid = null; }
  free(x, z, r = this.R) {
    if (x < this.x0 + r || x > this.x1 - r || z < this.z0 + r || z > this.z1 - r) return false;
    for (const [a, b, c, d] of this.rects) if (x > a - r && x < b + r && z > c - r && z < d + r) {
      // rounded: allow the corner region outside the circle
      const cx = Math.max(a, Math.min(b, x)), cz = Math.max(c, Math.min(d, z));
      if (Math.hypot(x - cx, z - cz) < r) return false;
    }
    if (this.extra && !this.extra(x, z)) return false;
    return true;
  }
  build() {
    const g = new Uint8Array(this.nx * this.nz);
    for (let i = 0; i < this.nx; i++) for (let k = 0; k < this.nz; k++) g[k * this.nx + i] = this.free(this.x0 + (i + 0.5) * this.cell, this.z0 + (k + 0.5) * this.cell, this.R + 0.02) ? 1 : 0;
    this.grid = g;
  }
  cellOf(x, z) { return [Math.max(0, Math.min(this.nx - 1, Math.floor((x - this.x0) / this.cell))), Math.max(0, Math.min(this.nz - 1, Math.floor((z - this.z0) / this.cell)))]; }
  nearestFree(i, k) {
    const g = this.grid;
    if (g[k * this.nx + i]) return [i, k];
    for (let r = 1; r < 40; r++) {
      let best = null, bd = 1e9;
      for (let di = -r; di <= r; di++) for (let dk = -r; dk <= r; dk++) {
        if (Math.max(Math.abs(di), Math.abs(dk)) !== r) continue;
        const a = i + di, b = k + dk;
        if (a < 0 || b < 0 || a >= this.nx || b >= this.nz || !g[b * this.nx + a]) continue;
        const d = di * di + dk * dk; if (d < bd) { bd = d; best = [a, b]; }
      }
      if (best) return best;
    }
    return null;
  }
  // A* over the grid (8-neighbour), then string-pulled to a few waypoints.
  path(sx, sz, tx, tz) {
    if (!this.grid) this.build();
    const g = this.grid, nx = this.nx;
    const s0 = this.nearestFree(...this.cellOf(sx, sz)), t0 = this.nearestFree(...this.cellOf(tx, tz));
    if (!s0 || !t0) return null;
    const S = s0[1] * nx + s0[0], T = t0[1] * nx + t0[0];
    const N = g.length, gs = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const h = (i) => { const x = i % nx, z = (i / nx) | 0; const dx = Math.abs(x - t0[0]), dz = Math.abs(z - t0[1]); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    const open = [S]; gs[S] = 0;
    const f = new Float32Array(N).fill(1e9); f[S] = h(S);
    let found = false, iter = 0;
    while (open.length && iter++ < 60000) {
      let bi = 0; for (let j = 1; j < open.length; j++) if (f[open[j]] < f[open[bi]]) bi = j;
      const cur = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      if (cur === T) { found = true; break; }
      if (closed[cur]) continue; closed[cur] = 1;
      const cx = cur % nx, cz = (cur / nx) | 0;
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const x = cx + dx, z = cz + dz;
        if (x < 0 || z < 0 || x >= nx || z >= this.nz) continue;
        const n = z * nx + x;
        if (!g[n] || closed[n]) continue;
        if (dx && dz && (!g[cz * nx + x] || !g[z * nx + cx])) continue;
        const ng = gs[cur] + (dx && dz ? 1.414 : 1);
        if (ng < gs[n]) { gs[n] = ng; from[n] = cur; f[n] = ng + h(n); open.push(n); }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let c = T; c !== -1; c = from[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map((c) => [this.x0 + ((c % nx) + 0.5) * this.cell, this.z0 + (((c / nx) | 0) + 0.5) * this.cell]);
    pts[pts.length - 1] = this.free(tx, tz) ? [tx, tz] : pts[pts.length - 1];
    // string pull: keep a point only if the straight line from the last kept point to the next one is blocked
    const out = [[sx, sz]];
    let i = 0;
    while (i < pts.length - 1) {
      let j = pts.length - 1;
      while (j > i + 1 && !this.clear(out[out.length - 1], pts[j])) j--;
      out.push(pts[j]); i = j;
    }
    if (out.length === 1) out.push(pts[pts.length - 1]);
    return out.slice(1);
  }
  clear(a, b) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / (this.cell * 0.5));
    for (let s = 1; s <= n; s++) { const t = s / n; if (!this.free(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, this.R + 0.01)) return false; }
    return true;
  }
  // push a circle out of the blockers and back inside the bounds
  collide(x, z, ox, oz) {
    if (this.free(x, z)) return [x, z];
    // try sliding along each axis
    if (this.free(x, oz)) return [x, oz];
    if (this.free(ox, z)) return [ox, z];
    return [ox, oz];
  }
}

// ---------- player controller ----------
// Moves `body` (an Object3D in the place's local space) with keys or along a tapped path.
export class Walker {
  constructor(body, nav, { speed = 1.5, onAnim } = {}) {
    Object.assign(this, { body, nav, speed, onAnim });
    this.path = null; this.facing = 0; this.moving = false; this.locked = false;
    this.keys = new Set();
    this.arrive = null; // callback when a tapped path ends
    this.stuck = 0;
  }
  goTo(x, z, arrive) {
    const p = this.body.position;
    const path = this.nav.path(p.x, p.z, x, z);
    this.path = path && path.length ? path : null;
    this.arrive = arrive || null;
    if (!this.path && arrive) { const a = arrive; this.arrive = null; a(); }
  }
  stop() { this.path = null; this.arrive = null; }
  faceTo(x, z) { this.targetFacing = Math.atan2(x - this.body.position.x, z - this.body.position.z); }
  update(dt, camera) {
    const p = this.body.position;
    let mx = 0, mz = 0;
    const k = (a, b) => this.keys.has(a) || this.keys.has(b);
    const up = k('ArrowUp', 'KeyW'), dn = k('ArrowDown', 'KeyS'), lf = k('ArrowLeft', 'KeyA'), rt = k('ArrowRight', 'KeyD');
    if (!this.locked && (up || dn || lf || rt)) {
      this.path = null; this.arrive = null;
      // screen-relative, measured in the body's parent space
      const f = new THREE.Vector3(); camera.getWorldDirection(f);
      const par = this.body.parent;
      if (par) { const q = new THREE.Quaternion(); par.getWorldQuaternion(q); f.applyQuaternion(q.invert()); }
      f.y = 0; f.normalize();
      const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
      const iy = (up ? 1 : 0) - (dn ? 1 : 0), ix = (rt ? 1 : 0) - (lf ? 1 : 0);
      mx = f.x * iy + r.x * ix; mz = f.z * iy + r.z * ix;
    } else if (this.path && !this.locked) {
      const [tx, tz] = this.path[0];
      mx = tx - p.x; mz = tz - p.z;
      if (Math.hypot(mx, mz) < 0.06) {
        this.path.shift();
        if (!this.path.length) {
          this.path = null; mx = mz = 0;
          if (this.arrive) { const a = this.arrive; this.arrive = null; a(); }
        }
      }
    }
    const len = Math.hypot(mx, mz);
    let moving = false;
    if (len > 1e-4) {
      const sp = this.speed * dt * (this.path ? Math.min(1, len / 0.1 + 0.3) : 1);
      const ox = p.x, oz = p.z;
      const [nx, nz] = this.nav.collide(ox + (mx / len) * sp, oz + (mz / len) * sp, ox, oz);
      p.x = nx; p.z = nz;
      const moved = Math.hypot(nx - ox, nz - oz);
      moving = moved > sp * 0.2;
      if (this.path) {
        this.stuck = moved < sp * 0.2 ? this.stuck + dt : 0;
        if (this.stuck > 0.5) { this.stuck = 0; const a = this.arrive; this.path = null; this.arrive = null; if (a) a(); }
      }
      this.targetFacing = Math.atan2(mx, mz);
    }
    if (this.targetFacing !== undefined) {
      let d = this.targetFacing - this.facing; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.facing += d * Math.min(1, dt * 12);
    }
    this.body.rotation.y = this.facing;
    this.moving = moving;
    return moving;
  }
}

// ---------- screen markers for people and things ----------
// A small DOM tag that follows a 3D point: a round speech mark when idle, the name when close.
export class Markers {
  constructor(layer) { this.layer = layer; this.list = []; }
  add(item) {
    const el = document.createElement('button');
    el.className = 'mark' + (item.kind ? ' ' + item.kind : '');
    el.type = 'button';
    el.innerHTML = `<span class="dot" aria-hidden="true"></span><span class="lbl">${item.label}</span>`;
    el.setAttribute('aria-label', item.label);
    this.layer.appendChild(el);
    item.el = el; item.enabled = item.enabled ?? true;
    this.list.push(item);
    return item;
  }
  clear() { for (const m of this.list) m.el.remove(); this.list = []; }
  update(camera, canvas, playerPos, near) {
    const w = canvas.clientWidth, h = canvas.clientHeight, v = new THREE.Vector3();
    for (const m of this.list) {
      const on = m.enabled && (typeof m.enabled !== 'function' || m.enabled());
      const vis = typeof m.enabled === 'function' ? m.enabled() : m.enabled;
      m.el.style.display = vis ? '' : 'none';
      if (!vis) continue;
      m.anchor(v); v.project(camera);
      m.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
      m.el.classList.toggle('near', near === m);
      const isGoal = !!(m.goal && m.goal());
      m.el.classList.toggle('goal', isGoal);
      // only nearby things and the current goal show a marker, so the room isn't covered in dots
      const s = m.spot ? m.spot() : null;
      const far = !isGoal && s && playerPos && Math.hypot(playerPos.x - s[0], playerPos.z - s[1]) > (/person/.test(m.kind || '') && !/small/.test(m.kind || '') ? 2.1 : 1.4);
      m.el.classList.toggle('far', !!far);
      void on;
    }
  }
}
