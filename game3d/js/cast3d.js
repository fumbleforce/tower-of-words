// The 3D cast from the Meshy workflow (tools/characters/, assets/characters/<id>/), wrapped so the scenes can treat
// them like the code-built people of cast.js. The Meshy chibis (chibi.js) come in here when that look is on: their
// files load once, and every place that builds the person gets its own copy.
import * as THREE from 'three';
import { HIP } from './train/people.js';
import { SEAT_Y } from './train/car.js';
import { loadMeshy } from './avatar.js';
import { chibiFiles, chibiFrom, CHIBI_CAST } from './chibi.js';

// Standing heights next to Mio (1.12) and Eric (1.2). While a model waits for Jørgen's approval it only loads with
// ?cast3d=<id>[,<id>]; approved ids go in CAST3D_ON.
export const CAST3D = { mori: 1.2, kuro: 1.12 };
const CAST3D_ON = [];
const Q3 = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const want3 = [...CAST3D_ON, ...(Q3.get('cast3d') || '').split(',')].filter(
  (id) => CAST3D[id] && !CHIBI_CAST.includes(id),
);
const PRE3 = {};
const warn = (id) => (e) => {
  console.warn('3D cast', id, e);
  return null;
};
await Promise.all([
  ...want3.map(async (id) => (PRE3[id] = await loadMeshy(id, { height: CAST3D[id] }).catch(warn(id)))),
  ...CHIBI_CAST.map(async (id) => (PRE3[id] = await chibiFiles(id).catch(warn(id)))),
]);
// the ids cast.js asks for here first
export const CAST3D_IDS = [...new Set([...Object.keys(CAST3D), ...CHIBI_CAST])];
// Wrap a loaded Meshy character so the scenes can treat it like a chibi rig: the pose helpers (sit, walkPose, arms...)
// switch its clips instead, the chibi parts they write to are harmless stand-ins (the head follows the real head bone,
// for labels and look-at), `seated` picks sit or idle, and it updates itself each frame it's drawn.
export function meshyPerson(m) {
  const O = () => new THREE.Object3D();
  m.legs = [O(), O()];
  m.knees = [O(), O()];
  m.arms = [O(), O()];
  m.torso = O();
  m.hips = O();
  m.hips.position.y = HIP;
  let hb = null;
  m.model.traverse((o) => {
    if (!hb && o.isBone && /^head$/i.test(o.name)) hb = o;
  });
  m.head = O();
  (hb || m.root).add(m.head);
  m.headK = O();
  let last = null,
    sk = null;
  m.model.traverse((o) => {
    if (!sk && o.isSkinnedMesh) sk = o;
  });
  // on the game's clock, which moves them (a sped-up or paused game, a slow frame): on the wall clock their steps
  // fell behind or ran ahead of their feet; the wall clock only where there is no game (a viewer)
  sk.onBeforeRender = () => {
    const G = globalThis.__game,
      now = G ? G.t : performance.now() / 1000;
    if (last !== null && now >= last && now - last < 0.004) return;
    const dt = last !== null && now > last ? Math.min(G ? 0.5 : 0.1, now - last) : 0;
    last = now;
    if (m.seated && m.state !== 'sit') m.sitHere();
    else if (m.seated === false && m.state === 'sit') {
      m.setState('idle');
      m.root.position.y = 0;
    }
    m.update(dt);
  };
  // seat the hips on the chair under the root (train and office seats: SEAT_Y), keeping x, z and facing
  m.sitHere = () => {
    m.sitAt(m.root.position.x, SEAT_Y, m.root.position.z, m.root.rotation.y);
  };
  return m;
}
export const meshy3 = (id) => {
  const p = PRE3[id];
  if (!p) return null;
  return meshyPerson(CHIBI_CAST.includes(id) ? chibiFrom(p) : p);
};
