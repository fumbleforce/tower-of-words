// Shared pieces for the three places: renderer and post chain (the same light model and AO as the train),
// contact shadows, a walk grid with A* for tap-to-move, the player controller and the talk markers.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const Q = new URLSearchParams(location.search);

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: Q.has('cap'),
  });
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
  const composer = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }),
  );
  composer.addPass(new RenderPass(scene, camera));
  if (beforeAO) composer.addPass(beforeAO);
  const gtao = new GTAOPass(scene, camera, 4, 4);
  gtao.updateGtaoMaterial({
    radius: 0.55,
    distanceExponent: 1.0,
    thickness: 1.5,
    scale: 1.2,
    samples: 16,
    distanceFallOff: 1.0,
  });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 16 });
  gtao.blendIntensity = 1.0;
  composer.addPass(gtao);
  composer.addPass(new OutputPass());
  return { composer, gtao };
}

let _blobTex;
export function blob(size, opacity = 0.42, color = '#1d1a22') {
  if (!_blobTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(0.5, 'rgba(0,0,0,0.55)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    _blobTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size * 0.8),
    new THREE.MeshBasicMaterial({ map: _blobTex, transparent: true, opacity, depthWrite: false, color }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.004;
  m.renderOrder = 1;
  m.name = 'blob';
  m.userData.noOutline = true; // a shadow, not part of the model: the hover outline skips it (main.js)
  m.userData.stackable = true; // one colour and draw order: the draw-call pass may merge them (perf/batch.js)
  return m;
}

// ---------- walk grid ----------
// Blockers are axis-aligned rectangles [x0, x1, z0, z1] in the place's local x/z.
export { Nav } from './movement/navigation.js';

// ---------- player controller ----------
// Moves `body` (an Object3D in the place's local space) with keys or along a tapped path.
export class Walker {
  constructor(body, nav, { speed = 1.5, onAnim } = {}) {
    Object.assign(this, { body, nav, speed, onAnim });
    this.path = null;
    this.facing = 0;
    this.moving = false;
    this.locked = false;
    this.keys = new Set();
    this.arrive = null; // callback when a tapped path ends
    this.stuck = 0;
  }
  goTo(x, z, arrive) {
    const p = this.body.position;
    const path = this.nav.path(p.x, p.z, x, z);
    this.path = path && path.length ? path : null;
    this.arrive = arrive || null;
    if (!this.path && arrive) {
      const a = arrive;
      this.arrive = null;
      a();
    }
  }
  stop() {
    this.path = null;
    this.arrive = null;
  }
  faceTo(x, z) {
    this.targetFacing = Math.atan2(x - this.body.position.x, z - this.body.position.z);
  }
  update(dt, camera) {
    const p = this.body.position;
    let mx = 0,
      mz = 0;
    const k = (a, b) => this.keys.has(a) || this.keys.has(b);
    const up = k('ArrowUp', 'KeyW'),
      dn = k('ArrowDown', 'KeyS'),
      lf = k('ArrowLeft', 'KeyA'),
      rt = k('ArrowRight', 'KeyD');
    if (!this.locked && (up || dn || lf || rt)) {
      this.path = null;
      this.arrive = null;
      // screen-relative, measured in the body's parent space
      const f = new THREE.Vector3();
      camera.getWorldDirection(f);
      const par = this.body.parent;
      if (par) {
        const q = new THREE.Quaternion();
        par.getWorldQuaternion(q);
        f.applyQuaternion(q.invert());
      }
      f.y = 0;
      f.normalize();
      const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
      const iy = (up ? 1 : 0) - (dn ? 1 : 0),
        ix = (rt ? 1 : 0) - (lf ? 1 : 0);
      mx = f.x * iy + r.x * ix;
      mz = f.z * iy + r.z * ix;
    } else if (this.path && !this.locked) {
      const [tx, tz] = this.path[0];
      mx = tx - p.x;
      mz = tz - p.z;
      if (Math.hypot(mx, mz) < 0.06) {
        this.path.shift();
        if (!this.path.length) {
          this.path = null;
          mx = mz = 0;
          if (this.arrive) {
            const a = this.arrive;
            this.arrive = null;
            a();
          }
        }
      }
    }
    const len = Math.hypot(mx, mz);
    let moving = false;
    if (len > 1e-4) {
      const sp = this.speed * dt * (this.path ? Math.min(1, len / 0.1 + 0.3) : 1);
      const ox = p.x,
        oz = p.z;
      const [nx, nz] = this.nav.collide(ox + (mx / len) * sp, oz + (mz / len) * sp, ox, oz);
      p.x = nx;
      p.z = nz;
      const moved = Math.hypot(nx - ox, nz - oz);
      moving = moved > sp * 0.2;
      if (this.path) {
        this.stuck = moved < sp * 0.2 ? this.stuck + dt : 0;
        if (this.stuck > 0.5) {
          this.stuck = 0;
          const a = this.arrive;
          this.path = null;
          this.arrive = null;
          if (a) a();
        }
      }
      this.targetFacing = Math.atan2(mx, mz);
    }
    if (this.targetFacing !== undefined) {
      let d = this.targetFacing - this.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.facing += d * Math.min(1, dt * 12);
    }
    this.body.rotation.y = this.facing;
    this.moving = moving;
    return moving;
  }
}

// ---------- screen markers for people and things ----------
// A small DOM pin that follows a 3D point: a circle with a symbol on a short line down to the person or thing.
const NEAR_PIN = 2.5; // m from Eric to the spot in front of it
export class Markers {
  constructor(layer) {
    this.layer = layer;
    this.list = [];
  }
  add(item) {
    const el = document.createElement('button');
    el.className = 'mark' + (item.kind ? ' ' + item.kind : '');
    el.type = 'button';
    // a pin with an icon (speech for people, a small eye for things), and a tag with the verb and name that
    // opens out when you're close. The whole button is at least 48 px for touch.
    const person = /person/.test(item.kind || '');
    const paw =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="15.5" rx="5" ry="4.2"/><circle cx="6.2" cy="10" r="2"/><circle cx="9.6" cy="6.8" r="2"/><circle cx="14.4" cy="6.8" r="2"/><circle cx="17.8" cy="10" r="2"/></svg>';
    const icon =
      item.verb === 'Pet'
        ? paw
        : person
          ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4 3.5V16H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg>'
          : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6c4.4 0 7.8 3.3 9 6-1.2 2.7-4.6 6-9 6s-7.8-3.3-9-6c1.2-2.7 4.6-6 9-6zm0 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>';
    el.innerHTML = `<span class="pin" aria-hidden="true">${icon}</span><span class="tag"><span class="vb">${item.verb || (person ? 'Talk' : 'Look')}</span><span class="nm">${item.label}</span><span class="key">E</span></span><span class="stem" aria-hidden="true"></span>`;
    el.setAttribute('aria-label', item.label);
    this.layer.appendChild(el);
    item.el = el;
    item.enabled = item.enabled ?? true;
    this.list.push(item);
    return item;
  }
  clear() {
    for (const m of this.list) m.el.remove();
    this.list = [];
  }
  update(camera, canvas, playerPos, near) {
    const w = canvas.clientWidth,
      h = canvas.clientHeight,
      v = new THREE.Vector3();
    // every usable thing on screen shows its pin, a circle with a symbol on a short line down to it (Jørgen,
    // 2026-09-29: "earlier you had a line and a circle with a symbol which was better"). Pins further from Eric are
    // smaller and paler, and where two pins would overlap only the one nearer to Eric shows, so they never pile up
    // over people (css/marks.css draws them)
    const shown = [];
    for (const m of this.list) {
      const on = m.enabled && (typeof m.enabled !== 'function' || m.enabled());
      const vis = typeof m.enabled === 'function' ? m.enabled() : m.enabled;
      m.el.style.display = vis ? '' : 'none';
      if (!vis) continue;
      m.anchor(v);
      v.project(camera);
      // kept on screen: clamped at the sides and bottom; with no room above (the pin sits up to 56 px over its target,
      // under the HUD row at the top) the pin moves beside the head instead, never down over the face
      let sx = ((v.x + 1) / 2) * w,
        sy = ((1 - v.y) / 2) * h;
      // off screen: no marker squeezed into a corner (the goal has its own edge arrow)
      if ((v.z > 1 || v.x < -1.02 || v.x > 1.02 || v.y < -1.02 || v.y > 1.02) && !(m.goal && m.goal())) {
        m.el.style.display = 'none';
        continue;
      }
      const top = sx > w - 480 ? 64 : 12; // the HUD row only covers the top right
      const below = sy - 56 < top;
      m.el.classList.toggle('below', below);
      sx = Math.max(22, Math.min(w - 22, sx));
      sy = below ? Math.max(sy, top + 20) : sy;
      sy = Math.min(sy, h - (below ? 24 : 6));
      // distance from Eric: full size within 3 m, down to 70% and a paler pin from 8 m on (scaled from its tip)
      const s = m.spot ? m.spot() : null;
      const d = s && playerPos ? Math.hypot(playerPos.x - s[0], playerPos.z - s[1]) : 0;
      // a thing that only has a flat line or a word to it shows its pin once Eric is close (interactions.js nearOnly);
      // it can still be clicked or picked with E from anywhere, like any other
      if (m.nearOnly && near !== m && d > NEAR_PIN && m.nearOnly()) {
        m.el.style.display = 'none';
        continue;
      }
      const k = near === m ? 0 : Math.max(0, Math.min(1, (d - 3) / 5));
      m.el.style.transform = `translate(${sx}px, ${sy}px) scale(${(1 - 0.3 * k).toFixed(3)})`;
      m.el.style.setProperty('--mo', (1 - 0.35 * k).toFixed(3));
      m.el.classList.toggle('flip', sx > w - 90); // a pin beside the head goes on the left near the right edge
      if (m.labelIf) {
        const want = m.labelCond(m.labelIf.cond) ? m.labelIf.text : m.labelIf.other;
        if (want !== m.label) {
          m.label = want;
          m.el.querySelector('.nm').textContent = want;
        }
      }
      m.el.classList.toggle('near', near === m);
      const isGoal = !!(m.goal && m.goal());
      m.el.classList.toggle('goal', isGoal);
      // a close-only pin never crowds out a full one (the covered monitor hid Mio's)
      const rank = near === m ? -2 : isGoal ? -1 : d + (m.nearOnly && m.nearOnly() ? 100 : 0);
      shown.push({ m, sx, sy, d, rank });
      void on;
    }
    // overlapping pins: the one in reach, then the goal, then the nearest wins; the others hide until there's room
    shown.sort((a, b) => a.rank - b.rank);
    const kept = [],
      gap = document.body.classList.contains('phone') ? 36 : 30;
    for (const e of shown) {
      const hit = kept.some((o) => Math.abs(o.sx - e.sx) < gap && Math.abs(o.sy - e.sy) < gap);
      e.m.el.classList.toggle('crowded', hit);
      if (!hit) kept.push(e);
    }
  }
}
