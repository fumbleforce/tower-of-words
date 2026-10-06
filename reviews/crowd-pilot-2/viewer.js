// Live viewer for Review crowd-pilot-2: the two pilot crowd models (A office man, B office woman) on Meshy's rig, beside
// the cast, built by the game's own loader (game3d/js/avatar.js meshyFrom) from the files the game would load: walk.glb,
// run.glb, sit.glb, base.webp and the approved relaxed-3 idle baked on that rig. Nothing here is in the game.
// Walk and run move the people, as the game does: the game times the walk clip to how far the body really goes
// (game3d/js/movement/gait.js), so a person told to walk who doesn't move holds the clip's first frame and then stands
// (round 1's viewer did exactly that: "they just lift their leg and put it down again"). Two ways here:
//   treadmill: each walks forward on the spot of the screen while the floor slides back under them (the feet should
//              stay planted on the moving grid);
//   loop:      all walk round one oval, each at the same ground speed.
//   viewer.html?s=<scene>&m=<motion>&w=<treadmill|loop>   scenes and files from ./viewer.json (paths from the repo root)
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
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
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

async function person(rig) {
  const files = await Promise.all([load(rig.dir + 'walk.glb'), load(rig.dir + 'run.glb'), idleClip(rig.idle),
    load(rig.dir + 'sit.glb'), texture(rig.dir + 'base.webp')]);
  return meshyFrom(rig.id, [...files, null], { height: rig.height });
}

function seat() {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.3, 0.5), new THREE.MeshLambertMaterial({ color: '#5b6f8f', transparent: true, opacity: 0.35, depthWrite: false }));
  m.position.set(0, 0.15, -0.06);
  m.castShadow = m.receiveShadow = true;
  m.visible = false;
  return m;
}
// the treadmill's floor: a strip of grid lines that slides back under the person as they walk
const CELL = 0.2;
function belt() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x9aa4ab });
  for (let i = -8; i <= 8; i++) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.012), mat);
    l.rotation.x = -Math.PI / 2;
    l.position.set(0, 0.002, i * CELL);
    g.add(l);
  }
  for (const x of [-0.31, 0.31]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 17 * CELL), mat);
    s.rotation.x = -Math.PI / 2;
    s.position.set(x, 0.002, 0);
    g.add(s);
  }
  g.visible = false;
  return g;
}

let frozen = false, figures = [], motion = params.get('m') || 'idle', way = params.get('w') || 'treadmill', current = null, slow = 1;
// the loop: an oval round the middle of the row, everyone on it spaced evenly, at one ground speed
const OVAL = { half: 1.5, r: 0.9 }, LOOP_V = { walk: 0.55, run: 1.35 };
const ovalLen = 4 * OVAL.half + 2 * Math.PI * OVAL.r;
function ovalAt(s) {
  s = ((s % ovalLen) + ovalLen) % ovalLen;
  const a = 2 * OVAL.half, c = Math.PI * OVAL.r;
  if (s < a) return [-OVAL.half + s, OVAL.r, Math.PI / 2];
  if ((s -= a) < c) { const t = s / OVAL.r; return [OVAL.half + Math.sin(t) * OVAL.r, Math.cos(t) * OVAL.r, Math.PI / 2 + t]; }
  if ((s -= c) < a) return [OVAL.half - s, -OVAL.r, -Math.PI / 2];
  s -= a;
  const t = s / OVAL.r;
  return [-OVAL.half - Math.sin(t) * OVAL.r, -Math.cos(t) * OVAL.r, -Math.PI / 2 + t];
}

function play(f, i) {
  f.seat.visible = motion === 'sit';
  f.belt.visible = (motion === 'walk' || motion === 'run') && way === 'treadmill';
  f.slide.position.set(0, 0, 0);
  if (motion === 'sit') return f.m.sitAt(0, 0.3, 0, 0);
  f.m.root.position.set(0, 0, 0);
  f.m.root.rotation.set(0, 0, 0);
  f.m.seated = false;
  f.s = (i * ovalLen) / figures.length;
  f.m.setState(motion === 'idle' ? 'idle' : 'walk');
  f.m.setGait(null, { run: motion === 'run' });
}
const moving = () => motion === 'walk' || motion === 'run';
function placeLoop() {
  const loop = moving() && way === 'loop';
  const xs = figures.map((f) => f.x0);
  const cx = figures.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
  for (const f of figures) f.g.position.set(loop ? cx : f.x0, 0, loop ? 0 : f.z0);
}

async function show(key) {
  current = key;
  setPressed('scenes', key);
  status.textContent = 'loading';
  for (const f of figures) turn.remove(f.g);
  figures = [];
  tagBox.replaceChildren();
  const sc = CFG.scenes[key];
  const made = await Promise.all(sc.items.map(async (it, i) => {
    const rig = CFG.rigs[it.rig];
    const m = await person(rig);
    const g = new THREE.Group(), slide = new THREE.Group();
    const x0 = (i - (sc.items.length - 1) / 2) * (sc.gap || 0.85);
    const s = seat(), b = belt();
    slide.add(m.root, b);
    g.add(slide, s);
    m.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const tag = document.createElement('div');
    tag.textContent = it.label || rig.label;
    tagBox.appendChild(tag);
    return { g, slide, m, seat: s, belt: b, tag, x0, z0: 0, s: 0, h: rig.height, key: it.rig };
  }));
  if (current !== key) return;
  figures = made;
  for (const f of figures) turn.add(f.g);
  placeLoop();
  figures.forEach((f, i) => { f.g.rotation.y = facing; play(f, i); });
  frameAll();
  status.textContent = `${figures.length} people`;
}

function frameAll(y = 0.55, k = 1) {
  const loop = moving() && way === 'loop';
  const xs = figures.map((f) => f.x0);
  const w = loop ? 2 * (OVAL.half + OVAL.r) + 0.6 : Math.max(...xs) - Math.min(...xs) + 1;
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  controls.target.set(cx, y, 0);
  camera.position.set(cx, y + (loop ? 2.2 : 0.5) * k, (1.2 + w * 1.25) * k);
  controls.update();
}

let facing = 0;
const face = (a) => { facing = a; for (const f of figures) f.g.rotation.y = a; };
// one person close: whole body, face, or feet; side views show their left side (they face image left)
function closeOn(i, part, side) {
  face(side ? -Math.PI / 2 : 0);
  const f = typeof i === 'string' ? figures.find((x) => x.key === i) : figures[i];
  if (!f) return;
  const y = part === 'face' ? f.h * 0.78 : part === 'feet' ? 0.12 : part === 'legs' ? 0.28 : 0.55;
  const d = part === 'face' ? 0.75 : part === 'feet' || part === 'legs' ? 1.1 : 2.4;
  controls.target.set(f.g.position.x, y, 0);
  camera.position.set(f.g.position.x, y + (part === 'face' ? 0.05 : 0.15), d);
  controls.update();
}
const VIEWS = {
  'whole row': () => { face(0); frameAll(); },
  'three-quarter': () => { face(-0.7); frameAll(); },
  'from the side': () => { face(-Math.PI / 2); frameAll(); },
  'from behind': () => { face(Math.PI); frameAll(); },
};
for (const k of CFG.closeups || []) {
  const n = k.toUpperCase();
  VIEWS[`${n}: face`] = () => closeOn(k, 'face', false);
  VIEWS[`${n}: legs from the side`] = () => closeOn(k, 'legs', true);
}

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
function setMotion(m) {
  motion = m;
  setPressed('motions', m);
  placeLoop();
  figures.forEach((f, i) => play(f, i));
  if (moving() && way === 'loop') frameAll();
}
function setWay(w) {
  way = w;
  setPressed('ways', w);
  placeLoop();
  figures.forEach((f, i) => play(f, i));
  frameAll();
}
buttons('scenes', Object.entries(CFG.scenes).map(([k, s]) => [k, s.label]), show);
buttons('motions', [['idle', 'idle'], ['walk', 'walk'], ['run', 'run'], ['sit', 'sit']], setMotion);
buttons('ways', [['treadmill', 'on a treadmill'], ['loop', 'round a loop']], setWay);
buttons('views', Object.keys(VIEWS).map((k) => [k, k]), (k) => VIEWS[k]());
let spin = false;
document.getElementById('spin').onclick = (e) => { spin = !spin; e.target.setAttribute('aria-pressed', String(spin)); };
document.getElementById('slow').onclick = (e) => { slow = slow === 1 ? 0.25 : 1; e.target.setAttribute('aria-pressed', String(slow !== 1)); };

const clock = new THREE.Clock(), v = new THREE.Vector3();
function step(dt) {
  if (spin) for (const f of figures) f.g.rotation.y += dt * 0.6;
  for (const f of figures) {
    if (moving()) {
      const run = motion === 'run';
      if (way === 'treadmill') {
        // forward at the pace their own clip carries them; the slide keeps them where they stand on screen
        const sp = run ? f.m.strides.runV : f.m.strides.walkV * 1.1;
        const r = f.m.root.position;
        r.z += sp * dt;
        f.slide.position.z = -r.z;
        f.belt.position.z = r.z - (((r.z % CELL) + CELL) % CELL);
      } else {
        f.s += LOOP_V[motion] * dt;
        const [x, z, yaw] = ovalAt(f.s);
        f.m.root.position.set(x, 0, z);
        f.m.root.rotation.y = yaw;
      }
    }
    f.m.update(dt);
  }
}
function frame() {
  const dt0 = Math.min(clock.getDelta(), 0.05) * slow;
  if (!frozen) step(dt0);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  controls.update();
  renderer.render(scene, camera);
  for (const f of figures) {
    f.m.root.getWorldPosition(v);
    v.y -= 0.04;
    v.project(camera);
    f.tag.style.left = `${(v.x + 1) * 50}%`;
    f.tag.style.top = `${(1 - v.y) * 50}%`;
    f.tag.style.display = v.z < 1 ? '' : 'none';
  }
  requestAnimationFrame(frame);
}
setPressed('motions', motion);
setPressed('ways', way);
frame();
await show(params.get('s') || Object.keys(CFG.scenes)[0]);
window.__viewer = {
  ready: true, show, view: (k) => VIEWS[k](), closeOn, camera, controls, setMotion, setWay, figures: () => figures,
  // fixed steps for stills (the sheets): advance everyone by n steps of dt
  advance: (n, dt = 1 / 60) => { for (let i = 0; i < n; i++) step(dt); },
  freeze: (on) => { frozen = on; },
};
