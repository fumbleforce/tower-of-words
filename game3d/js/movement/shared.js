import * as THREE from 'three';

export const ACCEL = 5.5; // m/s² from standing

export const BRAKE = 7.5; // m/s² when stopping (keys released, or the end of a path)

export const TURN = 9; // rad/s at most

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
const _v = new THREE.Vector3();

// every visible person in the place, in the place's walk-grid space: { id, rig, root, x, z, r, seated }
export function bodies(game) {
  const P = game && game.place;
  if (!P || !P.space) return [];
  const out = [],
    seen = new Set(),
    K = P.charScale || 1;
  const add = (id, r) => {
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
    out.push({
      id,
      rig: r,
      root: r.root,
      x: _v.x,
      z: _v.z,
      r: (id === 'tama' ? 0.12 : seated ? BODY * 0.8 : BODY) * K,
      seated,
    });
  };
  add('eric', game.player);
  add('mio', game.mioNpc);
  for (const [id, r] of Object.entries(P.people || {})) add(id, r);
  return out;
}

export function rigOf(game, obj) {
  if (!game) return null;
  if (game.player && game.player.root === obj) return game.player;
  if (game.mioNpc && game.mioNpc.root === obj) return game.mioNpc;
  for (const r of Object.values((game.place && game.place.people) || {})) if (r && r.root === obj) return r;
  return null;
}
