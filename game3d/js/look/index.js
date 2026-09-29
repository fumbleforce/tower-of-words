// The world look on top of the flat colours (review style-avenues-room: Jørgen picked 2, 4 and 8):
//   2  procedural surface patterns on every model, props included (look/procedural.js), behind
//      Settings > Graphics > Surface detail
//   4  vertex colour and baked light, a softer version (look/bake.js)
//   8  small modelled detail in the props (look/detail.js, through props.js)
// applyLook(place, game) runs once per place, after it's built (main.js prepare(), before the draw-call pass scans
// it). It patches materials in place and adds a vertex attribute; no material or mesh is swapped, so the places'
// own code (fades, lift clipping, colour changes) and js/perf/batch.js work as before.
// Flags for comparison shots: ?plainlook, ?surf=0|1, ?bake=0|soft|hard, ?detail=0 (look/flags.js).
import * as THREE from 'three';
import { LOOK } from './flags.js';
import { patchMaterial, setSurface, setProcedural, setDetail, takes, PROC } from './procedural.js';
import { bakeLight, SOFT, HARD } from './bake.js';
import { PAL } from '../props.js';
import { settings, onSettings, qualityTier } from '../settings.js';

export { LOOK };
const Q = new URLSearchParams(location.search);
export const surfacesOn = () => (LOOK.surf != null ? LOOK.surf : settings.surfaces !== false);
PROC.on = surfacesOn();
const scenes = new Set();
const tierNow = () => (Q.has('q') ? +Q.get('q') : ({ low: 0, medium: 1, high: 2 })[qualityTier()] ?? 1);
onSettings((k) => {
  if (k === 'surfaces') setProcedural(surfacesOn(), [...scenes]);
  if (k === 'quality') setDetail(tierNow());
});

// ---------- what each surface is made of ----------
// by material colour (the palette in props.js and the colours the places use), then by shape
const hx = (c) => new THREE.Color(c).getHex();
const BY_COLOUR = new Map(Object.entries({
  [PAL.wall]: 'plaster', [PAL.wallInner]: 'plaster', [PAL.wallTop]: 'wallcap', [PAL.skirting]: 'plastic', [PAL.trim]: 'paint',
  [PAL.door]: 'door', [PAL.doorFrame]: 'paint', [PAL.doorWin]: 'glass',
  [PAL.bench]: 'fabric', [PAL.benchBack]: 'fabric', [PAL.benchFrame]: 'metal',
  [PAL.metal]: 'metal', [PAL.dark]: 'plastic', [PAL.charcoal]: 'plastic',
  [PAL.planter]: 'ceramic', [PAL.soil]: 'soil',
  [PAL.desk]: 'laminate', [PAL.deskTop]: 'laminate', [PAL.deskLeg]: 'metal', [PAL.drawer]: 'metal',
  [PAL.chair]: 'fabric', [PAL.chairDark]: 'fabric', '#2a2f3e': 'fabric', [PAL.monitor]: 'plastic',
  [PAL.paper]: 'paper', [PAL.box]: 'card', [PAL.boxDark]: 'card', [PAL.floorDark]: 'stone',
  '#a3a9b2': 'metal', '#9aa0a9': 'drawerfront', '#8a909a': 'metal', '#858b95': 'metal', '#c9cdd2': 'handle', '#cfd1d4': 'plastic',
  '#e6e7e8': 'plastic', '#d8dadc': 'plastic', '#4a5b78': 'ceramic', '#e9e6df': 'ceramic', '#7aa0c8': 'ceramic', '#c96a5a': 'ceramic',
  '#9cc39a': 'ceramic', '#e2c26a': 'ceramic', '#b3aea5': 'ceramic', '#8d8f93': 'stone', '#525862': 'door',
  '#4a6490': 'binder', '#6a7a8c': 'binder', '#3d4d6b': 'binder', '#7f8ea3': 'binder', '#56657e': 'binder', '#5b6f86': 'binder',
  '#8b939e': 'concrete', '#737c88': 'concrete',
}).map(([k, v]) => [hx(k), v]));
const _b = new THREE.Box3(), _s = new THREE.Vector3();
function surfOf(o) {
  if (o.userData.surf) return o.userData.surf;
  const m = o.material, c = m.color ? m.color.getHex() : -1;
  if (BY_COLOUR.has(c)) return BY_COLOUR.get(c);
  if (m.vertexColors) return 'plastic';   // leaves and other hull-coloured things: a light grain
  _b.setFromObject(o); _b.getSize(_s);
  if (_s.y < 0.12 && _s.x * _s.z > 2) return 'concrete';                                      // a floor or a platform
  if (Math.max(_s.x, _s.z) > 1.2 && _s.y > 0.8 && Math.min(_s.x, _s.z) < 0.35) return 'plaster'; // a wall
  return 'paint';
}
const FLOOR = new Set(['tile', 'grout', 'carpet', 'stone']), SHELL = new Set(['plaster', 'wallcap', 'skirting']);

// ---------- which meshes take part ----------
function eligible(o) {
  if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || o.userData.noLook) return false;
  const m = o.material;
  if (!takes(m) || m.userData.noLook || m.transparent || !m.colorWrite || m.map || m.emissiveMap) return false;
  if (m.emissive && m.emissiveIntensity > 0.25 && m.emissive.getHex() !== 0) return false;   // lamps, screens, signs
  const g = o.geometry;
  return !!(g && g.attributes.position && g.attributes.normal);
}

// place: { scene, space, people, sun, floorY } (a game place), or { scene } with options for the showcase room.
// opt: surf (bool, default the flag/setting; false leaves the surface patterns out), bake ('soft' | 'hard' | '0'),
//      exclude (roots to leave alone), warmAt, floorGrad (bakeLight), tier
export function applyLook(place, game = null, opt = {}) {
  const t0 = performance.now();
  if (LOOK.surf === false && LOOK.bake === '0' && opt.surf == null && opt.bake == null) return null;   // ?plainlook: the look before
  const scene = place.scene, top = place.space || scene;
  scenes.add(scene);
  setDetail(opt.tier ?? tierNow());
  const bakeMode = opt.bake ?? LOOK.bake;
  const doSurf = opt.surf ?? true;
  const skip = new Set(opt.exclude || []);
  for (const r of Object.values(place.people || {})) if (r && r.root) skip.add(r.root);
  if (game) for (const r of [game.player, game.mioNpc]) if (r && r.root) skip.add(r.root);
  const list = [];
  (function walk(o) { if (skip.has(o) || o.userData.noLook) return; if (o.isMesh && !o.userData.lookDone && eligible(o)) list.push(o); for (const c of o.children) walk(c); })(scene);
  scene.updateMatrixWorld(true);

  // what each mesh is made of; a geometry shared by several meshes gets a copy per mesh (each carries its own)
  const surf = new Map(), seenGeo = new Set();
  for (const o of list) {
    surf.set(o, surfOf(o));
    if (seenGeo.has(o.geometry)) o.geometry = o.geometry.clone();
    seenGeo.add(o.geometry);
  }
  const mats = new Set(list.map((o) => o.material));

  // baked light: everything but glass (the window panes keep their tint)
  let bk = null;
  if (bakeMode !== '0') {
    const meshes = list.filter((o) => surf.get(o) !== 'glass');
    const owner = (m) => { let o = m; while (o.parent && o.parent !== top && o.parent !== scene) o = o.parent; return o; };
    const sun = place.sun;
    const warmDir = opt.warmAt ? null : sun ? sun.position.clone().sub(sun.target ? sun.target.position : new THREE.Vector3()).normalize() : null;
    bk = bakeLight(meshes, {
      strength: bakeMode === 'hard' ? HARD : SOFT, floorY: place.floorY || 0, warmAt: opt.warmAt, warmDir, floorGrad: opt.floorGrad,
      isFloor: (m) => FLOOR.has(surf.get(m)) || (_b.setFromObject(m).getSize(_s).y < 0.12 && _s.x * _s.z > 2),   // by shape too: the train's floor
      isShell: (m) => SHELL.has(surf.get(m)), owner, repeat: () => true,
    });
  }
  for (const o of list) {
    if (doSurf) setSurface(o.geometry, surf.get(o), o.userData.tile);
    o.userData.lookDone = true;
  }
  let n = 0;
  for (const m of mats) if (patchMaterial(m)) n++;
  const ms = performance.now() - t0;
  place.look = { meshes: list.length, materials: mats.size, patched: n, bake: bk, ms: Math.round(ms) };
  return place.look;
}
