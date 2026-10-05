import * as THREE from 'three';
import { PLAYER_ID } from '../mc.js';

export const ACCEL = 5.5; // m/s² from standing

export const BRAKE = 7.5; // m/s² when stopping (keys released, or the end of a path)

export const TURN = 9; // rad/s at most

// the game loop's clock, which scripted walks keep to: a frame covers at most FRAME_MAX s of real time (times the time
// scale), in steps of at most STEP_MAX game seconds. Keep equal to the two numbers in main.js frame().
export const FRAME_MAX = 0.1;

export const STEP_MAX = 0.05;

export const CORNER = 0.32; // start turning toward the next waypoint this far before a corner

export const BODY = 0.24; // a person's radius (place units, times the character scale): two people stand about a body apart

export const TALK = 0.66; // talking distance, centre to centre (times the character scale)

export const angDiff = (a, b) => {
  const d = a - b;
  return Math.atan2(Math.sin(d), Math.cos(d));
};

// one smooth turn step: eases in on the target, never faster than the turn rate, and always finishes
export function turnToward(cur, target, dt, rate = TURN) {
  const d = angDiff(target, cur),
    a = Math.abs(d);
  if (a < 1e-4) return target;
  const step = Math.min(a, rate * dt, Math.max(a * (1 - Math.exp(-dt * 12)), 0.6 * dt));
  return cur + Math.sign(d) * step;
}

// ---------- who is where ----------
const _v = new THREE.Vector3(),
  _f = new THREE.Vector3(),
  _q = new THREE.Quaternion(),
  _q2 = new THREE.Quaternion();

const KNEES = 0.15; // how far in front of a seated person's hips their circle sits (their knees), times the scale

const CAT = 0.18; // the cat's radius: room for her whole body, so nobody stands on her

// every visible person in the place, in the place's walk-grid space: { id, rig, root, x, z, r, seated, crowd }
// (crowd: a passer-by from place.crowd, who gives way to Eric and the story's people)
export function bodies(game) {
  const P = game && game.place;
  if (!P || !P.space) return [];
  const out = [],
    seen = new Set(),
    K = P.charScale || 1;
  const add = (id, r, crowd = false) => {
    if (!r || !r.root || seen.has(r.root) || !r.root.visible || !r.root.parent) return;
    seen.add(r.root);
    r.root.getWorldPosition(_v);
    P.space.worldToLocal(_v);
    // the chibi cast's sit() lifts the root onto the seat without a flag
    const seated = !!r.seated || (!!r.hips && r.root.position.y > 0.05);
    // Mio's seat pose moves her root off her hips; where she really is, is the root plus that offset
    if (seated && r.sitOff) {
      _v.x += r.sitOff.x;
      _v.z += r.sitOff.z;
    }
    // someone seated takes up the floor in front of the seat too, where their knees and feet are: their circle sits
    // KNEES forward of the hips, so nobody stands in their lap
    if (seated) {
      const f = _f
        .set(0, 0, 1)
        .applyQuaternion(r.root.getWorldQuaternion(_q))
        .applyQuaternion(P.space.getWorldQuaternion(_q2).invert()); // the way they face, in the place's space
      f.y = 0;
      const fl = f.length() || 1;
      _v.x += (f.x / fl) * KNEES * K;
      _v.z += (f.z / fl) * KNEES * K;
    }
    out.push({
      id,
      rig: r,
      root: r.root,
      x: _v.x,
      z: _v.z,
      r: (id === 'tama' ? CAT : seated ? BODY * 0.8 : BODY) * K,
      seated,
      crowd,
    });
  };
  add(PLAYER_ID, game.player);
  add('mio', game.mioNpc);
  for (const [id, r] of Object.entries(P.people || {})) add(id, r);
  (P.crowd || []).forEach((r, i) => add('crowd' + i, r, true)); // passers-by (the lobby's commuters)
  return out;
}

export function rigOf(game, obj) {
  if (!game) return null;
  if (game.player && game.player.root === obj) return game.player;
  if (game.mioNpc && game.mioNpc.root === obj) return game.mioNpc;
  for (const r of Object.values((game.place && game.place.people) || {})) if (r && r.root === obj) return r;
  return null;
}
