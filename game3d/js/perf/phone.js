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

// Bigger batches on the phone: the draw-call pass cuts batches at 3 m or 6,000 triangles so what's off screen is
// culled; on a phone each draw costs more than the triangles, so 6 m and 12,000 (the office: 267 to 242 draws a
// frame, 242k to 269k triangles, in the fast test). Nothing changes in how it looks.
export const phoneBatch = () => (on() ? { span: 6, tris: 12000 } : {});

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
