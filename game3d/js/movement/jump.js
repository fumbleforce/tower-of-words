// Jumping, the classic platformer way (Jørgen, 2026-10-12: "lets add satisfying jumping into the game, like classic
// mario"). Space while walking, or with nothing in reach, and the Jump button on a phone. The jump is the feel of the
// old games: he leaves the ground at once, holding the button carries him higher (a tap is a hop), he hangs a moment
// at the top and comes down faster than he went up; a running jump goes a little higher. Stretched on the way up,
// squashed on landing with a puff of dust, the legs held mid-stride in the air, and the shadow stays on the ground,
// shrinking as he rises. A press just before landing jumps again as he lands.
// Only the body rises: a group between his root and his model (installJump makes it), so the walk grid, seating,
// the camera and everyone's "is he standing" checks never see a jump. Walls and people still stop him; he can't jump
// onto or over anything, except a parapet he jumps at, which is a fall (falls.js).
//   const jump = createJump(game, { shadow, canJump, onAir })   shadow: the blob under him (engine.js blob); jump-input.js
//                                                         makes it, with the key, the phone's button and the falls
//   jump.press() / jump.release()     the button, from a key or a tap
//   jump.update(dt)                   each frame, after the walker
//   jump.animRate                     what his animation clock runs at (slow in the air: the legs hold their pose)
//   jump.air                          off the ground
import * as THREE from 'three';
import { dust, jumpSound, landSound } from './jump-fx.js';
import { RUN } from './walker.js';

const HIGH = 0.78, // the top of a held jump, m (times the character scale)
  RISE_T = 0.34, // and how long it takes to get there
  V0 = (2 * HIGH) / RISE_T,
  G = (2 * HIGH) / (RISE_T * RISE_T),
  CUT = 4, // gravity once the button is let go on the way up: a tap is a hop
  FALL = 1.9, // gravity coming down
  HANG = 0.55, // gravity near the top while held
  HANG_V = 1.1, // m/s either side of the top that counts as near it
  TERMINAL = 9, // m/s, the fastest he falls
  RUN_BOOST = 0.14, // a running jump's extra lift, at full run
  BUFFER = 0.13, // s: a press this long before landing jumps on landing
  LEAN = 0.16; // rad, his lean into a moving jump

export function createJump(game, { shadow, canJump = () => true, onAir } = {}) {
  const P = game.player,
    root = P.root;
  // the group the body rises in: everything on him but his shadow
  const hop = new THREE.Group();
  hop.name = 'jump';
  for (const c of [...root.children]) if (c !== shadow) hop.add(c);
  root.add(hop);
  const shadowK = shadow ? { s: shadow.scale.x, o: shadow.material.opacity } : null;

  const s = {
    h: 0,
    vy: 0,
    air: false,
    held: false,
    buffer: 0,
    sq: 0,
    sqv: 0,
    lean: 0,
    down: false, // the button itself, held or not
  };
  const scale = () => root.scale.x || 1;
  const speedK = () => {
    const w = game.walker;
    return w ? THREE.MathUtils.clamp(w.v / (w.speed * RUN), 0, 1) : 0;
  };

  function takeoff() {
    const k = scale();
    s.air = true;
    s.held = s.down; // a press buffered before landing and let go since is a hop
    s.buffer = 0;
    s.vy = V0 * k * (1 + RUN_BOOST * speedK());
    s.sqv += 5.5; // the stretch as he leaves the ground
    dust(game, root, 0.6);
    jumpSound(1 + 0.1 * speedK());
  }
  function land() {
    const k = scale(),
      impact = Math.min(1.4, -s.vy / (V0 * k));
    s.air = false;
    s.h = 0;
    s.vy = 0;
    s.sqv -= 7 * impact; // the squash
    dust(game, root, 0.7 + 0.5 * impact);
    landSound(impact);
    if (s.buffer > 0) takeoff(); // pressed just before landing: straight back up
  }
  function reset() {
    Object.assign(s, {
      h: 0,
      vy: 0,
      air: false,
      held: false,
      buffer: 0,
      sq: 0,
      sqv: 0,
      lean: 0,
    });
    pose();
  }
  function pose() {
    hop.position.y = s.h;
    // squash and stretch about his feet, keeping his volume
    const sy = 1 + THREE.MathUtils.clamp(s.sq, -0.35, 0.35),
      sx = 1 / Math.sqrt(sy);
    hop.scale.set(sx, sy, sx);
    hop.rotation.x = s.lean;
    if (shadow) {
      const k = scale(),
        f = 1 / (1 + (s.h / k) * 1.1);
      shadow.scale.setScalar(shadowK.s * (0.55 + 0.45 * f));
      shadow.material.opacity = shadowK.o * (0.45 + 0.55 * f);
    }
  }

  const api = {
    get air() {
      return s.air;
    },
    get height() {
      return s.h;
    },
    // his animation clock: nearly still in the air, so the walk or run holds the stride he left the ground in
    get animRate() {
      return s.air || game.falling ? 0.12 : 1;
    },
    press() {
      if (!canJump()) return false;
      s.down = true;
      if (s.air) s.buffer = BUFFER;
      else takeoff();
      return true;
    },
    release() {
      s.held = s.down = false;
    },
    // something else took him (a scene, a trip, a seat): back on the ground, no squash left over
    reset,
    update(dt) {
      if (game.falling) return; // a fall moves him itself (falls.js)
      if (game.walker) game.walker.air = s.air; // his grip in the air (walker.js)
      if (s.buffer > 0) s.buffer -= dt;
      const k = scale();
      if (s.air) {
        if (P.seated || P.scripted || game.busy) {
          if (!game.falling) reset();
          return;
        }
        let g = G * k;
        if (s.vy > 0 && !s.held) g *= CUT;
        else if (s.held && Math.abs(s.vy) < HANG_V * k) g *= HANG;
        else if (s.vy < 0) g *= FALL;
        s.vy = Math.max(-TERMINAL * k, s.vy - g * dt);
        s.h += s.vy * dt;
        if (s.h <= 0) land();
        else if (onAir?.(s.h)) return; // in the air he went over something, and falls (falls.js)
      }
      // the squash-and-stretch spring; in the air it leans toward a stretch while rising
      const want = s.air ? THREE.MathUtils.clamp((s.vy / (V0 * k)) * 0.12, -0.06, 0.14) : 0;
      s.sqv += (-170 * (s.sq - want) - 15 * s.sqv) * dt;
      s.sq += s.sqv * dt;
      const leanTo = s.air && s.vy > -V0 * k * 0.4 ? LEAN * speedK() : 0;
      s.lean += (leanTo - s.lean) * (1 - Math.exp(-dt * 10));
      if (!s.air && Math.abs(s.sq) < 1e-4 && Math.abs(s.sqv) < 1e-3 && Math.abs(s.lean) < 1e-4) {
        if (hop.position.y !== 0 || hop.scale.y !== 1) reset();
        return;
      }
      pose();
    },
    hop,
  };
  return api;
}
