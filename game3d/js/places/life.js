// Small life shared by the places: warm light pools on the floor under the (hidden) ceiling lamps, dust
// drifting in window light, steam from a kettle, screens that flicker and scroll, and clock hands that move.
// Everything here is cheap (a few draw calls each) so it stays on in the low quality tier.
import * as THREE from 'three';

// ---------- light pools: kit/core/pool.js (one home, below the places)
export { lightPool } from '../kit/core/pool.js';

// ---------- dust motes in a box of light ----------
// box: [x0, x1, y0, y1, z0, z1] in the parent's space. dir: the slow drift.
export function dust(box, n = 60, { color = '#ffe2b8', size = 0.028, opacity = 0.55, seed = 3 } = {}) {
  const [x0, x1, y0, y1, z0, z1] = box;
  const pos = new Float32Array(n * 3),
    ph = new Float32Array(n);
  let s = seed * 7919;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < n; i++) {
    pos[i * 3] = rnd();
    pos[i * 3 + 1] = rnd();
    pos[i * 3 + 2] = rnd();
    ph[i] = rnd() * 6.283;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uT: { value: 0 },
      uMin: { value: new THREE.Vector3(x0, y0, z0) },
      uSize: { value: new THREE.Vector3(x1 - x0, y1 - y0, z1 - z0) },
      uColor: { value: new THREE.Color(color) },
      uOp: { value: opacity },
      uPx: { value: size },
      uScale: { value: 800 },
    },
    vertexShader: `attribute float ph; uniform float uT, uPx, uScale; uniform vec3 uMin, uSize; varying float vA;
      void main(){
        vec3 p = position;
        p.y = fract(p.y + uT * 0.012 + 0.03 * sin(uT * 0.4 + ph));
        p.x = fract(p.x + 0.02 * sin(uT * 0.23 + ph * 1.7) + uT * 0.004);
        p.z = fract(p.z + 0.02 * cos(uT * 0.19 + ph));
        vec3 w = uMin + p * uSize;
        vec4 mv = modelViewMatrix * vec4(w, 1.0);
        gl_Position = projectionMatrix * mv;
        // fade at the box edges and twinkle as they turn in the light
        float edge = smoothstep(0.0, 0.15, p.y) * smoothstep(1.0, 0.8, p.y) * smoothstep(0.0, 0.12, p.x) * smoothstep(1.0, 0.88, p.x);
        vA = edge * (0.45 + 0.55 * sin(uT * 1.3 + ph * 3.0) * sin(uT * 0.7 + ph));
        gl_PointSize = uPx * uScale / -mv.z;
      }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOp; varying float vA;
      void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(d)); gl_FragColor = vec4(uColor * 1.6, a * max(vA, 0.0) * uOp); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 3;
  pts.userData.noAO = true;
  pts.userData.update = (t, viewH = 800) => {
    mat.uniforms.uT.value = t;
    mat.uniforms.uScale.value = viewH;
  };
  return pts;
}

// ---------- steam: a few soft puffs rising and fading ----------
let _puffTex;
function puffTex() {
  if (_puffTex) return _puffTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)');
  gr.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  _puffTex = new THREE.CanvasTexture(c);
  return _puffTex;
}
export function steam({ n = 6, rise = 0.45, size = 0.12, opacity = 0.35, period = 2.6 } = {}) {
  const g = new THREE.Group();
  const puffs = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: puffTex(),
        color: '#f4f6f8',
        transparent: true,
        depthWrite: false,
        opacity: 0,
      }),
    );
    s.userData.o = i / n;
    s.renderOrder = 3;
    g.add(s);
    puffs.push(s);
  }
  g.userData.on = 1;
  g.userData.update = (t) => {
    for (const s of puffs) {
      const k = (t / period + s.userData.o) % 1;
      s.position.set(
        Math.sin(k * 5 + s.userData.o * 9) * 0.03 * k,
        k * rise,
        Math.cos(k * 4 + s.userData.o * 7) * 0.02 * k,
      );
      s.scale.setScalar(size * (0.5 + k * 1.4));
      s.material.opacity = opacity * g.userData.on * Math.sin(k * Math.PI) * (1 - k * 0.4);
    }
  };
  return g;
}

// ---------- screens: a few kinds of content, scrolling, with a faint flicker ----------
const SCREEN_KINDS = {
  sheet: (g, W, H) => {
    g.fillStyle = '#dfe8f2';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#4f79a8';
    g.fillRect(0, 0, W, 18);
    g.strokeStyle = 'rgba(80,100,130,.35)';
    g.lineWidth = 1;
    for (let y = 26; y < H * 2; y += 12) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }
    for (const x of [40, 96, 150, 200]) {
      g.beginPath();
      g.moveTo(x, 18);
      g.lineTo(x, H * 2);
      g.stroke();
    }
    g.fillStyle = '#51627a';
    for (let y = 29; y < H * 2; y += 12)
      for (const x of [6, 44, 100, 154, 204]) if ((x * 7 + y * 3) % 5) g.fillRect(x, y, 14 + ((x + y) % 18), 5);
  },
  mail: (g, W, H) => {
    g.fillStyle = '#e9edf2';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#c7d3e0';
    g.fillRect(0, 0, 70, H * 2);
    g.fillStyle = '#6e8fb4';
    g.fillRect(0, 0, W, 16);
    for (let y = 24; y < H * 2; y += 22) {
      g.fillStyle = '#5e6c80';
      g.fillRect(78, y, 90 + (y % 40), 5);
      g.fillStyle = '#9aa7b6';
      g.fillRect(78, y + 9, 130 - (y % 30), 4);
      g.fillStyle = '#8fa2b8';
      g.fillRect(8, y, 50, 5);
    }
  },
  code: (g, W, H) => {
    g.fillStyle = '#1f2833';
    g.fillRect(0, 0, W, H);
    const cols = ['#7fb7e0', '#9fd49a', '#e0c07f', '#c4c9d1', '#c4c9d1'];
    for (let y = 8, i = 0; y < H * 2; y += 10, i++) {
      const ind = [0, 12, 24, 12, 0, 24, 36][i % 7];
      g.fillStyle = cols[(i * 3) % 5];
      g.fillRect(8 + ind, y, 30 + ((i * 37) % 120), 4);
      if (i % 3) {
        g.fillStyle = cols[(i + 2) % 5];
        g.fillRect(50 + ind + ((i * 37) % 120), y, 20 + ((i * 13) % 50), 4);
      }
    }
  },
  // a plain desktop, still: a sea-and-island wallpaper, a few icons, one window, the taskbar (no words on it)
  desktop: (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#24496a');
    sky.addColorStop(1, '#3d7d8c');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#2f6676';
    g.beginPath();
    g.moveTo(120, 112);
    g.quadraticCurveTo(170, 82, 214, 104);
    g.lineTo(240, 112);
    g.fill();
    g.fillStyle = '#5a9aa6';
    g.fillRect(0, 112, W, 4);
    g.fillStyle = '#e4ecf2';
    for (let i = 0; i < 4; i++) g.fillRect(10, 10 + i * 24, 14, 12);
    g.fillStyle = 'rgba(228,236,242,.6)';
    for (let i = 0; i < 4; i++) g.fillRect(8, 24 + i * 24, 18, 3);
    g.fillStyle = '#e6edf3';
    g.fillRect(60, 22, 120, 74);
    g.fillStyle = '#3f7f95';
    g.fillRect(60, 22, 120, 11);
    g.fillStyle = '#9aabbd';
    for (let i = 0; i < 4; i++) g.fillRect(68, 42 + i * 11, 104 - ((i * 29) % 46), 4);
    g.fillStyle = '#1a2230';
    g.fillRect(0, H - 12, W, 12);
    g.fillStyle = '#7fb7e0';
    for (let i = 0; i < 4; i++) g.fillRect(8 + i * 14, H - 9, 9, 6);
    g.drawImage(g.canvas, 0, 0, W, H, 0, H, W, H); // the same picture below, wherever the texture's window sits
  },
  term: (g, W, H) => {
    g.fillStyle = '#10161c';
    g.fillRect(0, 0, W, H);
    for (let y = 8, i = 0; y < H * 2; y += 10, i++) {
      g.fillStyle = i % 5 === 0 ? '#e0b86a' : '#6fd39a';
      g.fillRect(6, y, 20 + ((i * 53) % 180), 4);
    }
  },
};
const _screenTex = {};
export function screenTexture(kind = 'sheet') {
  if (_screenTex[kind]) return _screenTex[kind];
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  // draw twice as tall content and wrap it, so a scroll never shows a seam
  const big = document.createElement('canvas');
  big.width = 256;
  big.height = 320;
  SCREEN_KINDS[kind](big.getContext('2d'), 256, 160);
  c.getContext('2d').drawImage(big, 0, 0);
  const t = new THREE.CanvasTexture(big);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 0.5);
  _screenTex[kind] = t;
  return t;
}
// A lit screen material; list it in a Screens set to animate.
export function screenMat(kind = 'sheet', k = 0.85) {
  const tex = screenTexture(kind).clone();
  tex.needsUpdate = true;
  const m = new THREE.MeshStandardMaterial({
    map: tex,
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: tex,
    emissiveIntensity: k,
    roughness: 0.35,
  });
  m.userData.base = k;
  m.userData.seed = Math.random() * 100;
  m.userData.kind = kind;
  return m;
}
export class Screens {
  constructor() {
    this.list = [];
  }
  add(m) {
    this.list.push(m);
    return m;
  }
  update(t) {
    for (const m of this.list) {
      const u = m.userData;
      // a slow flicker plus, now and then, a scroll step (someone working)
      m.emissiveIntensity = u.base * (0.94 + 0.05 * Math.sin(t * 13 + u.seed) * Math.sin(t * 3.1 + u.seed * 2));
      const step = Math.floor((t + u.seed) / (u.kind === 'term' ? 0.6 : 2.4));
      if (step !== u.step) {
        u.step = step;
        m.map.offset.y = (step * 0.037 * (u.kind === 'term' ? 1 : 1.9)) % 0.5;
      }
    }
  }
}

// ---------- clock hands: hour and minute from a time in minutes, a sweeping second hand ----------
// r: face radius. Put the group just in front of the face. set(minutes, seconds).
export function clockHands(r = 0.16, { color = '#2b3140', second = '#c9473f' } = {}) {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color });
  const hand = (len, w, z, mm) => {
    const pv = new THREE.Group();
    const h = new THREE.Mesh(new THREE.PlaneGeometry(w, len), mm);
    h.position.set(0, len / 2 - len * 0.12, z);
    pv.add(h);
    g.add(pv);
    return pv;
  };
  const hr = hand(r * 0.55, r * 0.09, 0.002, m),
    mn = hand(r * 0.82, r * 0.06, 0.004, m),
    sc = hand(r * 0.9, r * 0.025, 0.006, new THREE.MeshBasicMaterial({ color: second }));
  const cap = new THREE.Mesh(new THREE.CircleGeometry(r * 0.06, 12), new THREE.MeshBasicMaterial({ color: second }));
  cap.position.z = 0.008;
  g.add(cap);
  g.userData.set = (minutes, seconds = 0) => {
    hr.rotation.z = (-((minutes / 60) % 12) / 12) * Math.PI * 2;
    mn.rotation.z = (-(minutes % 60) / 60) * Math.PI * 2;
    sc.rotation.z = (-(seconds % 60) / 60) * Math.PI * 2;
  };
  g.userData.second = sc;
  return g;
}

// ---------- contact shadows: a soft dark footprint under every freestanding prop ----------
// AO does this in the medium and high tiers; these keep things grounded in the low tier too and deepen the
// contact where AO is thin (under benches and sofas, around machines). Walls and floors are skipped.
let _footTex;
function footTex() {
  if (_footTex) return _footTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.filter = 'blur(7px)';
  g.fillStyle = '#000';
  g.fillRect(14, 14, 36, 36);
  _footTex = new THREE.CanvasTexture(c);
  return _footTex;
}
export function groundShadows(root, { skip = new Set(), opacity = 0.5, y = 0.009, maxSide = 3.2 } = {}) {
  const box = new THREE.Box3(),
    size = new THREE.Vector3(),
    ctr = new THREE.Vector3();
  const mat = new THREE.MeshBasicMaterial({
    map: footTex(),
    color: '#141820',
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const out = new THREE.Group();
  out.name = 'contact';
  for (const o of root.children) {
    if (skip.has(o) || o.isLight || o.name === 'contact' || o.name === 'proxy' || o.userData.noContact || !o.visible)
      continue;
    box.setFromObject(o);
    if (box.isEmpty()) continue;
    box.getSize(size);
    box.getCenter(ctr);
    if (box.min.y > 0.04 || size.y < 0.12) continue; // not standing on the floor, or flat (mats, lines)
    const lo = Math.min(size.x, size.z),
      hi = Math.max(size.x, size.z);
    if (hi > maxSide || (lo < 0.2 && hi > 0.9)) continue; // walls and wall strips
    if (lo < 0.06) continue;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 1.55 + 0.12, size.z * 1.55 + 0.12), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(ctr.x, y, ctr.z);
    m.renderOrder = 1;
    m.userData.noAO = true;
    m.userData.stackable = true; // one colour and draw order: the draw-call pass may merge them (perf/batch.js)
    out.add(m);
  }
  root.add(out);
  return out;
}
