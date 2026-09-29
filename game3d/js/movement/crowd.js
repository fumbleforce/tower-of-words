import { bodies, BODY } from './shared.js';
import * as THREE from 'three';

// ---------- soft collision between people ----------
// People are soft to each other (Jørgen, 2026-09-29: "models push gently at each other without locking up in tight
// spaces"). A walker can lean into a standing person by up to GIVE of the two radii (at half speed), softSeparate()
// then pushes the two apart every frame like a spring with a capped speed (never into a wall), and someone who keeps
// pressing into the same person with no headway for PRESS seconds slips past them (the pair is let through until they
// are apart again). Seated people, the cat and people in fixed choreography (glide, avoid: false) stay hard. Walls and
// props are never soft: every push goes through nav.collide.
export const GIVE = 0.4; // how far a walker may lean into a standing person (share of the two radii)

const PUSH_K = 9; // spring rate of the push apart (1/s)

const PUSH_MAX = 0.9; // push speed cap (place units / s, times the character scale)

const PRESS = 0.7; // s of pressing into the same person without headway before the walker slips past

const passing = new Map(); // pair key -> game time the pass-through ends

const pairKey = (a, b) => (a.uuid < b.uuid ? a.uuid + '|' + b.uuid : b.uuid + '|' + a.uuid);

export const isPassing = (a, b) => passing.has(pairKey(a, b));

function letPass(game, a, b) {
  const k = pairKey(a, b);
  if (passing.has(k)) return;
  passing.set(k, ((game && game.t) || 0) + 4);
  const C = window.__moveCheck;
  if (C) {
    C.passes = (C.passes || 0) + 1;
    if (C.notes && C.notes.length < 40) C.notes.push(`pass-through at t=${((game && game.t) || 0).toFixed(1)}`);
  }
}

export const isHard = (b) => b.seated || b.id === 'tama' || !!(b.rig && b.rig._noAvoid);

// who gives way in a push: 0 = doesn't move (seated, fixed choreography); the player gives less than people standing
function pushWeight(game, b) {
  if (b.seated || (b.rig && b.rig._noAvoid) || b.id === 'tama') return 0;
  if (game.player && b.root === game.player.root) return game.player.scripted ? 0.5 : 0.35;
  return b.rig && b.rig._walk ? 0.6 : 1;
}

// pressing into someone: count the time without headway, and let the walker through after PRESS seconds
export function press(game, holder, me, other, moved, step, dt, limit = PRESS) {
  if (!other || other.seated || other.id === 'tama' || step < 1e-5 || moved > step * 0.35) {
    holder._press = Math.max(0, (holder._press || 0) - dt * 2);
    return;
  }
  holder._press = (holder._press || 0) + dt;
  if (holder._press > limit) {
    holder._press = 0;
    letPass(game, me, other.root);
  }
}

// One step that doesn't walk hard into someone: a head-on meeting sidesteps to the right (both keep right, so two
// people meeting in a corridor pass), and the part of the step toward them is halved and stops at GIVE into their
// circle (for someone hard, at the edge). Someone already closer than that can still move away or round them;
// softSeparate() does the pushing apart.
export function slideStep(ox, oz, nx, nz, b, rr, fx, fz, step, hard = true) {
  if (Math.hypot(nx - b.x, nz - b.z) >= rr) return [nx, nz];
  const o = Math.hypot(ox - b.x, oz - b.z) || 1e-4,
    ux = (ox - b.x) / o,
    uz = (oz - b.z) / o;
  let mx = nx - ox,
    mz = nz - oz;
  if (-(ux * fx + uz * fz) > 0.7) {
    mx += -fz * step * 0.9;
    mz += fx * step * 0.9;
  }
  const inner = hard ? rr : rr * (1 - GIVE);
  const rad = mx * ux + mz * uz;
  if (rad < 0) {
    const keep = o > inner ? 0.5 : 0;
    mx -= rad * (1 - keep) * ux;
    mz -= rad * (1 - keep) * uz;
  }
  let x = ox + mx,
    z = oz + mz;
  const e = Math.hypot(x - b.x, z - b.z) || 1e-4;
  if (o >= inner && e < inner) {
    x = b.x + ((x - b.x) / e) * inner;
    z = b.z + ((z - b.z) / e) * inner;
  }
  if (hard && o < rr) {
    const push = Math.min(rr - e, step * 0.6);
    x += ((x - b.x) / e) * push;
    z += ((z - b.z) / e) * push;
  } // too close to someone hard: ease apart
  return [x, z];
}

// Every frame (main.js step): overlapping people are pushed apart, spring-like, capped in speed, weighted by who
// gives way, never through a wall or off the walk grid. Pairs that are passing through each other are left alone
// until they're apart.
export function softSeparate(game, dt) {
  const P = game && game.place;
  if (!P || !P.space || !(dt > 0)) return;
  const nav = P.nav,
    K = P.charScale || 1,
    t = game.t || 0;
  const list = bodies(game).filter((b) => b.root.parent === P.space);
  const move = (b, dx, dz) => {
    const p = b.root.position,
      ox = p.x,
      oz = p.z;
    let [x, z] = [ox + dx, oz + dz];
    if (nav) {
      if (!nav.free(ox, oz)) {
        if (!nav.free(x, z)) return 0;
      } // already in a wall's margin: only moves that get out
      else [x, z] = nav.collide(x, z, ox, oz);
    }
    p.x = x;
    p.z = z;
    const bl = b.rig && b.rig.blob;
    if (bl && bl.parent && bl.parent !== b.root) {
      bl.position.x += x - ox;
      bl.position.z += z - oz;
    }
    if (game.player && b.root === game.player.root && game.walker && game.walker._pos) game.walker._pos = [p.x, p.z];
    b.x += x - ox;
    b.z += z - oz;
    return Math.hypot(x - ox, z - oz) / (Math.hypot(dx, dz) || 1);
  };
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const A = list[i],
        B = list[j],
        rr = A.r + B.r;
      let dx = B.x - A.x,
        dz = B.z - A.z;
      const d = Math.hypot(dx, dz);
      const k = pairKey(A.root, B.root);
      if (passing.has(k)) {
        if (d >= rr + 0.02 || t > passing.get(k)) passing.delete(k);
        continue;
      }
      if (d >= rr) continue;
      const wa = pushWeight(game, A),
        wb = pushWeight(game, B);
      if (wa + wb === 0) continue;
      if (d < 1e-4) {
        dx = Math.cos(i + j);
        dz = Math.sin(i + j);
      } else {
        dx /= d;
        dz /= d;
      }
      const amt = Math.min((rr - d) * (1 - Math.exp(-PUSH_K * dt)), PUSH_MAX * K * dt);
      const sa = (amt * wa) / (wa + wb),
        sb = amt - sa;
      // whatever one side can't take (a wall behind them) goes to the other
      const fa = sa > 0 ? move(A, -dx * sa, -dz * sa) : 0,
        fb = sb > 0 ? move(B, dx * sb, dz * sb) : 0;
      const left = sa * (1 - fa) + sb * (1 - fb);
      if (left > 1e-5) {
        if (wb > 0 && fb > 0.5) move(B, dx * left, dz * left);
        else if (wa > 0 && fa > 0.5) move(A, -dx * left, -dz * left);
      }
    }
  for (const [k, end] of passing) if (t > end + 1) passing.delete(k);
  // arm's length: someone standing still too close to Eric while he stands or sits still (placed by a scene, stopped
  // behind his chair) steps back slowly to SPACE. Not while either is walking, and not in the lift cab.
  const pl = game.player,
    w = game.walker,
    e = pl && list.find((b) => b.root === pl.root);
  const still = e && !(pl.scripted && pl._walk) && !(w && (w.moving || w.path || (w.keys && w.keys.size)));
  if (still && !inCab()) {
    const D = SPACE * K;
    for (const b of list) {
      if (
        b === e ||
        b.id === 'tama' ||
        pushWeight(game, b) === 0 ||
        b.rig._walk ||
        passing.has(pairKey(b.root, e.root))
      )
        continue;
      const dx = b.x - e.x,
        dz = b.z - e.z,
        d = Math.hypot(dx, dz);
      if (d >= D || d < 1e-4) continue;
      const amt = Math.min((D - d) * (1 - Math.exp(-3 * dt)), 0.35 * K * dt);
      move(b, (dx / d) * amt, (dz / d) * amt);
    }
  }
}

// arm's length from Eric for someone else stopping near him: a test (x, z) -> ok, or null when it doesn't apply
const SPACE = 0.58; // centre to centre, times the character scale (TALK is 0.66)

const inCab = () => !!(window.__lift && window.__lift.ride && window.__lift.ride.on);

export function spaceFrom(game, self) {
  const P = game && game.place,
    pl = game && game.player;
  if (
    !P ||
    !P.space ||
    !pl ||
    !pl.root ||
    self === pl.root ||
    !pl.root.visible ||
    pl.root.parent !== P.space ||
    inCab()
  )
    return null;
  const e = bodies(game).find((b) => b.root === pl.root);
  if (!e) return null;
  const K = P.charScale || 1,
    D = SPACE * K;
  // and, while he sits, not right between him and the camera, where she'd cover him on screen (Mio behind his chair
  // at the end of the day stood an arm's length away but hid him from the top-down camera)
  let cx = 0,
    cz = 0;
  if (P.camera && e.seated) {
    const c = P.camera.getWorldPosition(new THREE.Vector3());
    P.space.worldToLocal(c);
    const l = Math.hypot(c.x - e.x, c.z - e.z) || 1;
    cx = (c.x - e.x) / l;
    cz = (c.z - e.z) / l;
  }
  return (x, z) => {
    const dx = x - e.x,
      dz = z - e.z;
    if (Math.hypot(dx, dz) < D) return false;
    const along = dx * cx + dz * cz,
      lat = Math.abs(dx * cz - dz * cx);
    return !(along > -0.1 * K && along < 1.0 * K && lat < 0.5 * K);
  };
}

// One step of a scripted walk by the chibi cast (story.js walkPerson): hold back for a moment when someone is right
// ahead (so people leaving together fall into a line instead of a heap), then slide round them. Seated people are left
// to the walk grid. Returns [x, z].
export function personStep(game, rig, ox, oz, nx, nz, dt) {
  const P = game && game.place;
  if (!P || !P.space || rig.root.parent !== P.space) return [nx, nz];
  const me = BODY * (P.charScale || 1),
    step = Math.hypot(nx - ox, nz - oz);
  if (step < 1e-6) return [nx, nz];
  const fx = (nx - ox) / step,
    fz = (nz - oz) / step;
  const list = bodies(game).filter((b) => b.root !== rig.root);
  // someone right ahead, or another walker converging on the same spot (the one with the lower id gives way, so two
  // never wait for each other)
  const ahead = list.find((b) => {
    if (b.seated || isPassing(rig.root, b.root)) return false;
    const rx = b.x - ox,
      rz = b.z - oz,
      bd = Math.hypot(rx, rz) || 1e-4,
      c = (rx * fx + rz * fz) / bd;
    if (bd >= b.r + me + 0.15) return false;
    return c > 0.55 || (c > 0 && b.rig._walk && rig.root.id < b.root.id);
  });
  if (ahead) rig._blocker = ahead;
  // the player in the way for half a second: he steps aside
  if (
    ahead &&
    game.player &&
    ahead.root === game.player.root &&
    (rig._hold || 0) > 0.5 &&
    game.walker &&
    game.walker.makeRoom &&
    !game.player.seated &&
    !game.player.scripted
  )
    game.walker.makeRoom(fx, fz, ahead.r + me + 0.12);
  // behind someone who's walking too: queue (up to 2 s); behind someone standing: slow down and go round them
  if (ahead && ahead.rig._walk && (rig._hold || 0) < 2.0) {
    rig._hold = (rig._hold || 0) + dt;
    rig._blk = (rig._blk || 0) + dt;
    return [ox, oz];
  }
  if (ahead) {
    rig._hold = (rig._hold || 0) + dt;
    nx = ox + (nx - ox) * 0.45;
    nz = oz + (nz - oz) * 0.45;
  } else rig._hold = 0;
  let x = nx,
    z = nz,
    by = null;
  for (const b of list) {
    if (isPassing(rig.root, b.root)) continue;
    const [sx, sz] = slideStep(ox, oz, x, z, b, b.r + me, fx, fz, step, isHard(b));
    if (sx === x && sz === z) continue;
    rig._blocker = by = b;
    if (P.nav) [x, z] = P.nav.collide(sx, sz, ox, oz);
    else {
      x = sx;
      z = sz;
    }
  }
  // never into a wall's margin from open floor (a sidestep or a detour leg cutting a corner)
  if (P.nav && !P.nav.free(x, z) && P.nav.free(ox, oz)) [x, z] = P.nav.collide(x, z, ox, oz);
  // no headway against someone (a doorway, a corner): slip past rather than stall the walk
  press(game, rig, rig.root, by, Math.hypot(x - ox, z - oz), step, dt, 1.0);
  // held up or turned aside by people this step: walkPerson goes round, ends a last leg early when someone stands on
  // the spot, and gives up a leg that stays blocked for 4 s (never walking through anyone, never hanging a scene)
  rig._blk = x !== nx || z !== nz ? (rig._blk || 0) + dt : 0;
  return [x, z];
}
