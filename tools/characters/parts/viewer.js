// Live viewer for rigged character attempts: Mio's approved idle and walk carried over from the game's Mio rig by
// bone name, and another model beside it for comparison. Models are git-ignored files in the main checkout.
// Another round passes its own models as viewer.html?cfg=<json url>, the JSON being {"title", "blurb",
// "attempts": {id: url}, "compare": {name: url}, "refs": [picture urls]}; without one it shows reviews/char-mio-parts-1.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { bindRetarget as bindRig, applyRetarget as applyRig, resetPose } from './retarget.js';

const cfgUrl = new URLSearchParams(location.search).get('cfg');
const CFG = (cfgUrl && await fetch(cfgUrl).then((r) => r.json())) || {
  attempts: Object.fromEntries(['a11', 'a10', 'a07'].map((a) => [a, `/art/parts/char-mio-parts/${a}/mio-rigged.glb`])),
  compare: { 'meshy-single': '/art/parts/style-concepts/claude-miogen3d/raw/meshy-single/norm.glb' },
};
const ATTEMPTS = Object.keys(CFG.attempts);
const COMPARE = { none: null, ...CFG.compare };
if (CFG.title) document.title = document.getElementById('title').textContent = CFG.title;
if (CFG.blurb) document.getElementById('blurb').textContent = CFG.blurb;
if (CFG.refs) {
  document.getElementById('refs').replaceChildren(...CFG.refs.map((src) => Object.assign(new Image(), { src, alt: 'Target picture' })));
}
const SRC_RIG = '/game3d/assets/mio/walk.glb';
const IDLE = '/game3d/assets/characters/relaxed-idle-mio.json';
const HEIGHT = 1.6;
// Step scale for the walk (cfg "step" or ?step=): the leg bones get only this share of the clip's rotation, so short
// chibi legs take smaller, lower steps than Mio's clip. 1 = the clip as it is (the default).
const STEP = Number(new URLSearchParams(location.search).get('step') ?? CFG.step ?? 1);

const canvas = document.getElementById('c');
const status = document.getElementById('status');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeceef1);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f94, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(-2, 4, 3);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
const turn = new THREE.Group();
scene.add(turn);
const loader = new GLTFLoader();
const load = (u) => new Promise((ok, no) => loader.load(u, ok, undefined, no));

let yaw = 0, pitch = 0.05, dist = 4.2, spin = false, motion = 'rest';
let target = null, other = null;
const src = { root: null, mixer: null, clips: {} };

// ---- drag to turn, wheel to zoom ----
let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = [e.clientX, e.clientY, yaw, pitch]; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  yaw = drag[2] - (e.clientX - drag[0]) * 0.01;
  pitch = Math.max(-0.6, Math.min(0.9, drag[3] + (e.clientY - drag[1]) * 0.005));
});
canvas.addEventListener('pointerup', () => (drag = null));
canvas.addEventListener('wheel', (e) => { e.preventDefault(); dist = Math.max(0.8, Math.min(9, dist * (1 + e.deltaY * 0.001))); }, { passive: false });

function fit(obj) {
  // stand on the floor at HEIGHT, centred
  const box = new THREE.Box3().setFromObject(obj);
  const s = HEIGHT / (box.max.y - box.min.y);
  obj.scale.multiplyScalar(s);
  box.setFromObject(obj);
  obj.position.x -= (box.min.x + box.max.x) / 2;
  obj.position.z -= (box.min.z + box.max.z) / 2;
  obj.position.y -= box.min.y;
}

// ---- retarget (./retarget.js), with the walk's leg share and the turntable's turn ----
function bindRetarget(model) {
  turn.rotation.y = 0; // rest is read facing front; frame() turns it back
  return bindRig(src.root, model);
}
const applyRetarget = (r) => applyRig(r, { turn: turn.quaternion, legShare: motion === 'walk' ? STEP : 1 });

async function loadSource() {
  const g = await load(SRC_RIG);
  src.root = g.scene;
  src.root.traverse((o) => { if (o.isMesh) o.visible = false; });
  scene.add(src.root);                                   // invisible; only its bones are read
  src.root.position.set(100, 0, 0);
  src.mixer = new THREE.AnimationMixer(src.root);
  src.clips.walk = g.animations[0];
  const idle = await fetch(IDLE).then((r) => r.json());
  src.clips.idle = THREE.AnimationClip.parse(idle);
}

async function loadModel(url) {
  const g = await load(url);
  const root = new THREE.Group();
  root.add(g.scene);
  fit(root);
  root.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; if (o.material.map) o.material.map.anisotropy = 4; } });
  return root;
}

let rt = null, action = null;
async function showAttempt(id) {
  status.textContent = `loading ${id}`;
  const m = await loadModel(CFG.attempts[id]);
  if (target) turn.remove(target);
  target = m;
  turn.add(target);
  layout();
  rt = bindRetarget(target);
  setMotion(motion);
  status.textContent = `${id} · ${countFaces(target).toLocaleString()} faces`;
  setPressed('attempts', id);
}

async function showCompare(key) {
  if (other) turn.remove(other);
  other = null;
  if (COMPARE[key]) {
    status.textContent = `loading ${key}`;
    other = await loadModel(COMPARE[key]);
    turn.add(other);
  }
  layout();
  setPressed('compare', key);
  status.textContent = '';
}

function layout() {
  if (target) target.position.x = other ? -0.45 : 0;
  if (other) other.position.x = 0.45;
  dist = other ? 5.2 : 4.2;
}

function setMotion(m) {
  motion = m;
  if (action) action.stop();
  action = null;
  if (rt) resetPose(rt);
  if (m !== 'rest' && src.clips[m]) {
    action = src.mixer.clipAction(src.clips[m]);
    action.reset().play();
  }
  setPressed('motions', m);
}

function countFaces(o) {
  let n = 0;
  o.traverse((c) => { if (c.isMesh) n += (c.geometry.index ? c.geometry.index.count : c.geometry.attributes.position.count) / 3; });
  return n;
}

function setPressed(group, key) {
  for (const b of document.getElementById(group).children) b.setAttribute('aria-pressed', String(b.dataset.k === key));
}

function buttons(group, keys, fn) {
  const el = document.getElementById(group);
  for (const k of keys) {
    const b = document.createElement('button');
    b.textContent = k; b.dataset.k = k; b.onclick = () => fn(k);
    el.appendChild(b);
  }
}

document.getElementById('spin').onclick = (e) => { spin = !spin; e.target.setAttribute('aria-pressed', String(spin)); };

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (spin) yaw += dt * 0.6;
  turn.rotation.y = yaw;
  if (action) { src.mixer.update(dt); applyRetarget(rt); }
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  camera.position.set(0, 0.85 + Math.sin(pitch) * dist, Math.cos(pitch) * dist);
  camera.lookAt(0, 0.82, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

const params = new URLSearchParams(location.search);
buttons('attempts', ATTEMPTS, showAttempt);
buttons('motions', ['rest', 'idle', 'walk'], setMotion);
buttons('compare', Object.keys(COMPARE), showCompare);
await loadSource();
await showAttempt(params.get('a') || ATTEMPTS[0]);
setMotion(params.get('m') || 'idle');
if (params.get('c')) await showCompare(params.get('c'));
frame();
window.__viewer = { ready: true, get rt() { return rt; }, setMotion, showAttempt, showCompare, set yaw(v) { yaw = v; } };
