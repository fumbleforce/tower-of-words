// The live creator: Mio's or Eric's body as built in Blender, with their own hair, Eric's stubble and two outfits,
// idling or walking. The look lives in the URL (?body=eric&outfit=shirt&...), so any look can be linked.
import * as THREE from 'three';
import { BODIES, OUTFITS, loadModel, loadOriginal } from './model.js';

const $ = (id) => document.getElementById(id);
const SKIN_TONES = ['#f7e3d8', '#f3d3c0', '#e8bfa3', '#d9a47f', '#c08560', '#9c6644', '#7a4b2e'];
const HAIR_COLOURS = ['#1d1f2b', '#1d2d5c', '#4a3325', '#8a5a32', '#b89478', '#d9b56a', '#26405f', '#1f7d86', '#b85a6a', '#9aa0a8'];
const CLOTH_COLOURS = ['#f4f2ee', '#8d929c', '#2b2f3a', '#28314f', '#3a6ea5', '#2f6b4f', '#6f7a5a', '#b3473d', '#d9a441', '#7a6aa8', '#c9b79a'];
const DEFAULT = { body: 'mio', hair: 'own', hairColour: '', stubble: 'own', outfit: 'hoodie', topColour: '', bottomColour: '', skin: '' };
const PRESETS = {
  'Mio, hoodie': { body: 'mio', outfit: 'hoodie', topColour: '#28314f' },
  'Mio, shirt and skirt': { body: 'mio', outfit: 'shirt' },
  'Eric, hoodie': { body: 'eric', outfit: 'hoodie' },
  'Eric, shirt and skirt': { body: 'eric', outfit: 'shirt', bottomColour: '#2b2f3a' },
  'Bare bodies': { outfit: 'none', hair: 'none', stubble: 'none' },
};

const params = new URLSearchParams(location.search);
const state = { ...DEFAULT };
for (const key of Object.keys(DEFAULT)) if (params.has(key)) state[key] = params.get(key);
const view = window.__creator = { ready: false, state };

// ---------- scene ----------
const host = $('viewport');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
host.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#dde4ea');
scene.add(new THREE.HemisphereLight(0xffffff, 0x8d98a3, 1.9));
const sun = new THREE.DirectionalLight(0xffffff, 2.1); sun.position.set(1.5, 3, 2.5); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); sun.shadow.normalBias = 0.012; sun.shadow.bias = -0.0004;
Object.assign(sun.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5 });
scene.add(sun);
const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.MeshLambertMaterial({ color: '#c9d2da' }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 20);
let yaw = 0.35, pitch = 0.12, zoom = 1, spin = true, faceView = false, frozen = false, focus = null;

// ---------- character ----------
let ch = null, original = null, request = 0, motion = 'neutral';
const clock = new THREE.Clock();

function apply() {
  if (!ch) return;
  ch.dress(state);
  const query = new URLSearchParams(Object.fromEntries(Object.entries(state).filter(([k, v]) => v !== DEFAULT[k])));
  history.replaceState(null, '', '?' + query);
  render();
}

async function load() {
  const token = ++request;
  view.ready = false; window.__done = false; window.__err = null;
  $('status').textContent = 'Loading ' + BODIES[state.body] + '…';
  try {
    const next = await loadModel(state.body);
    if (token !== request) { next.dispose(); return; }
    ch?.dispose();
    ch = next; scene.add(ch.root);
    ch.play(motion);
    await setBeside($('beside').getAttribute('aria-pressed') === 'true');
    refreshControls(); apply();
    $('status').textContent = `${BODIES[state.body]}, made in Blender`;
    view.ready = true; window.__done = true;
  } catch (error) {
    console.error(error);
    if (token === request) { $('status').textContent = 'Could not load: ' + error.message; window.__err = error.message; }
  }
}

// the original game model, whole, next to the new character
async function setBeside(on) {
  original?.dispose(); original = null;
  if (on && ch) {
    const next = await loadOriginal(state.body);
    next.play(motion);
    if (ch.cur) next.cur.time = ch.cur.time;
    original = next; scene.add(original.root);
  }
  if (ch) ch.root.position.x = on ? -0.31 : 0;
  if (original) original.root.position.x = 0.31;
  view.beside = !!original;
}

// ---------- controls ----------
function chips(id, options, key, onPick = apply) {
  const box = $(id); box.replaceChildren();
  for (const [value, label] of options) {
    const b = document.createElement('button');
    b.textContent = label; b.dataset.value = value; b.setAttribute('aria-pressed', String(state[key] === value));
    b.onclick = () => { state[key] = value; box.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); onPick(); };
    box.append(b);
  }
}
function swatches(id, colours, key) {
  const box = $(id); box.replaceChildren();
  for (const colour of [''].concat(colours)) {
    const b = document.createElement('button');
    b.className = 'swatch' + (colour ? '' : ' asmade');
    if (colour) b.style.background = colour;
    b.title = colour || 'As made'; b.setAttribute('aria-label', b.title);
    b.setAttribute('aria-pressed', String(state[key] === colour));
    b.onclick = () => { state[key] = colour; box.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); apply(); };
    box.append(b);
  }
}
function refreshControls() {
  const own = BODIES[state.body] + "'s";
  chips('body', Object.entries(BODIES).map(([k, n]) => [k, n]), 'body', () => load());
  swatches('skin', SKIN_TONES, 'skin');
  chips('hair', [['own', own + ' hair'], ['none', 'None']], 'hair');
  swatches('hair-colour', HAIR_COLOURS, 'hairColour');
  $('facial-box').hidden = state.body !== 'eric';
  chips('facial', [['own', 'Stubble'], ['none', 'None']], 'stubble');
  chips('outfit', Object.entries(OUTFITS), 'outfit');
  swatches('top-colour', CLOTH_COLOURS, 'topColour');
  swatches('bottom-colour', CLOTH_COLOURS, 'bottomColour');
}
const presetBox = $('presets');
for (const [name, preset] of Object.entries(PRESETS)) {
  const b = document.createElement('button'); b.textContent = name;
  b.onclick = () => view.set({ ...DEFAULT, body: state.body, ...preset });
  presetBox.append(b);
}
function setMotion(name) {
  motion = name;
  $('motion-idle').setAttribute('aria-pressed', String(name === 'neutral')); $('motion-walk').setAttribute('aria-pressed', String(name === 'walk'));
  ch?.play(name); original?.play(name);
}
$('motion-idle').onclick = () => setMotion('neutral');
$('motion-walk').onclick = () => setMotion('walk');
$('spin').onclick = () => { spin = !spin; $('spin').setAttribute('aria-pressed', String(spin)); };
$('beside').onclick = async () => { const on = $('beside').getAttribute('aria-pressed') !== 'true'; $('beside').setAttribute('aria-pressed', String(on)); await setBeside(on); };
$('face').onclick = () => { faceView = !faceView; $('face').setAttribute('aria-pressed', String(faceView)); };

// orbit: drag turns, wheel or pinch zooms
const pointers = new Map(); let pinch = 0;
host.onpointerdown = (e) => { pointers.set(e.pointerId, [e.clientX, e.clientY]); host.setPointerCapture(e.pointerId); spin = false; $('spin').setAttribute('aria-pressed', 'false'); };
host.onpointermove = (e) => {
  const last = pointers.get(e.pointerId); if (!last) return;
  if (pointers.size === 1) { yaw -= (e.clientX - last[0]) * 0.01; pitch = THREE.MathUtils.clamp(pitch + (e.clientY - last[1]) * 0.006, -0.3, 1.1); }
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()], dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (pinch) zoom = THREE.MathUtils.clamp(zoom * dist / pinch, 0.6, 4);
    pinch = dist;
  }
};
for (const type of ['pointerup', 'pointercancel']) host.addEventListener(type, (e) => { pointers.delete(e.pointerId); pinch = 0; });
host.addEventListener('wheel', (e) => { e.preventDefault(); zoom = THREE.MathUtils.clamp(zoom * Math.exp(-e.deltaY * 0.001), 0.6, 4); }, { passive: false });

// ---------- loop ----------
function resize() { renderer.setSize(host.clientWidth, host.clientHeight, false); camera.aspect = host.clientWidth / Math.max(1, host.clientHeight); camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(host);
const target = new THREE.Vector3();
function render() {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (spin && pointers.size === 0) yaw += dt * 0.45;
  if (!frozen) { ch?.update(dt); original?.update(dt); }
  const wide = original ? 1.45 : 1;
  const face = faceView ? 3.2 : 1;
  target.set(0, faceView ? 0.66 : 0.5, 0);
  if (focus) target.set(...focus);
  const dist = (2.9 * wide / face) / zoom * Math.max(1, 1.05 / camera.aspect);
  camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * dist, target.y + Math.sin(pitch) * dist, target.z + Math.cos(yaw) * Math.cos(pitch) * dist);
  camera.lookAt(target);
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(render);
view.set = async (changes) => { const body = state.body; Object.assign(state, changes); if (state.body !== body) await load(); else { refreshControls(); apply(); } };
// for captures: hold one pose (name, time in seconds)
view.pose = (name, time) => {
  motion = name; spin = false; frozen = true;
  for (const c of [ch, original]) {
    if (!c) continue;
    c.play(name); c.cur.time = time; c.update(0);
  }
};
view.camera = (y, p = 0.12, z = 1, face = false, at = null) => { yaw = y; pitch = p; zoom = z; faceView = face; focus = at; spin = false; };
view.character = () => ch;
addEventListener('pagehide', () => { request++; renderer.setAnimationLoop(null); ch?.dispose(); original?.dispose(); renderer.dispose(); });
load();
