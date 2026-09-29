// Movement and facing for everyone who walks:
//   SmoothWalker   the player (engine.js Walker + acceleration, braking, a turn rate, rounded corners, a gait value,
//                  steering round other people, and the tap feedback: path preview, destination ring, "can't go" mark)
//   walkRig        a scripted walk for anyone (routed over the place's walk grid, smooth turns, steers round people,
//                  never ends on top of someone, settles into idle)
//   glide          the straight-line move the trips use (doors, lifts), with the same smooth start, stop and turn
//   approachSpot   where to stand to talk to someone: a talking distance in front of them, on free floor
//   pickPerson     which person a tap meant: a capsule round the whole body, generous, before any floor tap
//
// Facing has one owner per character. Only the walker writes the player's facing, and it adopts any turn or
// move made by someone else (a trip, a sit) instead of turning back to an old target afterwards. NPC moves never
// touch the player's facing (the old glide wrote every mover's heading into the player's walker, which made Eric
// spin on the spot whenever Mio walked during a scene).
//
// Numbers (measured on the Meshy clips): Eric's walk clip covers about 0.44 body units / s at time scale 1, his run
// clip about 1.1; Mio's 0.47 and 0.77. The avatars blend walk and run by the gait value (setGait) so feet don't slide.
import * as THREE from 'three';
import { Walker } from './engine.js';
import { sfx } from './sfx.js';

const ACCEL = 5.5; // m/s² from standing
const BRAKE = 7.5; // m/s² when stopping (keys released, or the end of a path)
const TURN = 9; // rad/s at most
const CORNER = 0.32; // start turning toward the next waypoint this far before a corner
const BODY = 0.24; // a person's radius (place units, times the character scale): two people stand about a body apart
const TALK = 0.66; // talking distance, centre to centre (times the character scale)

const angDiff = (a, b) => {
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
function rigOf(game, obj) {
  if (!game) return null;
  if (game.player && game.player.root === obj) return game.player;
  if (game.mioNpc && game.mioNpc.root === obj) return game.mioNpc;
  for (const r of Object.values((game.place && game.place.people) || {})) if (r && r.root === obj) return r;
  return null;
}
// the reachable cell (flood fill from the start over the walk grid) closest to the target
function reachableNear(nav, sx, sz, tx, tz) {
  if (!nav.grid) nav.build();
  const g = nav.grid,
    nx = nav.nx,
    s0 = nav.nearestFree(...nav.cellOf(sx, sz));
  if (!s0) return null;
  const seen = new Uint8Array(g.length),
    q = [s0[1] * nx + s0[0]];
  seen[q[0]] = 1;
  let best = null,
    bd = 1e9;
  for (let h = 0; h < q.length; h++) {
    const c = q[h],
      x = c % nx,
      z = (c / nx) | 0;
    const wx = nav.x0 + (x + 0.5) * nav.cell,
      wz = nav.z0 + (z + 0.5) * nav.cell,
      d = Math.hypot(wx - tx, wz - tz);
    if (d < bd) {
      bd = d;
      best = [wx, wz];
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const a = x + dx,
        b = z + dz;
      if (a < 0 || b < 0 || a >= nx || b >= nav.nz) continue;
      const n = b * nx + a;
      if (!seen[n] && g[n]) {
        seen[n] = 1;
        q.push(n);
      }
    }
  }
  return best;
}
// a free spot near (x, z) that no one else stands on (for NPC destinations and approach points)
function clearOf(list, x, z, rad) {
  return list.every((b) => Math.hypot(b.x - x, b.z - z) >= b.r + rad);
}
function freeNear(nav, list, x, z, rad, ok = null) {
  if ((!nav || nav.free(x, z, nav.R + 0.02)) && clearOf(list, x, z, rad) && (!ok || ok(x, z))) return [x, z];
  for (let ring = 1; ring <= 6; ring++) {
    const d = ring * 0.14;
    let best = null,
      bd = 1e9;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2,
        cx = x + Math.cos(a) * d,
        cz = z + Math.sin(a) * d;
      if (nav && !nav.free(cx, cz, nav.R + 0.02)) continue;
      if (!clearOf(list, cx, cz, rad) || (ok && !ok(cx, cz))) continue;
      const k = Math.hypot(cx - x, cz - z);
      if (k < bd) {
        bd = k;
        best = [cx, cz];
      }
    }
    if (best) return best;
  }
  return [x, z];
}

// ---------- soft collision between people ----------
// People are soft to each other (Jørgen, 2026-09-29: "models push gently at each other without locking up in tight
// spaces"). A walker can lean into a standing person by up to GIVE of the two radii (at half speed), softSeparate()
// then pushes the two apart every frame like a spring with a capped speed (never into a wall), and someone who keeps
// pressing into the same person with no headway for PRESS seconds slips past them (the pair is let through until they
// are apart again). Seated people, the cat and people in fixed choreography (glide, avoid: false) stay hard. Walls and
// props are never soft: every push goes through nav.collide.
const GIVE = 0.4; // how far a walker may lean into a standing person (share of the two radii)
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
const isHard = (b) => b.seated || b.id === 'tama' || !!(b.rig && b.rig._noAvoid);
// who gives way in a push: 0 = doesn't move (seated, fixed choreography); the player gives less than people standing
function pushWeight(game, b) {
  if (b.seated || (b.rig && b.rig._noAvoid) || b.id === 'tama') return 0;
  if (game.player && b.root === game.player.root) return game.player.scripted ? 0.5 : 0.35;
  return b.rig && b.rig._walk ? 0.6 : 1;
}
// pressing into someone: count the time without headway, and let the walker through after PRESS seconds
function press(game, holder, me, other, moved, step, dt, limit = PRESS) {
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
function slideStep(ox, oz, nx, nz, b, rr, fx, fz, step, hard = true) {
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
// a route that goes round the people standing in the way (they're blocked on the walk grid just for this search)
function pathAround(nav, from, to, list, myR) {
  for (const b of list) {
    const r = Math.max(0.05, b.r + myR - nav.R);
    nav.blockTagged('_people', b.x - r, b.x + r, b.z - r, b.z + r);
  }
  const path = nav.path(from[0], from[1], to[0], to[1]);
  nav.unblock('_people');
  return path && path.length ? path : null;
}

export class SmoothWalker extends Walker {
  constructor(body, nav, opts = {}) {
    super(body, nav, opts);
    this.v = 0; // current ground speed (place units / s)
    this.vx = 0;
    this.vz = 0; // current direction of travel
    this.gait = { v: 0, k: 0 };
    this.preview = new PathPreview();
    this.others = opts.others || (() => bodies(window.__game).filter((b) => b.root !== this.body));
    this._yaw = undefined;
    this._facing = undefined;
    this._pos = null;
  }
  stop() {
    super.stop();
    this.preview.clear();
    this.aside = null;
  }
  goTo(x, z, arrive) {
    this.preview.clear();
    this.aside = null;
    super.goTo(x, z, arrive);
  }
  // someone walking (dx, dz) is held up by him: step aside, off their line, even during a scene (people do)
  makeRoom(fx, fz, need) {
    const now = performance.now();
    if (this.aside || this.keys.size || (this.path && !this.locked) || now - (this._roomT || 0) < 2500) return;
    this._roomT = now;
    const p = this.body.position,
      others = this.others().filter((o) => !o.seated),
      me = BODY * (this.body.scale.x || 1);
    // off their line, to the side with the most room from everyone (in a crowd, out of the flow)
    let best = null,
      bs = 1e9;
    for (const side of [1, -1])
      for (const k of [1, 1.4, 1.9, 2.4]) {
        const cx = p.x - fz * need * k * side,
          cz = p.z + fx * need * k * side;
        if (!this.nav.free(cx, cz)) continue;
        if (!clearOf(others, cx, cz, me)) continue;
        const room = Math.min(1.5, ...others.map((o) => Math.hypot(o.x - cx, o.z - cz) - o.r));
        const c = k * 0.3 - room + (side < 0 ? 0.05 : 0);
        if (c < bs) {
          bs = c;
          best = [cx, cz];
        }
      }
    if (best) {
      this.aside = [best];
      this.asideT = 0;
    }
    const C = window.__moveCheck;
    if (C && C.notes && C.notes.length < 40)
      C.notes.push(
        `makeRoom at [${p.x.toFixed(2)}, ${p.z.toFixed(2)}] -> ${best ? best.map((v) => v.toFixed(2)).join(', ') : 'no room'}`,
      );
  }
  // snap the walker to the body as it is now (after a trip or a sit): no leftover turn, no leftover speed
  sync() {
    this.facing = this.targetFacing = this.body.rotation.y;
    this.v = 0;
    this._yaw = this._facing = this.facing;
    const p = this.body.position;
    this._pos = [p.x, p.z];
  }
  // a tap on the floor (or not): walk there with the preview, or show that it can't be reached
  tapRay(raycaster, place) {
    const p = place.pick(raycaster);
    const y = place.floorY || 0;
    const space = place.space;
    if (!p) {
      // missed the floor (a wall, the sky): mark where the ray meets the floor plane, if it does
      const pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y),
        w = new THREE.Vector3();
      const r = raycaster.ray.clone();
      if (space) {
        const inv = new THREE.Matrix4().copy(space.matrixWorld).invert();
        r.applyMatrix4(inv);
      }
      const N = this.nav;
      if (r.intersectPlane(pl, w) && w.x > N.x0 && w.x < N.x1 && w.z > N.z0 && w.z < N.z1)
        this.preview.fail(space, w.x, w.z, y);
      sfx('nope');
      return 'miss';
    }
    const from = this.body.position,
      N = this.nav;
    const inside = p.x > N.x0 && p.x < N.x1 && p.z > N.z0 && p.z < N.z1;
    // a tap on someone's feet: stop short of them instead of walking into them
    const others = this.others(),
      myR = BODY * (this.body.scale.x || 1),
      on = others.find((o) => Math.hypot(o.x - p.x, o.z - p.z) < o.r + myR);
    let tx = p.x,
      tz = p.z;
    if (on) {
      const d = Math.hypot(from.x - on.x, from.z - on.z) || 1;
      tx = on.x + ((from.x - on.x) / d) * (on.r + myR + 0.1);
      tz = on.z + ((from.z - on.z) / d) * (on.r + myR + 0.1);
    }
    let path = inside ? N.path(from.x, from.z, tx, tz) : null;
    let last = path && path.length ? path[path.length - 1] : null;
    // the tap is somewhere he can't stand (inside furniture, a closed room): walk to the nearest floor he can reach
    if (inside && (!last || Math.hypot(last[0] - tx, last[1] - tz) > 0.8)) {
      const near = reachableNear(N, from.x, from.z, tx, tz);
      if (near && Math.hypot(near[0] - tx, near[1] - tz) < 2.0) {
        path = N.path(from.x, from.z, near[0], near[1]);
        last = path && path.length ? path[path.length - 1] : null;
        if (last) {
          tx = last[0];
          tz = last[1];
        }
      }
    }
    // unreachable: off the walkable map, no route, or the nearest reachable spot is well away from the tap
    // (a wall, a closed room): don't walk off somewhere else, say no where the finger was
    if (!last || Math.hypot(last[0] - tx, last[1] - tz) > 0.8) {
      if (inside) this.preview.fail(space, p.x, p.z, y);
      sfx('nope');
      return 'fail'; // a walk already under way carries on
    }
    this.path = path;
    this.arrive = null;
    const end = path[path.length - 1];
    const moved = Math.hypot(end[0] - p.x, end[1] - p.z) > 0.25; // tapped inside furniture: goes to the nearest free spot
    this.preview.show(space, [from.x, from.z], path, y, moved ? [p.x, p.z] : null);
    return moved ? 'near' : 'ok';
  }
  update(dt, camera) {
    const p = this.body.position;
    // someone else turned or moved him (a trip, a sit, a stand, the story): take that as the new state, so he
    // doesn't turn back to an old target or carry old speed into the next frame
    if (this._yaw !== undefined && Math.abs(angDiff(this.body.rotation.y, this._yaw)) > 1e-3) {
      this.facing = this.targetFacing = this.body.rotation.y;
      this.v = 0;
    } else if (this._facing !== undefined && Math.abs(angDiff(this.facing, this._facing)) > 1e-3)
      this.targetFacing = this.facing;
    if (this._pos && Math.hypot(p.x - this._pos[0], p.z - this._pos[1]) > 0.02) this.v = 0;
    let mx = 0,
      mz = 0,
      keys = false,
      remain = Infinity;
    const k = (a, b) => this.keys.has(a) || this.keys.has(b);
    const up = k('ArrowUp', 'KeyW'),
      dn = k('ArrowDown', 'KeyS'),
      lf = k('ArrowLeft', 'KeyA'),
      rt = k('ArrowRight', 'KeyD');
    const others = this.others();
    const R = BODY * (this.body.scale.x || 1); // his own body, for people (walls use the grid's own radius)
    if (!this.locked && (up || dn || lf || rt)) {
      if (this.path) {
        this.path = null;
        this.arrive = null;
        this.preview.clear();
      }
      const f = new THREE.Vector3();
      camera.getWorldDirection(f);
      const par = this.body.parent;
      if (par) {
        const q = new THREE.Quaternion();
        par.getWorldQuaternion(q);
        f.applyQuaternion(q.invert());
      }
      f.y = 0;
      f.normalize();
      const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
      const iy = (up ? 1 : 0) - (dn ? 1 : 0),
        ix = (rt ? 1 : 0) - (lf ? 1 : 0);
      mx = f.x * iy + r.x * ix;
      mz = f.z * iy + r.z * ix;
      keys = true;
    } else if (this.aside) {
      // a step aside: short, and given up after a second and a half whatever happens
      const [tx, tz] = this.aside[0];
      mx = tx - p.x;
      mz = tz - p.z;
      remain = Math.hypot(mx, mz);
      this.asideT = (this.asideT || 0) + dt;
      if (remain < 0.04 || this.asideT > 1.5) {
        this.aside = null;
        mx = mz = 0;
      }
    } else if (this.path && !this.locked) {
      // corner rounding: once close to a waypoint that isn't the last, aim at the next one if the way is clear
      while (
        this.path.length > 1 &&
        Math.hypot(this.path[0][0] - p.x, this.path[0][1] - p.z) < CORNER &&
        this.nav.clear([p.x, p.z], this.path[1])
      )
        this.path.shift();
      const [tx, tz] = this.path[0];
      mx = tx - p.x;
      mz = tz - p.z;
      remain = Math.hypot(mx, mz);
      for (let i = 1; i < this.path.length; i++)
        remain += Math.hypot(this.path[i][0] - this.path[i - 1][0], this.path[i][1] - this.path[i - 1][1]);
      // the end of the path is taken by someone: arrive at the edge of them, not on top
      const last = this.path[this.path.length - 1];
      const taker = others.find((o) => Math.hypot(o.x - last[0], o.z - last[1]) < o.r + R);
      const blockedEnd = taker && Math.hypot(p.x - taker.x, p.z - taker.z) < taker.r + R + 0.06 && remain < 1.0;
      if (Math.hypot(mx, mz) < 0.05 || blockedEnd) {
        this.path.shift();
        if (!this.path.length || blockedEnd) {
          this.path = null;
          mx = mz = 0;
          this.preview.arrived();
          if (this.arrive) {
            const a = this.arrive;
            this.arrive = null;
            a();
          }
        }
      }
    }
    const len = Math.hypot(mx, mz);
    // wanted speed: full, less when the facing is far off (turn first, don't moonwalk), braking into the end of a path
    let want = 0;
    if (len > 1e-4) {
      mx /= len;
      mz /= len;
      want = this.speed;
      const ang = Math.abs(angDiff(Math.atan2(mx, mz), this.facing));
      want *= THREE.MathUtils.clamp((Math.cos(ang) + 0.35) / 1.35, this.v > 0.4 ? 0.35 : 0.12, 1);
      if (!keys && remain < Infinity) want = Math.min(want, Math.sqrt(2 * BRAKE * 0.6 * remain) + 0.15);
      this.targetFacing = Math.atan2(mx, mz);
      // the direction of travel swings round smoothly too (no instant sideways moves)
      const blend = 1 - Math.exp(-dt * 16);
      this.vx += (mx - this.vx) * blend;
      this.vz += (mz - this.vz) * blend;
    }
    const a = want > this.v ? ACCEL : BRAKE;
    this.v += THREE.MathUtils.clamp(want - this.v, -a * dt, a * dt);
    let moved = 0;
    if (this.v > 1e-3) {
      const dl = Math.hypot(this.vx, this.vz) || 1,
        step = this.v * dt;
      const ox = p.x,
        oz = p.z;
      let [nx, nz] = this.nav.collide(ox + (this.vx / dl) * step, oz + (this.vz / dl) * step, ox, oz);
      // people: never step into someone; slide round them, keep right when meeting head-on
      const tl = Math.hypot(this.vx, this.vz) || 1,
        fx = this.vx / tl,
        fz = this.vz / tl;
      let blockedBy = null;
      for (const o of others) {
        if (isPassing(this.body, o.root)) continue;
        const [sx, sz] = slideStep(ox, oz, nx, nz, o, o.r + R, fx, fz, step, isHard(o));
        if (sx === nx && sz === nz) continue;
        blockedBy = o;
        [nx, nz] = this.nav.collide(sx, sz, ox, oz);
      }
      // pressing into someone with no headway (a doorway, a corner): slip past them after a moment
      if (keys || this.path) press(window.__game, this, this.body, blockedBy, Math.hypot(nx - ox, nz - oz), step, dt);
      // held up by someone on a tapped route for a moment: plan round them
      this.blockT = blockedBy && this.path ? (this.blockT || 0) + dt : 0;
      if (this.blockT > 0.4 && this.path) {
        this.blockT = -1.5; // not again straight away
        const end = this.path[this.path.length - 1],
          alt = pathAround(
            this.nav,
            [ox, oz],
            end,
            others.filter((o) => !o.seated),
            R,
          );
        if (alt) this.path = alt;
      }
      p.x = nx;
      p.z = nz;
      moved = Math.hypot(nx - ox, nz - oz);
      // blocked: the speed drops to what actually happened (sliding along a wall is slower)
      if (step > 1e-5) this.v = Math.min(this.v, (moved / dt) * 1.02 + 0.02);
      if (this.path) {
        this.stuck = moved < step * 0.2 ? this.stuck + dt : 0;
        if (this.stuck > 0.5) {
          this.stuck = 0;
          const ar = this.arrive;
          this.path = null;
          this.arrive = null;
          this.preview.clear();
          if (ar) ar();
        }
      }
    }
    if (this.targetFacing !== undefined) this.facing = turnToward(this.facing, this.targetFacing, dt);
    this.body.rotation.y = this.facing;
    // walking or not, with some hysteresis so a slow slide along a wall doesn't flicker walk / idle / walk
    const speedNow = moved / Math.max(dt, 1e-4);
    const was = this.moving;
    this.moving = was ? speedNow > 0.04 && this.v > 0.04 : speedNow > 0.1 && this.v > 0.1;
    // a big turn on the spot takes a few small steps instead of a frozen pirouette
    const turnLeft = this.targetFacing === undefined ? 0 : Math.abs(angDiff(this.targetFacing, this.facing));
    this.turning = !this.moving && turnLeft > 0.5;
    const sc = this.body.scale.x || 1;
    this.gait.v = this.moving ? this.v / sc : this.turning ? 0.3 : 0;
    this.gait.k = this.moving ? this.v / this.speed : 0;
    this.preview.update(dt, p);
    this._yaw = this.body.rotation.y;
    this._facing = this.facing;
    this._pos = [p.x, p.z];
    return this.moving || this.turning;
  }
}

// A way round someone standing in a chibi walk's way: a point beside them (right side first), clear of the walls and
// of everyone else, for walkPerson to go through before carrying on to its waypoint. Null if there's no room.
export function detourPoint(game, rig, b, [tx, tz]) {
  const P = game && game.place;
  if (!P) return null;
  const K = P.charScale || 1,
    me = BODY * K,
    p = rig.root.position;
  const dx = tx - p.x,
    dz = tz - p.z,
    dl = Math.hypot(dx, dz) || 1,
    fx = dx / dl,
    fz = dz / dl;
  const others = bodies(game).filter((o) => o.root !== rig.root && o !== b);
  let best = null,
    bs = 1e9;
  for (const side of [1, -1])
    for (const k of [1.0, 1.35, 1.7]) {
      const off = (b.r + me) * k + 0.05,
        cx = b.x - fz * off * side,
        cz = b.z + fx * off * side;
      if (P.nav && (!P.nav.free(cx, cz, P.nav.R) || !P.nav.clear([p.x, p.z], [cx, cz]))) continue; // and a straight way there
      if (!clearOf(others, cx, cz, me)) continue;
      const cost = Math.hypot(cx - p.x, cz - p.z) + Math.hypot(tx - cx, tz - cz) + (side < 0 ? 0.05 : 0);
      if (cost < bs) {
        bs = cost;
        best = [cx, cz];
      }
    }
  return best;
}

// A walk whose end is someone's own position ("walk to Eric") stops at a talking distance in front of them, on the
// walker's side, instead of on top of them. Other ends are returned as they are.
// Any other end within arm's length of Eric (a spot behind his chair while he sits there) moves to the nearest free
// floor at arm's length (SPACE), not more than 0.9 away (Jørgen, 2026-09-29: "models just constantly being too close to
// each other"). Not in the lift cab, whose spots are set by the ride.
export function standOff(game, rig, [x, z]) {
  const P = game && game.place;
  if (!P || !P.space) return [x, z];
  const K = P.charScale || 1,
    from = rig.root.position;
  const others = bodies(game).filter((b) => b.root !== rig.root);
  const on = others.find((b) => Math.hypot(b.x - x, b.z - z) < b.r);
  let tx = x,
    tz = z;
  if (on) {
    const d = Math.hypot(from.x - on.x, from.z - on.z) || 1,
      D = TALK * K;
    tx = on.x + ((from.x - on.x) / d) * D;
    tz = on.z + ((from.z - on.z) / d) * D;
    if (P.nav && !P.nav.free(tx, tz, P.nav.R + 0.02)) [tx, tz] = freeNear(P.nav, others, tx, tz, BODY * K);
  }
  const ok = spaceFrom(game, rig.root);
  if (ok && !ok(tx, tz)) {
    const q = freeNear(
      P.nav,
      others.filter((b) => b.id !== 'tama'),
      tx,
      tz,
      BODY * K,
      ok,
    );
    if (ok(q[0], q[1]) && Math.hypot(q[0] - tx, q[1] - tz) < 0.9) [tx, tz] = q;
  }
  return [tx, tz];
}
// arm's length from Eric for someone else stopping near him: a test (x, z) -> ok, or null when it doesn't apply
const SPACE = 0.58; // centre to centre, times the character scale (TALK is 0.66)
const inCab = () => !!(window.__lift && window.__lift.ride && window.__lift.ride.on);
function spaceFrom(game, self) {
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

// ---------- scripted moves ----------
// walkRig(game, rig, [x, z], { speed, route = true, avoid = true, brakeTo = 0 }): walk someone to a spot. Routed over
// the place's walk grid (never through desks), the end moved off anyone standing there, smooth turns, gait for the
// feet, waits for or steps round people in the way, and settles into idle at the end. Resolves on arrival, or after
// a stall (it never hangs a scene). Works on a bare Object3D too (the cat), without the animation parts.
export function walkRig(
  game,
  rigOrObj,
  to,
  { speed = 1.25, route = true, avoid = true, brakeTo = 0, settle = true } = {},
) {
  const rig = rigOrObj && rigOrObj.root ? rigOrObj : rigOf(game, rigOrObj);
  const obj = rig ? rig.root : rigOrObj;
  const walkToken = (obj.userData.walkTok = (obj.userData.walkTok || 0) + 1);
  const parent = obj.parent;
  const P = game.place,
    nav = P && obj.parent === P.space ? P.nav : null;
  const player = game.player && obj === game.player.root;
  const self = (b) => b.root === obj;
  let [tx, tz] = avoid && game.place ? standOff(game, rig || { root: obj }, to) : to;
  const people = () => (avoid ? bodies(game).filter((b) => !self(b)) : []);
  // the destination: free floor, and not on top of someone
  if (nav && avoid)
    [tx, tz] = freeNear(
      nav,
      people().filter((b) => b.id !== 'tama'),
      tx,
      tz,
      BODY * (obj.scale.x || 1),
      spaceFrom(game, obj),
    );
  let path = null;
  if (route && nav) {
    path = nav.path(obj.position.x, obj.position.z, tx, tz);
    if (path && path.length) path[path.length - 1] = [tx, tz];
    else {
      // no way through (a shut door, a closed room): go as close as the floor allows, never through a wall
      const near = reachableNear(nav, obj.position.x, obj.position.z, tx, tz);
      if (near) {
        [tx, tz] = near;
        path = nav.path(obj.position.x, obj.position.z, tx, tz);
      }
      console.warn('walkRig: no route to', to, near ? 'going to the nearest reachable spot' : 'staying put');
      if (!path || !path.length) path = [[obj.position.x, obj.position.z]];
    }
  }
  if (!path || !path.length) path = [[tx, tz]];
  if (rig) {
    rig._walk = true;
    rig._noAvoid = !avoid;
  }
  const pst = {}; // pressing-into-someone time (soft collision)
  let v = 0,
    yaw = obj.rotation.y,
    stall = 0,
    wait = 0,
    waited = 0,
    age = 0,
    blockT = 0;
  let plen = 0;
  {
    let q = [obj.position.x, obj.position.z];
    for (const w of path) {
      plen += Math.hypot(w[0] - q[0], w[1] - q[1]);
      q = w;
    }
  }
  const limit = (plen / Math.max(0.3, speed)) * 3 + 6; // a hard cap: whatever happens, the walk ends
  const sc = obj.scale.x || 1;
  return new Promise((res) => {
    let last = performance.now();
    const done = () => {
      // end clear of everyone (someone may have stopped where she was heading): a small settling step if needed
      if (avoid && nav) {
        const q = obj.position,
          list = people().filter((b) => b.id !== 'tama');
        if (!clearOf(list, q.x, q.z, BODY * sc)) {
          const [fx, fz] = freeNear(nav, list, q.x, q.z, BODY * sc);
          if (Math.hypot(fx - q.x, fz - q.z) < 0.35) {
            q.x = fx;
            q.z = fz;
          }
        }
      }
      if (rig) {
        rig._walk = false;
        rig._noAvoid = false;
        if (settle && !rig.seated) {
          rig.setGait?.(null);
          rig.setState?.('idle');
        }
      }
      if (player && game.walker) game.walker.sync?.();
      res();
    };
    const tick = () => {
      if (obj.userData.walkTok !== walkToken) {
        res();
        return;
      }
      if (obj.parent !== parent || game.place !== P) {
        if (rig) {
          rig._walk = false;
          rig._noAvoid = false;
        }
        res();
        return;
      }
      const now = performance.now();
      let dt = Math.min(0.05, (now - last) / 1000) * (game.timeScale || 1);
      last = now;
      if (game.paused) dt = 0;
      if (!obj.parent && dt > 0) {
        done();
        return;
      }
      const p = obj.position;
      while (
        path.length > 1 &&
        Math.hypot(path[0][0] - p.x, path[0][1] - p.z) < (route ? CORNER : 0.05) &&
        (!nav || nav.clear([p.x, p.z], path[1]))
      )
        path.shift();
      const [gx, gz] = path[0];
      const dx = gx - p.x,
        dz = gz - p.z,
        d = Math.hypot(dx, dz);
      let remain = d;
      for (let i = 1; i < path.length; i++)
        remain += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
      if (remain < 0.03 || (path.length === 1 && d < 0.03)) {
        p.x = tx;
        p.z = tz;
        if (settle) obj.rotation.y = yaw;
        done();
        return;
      }
      const head = Math.atan2(dx, dz);
      yaw = turnToward(yaw, head, dt);
      let want = speed * THREE.MathUtils.clamp((Math.cos(angDiff(head, yaw)) + 0.35) / 1.35, v > 0.4 ? 0.3 : 0.12, 1);
      want = Math.min(want, Math.sqrt(2 * BRAKE * 0.6 * remain) + Math.max(0.15, brakeTo * speed));
      // someone right in front: behind someone walking, wait a moment (a queue); someone standing, slow down and go
      // round (sidestep, slide, push gently), and the player steps aside if he can
      if (avoid && dt > 0) {
        const ahead = people().find((b) => {
          const bx = b.x - p.x,
            bz = b.z - p.z,
            bd = Math.hypot(bx, bz);
          return bd < b.r + BODY * sc + 0.25 && (bx * dx + bz * dz) / (bd * d || 1) > 0.5 && !isPassing(obj, b.root);
        });
        if (ahead && ahead.rig._walk && waited < 0.9) {
          want = 0;
          waited += dt;
          wait = 1;
        } else {
          wait = 0;
          if (ahead) {
            want = Math.min(want, speed * 0.45);
            waited += dt;
          } else waited = 0;
        }
        if (
          ahead &&
          waited > 0.4 &&
          game.player &&
          ahead.root === game.player.root &&
          game.walker?.makeRoom &&
          !game.player.seated &&
          !game.player.scripted
        )
          game.walker.makeRoom(dx / (d || 1), dz / (d || 1), ahead.r + BODY * sc + 0.12);
      }
      v += THREE.MathUtils.clamp(want - v, -(want > v ? ACCEL : BRAKE) * dt, (want > v ? ACCEL : BRAKE) * dt);
      const step = Math.min(v * dt, remain);
      let nx = p.x + Math.sin(yaw) * step,
        nz = p.z + Math.cos(yaw) * step;
      // mostly along the way it faces, pulled onto the line to the waypoint so turns don't swing wide
      if (d > 1e-4) {
        const k = Math.min(1, dt * 6);
        nx += (p.x + (dx / d) * step - nx) * k;
        nz += (p.z + (dz / d) * step - nz) * k;
      }
      let blockedBy = null;
      if (avoid) {
        const fx = Math.sin(yaw),
          fz = Math.cos(yaw),
          list = people();
        for (const b of list) {
          if (isPassing(obj, b.root)) continue;
          const [sx, sz] = slideStep(p.x, p.z, nx, nz, b, b.r + BODY * sc, fx, fz, step, isHard(b));
          if (sx === nx && sz === nz) continue;
          blockedBy = b;
          if (nav) [nx, nz] = nav.collide(sx, sz, p.x, p.z);
          else {
            nx = sx;
            nz = sz;
          }
        }
        // held up by someone for a moment: plan a way round everyone standing
        blockT = blockedBy && !wait ? blockT + dt : 0;
        if (blockT > 0.5 && nav && route !== false) {
          blockT = -1.5;
          const alt = pathAround(
            nav,
            [p.x, p.z],
            [tx, tz],
            list.filter((b) => !b.seated),
            BODY * sc,
          );
          if (alt) {
            path = alt;
            path[path.length - 1] = [tx, tz];
          }
        }
        // still no headway against them (a doorway, a corner): slip past rather than stall the walk
        if (!wait)
          press(game, pst, obj, blockedBy, Math.hypot(nx - p.x, nz - p.z), Math.max(step, 0.2 * speed * dt), dt, 1.0);
      }
      const moved = Math.hypot(nx - p.x, nz - p.z);
      p.x = nx;
      p.z = nz;
      obj.rotation.y = yaw;
      if (player && game.walker) game.walker.sync?.();
      if (dt > 0) {
        age += dt;
        stall = moved < 0.0015 && !wait ? stall + dt : 0;
        if (stall > 1.5 || age > limit) {
          done();
          return;
        } // stuck behind something: end where it is rather than hang the scene
        if (rig) {
          const walking = moved / dt > 0.05 || Math.abs(angDiff(head, yaw)) > 0.5;
          rig.setState?.(walking ? 'walk' : 'idle');
          rig.setGait?.(walking ? Math.max(moved / dt, 0.3) / sc : null);
        }
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}
// Turn someone to face a spot, smoothly (the story's face step; it used to snap). A big turn takes small steps.
export function faceRig(game, rigOrObj, [x, z]) {
  const rig = rigOrObj && rigOrObj.root ? rigOrObj : rigOf(game, rigOrObj);
  const obj = rig ? rig.root : rigOrObj;
  if (game.player && obj === game.player.root && game.walker) {
    game.walker.faceTo(x, z);
    return Promise.resolve();
  }
  const target = Math.atan2(x - obj.position.x, z - obj.position.z);
  if (rig && rig.seated) {
    obj.rotation.y = target;
    return Promise.resolve();
  }
  const token = (obj.userData.faceTok = (obj.userData.faceTok || 0) + 1);
  const stepping = rig && !rig._walk && Math.abs(angDiff(target, obj.rotation.y)) > 0.6;
  return new Promise((res) => {
    let last = performance.now();
    const tick = () => {
      if (obj.userData.faceTok !== token || (rig && rig._walk)) {
        res();
        return;
      }
      const now = performance.now(),
        dt = game.paused ? 0 : Math.min(0.05, (now - last) / 1000) * (game.timeScale || 1);
      last = now;
      obj.rotation.y = turnToward(obj.rotation.y, target, dt, TURN * 0.8);
      const left = Math.abs(angDiff(target, obj.rotation.y));
      if (stepping) {
        rig.setState?.(left > 0.05 ? 'walk' : 'idle');
        rig.setGait?.(left > 0.05 ? 0.3 : null);
      }
      if (left < 1e-3) {
        obj.rotation.y = target;
        res();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

// Standing up from a seat: step out to your own spot in the aisle in front of the seat (dz: the way out, e.g. +0.5),
// moved along the aisle if a neighbour already stands there, so two people standing together never end in a heap.
export async function standOut(game, rigOrObj, dz, { speed = 0.8 } = {}) {
  const rig = rigOrObj && rigOrObj.root ? rigOrObj : rigOf(game, rigOrObj);
  if (!rig) return;
  const o = rig.root,
    P = game.place,
    nav = P && o.parent === P.space ? P.nav : null;
  if (rig.seated) {
    rig.seated = false;
    rig.setState?.('idle');
  }
  o.position.y = 0;
  const others = bodies(game).filter((b) => b.root !== o && !b.seated && b.id !== 'tama');
  const x = o.position.x,
    z = o.position.z + dz;
  // search along the aisle (x) first, both ways, then anywhere near
  let spot = null;
  for (const ox of [0, 0.2, -0.2, 0.4, -0.4, 0.6, -0.6]) {
    const cx = x + ox;
    if (nav && !nav.free(cx, z, nav.R + 0.02)) continue;
    if (clearOf(others, cx, z, BODY * (P.charScale || 1) + 0.04)) {
      spot = [cx, z];
      break;
    }
  }
  if (!spot) spot = freeNear(nav, others, x, z, BODY * (P.charScale || 1) + 0.04);
  // start at the seat edge, facing out, and take the step
  o.rotation.y = Math.atan2(spot[0] - x, spot[1] - o.position.z);
  o.position.z += dz * 0.35;
  await walkRig(game, rig, spot, { speed, route: false, avoid: false });
  if (game.player && o === game.player.root && game.walker) game.walker.sync?.();
}

// The trips' straight moves (through doors, into lifts): no routing and no people-avoidance (the choreography is
// fixed), but the same smooth start, turn and stop, and keeps a little speed at the end so chained moves flow.
export function glide(g, obj, to, speed) {
  return walkRig(g, obj, to, { speed, route: false, avoid: false, brakeTo: 0.45, settle: false });
}

// ---------- talking to someone ----------
// Where Eric should stand to talk to a standing person: a talking distance away, on the side he comes from, leaning
// toward their front (no walking round behind someone to reach their face); never inside furniture or another person. Null for seated people (their
// places keep hand-placed spots) and for things.
export function approachSpot(game, item) {
  const P = game.place;
  if (!P || !item || !/person/.test(item.kind || '')) return null;
  const r = P.people && P.people[item.id];
  if (!r || !r.root || !r.root.visible) return null;
  const seatedNow = !!r.seated || (!!r.hips && r.root.position.y > 0.05);
  const nav = P.nav,
    K = P.charScale || 1,
    me = game.player.root.position;
  // their place and heading in the walk grid's space (a rig can sit inside a sub-group of the place)
  const c = r.root.getWorldPosition(new THREE.Vector3());
  P.space.worldToLocal(c);
  const f = new THREE.Vector3(0, 0, 1).applyQuaternion(r.root.getWorldQuaternion(new THREE.Quaternion()));
  f.applyQuaternion(P.space.getWorldQuaternion(new THREE.Quaternion()).invert());
  const x = c.x,
    z = c.z,
    yaw = Math.atan2(f.x, f.z);
  const D = (item.id === 'tama' ? 0.5 : TALK + (seatedNow ? 0.08 : 0)) * K; // seated: their knees reach into the aisle
  const others = bodies(game).filter((b) => b.root !== r.root && b.root !== game.player.root);
  const toMe = Math.atan2(me.x - x, me.z - z);
  const cands = [];
  for (const dist of [D, D * 0.85, D * 1.2])
    for (let i = 0; i < 16; i++) {
      const a = yaw + (i / 16) * Math.PI * 2,
        cx = x + Math.sin(a) * dist,
        cz = z + Math.cos(a) * dist;
      if (nav && !nav.free(cx, cz, nav.R + 0.02)) continue;
      if (!clearOf(others, cx, cz, BODY * K)) continue;
      cands.push([
        Math.abs(angDiff(a, yaw)) * 0.45 +
          Math.abs(angDiff(a, toMe)) * 0.75 +
          Math.hypot(cx - me.x, cz - me.z) * 0.15 +
          Math.abs(dist - D) * 2,
        cx,
        cz,
      ]);
    }
  cands.sort((p, q) => p[0] - q[0]);
  // the best one he can actually walk to
  for (const [, cx, cz] of cands.slice(0, 8)) {
    if (!nav) return [cx, cz];
    const path = nav.path(me.x, me.z, cx, cz),
      end = path && path[path.length - 1];
    if (end && Math.hypot(end[0] - cx, end[1] - cz) < 0.15) return [cx, cz];
  }
  return null;
}

// ---------- tapping people ----------
// A tap near a person, or on the floor where the current goal is used, picks them: the distance from the tap to their body (a capsule from the feet to the head,
// as wide as the body on screen plus a finger's margin) or to their pin. People win over things and the floor.
export function pickPerson(game, clientX, clientY, canvas) {
  const P = game.place;
  if (!P || !game.markers) return null;
  const rect = canvas.getBoundingClientRect(),
    W = rect.width,
    H = rect.height,
    cam = P.camera;
  const scr = (v) => {
    v.project(cam);
    return [((v.x + 1) / 2) * W + rect.left, ((1 - v.y) / 2) * H + rect.top];
  };
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
  let best = null,
    bd = 1e9;
  for (const m of game.markers.list) {
    if (!/person/.test(m.kind || '') || !(typeof m.enabled === 'function' ? m.enabled() : m.enabled)) continue;
    const r = P.people && P.people[m.id];
    if (!r || !r.root || !r.root.visible) continue;
    const foot = new THREE.Vector3();
    r.root.getWorldPosition(foot);
    const head = m.anchor(new THREE.Vector3());
    const small = /small/.test(m.kind || '');
    const [fx, fy] = scr(foot.clone()),
      [hx, hy] = scr(head.clone());
    const side = scr(foot.clone().addScaledVector(right, (small ? 0.2 : 0.3) * (P.charScale || 1)));
    const half = Math.max(small ? 18 : 22, Math.hypot(side[0] - fx, side[1] - fy)) + 12; // body half-width + finger
    // distance from the tap to the segment feet -> head
    const sx = hx - fx,
      sy = hy - fy,
      L = sx * sx + sy * sy || 1,
      t = Math.max(0, Math.min(1, ((clientX - fx) * sx + (clientY - fy) * sy) / L));
    const d = Math.hypot(clientX - (fx + sx * t), clientY - (fy + sy * t));
    const pin = Math.hypot(clientX - hx, clientY - (hy - 30));
    // the current goal wins a close call (a tap between two people usually means the one the game points at)
    const score = Math.min(d / half, pin / 34) * (m.goal && m.goal() ? 0.7 : 1);
    if (score < 1 && score < bd) {
      bd = score;
      best = m;
    }
  }
  // a tap on the floor where the goal is to be used (its spot, the ring the game draws there) means the goal
  for (const m of game.markers.list) {
    if (!(m.goal && m.goal()) || !(typeof m.enabled === 'function' ? m.enabled() : m.enabled) || !m.spot) continue;
    const sp = m.spot();
    if (!sp) continue;
    const v = new THREE.Vector3(sp[0], P.floorY || 0, sp[1]);
    P.space.localToWorld(v);
    const [sx, sy] = scr(v),
      d = (Math.hypot(clientX - sx, clientY - sy) / 40) * 0.7;
    if (d < 1 && d < bd) {
      bd = d;
      best = m;
    }
  }
  return best;
}

// ---------- tap feedback on the floor ----------
// A dotted line along the path that the player eats up as he walks, a ring at the end that settles in, and for a
// tap that can't be reached, a small cross that shakes once and fades (with the soft 'nope' sound).
const OK = new THREE.Color('#6fd0c6'),
  BAD = new THREE.Color('#f08a7e');
export class PathPreview {
  constructor() {
    this.group = new THREE.Group();
    this.group.renderOrder = 3;
    const dm = new THREE.MeshBasicMaterial({ color: OK, transparent: true, opacity: 0.8, depthWrite: false });
    this.dotGeo = new THREE.CircleGeometry(0.035, 12);
    this.dotMat = dm;
    this.dots = [];
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.13, 0.17, 40),
      new THREE.MeshBasicMaterial({ color: OK, transparent: true, opacity: 0, depthWrite: false }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.renderOrder = 3;
    this.group.add(this.ring);
    this.ghost = new THREE.Mesh(
      new THREE.RingGeometry(0.07, 0.1, 24),
      new THREE.MeshBasicMaterial({ color: OK, transparent: true, opacity: 0, depthWrite: false }),
    );
    this.ghost.rotation.x = -Math.PI / 2;
    this.group.add(this.ghost);
    // the cross: two thin bars
    const xm = new THREE.MeshBasicMaterial({ color: BAD, transparent: true, opacity: 0, depthWrite: false });
    this.cross = new THREE.Group();
    for (const r of [Math.PI / 4, -Math.PI / 4]) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.05), xm);
      b.rotation.set(-Math.PI / 2, 0, r);
      this.cross.add(b);
    }
    this.crossMat = xm;
    this.group.add(this.cross);
    this.t = 0;
    this.mode = null;
    this.failT = -1;
  }
  attach(space, y) {
    if (this.group.parent !== space) space.add(this.group);
    this.group.position.y = y + 0.013;
    this.group.visible = true;
  }
  show(space, from, path, y, tapped) {
    this.attach(space, y);
    for (const d of this.dots) this.group.remove(d);
    this.dots = [];
    // dots every 0.22 along the path, skipping the first bit under his feet
    let prev = from,
      acc = 0.3;
    for (const q of path) {
      const dx = q[0] - prev[0],
        dz = q[1] - prev[1],
        L = Math.hypot(dx, dz);
      while (acc < L) {
        const m = new THREE.Mesh(this.dotGeo, this.dotMat.clone());
        m.rotation.x = -Math.PI / 2;
        m.position.set(prev[0] + (dx * acc) / L, 0, prev[1] + (dz * acc) / L);
        m.userData.i = this.dots.length;
        this.group.add(m);
        this.dots.push(m);
        acc += 0.22;
      }
      acc -= L;
      prev = q;
    }
    const end = path[path.length - 1];
    this.ring.position.set(end[0], 0, end[1]);
    this.ring.material.color.copy(OK);
    // tapped inside something: a faint small ring where the finger was, so the move to the nearest spot reads
    if (tapped) {
      this.ghost.position.set(tapped[0], 0, tapped[1]);
      this.ghost.material.opacity = 0.5;
    } else this.ghost.material.opacity = 0;
    this.t = 0;
    this.mode = 'walk';
    this.crossMat.opacity = 0;
    this.failT = -1;
  }
  fail(space, x, z, y) {
    this.attach(space, y);
    this.cross.position.set(x, 0, z);
    this.failT = 0;
  }
  arrived() {
    if (this.mode === 'walk') {
      this.mode = 'land';
      this.t = 0;
    }
  }
  clear() {
    for (const d of this.dots) this.group.remove(d);
    this.dots = [];
    this.mode = null;
    this.ring.material.opacity = 0;
    this.ghost.material.opacity = 0;
  }
  update(dt, p) {
    if (!this.group.parent) return;
    this.t += dt;
    if (this.mode === 'walk') {
      // the ring drops in (from a little bigger) and breathes while he walks
      const k = Math.min(1, this.t / 0.18);
      this.ring.scale.setScalar(1.5 - 0.5 * easeOut(k) + 0.04 * Math.sin(this.t * 5));
      this.ring.material.opacity = 0.85 * k;
      // dots light up one after another, then each fades once he has passed it
      for (const d of this.dots) {
        const on = Math.min(1, Math.max(0, (this.t * 18 - d.userData.i) / 3));
        const near = Math.hypot(d.position.x - p.x, d.position.z - p.z);
        d.userData.gone = d.userData.gone || near < 0.14;
        d.material.opacity = d.userData.gone ? Math.max(0, d.material.opacity - dt * 5) : 0.75 * on;
      }
      this.ghost.material.opacity = Math.max(0, this.ghost.material.opacity - dt * 0.8);
    } else if (this.mode === 'land') {
      // arrival: the ring widens and fades
      const k = Math.min(1, this.t / 0.35);
      this.ring.scale.setScalar(1 + 0.6 * easeOut(k));
      this.ring.material.opacity = 0.85 * (1 - k);
      for (const d of this.dots) d.material.opacity = Math.max(0, d.material.opacity - dt * 5);
      if (k >= 1) this.clear();
    }
    if (this.failT >= 0) {
      this.failT += dt;
      const k = this.failT / 0.7;
      this.crossMat.opacity = k < 0.1 ? (k / 0.1) * 0.9 : Math.max(0, 0.9 * (1 - (k - 0.45) / 0.55));
      this.cross.rotation.y = Math.sin(this.failT * 38) * 0.25 * Math.max(0, 1 - this.failT / 0.3);
      this.cross.scale.setScalar(0.8 + 0.2 * easeOut(Math.min(1, k * 3)));
      if (k >= 1) {
        this.failT = -1;
        this.crossMat.opacity = 0;
      }
    }
  }
}
const easeOut = (k) => 1 - (1 - k) ** 3;

// ---------- the movement check (fast test) ----------
// startMoveCheck(game): samples every game step (it rides on the player's update) and records to window.__moveCheck:
//   overlap  two characters (not both seated) closer than their two radii (less 0.03) for more than 2.5 s, or deeper
//            than the soft lean (GIVE) for more than 0.4 s (pairs passing through each other in a tight spot are exempt)
//   spin     the player turning faster than 3 rad/s while standing still and not taking turning steps, for > 0.25 s
// fast.mjs fails the build on any overlap or spin.
export function startMoveCheck(game) {
  const C = (window.__moveCheck = { overlaps: [], spins: [], steps: 0, notes: [] });
  const pl = game.player;
  if (!pl || pl._checked) return C;
  pl._checked = true;
  const orig = pl.update.bind(pl),
    near = new Map();
  let lastYaw = null,
    lastPos = null,
    spinT = 0;
  pl.update = (dt, ...a) => {
    orig(dt, ...a);
    if (!game.place || dt <= 0) return;
    C.steps++;
    // seated people count too, with their smaller radius (nobody should stand in a lap); two seated neighbours are fine
    const list = bodies(game).filter((b) => b.root.parent === game.place.space);
    const seen = new Set();
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const A = list[i],
          B = list[j],
          d = Math.hypot(A.x - B.x, A.z - B.z);
        if (A.seated && B.seated) continue;
        // soft collision: a lean into someone standing is fine for a moment (2.5 s), deeper than the lean for 0.4 s is
        // an overlap; two people passing through each other in a tight spot are let through
        if (isPassing(A.root, B.root)) continue;
        const soft = !isHard(A) && !isHard(B),
          deep = d < (A.r + B.r) * (soft ? 1 - GIVE : 1) - 0.03;
        if (d >= A.r + B.r - 0.03) continue;
        const k = A.id + '|' + B.id;
        seen.add(k);
        const t = (near.get(k) || 0) + dt;
        near.set(k, t);
        const lim = deep ? 0.4 : 2.5;
        if (t > lim && t - dt <= lim && C.overlaps.length < 50) {
          const tag = (b) =>
            `${b.id} [${b.x.toFixed(2)}, ${b.z.toFixed(2)}]${b.rig._walk ? ' walking' : ''}${b.rig.scripted ? ' scripted' : ''}${b.rig.state ? ' ' + b.rig.state : ''}`;
          const last = (window.__test && window.__test.log && window.__test.log.slice(-1)[0]) || '';
          C.overlaps.push(
            `${game.place.name}: ${A.id} and ${B.id} ${d.toFixed(2)} apart at t=${(game.t || 0).toFixed(1)}${game.busy ? ' (scene)' : ''}; ${tag(A)}; ${tag(B)}; last step: ${last}`,
          );
        }
      }
    for (const k of [...near.keys()]) if (!seen.has(k)) near.delete(k);
    const o = pl.root,
      w = game.walker;
    if (lastYaw !== null && !pl.seated && lastPos) {
      const dy = Math.abs(angDiff(o.rotation.y, lastYaw)) / dt,
        still = Math.hypot(o.position.x - lastPos[0], o.position.z - lastPos[1]) / dt < 0.05;
      spinT = dy > 3 && still && !(w && w.turning) ? spinT + dt : 0;
      if (spinT > 0.25 && spinT - dt <= 0.25 && C.spins.length < 50)
        C.spins.push(
          `${game.place.name}: Eric turning on the spot at t=${(game.t || 0).toFixed(1)}${game.busy ? ' (scene)' : ''}`,
        );
    }
    lastYaw = o.rotation.y;
    lastPos = [o.position.x, o.position.z];
  };
  return C;
}
