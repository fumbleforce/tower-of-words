// Live viewer for Review crowd-pilot-1: the two pilot crowd models (A office man, B office woman), each on two rigs,
// built by the game's own loader (game3d/js/avatar.js meshyFrom) from the files the game would load: walk.glb,
// run.glb, sit.glb, base.webp and the approved relaxed-3 idle baked on that rig. Nothing here is in the game.
//   viewer.html?s=<scene>&m=<motion>   scenes and files from ./viewer.json (paths from the repo root)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { meshyFrom } from '../../game3d/js/avatar.js';

const ROOT = new URL('../../', location.href).href;
const CFG = await fetch('./viewer.json').then((r) => r.json());
const params = new URLSearchParams(location.search);
document.title = CFG.title;
document.getElementById('title').textContent = CFG.title;
document.getElementById('blurb').textContent = CFG.blurb;

const canvas = document.getElementById('c'),
  status = document.getElementById('status'),
  tagBox = document.getElementById('tags');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeceef1);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f94, 2.0));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(-3, 6, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
scene.add(sun);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ color: 0xdfe3e7 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.screenSpacePanning = true;
const turn = new THREE.Group();
scene.add(turn);

const gltf = new GLTFLoader();
const load = (u) => gltf.loadAsync(ROOT + u);
const texture = (u) => new THREE.TextureLoader().loadAsync(ROOT + u);
const idleClip = (u) => fetch(ROOT + u).then((r) => r.json()).then((j) => THREE.AnimationClip.parse(j));

// one person from a rig's files; tex overrides its base.webp (a colour variant)
async function person(rig, { tex, height } = {}) {
  const files = await Promise.all([load(rig.dir + 'walk.glb'), load(rig.dir + 'run.glb'), idleClip(rig.idle),
    load(rig.dir + 'sit.glb'), texture(tex || rig.dir + 'base.webp')]);
  return meshyFrom(rig.id, [...files, null], { height: height || rig.height });
}

function seat() {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.3, 0.5), new THREE.MeshLambertMaterial({ color: '#5b6f8f', transparent: true, opacity: 0.35, depthWrite: false }));
  m.position.set(0, 0.15, -0.06);
  m.castShadow = m.receiveShadow = true;
  m.visible = false;
  return m;
}

let figures = [], motion = params.get('m') || 'idle', current = null, varig = params.get('r') || CFG.varietyRigs[0];
function play(f) {
  f.seat.visible = motion === 'sit';
  if (motion === 'sit') return f.m.sitAt(0, 0.3, 0, 0);
  f.m.root.position.set(0, 0, 0);
  f.m.root.rotation.set(0, 0, 0);
  f.m.seated = false;
  f.m.setState(motion);
}

async function show(key) {
  current = key;
  setPressed('scenes', key);
  status.textContent = 'loading';
  for (const f of figures) turn.remove(f.g);
  figures = [];
  tagBox.replaceChildren();
  const sc = CFG.scenes[key];
  const rows = sc.rows || [sc.items];
  const list = [];
  rows.forEach((row, ri) => {
    const items = typeof row === 'string' ? CFG.variety[row].map((v) => ({ ...v, rig: varig.replace('?', row) })) : row;
    items.forEach((it, i) => list.push({ it, x: (i - (items.length - 1) / 2) * (sc.gap || 0.85), z: -ri * 1.6 }));
  });
  const made = await Promise.all(list.map(async ({ it, x, z }) => {
    const rig = CFG.rigs[it.rig];
    const m = await person(rig, it);
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const s = seat();
    g.add(m.root, s);
    m.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const tag = document.createElement('div');
    tag.textContent = it.label || rig.label;
    tagBox.appendChild(tag);
    return { g, m, seat: s, tag, h: it.height || rig.height };
  }));
  if (current !== key) return;
  figures = made;
  for (const f of figures) { turn.add(f.g); f.g.rotation.y = facing; play(f); }
  frameAll();
  status.textContent = `${figures.length} people`;
}

// the camera on a group of people (all, or the first or second half of the row: A's two rigs, B's two rigs)
function frameAll(y = 0.55, k = 1, part = null) {
  const half = Math.ceil(figures.length / 2);
  const group = part === null ? figures : part ? figures.slice(half) : figures.slice(0, half);
  const xs = group.map((f) => f.g.position.x), zs = figures.map((f) => f.g.position.z);
  const w = Math.max(...xs) - Math.min(...xs) + 1, depth = Math.min(...zs), cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const up = CFG.scenes[current]?.camUp || 0;
  controls.target.set(cx, y, depth / 2);
  camera.position.set(cx, y + (0.5 + up) * k, depth / 2 + (1.2 + w * 1.25) * k);
  controls.update();
}

// each person turns in place, so the row stays side by side: 0 faces us; the side view shows their left side (they
// face image left), the three-quarter view their left side half turned to us; behind shows the back
let facing = 0;
const face = (a) => { facing = a; for (const f of figures) f.g.rotation.y = a; };
const VIEWS = {
  'whole row': () => { face(0); frameAll(); },
  'A: shoulders and elbows': () => { face(0); frameAll(0.72, 0.85, 0); },
  'A: hips and knees': () => { face(0); frameAll(0.3, 0.85, 0); },
  'B: shoulders and elbows': () => { face(0); frameAll(0.72, 0.85, 1); },
  'B: hips and knees': () => { face(0); frameAll(0.3, 0.85, 1); },
  'three-quarter': () => { face(-0.7); frameAll(); },
  'from the side': () => { face(-Math.PI / 2); frameAll(); },
  'A from the side, hips and knees': () => { face(-Math.PI / 2); frameAll(0.3, 0.85, 0); },
  'B from the side, hips and knees': () => { face(-Math.PI / 2); frameAll(0.3, 0.85, 1); },
  'from behind': () => { face(Math.PI); frameAll(); },
};

function setPressed(group, key) {
  for (const b of document.getElementById(group).children) b.setAttribute('aria-pressed', String(b.dataset.k === key));
}
function buttons(group, entries, fn) {
  const el = document.getElementById(group);
  for (const [k, label] of entries) {
    const b = document.createElement('button');
    b.textContent = label;
    b.dataset.k = k;
    b.onclick = () => fn(k);
    el.appendChild(b);
  }
}
buttons('scenes', Object.entries(CFG.scenes).map(([k, s]) => [k, s.label]), show);
buttons('motions', [['idle', 'idle'], ['walk', 'walk'], ['run', 'run'], ['sit', 'sit']], (m) => {
  motion = m;
  setPressed('motions', m);
  for (const f of figures) play(f);
});
buttons('varig', CFG.varietyRigs.map((r) => [r, CFG.varietyRigLabels[r]]), (r) => {
  varig = r;
  setPressed('varig', r);
  if (CFG.scenes[current].rows) show(current);
});
buttons('views', Object.keys(VIEWS).map((k) => [k, k]), (k) => VIEWS[k]());
let spin = false;
document.getElementById('spin').onclick = (e) => { spin = !spin; e.target.setAttribute('aria-pressed', String(spin)); };

const clock = new THREE.Clock(), v = new THREE.Vector3();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (spin) for (const f of figures) f.g.rotation.y += dt * 0.6;
  for (const f of figures) f.m.update(dt);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  controls.update();
  renderer.render(scene, camera);
  for (const f of figures) {
    f.g.getWorldPosition(v);
    v.y -= 0.04;
    v.project(camera);
    f.tag.style.left = `${(v.x + 1) * 50}%`;
    f.tag.style.top = `${(1 - v.y) * 50}%`;
    f.tag.style.display = v.z < 1 ? '' : 'none';
  }
  requestAnimationFrame(frame);
}
setPressed('motions', motion);
setPressed('varig', varig);
frame();
await show(params.get('s') || Object.keys(CFG.scenes)[0]);
// one person close (for the sheets): upper body (shoulders, elbows) or lower body (hips, knees), front or side
function closeOn(i, part, side) {
  face(side ? -Math.PI / 2 : 0);
  const f = figures[i], y = part === 'upper' ? 0.62 : 0.28;
  controls.target.set(f.g.position.x, y, f.g.position.z);
  camera.position.set(f.g.position.x, y + 0.25, f.g.position.z + 1.25);
  controls.update();
}
window.__viewer = {
  ready: true, show, view: (k) => VIEWS[k](), closeOn, camera, controls,
  setMotion: (m) => { motion = m; for (const f of figures) play(f); },
  setRig: (r) => { varig = r; return show(current); },
};
