// Finds: things Eric picks up and keeps on his phone. Photos lie around the day's places, off the main path; a
// paper (the bakery flyer in mailbox 203) comes out of a scene through the `find` hook. Found is the flag
// found_<id> (saved with the flags, so Continue keeps it); the Photos chip and album show them (ui/finds-view.js).
// Their words (titles, captions, the paper's text, the notice board's posts) are the story's: story/finds.js.
// Where they lie and how they look: finds/spots.js and finds/prints.js. The contract: game3d/story/FORMAT.md (Finds).
//   installFinds(game)           the `find` hook; loads story/finds.js
//   addFindSpots(game, place)    a built place gets its prints on the ground and a thing each to pick them up
//   syncFinds(place)             the prints Eric already has stay gone (on every entry, after a load)
//   take(game, id)               picks one up: the flag, the save, the close look
//   hasBoard(id), readBoard(id)   a notice board's posts, held up close (from a thing's act, already a beat)
import * as THREE from 'three';
import { flags } from '../narrative/state.js';
import { reachableNear } from '../movement/navigation.js';
import { save } from '../sim.js';
import { sfx } from '../sfx.js';
import { FINDS, PHOTOS } from './spots.js';
import { printTexture } from './prints.js';
import { showFind, showBoard, refreshFinds, setFindsSource } from '../ui/finds-view.js';

export { FINDS, PHOTOS };
export const FOUND = 'found_';
export const found = (id) => !!flags[FOUND + id];
export const photoCount = () => PHOTOS.filter(found).length;

let text = { photos: {}, papers: {}, boards: {} };
export const findText = () => text;
async function loadText() {
  try {
    const m = await import('../../story/finds.js');
    text = { photos: {}, papers: {}, boards: {}, ...(m.default || {}) };
  } catch {
    /* no text yet: titles fall back to the engine's, boards stay shut */
  }
  refreshFinds();
}

// what the album shows: the engine's defs with the story's words over them
function view(f) {
  const t = (f.kind === 'photo' ? text.photos : text.papers)?.[f.id] || {};
  return {
    id: f.id,
    kind: f.kind,
    print: f.print,
    title: t.title || f.title,
    caption: t.caption || '',
    lines: t.lines,
    found: found(f.id),
  };
}
const PAPERS = Object.values(FINDS).filter((f) => f.kind !== 'photo');
setFindsSource(() => ({
  photos: PHOTOS.map((id) => view(FINDS[id])),
  papers: PAPERS.map(view),
  count: photoCount(),
  total: PHOTOS.length,
}));

export function installFinds(game) {
  game.hooks.find = ({ id }) => take(game, id);
  loadText();
  refreshFinds();
}

export async function take(game, id) {
  const f = FINDS[id];
  if (!f || found(id)) return;
  flags['found_' + id] = true;
  const prop = game.place?.findProps?.[id];
  if (prop) prop.visible = false;
  sfx('ok');
  save(game);
  refreshFinds(id);
  await showFind(id, { fresh: true });
}

export const hasBoard = (id) => (text.boards?.[id] || []).length > 0;
// a thing's act already runs as a beat (gameplay/interactions.js talk), so this only holds the view up
export function readBoard(id) {
  return showBoard(text.boards[id] || []);
}

// the print lying on the ground, named so the draw-call passes leave it alone
function printMesh(f) {
  const tex = new THREE.CanvasTexture(printTexture(f.print));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  // one flat card, one draw call: the picture's white border is in the texture
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.21).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }),
  );
  m.name = `find:${f.id}`;
  m.castShadow = false;
  m.receiveShadow = true;
  return m;
}

// the top of whatever flat thing is under (x, z) (paving, a floor, a rug) up to knee height, so the print lies on it
const ray = new THREE.Raycaster();
function floorAt(place, x, z) {
  place.space.updateMatrixWorld(true);
  const from = place.space.localToWorld(new THREE.Vector3(x, 0.35, z));
  ray.set(from, new THREE.Vector3(0, -1, 0));
  ray.camera = place.camera; // sprites (labels, glows) need one to be tested
  ray.far = 0.6;
  const hit = ray
    .intersectObject(place.space, true)
    .find((h) => h.object.isMesh && h.object.visible && !h.object.isInstancedMesh);
  return hit ? place.space.worldToLocal(hit.point.clone()).y : 0;
}

export function addFindSpots(game, place) {
  place.findProps = place.findProps || {};
  for (const f of Object.values(FINDS)) {
    if (f.place !== place.name || !f.at) continue;
    const [x, z] = f.at;
    const mesh = printMesh(f);
    const y = floorAt(place, x, z);
    mesh.position.set(x, y + 0.004, z);
    mesh.rotation.y = f.turn || 0;
    place.space.add(mesh);
    place.findProps[f.id] = mesh;
    const stand = reachableNear(place.nav, place.start[0], place.start[1], x, z + 0.45) || [x, z + 0.45];
    place.things[f.id] = {
      label: 'Photo',
      kind: 'thing',
      verb: 'Pick up',
      anchor: (v) => place.space.localToWorld(v.set(x, y + 0.5, z)),
      spot: () => stand,
      face: () => [x, z],
      enabled: () => !found(f.id),
      act: () => take(game, f.id),
    };
  }
}

export function syncFinds(place) {
  for (const [id, o] of Object.entries(place.findProps || {})) if (FINDS[id]?.at) o.visible = !found(id);
  refreshFinds();
}
