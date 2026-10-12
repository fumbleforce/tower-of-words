// Jumping, the classic platformer way (Jørgen, 2026-10-12: "lets add satisfying jumping into the game, like classic
// mario"). Space while walking, or with nothing in reach, and the Jump button on a phone. The jump is the feel of the
// old games: he leaves the ground at once, holding the button carries him higher (a tap is a hop), he hangs a moment
// at the top and comes down faster than he went up; a running jump goes a little higher. Stretched on the way up,
// squashed on landing with a puff of dust, the legs held mid-stride in the air, and the shadow stays on the ground,
// shrinking as he rises. A press just before landing jumps again as he lands.
// Feet follow the visible scene surfaces: low steps, bench tops and lower ground. The route grid never becomes
// an invisible wall; traversal.js checks the body against solid geometry.
//   const jump = createJump(game, { shadow, canJump, onAir })   shadow: the blob under him (engine.js blob); jump-input.js
//                                                         makes it, with the key, the phone's button and the falls
//   jump.press() / jump.release()     the button, from a key or a tap
//   jump.update(dt)                   each frame, after the walker
//   jump.animRate                     what his animation clock runs at (slow in the air: the legs hold their pose)
//   jump.air                          off the ground
import * as THREE from 'three';
import { dust, jumpSound, landSound } from './jump-fx.js';
import { RUN } from './walker.js';
import { createTraversal } from './traversal.js';
import { installJumpBodies } from './jump-bodies.js';

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

export function createJump(game, { shadow, canJump = () => true, onAir, onVoid } = {}) {
  const P = game.player,
    root = P.root;
  const bodies = installJumpBodies(P, shadow);
  let { hop, pose: jumpPose } = bodies.sync();
  function syncBody() {
    const body = bodies.sync();
    if (!body.changed) return;
    hop = body.hop;
    jumpPose = body.pose;
    s.air = false;
    s.h = ground;
    s.vy = 0;
    count = 0;
    salto = false;
    groundedFor = Infinity;
    pose();
  }
  let salto = false,
    count = 0,
    groundedFor = Infinity;
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
  let place = null,
    ground = 0,
    physical = null,
    inactive = false;
  const scale = () => root.scale.x || 1;
  function terrain() {
    if (place !== game.place || !physical) {
      place = game.place;
      ground = 0;
      physical = place
        ? createTraversal(place, [
            root,
            game.mioNpc?.root,
            ...Object.values(place.people || {}).map((p) => p.root),
            ...Object.values(place.extras || {}).map((p) => p.root),
            ...(place.crowd || []).map((p) => p.root),
          ])
        : null;
      if (game.walker)
        game.walker.traversal = {
          collide: (x, z, ox, oz) => physical.collide(x, z, ox, oz, root.position.y + s.h, scale(), s.air),
          clear: (a, b) => physical.clear(a, b, root.position.y + s.h, scale()),
        };
    }
    return physical;
  }
  const speedK = () => {
    const w = game.walker;
    return w ? THREE.MathUtils.clamp(w.v / (w.speed * RUN), 0, 1) : 0;
  };

  function takeoff() {
    syncBody();
    const k = scale();
    count = groundedFor <= 0.5 ? (count % 3) + 1 : 1;
    groundedFor = 0;
    salto =
      count === 3 &&
      (!physical ||
        physical.free(
          root.position.x,
          root.position.z,
          root.position.x,
          root.position.z,
          root.position.y + s.h + 0.65 * k,
          k,
          true,
        ));
    jumpPose.begin(salto ? 3 : 1);
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
    s.h = ground;
    s.vy = 0;
    s.sqv -= 7 * impact; // the squash
    dust(game, root, 0.7 + 0.5 * impact);
    landSound(impact);
    if (s.buffer > 0) takeoff(); // pressed just before landing: straight back up
  }
  function reset() {
    syncBody();
    jumpPose.reset();
    salto = false;
    count = 0;
    groundedFor = Infinity;
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
    hop.position.y = s.h / scale();
    // squash and stretch about his feet, keeping his volume
    const sy = 1 + THREE.MathUtils.clamp(s.sq, -0.35, 0.35),
      sx = 1 / Math.sqrt(sy);
    hop.scale.set(sx, sy, sx);
    hop.rotation.x = s.lean;
    if (shadow) {
      const k = scale(),
        f = 1 / (1 + (Math.max(0, s.h - ground) / k) * 1.1);
      shadow.scale.setScalar(shadowK.s * (0.55 + 0.45 * f));
      shadow.material.opacity = shadowK.o * (0.45 + 0.55 * f);
    }
  }

  const api = {
    restoreSurface(saved) {
      terrain();
      const p = root.position;
      const y = physical?.support(saved.x, saved.z, saved.y + 0.22 * scale(), 0.6 * scale());
      if (y == null || !physical.free(saved.x, saved.z, saved.x, saved.z, y, scale(), false)) return false;
      p.x = saved.x;
      p.z = saved.z;
      s.h = ground = y - p.y;
      s.air = false;
      s.vy = 0;
      pose();
      game.walker?.sync();
      game.place.cam?.snap?.(p);
      return true;
    },
    get air() {
      return s.air;
    },
    get salto() {
      return salto;
    },
    get count() {
      return count;
    },
    get supportHeight() {
      return ground;
    },
    get height() {
      return s.h;
    },
    // his animation clock: nearly still in the air, so the walk or run holds the stride he left the ground in
    get animRate() {
      return s.air || game.falling ? 0 : 1;
    },
    press() {
      if (!canJump()) return false;
      s.down = true;
      if (s.air) s.buffer = BUFFER;
      else takeoff();
      return true;
    },
    release() {
      s.down = false;
      s.held = salto && s.vy > 0;
    },
    // something else took him (a scene, a trip, a seat): back on the ground, no squash left over
    reset,
    update(dt) {
      syncBody();
      if (game.busy || P.seated || P.scripted) {
        count = 0;
        groundedFor = Infinity;
        jumpPose.reset();
        if (!game.falling && s.air) {
          s.h = ground;
          s.air = false;
          s.vy = 0;
          pose();
        }
        if ((P.seated || P.scripted || game.transition) && s.h) reset();
        inactive = true;
      } else {
        if (inactive) {
          physical = null;
          inactive = false;
        }
        terrain()?.refresh();
      }
      if (game.falling) return; // a fall moves him itself (falls.js)
      if (game.walker) game.walker.air = s.air; // his grip in the air (walker.js)
      if (s.buffer > 0) s.buffer -= dt;
      if (!s.air) groundedFor += dt;
      const k = scale();
      if (physical && !P.seated && !P.scripted && !game.busy) {
        const y = physical.support(
          root.position.x,
          root.position.z,
          root.position.y + s.h + (s.air ? 0.035 : 0.22) * k,
        );
        ground = y === null ? s.h - 8 * k : y - root.position.y;
        if (!s.air) {
          if (ground < s.h - 0.25 * k) {
            s.air = true;
            s.vy = 0;
          } else s.h = ground;
        }
      }
      if (s.air) {
        if (P.seated || P.scripted || game.busy) {
          if (!game.falling) reset();
          return;
        }
        let g = G * k;
        if (salto && s.vy > 0) s.held = true;
        if (s.vy > 0 && !s.held) g *= CUT;
        else if (s.held && Math.abs(s.vy) < HANG_V * k) g *= HANG;
        else if (s.vy < 0) g *= FALL;
        s.vy = Math.max(-TERMINAL * k, s.vy - g * dt);
        const next = s.h + s.vy * dt;
        if (
          s.vy > 0 &&
          physical &&
          !physical.free(
            root.position.x,
            root.position.z,
            root.position.x,
            root.position.z,
            root.position.y + next,
            k,
            true,
          )
        )
          s.vy = 0;
        else s.h = next;
        if (s.h < -3 * k && ground < s.h - k) {
          onVoid?.();
          return;
        }
        if (s.h <= ground && s.vy <= 0) land();
        else if (onAir?.(s.h)) return; // in the air he went over something, and falls (falls.js)
      }
      jumpPose.update({ airborne: s.air, velocityRatio: s.vy / (V0 * k), dt });
      // the squash-and-stretch spring; in the air it leans toward a stretch while rising
      const want = s.air ? THREE.MathUtils.clamp((s.vy / (V0 * k)) * 0.12, -0.06, 0.14) : 0;
      s.sqv += (-170 * (s.sq - want) - 15 * s.sqv) * dt;
      s.sq += s.sqv * dt;
      const leanTo = s.air && s.vy > -V0 * k * 0.4 ? LEAN * speedK() : 0;
      s.lean += (leanTo - s.lean) * (1 - Math.exp(-dt * 10));
      if (!s.air && Math.abs(s.sq) < 1e-4 && Math.abs(s.sqv) < 1e-3 && Math.abs(s.lean) < 1e-4) {
        pose();
        return;
      }
      pose();
    },
    get hop() {
      return hop;
    },
  };
  return api;
}
