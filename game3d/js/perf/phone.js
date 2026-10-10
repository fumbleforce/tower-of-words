// The lighter look on phones (Jørgen, review office-perf: "Fix now, lighter look on phone allowed"). Runs on a place
// once it is built, before the draw-call pass, only on a phone-sized screen; desktop keeps every place as it is.
// Budget: 250 draw calls and 300k triangles a frame, every pass (notes/PERF.md). ?fullphone turns it off.
import { isPhone } from '../settings.js';

// what each place drops on the phone
const LIGHTER = {
  // The office's shadow light is a soft key from high above (scenes/office.js): under the ceiling lamps the furniture's
  // shadows barely show, while drawing it into the shadow map took about 80 batches and 170k triangles a frame.
  // Contact footprints (places/life.js) and the baked light keep it grounded; people (and Eric and Mio, added on
  // entering) still cast theirs, or they'd look like they float.
  office: (place) => {
    const people = new Set(Object.values(place.people || {}).map((p) => p && p.root));
    const skip = (o) => {
      if (people.has(o)) return;
      if (o.isMesh) o.castShadow = false;
      for (const c of o.children) skip(c);
    };
    skip(place.scene);
    // and the props the scenes add later (the copier's sheets, the vending machine's can): 15 sheets landing in the
    // copier's tray drew 30 times a frame with their shadows (issue #136)
    const g = window.__game;
    place.space?.addEventListener('childadded', ({ child }) => {
      if (people.has(child) || child === g?.player?.root || child === g?.mioNpc?.root) return;
      child.traverse((o) => {
        if (o.isMesh) o.castShadow = false;
      });
    });
  },
  // The passengers and the cat are drawn again for every shadow they cast (about 60 draws a frame, each one many small
  // parts). Each has a blob shadow under them (places/train.js), which stays; Eric and Mio still cast theirs.
  train: (place) => {
    for (const p of Object.values(place.people || {}))
      p?.root?.traverse((o) => {
        if (o.isMesh) o.castShadow = false;
      });
  },
};

const on = () => isPhone() && !new URLSearchParams(location.search).has('fullphone');
// whether this is the phone's lighter build (the Blender-built planting's lighter copies, scenes/outdoor/plant-models.js)
export const phoneLighter = on;

// Batches on the phone: the draw-call pass cuts batches at 3 m or 6,000 triangles so what's off screen is culled; on
// a phone each draw costs more than the triangles, so 6 m and 12,000 (the office: 267 to 242 draws a frame, 242k to
// 269k triangles, in the fast test). What casts a shadow is cut by triangles alone, at 8,000: those batches hold the
// big merged meshes' 8 m pieces (phoneTiles), and their meshes are copied into a batch however they're cut.
// Nothing changes in how it looks. An interior (room) gets the same on the desktop: from its overview or the
// third-person camera most of a room is in view, so the finer cut culled little and cost draws (#374: the office's
// desktop overview 582 to about 470 a frame, the same triangles).
// On the phone the shadow-only batches also draw their casters snapped to a 2 cm grid (perf/shadow-proxy.js
// snappedShadow): its shadow map's texels are bigger than that, so what collapses (bevels, small rounded corners, thin
// rods) never showed in a shadow (#374: the forecourt's shadow-only batches 78k to 60k triangles a frame).
export const batchSizes = (room = false) =>
  on()
    ? { span: 6, tris: 12000, cast: { span: Infinity, tris: 8000 }, shadowCell: 0.02 }
    : room
      ? { span: 6, tris: 12000, cast: { span: Infinity, tris: 8000 } }
      : {};

// Big merged meshes cut finer on the phone (perf/tile-geometry.js): its overview looks down at a small part of an
// outdoor place, so what casts a shadow is cut in 8 m squares (sets over 2,000 triangles) and what doesn't in pieces
// of 4,000 triangles, and most of a court's trees and paving stop drawing (#372: the forecourt 213 to 192 draws a
// frame, 398k to 287k triangles). The desktop's third-person camera sees far: pieces of 8,000 keep its draws down.
export const phoneTiles = () => (on() ? { cell: 8, max: 2000, rest: 4000 } : {});

// The medium tier on a phone (what 'auto' picks there, settings.js): no ambient occlusion. GTAO draws the whole scene
// a second time for its normals, which about doubled the phone's draw calls at medium (office 218 to 448 a frame).
// Bloom, the tilt-shift, the outline, the pixel ratio and the sharper shadows stay. High keeps it on phones too.
export const phoneTier = (q) => (on() && q === 1 ? { ao: false } : {});

// A pass that is off (AO on low, and on medium on a phone; bloom on low) keeps its full-screen targets at 1x1, so a
// phone doesn't hold GPU memory for nothing (the S23 lost its 3D view, perf/gl-guard.js). Wraps each pass's setSize;
// call the returned function after turning passes on or off.
export function sizeOnlyWhenOn(passes) {
  const again = passes.map((p) => {
    const set = p.setSize.bind(p);
    let wh = [1, 1];
    p.setSize = (w, h) => {
      wh = [w, h];
      set(p.enabled ? w : 1, p.enabled ? h : 1);
    };
    return () => p.setSize(...wh);
  });
  return () => again.forEach((f) => f());
}

export function lightenForPhone(place, name) {
  const f = LIGHTER[name];
  if (!f || !on()) return false;
  f(place);
  return true;
}
