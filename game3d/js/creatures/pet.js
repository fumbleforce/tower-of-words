// Petting the island's stray cats (Jørgen, 2026-10-04: "I need to be able to pet the other stray cats as well";
// docs/game/places.md, Birds and small animals). Each cat group (catalog.js, kind cat) is a thing to Pet, the way
// Tama is: a paw pin (smaller and paler further off, engine.js Markers), the outline, Pet on E or a tap, and he
// walks to free floor beside her (movement/targets.js approachSpot). He leans down and strokes her; she looks up and leans into his hand with a
// purr (sfx.js purr), then settles (curls up, washes or just sits on) and a while later sits up as before
// (others.js). The first time each cat is petted in a day, one narration line about her. No story, no bonds.
// A cat out of sight, up too high to reach, or with no free floor beside her he can walk to isn't a target. She
// never stands in anyone's way: the cats aren't bodies (movement/shared.js), so crowds and the cast walk on.
import * as THREE from 'three';
import { purr } from '../sfx.js';
import { sim } from '../sim.js';
import { approachSpot } from '../move.js';

const REACH = 0.62, // the highest a cat can sit and still be reached (place units over the floor, before K)
  DISTS = [0.5, 0.42, 0.62, 0.78], // where Eric stands from her (before K)
  SPOT_AGE = 700; // ms an approach spot is kept before it is worked out again

// one line for each cat, the first time in a day: what can't be seen (place:id)
const LINES = {
  'plaza:cat': 'It purrs hard enough that you can feel it in your fingertips.',
  'east_lane:cat': "Its fur is a little damp. It's been somewhere it probably shouldn't.",
  'office_quarter:cat': 'It sniffs your sleeve very thoroughly first, then decides you will do.',
  'dorm_court:cat': "It smells of someone's shampoo. Somebody in the dorm has been letting it in.",
  'sports:cat': 'Its fur is full of grass seeds from the pitch.',
  'shotengai:shop_cat': 'It smells faintly of grilled fish.',
  'shotengai:night_cat': 'Its fur is cool from the evening air.',
  'works:works_cat': 'Your fingers come away grey with dust.',
  'harbour:harbour_cat': 'Its fur is stiff with salt.',
};
const FALLBACK = 'It purrs, a low rumble you feel more than hear.';
// how each coat tends to settle afterwards (sometimes another way)
const SETTLE = { black: 'sleep', tabby: 'wash', ginger: 'sit' };
const told = new Set(); // day:place:id of the cats whose line has been shown

const bell = (k) => Math.sin(Math.PI * Math.min(1, k)) ** 0.7;

// could Eric pet a cat sitting at p: low enough, with free floor beside it (others.js places them where he can)
export function pettable(nav, p, K) {
  if (p.y > REACH * K) return false;
  for (const d of DISTS)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      if (nav.free(p.x + Math.sin(a) * d * K, p.z + Math.cos(a) * d * K, nav.R + 0.02)) return true;
    }
  return false;
}

// place.things entries for a place's cats (creatures/index.js), before the place's markers are built
export function petThings(game, place, name, cats) {
  const K = place.charScale || 1;
  for (const c of cats) {
    const id = 'stray_' + c.def.id,
      rig = c.rig,
      r = c.root;
    let at = { t: -1e9, x: 1e9, z: 1e9, spot: null };
    const high = () => r.position.y > REACH * K;
    const item = {
      label: 'Cat',
      kind: 'thing small',
      verb: 'Pet',
      obj: r,
      rig: () => rig,
      dists: DISTS,
      anchor: (v) => {
        r.getWorldPosition(v);
        v.y += 0.42 * K;
        return v;
      },
      // free floor beside her that Eric can walk to, kept a moment (asked every frame)
      spot: () => {
        const now = performance.now(),
          p = r.position;
        if (now - at.t > SPOT_AGE || Math.hypot(p.x - at.x, p.z - at.z) > 0.01) {
          const s = r.visible && !high() && game.place === place ? approachSpot(game, item) : null;
          at = { t: now, x: p.x, z: p.z, spot: s };
        }
        return at.spot;
      },
      face: () => [r.position.x, r.position.z],
      enabled: () => r.visible && !c.petting && !!item.spot(),
      act: () => pet(game, c, name),
    };
    place.things[id] = item;
  }
}

async function pet(game, c, place) {
  const rig = c.rig,
    W = c.W,
    coat = c.def.coat;
  c.petting = true;
  try {
    const curled = rig.mode === 'sleep';
    if (!curled) rig.set('sit'); // she stops washing
    const p = c.root.getWorldPosition(new THREE.Vector3()).project(game.place.camera);
    purr({ pan: p.x * 0.6 });
    const low = Math.max(0, Math.min(1, 1 - c.root.position.y / (REACH * W.K)));
    game.walker.faceTo(c.root.position.x, c.root.position.z); // (the face hook would turn him to his own spot)
    await game.wait(300);
    await Promise.all([
      game.hooks.gesture({ who: 'eric', kind: 'pet', low }),
      game.wait(350).then(() => game.tween(2.0, (k) => (rig.lean = curled ? 0 : bell(k)))),
    ]);
    rig.lean = 0;
    const way = Math.random() < 0.65 ? SETTLE[coat] || 'sit' : ['sleep', 'wash', 'sit'][(Math.random() * 3) | 0];
    rig.set(curled ? 'sleep' : way);
    c.settled = W.t + 8 + Math.random() * 7;
    const key = `${sim.day}:${place}:${c.def.id}`;
    if (!told.has(key)) {
      told.add(key);
      await game.ui.say(null, LINES[`${place}:${c.def.id}`] || FALLBACK);
    }
  } finally {
    rig.lean = 0;
    c.petting = false;
  }
}
