// Texture avenues showcase (review style-avenues-room): one office corner, the same content in every look, switchable.
//   game3d/showcase.html?look=0|2|3|4|7|8&view=game|close|far&q=0|1|2
// Keys: 0 2 3 4 7 8 pick a look, V changes the view, H hides the panel. ?cap hides the panel for screenshots.
// Each avenue is on its own (never combined), as written in game3d/design/style/AVENUES.md:
//   0 today's look   2 procedural materials   3 decals and wear   4 vertex colour and baked light
//   7 trim sheets    8 small modelled detail
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createRenderer, blob, Q } from '../engine.js';
import { makePost } from '../post.js';
import { RoomCam } from '../cam.js';
import { liveScreens } from '../props.js';
import { loadMio } from '../mio.js';
import { loadEric } from '../avatar.js';
import { buildRoom, R, WIN, GRADE, SPOTS } from './room.js';
import { buildDecals } from './decals.js';
import { trimRoom } from './trim.js';
// avenues 2, 4 and 8 are the game's own code (js/look/), the same the places use
import { applyLook, LOOK } from '../look/index.js';
import { PROC } from '../look/procedural.js';

export const LOOKS = {
  0: { key: '0', name: 'Today', note: 'The current look: one colour per face, the office lights and colour grade.' },
  2: { key: '2', name: 'Procedural', note: 'Avenue 2. Tile, carpet, plaster, metal, laminate and fabric computed in the shader from world position. No textures.' },
  3: { key: '3', name: 'Decals', note: 'Avenue 3. Scuffs, a worn path, a coffee ring, tape marks, a water mark and stickers from one atlas, drawn in one pass.' },
  4: { key: '4', name: 'Vertex colour', note: 'Avenue 4, the softer version in the game (?bake=hard: the first one). Darker corners and feet, warmer toward the window, a floor gradient, slightly different tints on repeated things.' },
  7: { key: '7', name: 'Trim sheet', note: 'Avenue 7. One atlas of edge detail on made things: panels and screws, vents, rubber edges, skirting, keys, labels, drawer fronts.' },
  8: { key: '8', name: 'Modelled detail', note: 'Avenue 8. Chamfers, frames and skirting in relief, cables, handles and hinges, a mug rim, separate paper sheets.' },
};
const VIEWS = ['game', 'close', 'far'];
const K = 1.18;   // people scale in the office

const canvas = document.getElementById('c');
const renderer = createRenderer(canvas);
renderer.info.autoReset = false;
const size = () => [window.innerWidth, window.innerHeight];
const phone = () => { const [w, h] = size(); return w / h < 0.8 || w < 640; };
const tier = Q.has('q') ? +Q.get('q') : phone() ? 1 : 2;

let cur = null, look = LOOKS[Q.get('look')] ? +Q.get('look') : 0, view = VIEWS.includes(Q.get('view')) ? Q.get('view') : 'game';
let eric, mio;

// ---------- merge static meshes per material (as the game's perf pass does), so draw counts compare fairly ----------
const KEEP = new Set(['screen', 'decal', 'glass']);
function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const groups = new Map(), drop = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || KEEP.has(o.userData.surf) || o.material.transparent || Array.isArray(o.material)) return;
    const g = o.geometry, attrs = Object.keys(g.attributes).sort().map((k) => k + g.attributes[k].itemSize).join(',');
    const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}|${attrs}|${g.index ? 1 : 0}`;
    if (!groups.has(key)) groups.set(key, { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, list: [] });
    groups.get(key).list.push(o);
  });
  let n = 0;
  for (const gr of groups.values()) {
    if (gr.list.length < 2) continue;
    const geos = gr.list.map((o) => { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); for (const k of Object.keys(g.morphAttributes)) delete g.morphAttributes[k]; return g; });
    const merged = mergeGeometries(geos); geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, gr.mat); m.castShadow = gr.cast; m.receiveShadow = gr.recv; m.userData.surf = gr.list[0].userData.surf;
    root.add(m); drop.push(...gr.list); n++;
  }
  for (const o of drop) { o.parent.remove(o); o.geometry.dispose(); }
  return n;
}

// the look patches materials in place, and props.js shares materials by colour: the room gets its own copies first,
// so one look doesn't leak into the next
function ownMaterials(root) {
  const copy = new Map();
  root.traverse((o) => { if (o.isMesh && o.material && !Array.isArray(o.material) && !o.userData.keep) { if (!copy.has(o.material)) copy.set(o.material, o.material.clone()); o.material = copy.get(o.material); } });
}
function withLook(scene, root, n) {
  ownMaterials(root);
  PROC.on = true;
  const winC = new THREE.Vector3((WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, R.Z0);
  return applyLook({ scene, space: root }, null, {
    surf: n === 2, bake: n === 4 ? (Q.get('bake') || 'soft') : '0', tier, warmAt: winC, floorGrad: { z0: R.Z0, z1: R.Z1 },
  });
}

function dispose(c) {
  if (!c) return;
  c.root.traverse((o) => { if (o.isMesh && !o.userData.keep) o.geometry.dispose(); });
  c.post.composer.dispose?.();
}

async function build(n) {
  const t0 = performance.now();
  LOOK.detail = n === 8;   // props.js builds the detailed props only for look 8
  const { scene, root, sun } = buildRoom({ detail: n === 8 });
  let extra = '';
  if (n === 2) withLook(scene, root, 2);
  if (n === 3) root.add(buildDecals());
  if (n === 4) extra = withLook(scene, root, 4).bake.meshes + ' meshes baked';
  if (n === 7) extra = trimRoom(root).n + ' meshes on the trim sheet';
  mergeStatic(root);
  // the two characters, as in the game (Meshy models, blob shadows)
  for (const [c, [x, z, ry]] of [[eric, SPOTS.eric], [mio, SPOTS.mio]]) { c.root.position.set(x, 0, z); c.root.rotation.y = ry; c.root.scale.setScalar(K); root.add(c.root); }
  const cam = new RoomCam({ elev: 51, fov: 24 });
  const place = { scene, camera: cam.camera, cam, grade: GRADE, sun };
  const post = makePost(renderer, place, tier);
  const old = cur;
  cur = { n, scene, root, cam, post, place, sun, buildMs: performance.now() - t0, extra };
  if (old) { old.root.remove(eric.root, mio.root); dispose(old); }
  resize();
  setView(view);
  return cur;
}

function fitGame(aspect) {
  const { X0, X1, Z0, Z1, WH } = R, V = (x, y, z) => new THREE.Vector3(x, y, z);
  cur.cam.fit(aspect, [V(X0, 0, Z1), V(X1, 0, Z1), V(X0, WH, Z0), V(X1, WH, Z0), V(X0, 0, Z0), V(X1, 0, Z1)], V(0, 0, 0), { limX: 0.96, limY: 0.92 });
}
function setView(v) {
  view = v;
  const [w, h] = size(), aspect = w / h, cam = cur.cam;
  fitGame(aspect);
  if (v === 'close') { cam.target.set(0.5, 0.3, -1.05); cam.dist = cam.fitDist / (phone() ? 1.7 : 2.2); cam.place(); }
  if (v === 'far') {
    // the desktop game's zoom: the camera distance that fits the whole office floor (places/office.js), on this room
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    cam.fit(aspect, [V(-6.9, 0, 0), V(6.9, 0, 0), V(0, 0.6, -6.4 - 0.1), V(0, 0, 6.3)], V(0, 0, 0.1), { limY: 1.0, limX: 1.0 });
  }
  syncUrl(); syncUi();
}

function resize() {
  const [w, h] = size();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cur ? cur.post.dpr(tier) : 2));
  renderer.setSize(w, h);
  if (cur) { cur.post.composer.setPixelRatio(renderer.getPixelRatio()); cur.post.composer.setSize(w, h); cur.post.setQuality(tier); }
}
window.addEventListener('resize', () => { if (!cur) return; resize(); setView(view); });

// ---------- frame ----------
let last = performance.now(), t = 0, fpsN = 0, fpsT = 0, fps = 0, cpu = 0;
const stats = { calls: 0, tris: 0 };
function frame(now) {
  requestAnimationFrame(frame);
  if (!cur) return;
  const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
  if (!Q.has('cap')) { eric.update?.(dt); mio.update?.(dt); liveScreens.update(t); }
  render();
  fpsN++; fpsT += dt; if (fpsT > 1) { fps = fpsN / fpsT; fpsN = 0; fpsT = 0; syncPerf(); }
}
function render() {
  const a = performance.now();
  renderer.info.reset();
  renderer.shadowMap.needsUpdate = true;
  cur.post.render();
  stats.calls = renderer.info.render.calls; stats.tris = renderer.info.render.triangles;
  cpu = cpu * 0.9 + (performance.now() - a) * 0.1;
}

// ---------- panel ----------
const ui = document.getElementById('panel');
function syncUrl() { const q = new URLSearchParams(location.search); q.set('look', look); q.set('view', view); history.replaceState(null, '', '?' + q.toString()); }
function syncUi() {
  if (!ui) return;
  ui.querySelectorAll('[data-look]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.look === look)));
  ui.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  ui.querySelector('.note').textContent = LOOKS[look].note;
}
function syncPerf() {
  const el = ui && ui.querySelector('.perf'); if (!el || !cur) return;
  el.textContent = `${stats.calls} draws · ${(stats.tris / 1000).toFixed(0)}k triangles · ${fps.toFixed(0)} fps · built in ${cur.buildMs.toFixed(0)} ms · quality ${tier}`;
}
async function pick(n) { if (n === look && cur && cur.n === n) return; look = n; syncUi(); ui && ui.classList.add('busy'); await build(n); ui && ui.classList.remove('busy'); syncPerf(); }
if (ui) {
  const looks = ui.querySelector('.looks'), views = ui.querySelector('.views');
  for (const [n, L] of Object.entries(LOOKS)) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.look = n;
    b.innerHTML = `<span class="k">${L.key}</span>${L.name}`; b.addEventListener('click', () => pick(+n)); looks.appendChild(b);
  }
  for (const v of VIEWS) { const b = document.createElement('button'); b.type = 'button'; b.dataset.view = v; b.textContent = { game: 'Game camera', close: 'Close', far: 'Desktop zoom' }[v]; b.addEventListener('click', () => setView(v)); views.appendChild(b); }
  if (Q.has('cap')) ui.hidden = true;
}
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (LOOKS[e.key]) pick(+e.key);
  else if (e.key === 'v' || e.key === 'V') setView(VIEWS[(VIEWS.indexOf(view) + 1) % VIEWS.length]);
  else if ((e.key === 'h' || e.key === 'H') && ui) ui.hidden = !ui.hidden;
});

// ---------- hooks for the screenshot tool ----------
window.__show = async (n, v = 'game') => { if (!cur || cur.n !== n) { look = n; await build(n); } setView(v); for (let i = 0; i < 3; i++) render(); return { ...stats, build: cur.buildMs, extra: cur.extra }; };
// the room's rectangle on screen (CSS px) with a margin, to crop the desktop-zoom shot
window.__roomRect = () => {
  const { X0, X1, Z0, Z1, WH } = R, v = new THREE.Vector3(), [w, h] = size();
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const x of [X0, X1]) for (const z of [Z0, Z1]) for (const y of [0, WH]) {
    v.set(x, y, z).project(cur.cam.camera); const sx = (v.x + 1) / 2 * w, sy = (1 - v.y) / 2 * h;
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
  }
  const m = 24; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w, x1 + m); y1 = Math.min(h, y1 + m);
  return { x: Math.round(x0), y: Math.round(y0), width: Math.round(x1 - x0), height: Math.round(y1 - y0) };
};
// average render time over n frames, waiting for the GPU each frame (on this machine's GPU: a ceiling, not a phone)
window.__bench = (n = 60) => { const gl = renderer.getContext(); render(); gl.finish(); const a = performance.now(); for (let i = 0; i < n; i++) { render(); gl.finish(); } return { ms: (performance.now() - a) / n, ...stats }; };

async function boot() {
  [eric, mio] = await Promise.all([loadEric(), loadMio({ height: 1.12 })]);
  for (const c of [eric, mio]) { c.setState?.('idle'); c.update?.(0.6); c.root.add(blob(0.55, 0.4)); c.root.traverse((o) => { if (o.isMesh) { o.userData.surf = 'char'; o.userData.keep = true; } }); }
  await build(look);
  requestAnimationFrame(frame);
  for (let i = 0; i < 3; i++) render();
  syncPerf();
  window.__done = true;
}
boot().catch((e) => { console.error(e); document.body.insertAdjacentHTML('beforeend', `<pre class="err">${e.message}\n${e.stack}</pre>`); });
