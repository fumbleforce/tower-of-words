// The live creator on the repaired base bodies: pick a body, hair, eyes and clothes and watch it idle or walk.
// State lives in the URL (?body=mio&hair=bob&...), so any look can be linked.
import * as THREE from 'three';
import { loadLibrary, buildCharacter, SKIN_TONES } from '../recipe.js';
import { dressed, layerMesh } from './base.js';
import { disposeCharacter } from '../dispose.js';
import { approvedIdleFor } from '../approved-idle.js';
import { CLOTHES, HAIR, classify, clothesGeometry, hairGeometry, tuckedEars, wardrobeMesh } from './wardrobe.js';
import { EYE_STYLES, IRIS, customEyes } from './eyes.js';

const VERSION = 'source16';
const $ = (id) => document.getElementById(id);
const NAMES = { mio: 'Mio', eric: 'Eric' };
const HAIR_COLOURS = ['#1d1f2b', '#4a3325', '#8a5a32', '#d9b56a', '#26405f', '#1f7d86', '#b85a6a', '#9aa0a8'];
const CLOTH_COLOURS = ['#f2f0ea', '#2b2f3a', '#1f3552', '#3a6ea5', '#2f6b4f', '#b3473d', '#d9a441', '#7a6aa8', '#c9b79a'];
const SLOTS = ['top', 'bottom', 'shoes'];
const DEFAULT = { body: 'mio', hair: 'own', hairColour: '', eyes: 'original', iris: '', top: 'own', topColour: '', bottom: 'own',
  bottomColour: '', shoes: 'own', shoesColour: '', skin: '' };
const PRESETS = {
  'Mio as she is': { body: 'mio' },
  'Eric as he is': { body: 'eric' },
  'New on Mio\'s body': { body: 'mio', hair: 'bob', hairColour: '#8a5a32', eyes: 'round', iris: '#3f8f5a', top: 'tank', topColour: '#f2f0ea', bottom: 'skirt', bottomColour: '#1f3552', shoes: 'sneakers', shoesColour: '#b3473d' },
  'New on Eric\'s body': { body: 'eric', hair: 'spiky', hairColour: '#1d1f2b', eyes: 'sharp', iris: '#c08a2e', top: 'tee', topColour: '#b3473d', bottom: 'shorts', bottomColour: '#c9b79a', shoes: 'sneakers', shoesColour: '#f2f0ea' },
  'Ponytail, office': { body: 'mio', hair: 'ponytail', hairColour: '#1d1f2b', eyes: 'sleepy', iris: '#6b4a2e', top: 'shirt', topColour: '#f2f0ea', bottom: 'longskirt', bottomColour: '#2b2f3a', shoes: 'boots', shoesColour: '#2b2f3a', skin: '#e8bfa3' },
  'Crop, jacket': { body: 'eric', hair: 'crop', hairColour: '#4a3325', eyes: 'round', iris: '#2f6fb0', top: 'jacket', topColour: '#2f6b4f', bottom: 'trousers', bottomColour: '#c9b79a', shoes: 'boots', shoesColour: '#4a3325', skin: '#d9a47f' },
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
sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -1.5, right: 1.5, top: 1.5, bottom: -1.5 });
scene.add(sun);
const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.MeshLambertMaterial({ color: '#c9d2da' }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 20);
let yaw = 0.35, pitch = 0.12, zoom = 1, spin = true, faceView = false, frozen = false, focus = null;

// ---------- character ----------
let library, libraryLoad, ch = null, original = null, eyes = null, request = 0, motion = 'neutral', clock = new THREE.Clock();
const extra = {};   // slot -> made mesh (hair, top, bottom, shoes)

// Start a clip at full weight at once (a zero-length fade-in can leave the weight at 0 until time moves on).
function start(c, name) {
  c.mixer.stopAllAction();
  const action = c.actions[name];
  action.reset().setEffectiveWeight(1).play();
  c.cur = action;
}

function tint(mesh, colour) {
  const u = mesh?.material.userData.u; if (!u) return;
  if (colour) { u.uTint.value.set(colour); u.uAmt.value = 1; } else u.uAmt.value = 0;
}
function removeExtra(slot) {
  const mesh = extra[slot]; if (!mesh) return;
  mesh.removeFromParent(); mesh.geometry.dispose(); mesh.material.dispose(); delete extra[slot];
}
function apply() {
  if (!ch) return;
  const d = ch.base.d, J = library.src[state.body].P;
  // hair
  removeExtra('hair');
  if (ch.meshes.hair) { ch.meshes.hair.visible = state.hair === 'own'; tint(ch.meshes.hair, state.hair === 'own' ? state.hairColour : ''); }
  const bodyPos = ch.meshes.body.geometry.attributes.position;
  bodyPos.array.set(HAIR[state.hair]?.coversEars ? tuckedEars(d) : d.pos); bodyPos.needsUpdate = true;
  if (HAIR[state.hair]) { extra.hair = wardrobeMesh(ch, hairGeometry(d, state.hair), state.hairColour || '#4a3325', 'hair-' + state.hair); ch.rig.add(extra.hair); }
  // Eric's stubble layer also holds some of his side hair (Codex's stubble diagnosis), so it goes with his hair
  if (ch.meshes.stubble) { ch.meshes.stubble.visible = state.hair === 'own'; tint(ch.meshes.stubble, state.hair === 'own' ? state.hairColour : ''); }
  // clothes
  for (const slot of SLOTS) {
    removeExtra(slot);
    const pick = state[slot], colour = state[slot + 'Colour'];
    if (ch.meshes[slot]) { ch.meshes[slot].visible = pick === 'own'; tint(ch.meshes[slot], pick === 'own' ? colour : ''); }
    if (CLOTHES[pick]) { extra[slot] = wardrobeMesh(ch, clothesGeometry(d, J, pick), colour || '#3a6ea5', slot + '-' + pick); ch.rig.add(extra[slot]); }
  }
  if (params.get('zones') === '1') showZones(d, J);
  // skin and eyes
  tint(ch.meshes.body, state.skin);
  eyes.set({ style: state.eyes, iris: state.iris || (state.eyes === 'original' ? null : '#2f6fb0') });
  history.replaceState(null, '', '?' + new URLSearchParams(Object.fromEntries(Object.entries(state).filter(([k, v]) => v !== DEFAULT[k]))));
  render();
}

// debugging aid (?zones=1): the body coloured by the zone each corner falls in
const ZONE_COLOURS = { torso: '#d0a040', neck: '#9050c0', arm: '#40a0d0', hand: '#e05050', leg: '#50b060', foot: '#303030' };
function showZones(d, J) {
  const g = ch.meshes.body.geometry, colour = new THREE.Color(), cols = new Float32Array(d.T * 9);
  for (let i = 0; i < d.T * 3; i++) {
    const zone = d.pieces[Math.floor(i / 3)] === 'body' ? classify(d, i, J).zone : null;
    colour.set(zone ? ZONE_COLOURS[zone] : '#ffffff').toArray(cols, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  ch.meshes.body.material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
}

async function load() {
  const token = ++request;
  view.ready = false; window.__done = false; window.__err = null;
  $('status').textContent = 'Loading ' + NAMES[state.body] + '…';
  try {
    library = await (libraryLoad ||= loadLibrary());   // one library even when loads overlap
    library.retargetRest = true;
    const baseId = `clean-${state.body}-${VERSION}`;
    const next = await dressed(library, state.body, { base: baseId, height: 1, layers: ['hair', 'top', 'bottom', 'shoes', 'stubble'], fit: `${baseId}-fit3-layers` });
    next.actions.neutral = next.mixer.clipAction(await approvedIdleFor(library, state.body));
    if (token !== request) { disposeCharacter(next); return; }
    for (const slot of Object.keys(extra)) removeExtra(slot);
    eyes?.dispose(); disposeCharacter(ch);
    ch = next; scene.add(ch.root);
    eyes = customEyes(ch.meshes.body.material, ch.base.d);
    start(ch, motion);
    await setBeside($('beside').getAttribute('aria-pressed') === 'true');
    refreshControls(); apply();
    $('status').textContent = `${NAMES[state.body]}'s body, ${ch.base.d.id}`;
    view.ready = true; window.__done = true;
  } catch (error) {
    console.error(error);
    if (token === request) { $('status').textContent = 'Could not load: ' + error.message; window.__err = error.message; }
  }
}

// the original game model, whole, next to the new character
async function setBeside(on) {
  if (original) { disposeCharacter(original); original = null; }
  if (on && ch) {
    const body = state.body, source = library.src[body];
    const next = await buildCharacter(library, { body, parts: {}, height: 1 });
    const mesh = layerMesh(library, next, body, 'original-' + body, Array.from({ length: source.T }, (_, i) => i), [255, 255, 255]);
    next.rig.add(mesh); next.meshes.original = mesh;
    next.actions.neutral = next.mixer.clipAction(await approvedIdleFor(library, body));
    next.root.position.x = 0.62; start(next, motion);
    if (ch.cur) { next.cur.time = ch.cur.time; }
    original = next; scene.add(original.root);
  }
  if (ch) ch.root.position.x = on ? -0.31 : 0;
  if (original) original.root.position.x = 0.31;
  view.beside = !!original;
}

// ---------- controls ----------
function chips(id, options, key, onPick = apply) {
  const box = $(id); box.replaceChildren();
  for (const [value, label, disabled] of options) {
    const b = document.createElement('button');
    b.textContent = label; b.dataset.value = value; b.setAttribute('aria-pressed', String(state[key] === value)); b.disabled = !!disabled;
    b.onclick = () => { state[key] = value; box.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); onPick(); };
    box.append(b);
  }
}
function swatches(id, colours, key, asMade = true) {
  const box = $(id); box.replaceChildren();
  const list = asMade ? [''].concat(colours) : colours;
  for (const colour of list) {
    const b = document.createElement('button');
    b.className = 'swatch' + (colour ? '' : ' asmade');
    if (colour) b.style.background = colour;
    b.title = colour ? colour : 'As made'; b.setAttribute('aria-label', b.title);
    b.setAttribute('aria-pressed', String(state[key] === colour));
    b.onclick = () => { state[key] = colour; box.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); apply(); };
    box.append(b);
  }
}
function refreshControls() {
  const own = NAMES[state.body] + "'s";
  chips('body', Object.entries(NAMES).map(([k, n]) => [k, n + "'s body"]), 'body', () => { resetOwn(); load(); });
  swatches('skin', SKIN_TONES, 'skin');
  chips('hair', [['own', own + ' hair'], ...Object.entries(HAIR).map(([k, h]) => [k, h.label]), ['none', 'None']], 'hair');
  swatches('hair-colour', HAIR_COLOURS, 'hairColour');
  chips('eyes', Object.entries(EYE_STYLES), 'eyes');
  swatches('iris', IRIS, 'iris');
  for (const slot of SLOTS) {
    chips(slot, [['own', own + ' ' + slot], ...Object.entries(CLOTHES).filter(([, c]) => c.slot === slot).map(([k, c]) => [k, c.label]), ['none', 'None']], slot);
    swatches(slot + '-colour', CLOTH_COLOURS, slot + 'Colour');
  }
}
function resetOwn() { for (const slot of ['hair', ...SLOTS]) if (state[slot] === 'own') state[slot + 'Colour'] = ''; }
const presetBox = $('presets');
for (const [name, preset] of Object.entries(PRESETS)) {
  const b = document.createElement('button'); b.textContent = name;
  b.onclick = () => { const body = state.body; Object.assign(state, DEFAULT, preset); if (state.body !== body) load(); else { refreshControls(); apply(); } };
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
  target.set(0, faceView ? 0.68 : 0.5, 0);
  if (focus) target.set(...focus);
  const dist = (2.9 * wide / face) / zoom * Math.max(1, 1.05 / camera.aspect);
  camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, target.y + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
  camera.lookAt(target);
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(render);
view.set = async (changes) => { const body = state.body; Object.assign(state, changes); if (state.body !== body) await load(); else { refreshControls(); apply(); } };
// for captures: hold one pose (name, time in seconds)
view.pose = (name, time) => {
  motion = name; spin = false; frozen = true;
  for (const c of [ch, original]) if (c) { start(c, name); c.cur.time = time; c.update(0); }
};
view.camera = (y, p = 0.12, z = 1, face = false, at = null) => { yaw = y; pitch = p; zoom = z; faceView = face; focus = at; spin = false; };
view.character = () => ch;
addEventListener('pagehide', () => { request++; renderer.setAnimationLoop(null); eyes?.dispose(); disposeCharacter(ch); disposeCharacter(original); renderer.dispose(); });
load();
