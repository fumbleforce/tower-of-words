import { rigOf, bodies, BODY, CORNER, turnToward, angDiff, BRAKE, ACCEL, TURN, FRAME_MAX, STEP_MAX } from './shared.js';
import { standOff } from './targets.js';
import { freeNear, reachableNear, clearOf, pathAround } from './navigation.js';
import { spaceFrom, isPassing, slideStep, isHard, press, followSpeed } from './crowd.js';
import * as THREE from 'three';

// ---------- scripted moves ----------
// walkRig(game, rig, [x, z], { speed, route = true, avoid = true, brakeTo = 0, run = false }): walk someone to a spot
// (a brisk walk when fast; the run clip only with run: true). Routed over
// the place's walk grid (never through desks), the end moved off anyone standing there, smooth turns, gait for the
// feet, waits for or steps round people in the way, and settles into idle at the end. Resolves on arrival, or after
// a stall (it never hangs a scene). Works on a bare Object3D too (the cat), without the animation parts.
export function walkRig(
  game,
  rigOrObj,
  to,
  { speed = 1.25, route = true, avoid = true, brakeTo = 0, settle = true, run = false } = {},
) {
  const rig = rigOrObj && rigOrObj.root ? rigOrObj : rigOf(game, rigOrObj);
  const obj = rig ? rig.root : rigOrObj;
  const walkToken = (obj.userData.walkTok = (obj.userData.walkTok || 0) + 1);
  obj.userData.walkVel = null;
  const parent = obj.parent;
  const P = game.place,
    nav = P && obj.parent === P.space ? P.nav : null;
  const player = game.player && obj === game.player.root;
  const self = (b) => b.root === obj;
  const hardMe = avoid && bodies(game).some((b) => self(b) && isHard(b)); // the cat keeps her distance, she doesn't lean in
  let [tx, tz] = avoid && game.place ? standOff(game, rig || { root: obj }, to) : to;
  const people = () => (avoid ? bodies(game).filter((b) => !self(b)) : []);
  // the destination: free floor, and not on top of someone
  if (nav && avoid) [tx, tz] = freeNear(nav, people(), tx, tz, BODY * (obj.scale.x || 1), spaceFrom(game, obj));
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
      obj.userData.walkVel = null;
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
    // one step of the walk (dt game seconds); true when it has ended
    const advance = (dt) => {
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
        return true;
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
        // walking the same way: follow at their pace, a small gap behind (never lean into someone walking away)
        const gap = ahead ? Math.hypot(ahead.x - p.x, ahead.z - p.z) - ahead.r - BODY * sc : 0,
          lead = ahead ? followSpeed(ahead, dx / (d || 1), dz / (d || 1), gap) : null;
        if (lead !== null) {
          want = Math.min(want, lead);
          waited = 0;
          wait = 1;
        } else if (ahead && ahead.rig._walk && waited < 0.9) {
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
          const [sx, sz] = slideStep(p.x, p.z, nx, nz, b, b.r + BODY * sc, fx, fz, step, hardMe || isHard(b));
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
      if (dt > 0) obj.userData.walkVel = [(nx - p.x) / dt, (nz - p.z) / dt]; // the pace a follower matches (followSpeed)
      p.x = nx;
      p.z = nz;
      obj.rotation.y = yaw;
      if (player && game.walker) game.walker.sync?.();
      if (dt > 0) {
        age += dt;
        stall = moved < 0.0015 && !wait ? stall + dt : 0;
        if (stall > 1.5 || age > limit) {
          done();
          return true;
        } // stuck behind something: end where it is rather than hang the scene
        if (rig) {
          const walking = moved / dt > 0.05 || Math.abs(angDiff(head, yaw)) > 0.5;
          rig.setState?.(walking ? 'walk' : 'idle');
          rig.setGait?.(walking ? Math.max(moved / dt, 0.3) / sc : null, { run });
        }
      }
      return false;
    };
    const tick = () => {
      if (obj.userData.walkTok !== walkToken) {
        res();
        return;
      }
      if (obj.parent !== parent || game.place !== P) {
        obj.userData.walkVel = null;
        if (rig) {
          rig._walk = false;
          rig._noAvoid = false;
        }
        res();
        return;
      }
      // the game loop's clock (main.js frame): as much game time as a frame covers, in steps no longer than the loop's,
      // so a walk keeps pace with everyone else and its following and avoiding stay steady on a slow frame
      const now = performance.now();
      const dt = game.paused ? 0 : Math.min(FRAME_MAX, (now - last) / 1000) * (game.timeScale || 1);
      last = now;
      if (!obj.parent && dt > 0) {
        done();
        return;
      }
      let left = dt;
      do {
        const s = Math.min(STEP_MAX, left);
        left -= s;
        if (advance(s)) return;
      } while (left > 1e-6);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

// Someone seated turns in the seat, round their hips (Mio's root is off her hips, so turning the root swung her out
// of the seat into the aisle), and only so far either way from how the seat faces: they don't sit sideways across
// the seat, legs in their neighbour.
const SEAT_TURN = 0.6; // rad
function seatTurn(rig, x, z) {
  const obj = rig.root,
    p = obj.position,
    off = rig.sitOff;
  const hx = p.x + (off ? off.x : 0),
    hz = p.z + (off ? off.z : 0);
  let s = obj.userData.seat;
  if (!s || Math.hypot(s.x - hx, s.z - hz) > 0.02) s = obj.userData.seat = { x: hx, z: hz, yaw: obj.rotation.y };
  const yaw = s.yaw + THREE.MathUtils.clamp(angDiff(Math.atan2(x - hx, z - hz), s.yaw), -SEAT_TURN, SEAT_TURN);
  // sitAt(hips x, seat top, hips z, facing) puts the hips back where they were
  if (off && rig.sitAt) rig.sitAt(hx, p.y + off.y - 0.07 * obj.scale.x, hz, yaw);
  else obj.rotation.y = yaw;
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
    seatTurn(rig, x, z);
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
// avoid: true for a move across open floor among other people (along the platform, behind Mio and round the cat):
// still straight, but it follows whoever walks ahead and goes round whoever stands in the way.
export function glide(g, obj, to, speed, avoid = false) {
  return walkRig(g, obj, to, { speed, route: false, avoid, brakeTo: 0.45, settle: false });
}

// One step of a set route (the lobby's commuters) that doesn't walk into anyone: with someone right in front they wait
// (a queue at the reader) for up to 2 s, then carry on and softSeparate eases them round. Returns 0 when there, 1
// after a step, 2 while waiting.
export function queueStep(game, rig, tx, tz, speed, dt) {
  const p = rig.root.position,
    d = Math.hypot(tx - p.x, tz - p.z);
  rig._walk = d >= 0.04;
  if (!rig._walk) return 0;
  const fx = (tx - p.x) / d,
    fz = (tz - p.z) / d,
    list = bodies(game),
    me = list.find((b) => b.root === rig.root);
  const ahead = list.find((b) => {
    if (!me || b === me || isPassing(rig.root, b.root)) return false;
    const bx = b.x - me.x,
      bz = b.z - me.z,
      bd = Math.hypot(bx, bz) || 1e-4;
    return bd < b.r + me.r + 0.08 && (bx * fx + bz * fz) / bd > 0.5;
  });
  rig._queue = ahead ? (rig._queue || 0) + dt : 0;
  if (ahead && rig._queue < 2) return 2;
  const s = Math.min(d, speed * dt);
  p.x += fx * s;
  p.z += fz * s;
  return 1;
}
