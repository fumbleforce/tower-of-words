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

const ACCEL = 5.5;       // m/s² from standing
const BRAKE = 7.5;       // m/s² when stopping (keys released, or the end of a path)
const TURN = 9;          // rad/s at most
const CORNER = 0.32;     // start turning toward the next waypoint this far before a corner
const BODY = 0.24;       // a person's radius (place units, times the character scale): two people stand about a body apart
const TALK = 0.66;       // talking distance, centre to centre (times the character scale)

const angDiff = (a, b) => { const d = a - b; return Math.atan2(Math.sin(d), Math.cos(d)); };
// one smooth turn step: eases in on the target, never faster than the turn rate, and always finishes
export function turnToward(cur, target, dt, rate = TURN) {
  const d = angDiff(target, cur), a = Math.abs(d);
  if (a < 1e-4) return target;
  const step = Math.min(a, rate * dt, Math.max(a * (1 - Math.exp(-dt * 12)), 0.6 * dt));
  return cur + Math.sign(d) * step;
}

// ---------- who is where ----------
const _v = new THREE.Vector3();
// every visible person in the place, in the place's walk-grid space: { id, rig, root, x, z, r, seated }
export function bodies(game) {
  const P = game && game.place; if (!P || !P.space) return [];
  const out = [], seen = new Set(), K = P.charScale || 1;
  const add = (id, r) => {
    if (!r || !r.root || seen.has(r.root) || !r.root.visible || !r.root.parent) return;
    seen.add(r.root); r.root.getWorldPosition(_v); P.space.worldToLocal(_v);
    out.push({ id, rig: r, root: r.root, x: _v.x, z: _v.z, r: (id === 'tama' ? 0.12 : BODY) * K, seated: !!r.seated });
  };
  add('eric', game.player); add('mio', game.mioNpc);
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
  const g = nav.grid, nx = nav.nx, s0 = nav.nearestFree(...nav.cellOf(sx, sz)); if (!s0) return null;
  const seen = new Uint8Array(g.length), q = [s0[1] * nx + s0[0]]; seen[q[0]] = 1;
  let best = null, bd = 1e9;
  for (let h = 0; h < q.length; h++) {
    const c = q[h], x = c % nx, z = (c / nx) | 0;
    const wx = nav.x0 + (x + 0.5) * nav.cell, wz = nav.z0 + (z + 0.5) * nav.cell, d = Math.hypot(wx - tx, wz - tz);
    if (d < bd) { bd = d; best = [wx, wz]; }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = x + dx, b = z + dz; if (a < 0 || b < 0 || a >= nx || b >= nav.nz) continue;
      const n = b * nx + a; if (!seen[n] && g[n]) { seen[n] = 1; q.push(n); }
    }
  }
  return best;
}
// a free spot near (x, z) that no one else stands on (for NPC destinations and approach points)
function clearOf(list, x, z, rad) { return list.every((b) => Math.hypot(b.x - x, b.z - z) >= b.r + rad); }
function freeNear(nav, list, x, z, rad) {
  if ((!nav || nav.free(x, z, nav.R + 0.02)) && clearOf(list, x, z, rad)) return [x, z];
  for (let ring = 1; ring <= 6; ring++) {
    const d = ring * 0.14; let best = null, bd = 1e9;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d;
      if (nav && !nav.free(cx, cz, nav.R + 0.02)) continue;
      if (!clearOf(list, cx, cz, rad)) continue;
      const k = Math.hypot(cx - x, cz - z); if (k < bd) { bd = k; best = [cx, cz]; }
    }
    if (best) return best;
  }
  return [x, z];
}

// One step that doesn't walk into someone: the part of the step toward them is dropped (so someone already too close
// can still move away or round them), the step stops at the edge of their circle, and a head-on meeting sidesteps to
// the right (both keep right, so two people meeting in a corridor pass).
function slideStep(ox, oz, nx, nz, b, rr, fx, fz, step) {
  const e = Math.hypot(nx - b.x, nz - b.z); if (e >= rr) return [nx, nz];
  const o = Math.hypot(ox - b.x, oz - b.z) || 1e-4, ux = (ox - b.x) / o, uz = (oz - b.z) / o;
  let mx = nx - ox, mz = nz - oz; const rad = mx * ux + mz * uz; if (rad < 0) { mx -= rad * ux; mz -= rad * uz; }
  let x = ox + mx, z = oz + mz;
  if (o >= rr) { const e2 = Math.hypot(x - b.x, z - b.z) || 1e-4; if (e2 < rr) { x = b.x + ((x - b.x) / e2) * rr; z = b.z + ((z - b.z) / e2) * rr; } }
  if ((x - ox) * fx + (z - oz) * fz < step * 0.3) { x += -fz * step * 0.9; z += fx * step * 0.9; }
  return [x, z];
}
// a route that goes round the people standing in the way (they're blocked on the walk grid just for this search)
function pathAround(nav, from, to, list, myR) {
  for (const b of list) { const r = Math.max(0.05, b.r + myR - nav.R); nav.blockTagged('_people', b.x - r, b.x + r, b.z - r, b.z + r); }
  const path = nav.path(from[0], from[1], to[0], to[1]);
  nav.unblock('_people');
  return path && path.length ? path : null;
}

export class SmoothWalker extends Walker {
  constructor(body, nav, opts = {}) {
    super(body, nav, opts);
    this.v = 0;                           // current ground speed (place units / s)
    this.vx = 0; this.vz = 0;             // current direction of travel
    this.gait = { v: 0, k: 0 };
    this.preview = new PathPreview();
    this.others = opts.others || (() => bodies(window.__game).filter((b) => b.root !== this.body));
    this._yaw = undefined; this._facing = undefined; this._pos = null;
  }
  stop() { super.stop(); this.preview.clear(); }
  goTo(x, z, arrive) { this.preview.clear(); super.goTo(x, z, arrive); }
  // snap the walker to the body as it is now (after a trip or a sit): no leftover turn, no leftover speed
  sync() { this.facing = this.targetFacing = this.body.rotation.y; this.v = 0; this._yaw = this._facing = this.facing; const p = this.body.position; this._pos = [p.x, p.z]; }
  // a tap on the floor (or not): walk there with the preview, or show that it can't be reached
  tapRay(raycaster, place) {
    const p = place.pick(raycaster);
    const y = place.floorY || 0;
    const space = place.space;
    if (!p) {
      // missed the floor (a wall, the sky): mark where the ray meets the floor plane, if it does
      const pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), w = new THREE.Vector3();
      const r = raycaster.ray.clone(); if (space) { const inv = new THREE.Matrix4().copy(space.matrixWorld).invert(); r.applyMatrix4(inv); }
      const N = this.nav;
      if (r.intersectPlane(pl, w) && w.x > N.x0 && w.x < N.x1 && w.z > N.z0 && w.z < N.z1) this.preview.fail(space, w.x, w.z, y);
      sfx('nope');
      return 'miss';
    }
    const from = this.body.position, N = this.nav;
    const inside = p.x > N.x0 && p.x < N.x1 && p.z > N.z0 && p.z < N.z1;
    // a tap on someone's feet: stop short of them instead of walking into them
    const others = this.others(), myR = BODY * (this.body.scale.x || 1), on = others.find((o) => Math.hypot(o.x - p.x, o.z - p.z) < o.r + myR);
    let tx = p.x, tz = p.z;
    if (on) { const d = Math.hypot(from.x - on.x, from.z - on.z) || 1; tx = on.x + ((from.x - on.x) / d) * (on.r + myR + 0.1); tz = on.z + ((from.z - on.z) / d) * (on.r + myR + 0.1); }
    let path = inside ? N.path(from.x, from.z, tx, tz) : null;
    let last = path && path.length ? path[path.length - 1] : null;
    // the tap is somewhere he can't stand (inside furniture, a closed room): walk to the nearest floor he can reach
    if (inside && (!last || Math.hypot(last[0] - tx, last[1] - tz) > 0.8)) {
      const near = reachableNear(N, from.x, from.z, tx, tz);
      if (near && Math.hypot(near[0] - tx, near[1] - tz) < 2.0) { path = N.path(from.x, from.z, near[0], near[1]); last = path && path.length ? path[path.length - 1] : null; if (last) { tx = last[0]; tz = last[1]; } }
    }
    // unreachable: off the walkable map, no route, or the nearest reachable spot is well away from the tap
    // (a wall, a closed room): don't walk off somewhere else, say no where the finger was
    if (!last || Math.hypot(last[0] - tx, last[1] - tz) > 0.8) {
      if (inside) this.preview.fail(space, p.x, p.z, y); sfx('nope'); return 'fail';   // a walk already under way carries on
    }
    this.path = path; this.arrive = null;
    const end = path[path.length - 1];
    const moved = Math.hypot(end[0] - p.x, end[1] - p.z) > 0.25;   // tapped inside furniture: goes to the nearest free spot
    this.preview.show(space, [from.x, from.z], path, y, moved ? [p.x, p.z] : null);
    return moved ? 'near' : 'ok';
  }
  update(dt, camera) {
    const p = this.body.position;
    // someone else turned or moved him (a trip, a sit, a stand, the story): take that as the new state, so he
    // doesn't turn back to an old target or carry old speed into the next frame
    if (this._yaw !== undefined && Math.abs(angDiff(this.body.rotation.y, this._yaw)) > 1e-3) { this.facing = this.targetFacing = this.body.rotation.y; this.v = 0; }
    else if (this._facing !== undefined && Math.abs(angDiff(this.facing, this._facing)) > 1e-3) this.targetFacing = this.facing;
    if (this._pos && Math.hypot(p.x - this._pos[0], p.z - this._pos[1]) > 0.02) this.v = 0;
    let mx = 0, mz = 0, keys = false, remain = Infinity;
    const k = (a, b) => this.keys.has(a) || this.keys.has(b);
    const up = k('ArrowUp', 'KeyW'), dn = k('ArrowDown', 'KeyS'), lf = k('ArrowLeft', 'KeyA'), rt = k('ArrowRight', 'KeyD');
    const others = this.others();
    const R = BODY * (this.body.scale.x || 1);   // his own body, for people (walls use the grid's own radius)
    if (!this.locked && (up || dn || lf || rt)) {
      if (this.path) { this.path = null; this.arrive = null; this.preview.clear(); }
      const f = new THREE.Vector3(); camera.getWorldDirection(f);
      const par = this.body.parent;
      if (par) { const q = new THREE.Quaternion(); par.getWorldQuaternion(q); f.applyQuaternion(q.invert()); }
      f.y = 0; f.normalize();
      const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
      const iy = (up ? 1 : 0) - (dn ? 1 : 0), ix = (rt ? 1 : 0) - (lf ? 1 : 0);
      mx = f.x * iy + r.x * ix; mz = f.z * iy + r.z * ix; keys = true;
    } else if (this.path && !this.locked) {
      // corner rounding: once close to a waypoint that isn't the last, aim at the next one if the way is clear
      while (this.path.length > 1 && Math.hypot(this.path[0][0] - p.x, this.path[0][1] - p.z) < CORNER && this.nav.clear([p.x, p.z], this.path[1])) this.path.shift();
      const [tx, tz] = this.path[0];
      mx = tx - p.x; mz = tz - p.z;
      remain = Math.hypot(mx, mz); for (let i = 1; i < this.path.length; i++) remain += Math.hypot(this.path[i][0] - this.path[i - 1][0], this.path[i][1] - this.path[i - 1][1]);
      // the end of the path is taken by someone: arrive at the edge of them, not on top
      const last = this.path[this.path.length - 1];
      const taker = others.find((o) => Math.hypot(o.x - last[0], o.z - last[1]) < o.r + R);
      const blockedEnd = taker && Math.hypot(p.x - taker.x, p.z - taker.z) < taker.r + R + 0.06 && remain < 1.0;
      if (Math.hypot(mx, mz) < 0.05 || blockedEnd) {
        this.path.shift();
        if (!this.path.length || blockedEnd) {
          this.path = null; mx = mz = 0; this.preview.arrived();
          if (this.arrive) { const a = this.arrive; this.arrive = null; a(); }
        }
      }
    }
    const len = Math.hypot(mx, mz);
    // wanted speed: full, less when the facing is far off (turn first, don't moonwalk), braking into the end of a path
    let want = 0;
    if (len > 1e-4) {
      mx /= len; mz /= len;
      want = this.speed;
      const ang = Math.abs(angDiff(Math.atan2(mx, mz), this.facing));
      want *= THREE.MathUtils.clamp((Math.cos(ang) + 0.35) / 1.35, this.v > 0.4 ? 0.35 : 0.12, 1);
      if (!keys && remain < Infinity) want = Math.min(want, Math.sqrt(2 * BRAKE * 0.6 * remain) + 0.15);
      this.targetFacing = Math.atan2(mx, mz);
      // the direction of travel swings round smoothly too (no instant sideways moves)
      const blend = 1 - Math.exp(-dt * 16);
      this.vx += (mx - this.vx) * blend; this.vz += (mz - this.vz) * blend;
    }
    const a = want > this.v ? ACCEL : BRAKE;
    this.v += THREE.MathUtils.clamp(want - this.v, -a * dt, a * dt);
    let moved = 0;
    if (this.v > 1e-3) {
      const dl = Math.hypot(this.vx, this.vz) || 1, step = this.v * dt;
      const ox = p.x, oz = p.z;
      let [nx, nz] = this.nav.collide(ox + (this.vx / dl) * step, oz + (this.vz / dl) * step, ox, oz);
      // people: never step into someone; slide round them, keep right when meeting head-on
      const tl = Math.hypot(this.vx, this.vz) || 1, fx = this.vx / tl, fz = this.vz / tl;
      let blockedBy = null;
      for (const o of others) {
        const [sx, sz] = slideStep(ox, oz, nx, nz, o, o.r + R, fx, fz, step);
        if (sx === nx && sz === nz) continue;
        blockedBy = o;
        if (this.nav.free(sx, sz)) { nx = sx; nz = sz; } else { nx = ox; nz = oz; }
      }
      // held up by someone on a tapped route for a moment: plan round them
      this.blockT = blockedBy && this.path ? (this.blockT || 0) + dt : 0;
      if (this.blockT > 0.4 && this.path) {
        this.blockT = -1.5;   // not again straight away
        const end = this.path[this.path.length - 1], alt = pathAround(this.nav, [ox, oz], end, others.filter((o) => !o.seated), R);
        if (alt) this.path = alt;
      }
      p.x = nx; p.z = nz;
      moved = Math.hypot(nx - ox, nz - oz);
      // blocked: the speed drops to what actually happened (sliding along a wall is slower)
      if (step > 1e-5) this.v = Math.min(this.v, (moved / dt) * 1.02 + 0.02);
      if (this.path) {
        this.stuck = moved < step * 0.2 ? this.stuck + dt : 0;
        if (this.stuck > 0.5) { this.stuck = 0; const ar = this.arrive; this.path = null; this.arrive = null; this.preview.clear(); if (ar) ar(); }
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
    this.gait.v = this.moving ? this.v / sc : this.turning ? 0.3 : 0; this.gait.k = this.moving ? this.v / this.speed : 0;
    this.preview.update(dt, p);
    this._yaw = this.body.rotation.y; this._facing = this.facing; this._pos = [p.x, p.z];
    return this.moving || this.turning;
  }
}

// ---------- scripted moves ----------
// walkRig(game, rig, [x, z], { speed, route = true, avoid = true, brakeTo = 0 }): walk someone to a spot. Routed over
// the place's walk grid (never through desks), the end moved off anyone standing there, smooth turns, gait for the
// feet, waits for or steps round people in the way, and settles into idle at the end. Resolves on arrival, or after
// a stall (it never hangs a scene). Works on a bare Object3D too (the cat), without the animation parts.
export function walkRig(game, rigOrObj, to, { speed = 1.25, route = true, avoid = true, brakeTo = 0, settle = true } = {}) {
  const rig = rigOrObj && rigOrObj.root ? rigOrObj : rigOf(game, rigOrObj);
  const obj = rig ? rig.root : rigOrObj;
  const P = game.place, nav = P && obj.parent === P.space ? P.nav : null;
  const player = game.player && obj === game.player.root;
  const self = (b) => b.root === obj;
  let [tx, tz] = to;
  const people = () => (avoid ? bodies(game).filter((b) => !self(b)) : []);
  // the destination: free floor, and not on top of someone
  if (nav && avoid) [tx, tz] = freeNear(nav, people().filter((b) => b.id !== 'tama'), tx, tz, BODY * (obj.scale.x || 1));
  let path = null;
  if (route && nav) {
    path = nav.path(obj.position.x, obj.position.z, tx, tz);
    if (path && path.length) path[path.length - 1] = [tx, tz];
    else {
      // no way through (a shut door, a closed room): go as close as the floor allows, never through a wall
      const near = reachableNear(nav, obj.position.x, obj.position.z, tx, tz);
      if (near) { [tx, tz] = near; path = nav.path(obj.position.x, obj.position.z, tx, tz); }
      console.warn('walkRig: no route to', to, near ? 'going to the nearest reachable spot' : 'staying put');
      if (!path || !path.length) path = [[obj.position.x, obj.position.z]];
    }
  }
  if (!path || !path.length) path = [[tx, tz]];
  if (rig) rig._walk = true;
  let v = 0, yaw = obj.rotation.y, stall = 0, wait = 0, waited = 0, age = 0, blockT = 0;
  let plen = 0; { let q = [obj.position.x, obj.position.z]; for (const w of path) { plen += Math.hypot(w[0] - q[0], w[1] - q[1]); q = w; } }
  const limit = plen / Math.max(0.3, speed) * 3 + 6;   // a hard cap: whatever happens, the walk ends
  const sc = obj.scale.x || 1;
  return new Promise((res) => {
    let last = performance.now();
    const done = () => {
      if (rig) { rig._walk = false; if (settle && !rig.seated) { rig.setGait?.(null); rig.setState?.('idle'); } }
      if (player && game.walker) game.walker.sync?.();
      res();
    };
    const tick = () => {
      const now = performance.now(); let dt = Math.min(0.05, (now - last) / 1000) * (game.timeScale || 1); last = now;
      if (game.paused) dt = 0;
      if (!obj.parent && dt > 0) { done(); return; }
      const p = obj.position;
      while (path.length > 1 && Math.hypot(path[0][0] - p.x, path[0][1] - p.z) < (route ? CORNER : 0.05) && (!nav || nav.clear([p.x, p.z], path[1]))) path.shift();
      const [gx, gz] = path[0];
      const dx = gx - p.x, dz = gz - p.z, d = Math.hypot(dx, dz);
      let remain = d; for (let i = 1; i < path.length; i++) remain += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
      if (remain < 0.03 || (path.length === 1 && d < 0.03)) { p.x = tx; p.z = tz; if (settle) obj.rotation.y = yaw; done(); return; }
      const head = Math.atan2(dx, dz);
      yaw = turnToward(yaw, head, dt);
      let want = speed * THREE.MathUtils.clamp((Math.cos(angDiff(head, yaw)) + 0.35) / 1.35, v > 0.4 ? 0.3 : 0.12, 1);
      want = Math.min(want, Math.sqrt(2 * BRAKE * 0.6 * remain) + Math.max(0.15, brakeTo * speed));
      // someone right in front: wait a moment (the player first of all), then step round
      if (avoid && dt > 0) {
        const ahead = people().find((b) => { const bx = b.x - p.x, bz = b.z - p.z, bd = Math.hypot(bx, bz); return bd < b.r + BODY * sc + 0.25 && (bx * dx + bz * dz) / (bd * d || 1) > 0.5; });
        if (ahead && waited < 0.9) { want = 0; waited += dt; wait = 1; } else { wait = 0; if (!ahead) waited = 0; }
      }
      v += THREE.MathUtils.clamp(want - v, -(want > v ? ACCEL : BRAKE) * dt, (want > v ? ACCEL : BRAKE) * dt);
      const step = Math.min(v * dt, remain);
      let nx = p.x + Math.sin(yaw) * step, nz = p.z + Math.cos(yaw) * step;
      // mostly along the way it faces, pulled onto the line to the waypoint so turns don't swing wide
      if (d > 1e-4) { const k = Math.min(1, dt * 6); nx += ((p.x + (dx / d) * step) - nx) * k; nz += ((p.z + (dz / d) * step) - nz) * k; }
      let blockedBy = null;
      if (avoid) {
        const fx = Math.sin(yaw), fz = Math.cos(yaw), list = people();
        for (const b of list) {
          const [sx, sz] = slideStep(p.x, p.z, nx, nz, b, b.r + BODY * sc, fx, fz, step);
          if (sx === nx && sz === nz) continue;
          blockedBy = b;
          if (!nav || nav.free(sx, sz)) { nx = sx; nz = sz; } else { nx = p.x; nz = p.z; }
        }
        // held up by someone for a moment: plan a way round everyone standing
        blockT = blockedBy && !wait ? blockT + dt : 0;
        if (blockT > 0.5 && nav && route !== false) {
          blockT = -1.5;
          const alt = pathAround(nav, [p.x, p.z], [tx, tz], list.filter((b) => !b.seated), BODY * sc);
          if (alt) { path = alt; path[path.length - 1] = [tx, tz]; }
        }
      }
      const moved = Math.hypot(nx - p.x, nz - p.z);
      p.x = nx; p.z = nz; obj.rotation.y = yaw;
      if (player && game.walker) game.walker.sync?.();
      if (dt > 0) {
        age += dt;
        stall = moved < 0.0015 && !wait ? stall + dt : 0;
        if (stall > 1.5 || age > limit) { done(); return; }   // stuck behind something: end where it is rather than hang the scene
        if (rig) {
          const walking = moved / dt > 0.05 || Math.abs(angDiff(head, yaw)) > 0.5;
          rig.setState?.(walking ? 'walk' : 'idle'); rig.setGait?.(walking ? Math.max(moved / dt, 0.3) / sc : null);
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
  if (game.player && obj === game.player.root && game.walker) { game.walker.faceTo(x, z); return Promise.resolve(); }
  const target = Math.atan2(x - obj.position.x, z - obj.position.z);
  if (rig && rig.seated) { obj.rotation.y = target; return Promise.resolve(); }
  const token = (obj.userData.faceTok = (obj.userData.faceTok || 0) + 1);
  const stepping = rig && !rig._walk && Math.abs(angDiff(target, obj.rotation.y)) > 0.6;
  return new Promise((res) => {
    let last = performance.now();
    const tick = () => {
      if (obj.userData.faceTok !== token || (rig && rig._walk)) { res(); return; }
      const now = performance.now(), dt = game.paused ? 0 : Math.min(0.05, (now - last) / 1000) * (game.timeScale || 1); last = now;
      obj.rotation.y = turnToward(obj.rotation.y, target, dt, TURN * 0.8);
      const left = Math.abs(angDiff(target, obj.rotation.y));
      if (stepping) { rig.setState?.(left > 0.05 ? 'walk' : 'idle'); rig.setGait?.(left > 0.05 ? 0.3 : null); }
      if (left < 1e-3) { obj.rotation.y = target; res(); return; }
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
  const o = rig.root, P = game.place, nav = P && o.parent === P.space ? P.nav : null;
  if (rig.seated) { rig.seated = false; rig.setState?.('idle'); }
  o.position.y = 0;
  const others = bodies(game).filter((b) => b.root !== o && !b.seated && b.id !== 'tama');
  const x = o.position.x, z = o.position.z + dz;
  // search along the aisle (x) first, both ways, then anywhere near
  let spot = null;
  for (const ox of [0, 0.2, -0.2, 0.4, -0.4, 0.6, -0.6]) {
    const cx = x + ox; if (nav && !nav.free(cx, z, nav.R + 0.02)) continue;
    if (clearOf(others, cx, z, BODY * (P.charScale || 1) + 0.04)) { spot = [cx, z]; break; }
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
export function glide(g, obj, to, speed) { return walkRig(g, obj, to, { speed, route: false, avoid: false, brakeTo: 0.45, settle: false }); }

// ---------- talking to someone ----------
// Where Eric should stand to talk to a standing person: a talking distance away, on the side he comes from, leaning
// toward their front (no walking round behind someone to reach their face); never inside furniture or another person. Null for seated people (their
// places keep hand-placed spots) and for things.
export function approachSpot(game, item) {
  const P = game.place; if (!P || !item || !/person/.test(item.kind || '')) return null;
  const r = P.people && P.people[item.id]; if (!r || !r.root || r.seated || !r.root.visible) return null;
  const nav = P.nav, K = P.charScale || 1, me = game.player.root.position;
  // their place and heading in the walk grid's space (a rig can sit inside a sub-group of the place)
  const c = r.root.getWorldPosition(new THREE.Vector3()); P.space.worldToLocal(c);
  const f = new THREE.Vector3(0, 0, 1).applyQuaternion(r.root.getWorldQuaternion(new THREE.Quaternion()));
  f.applyQuaternion(P.space.getWorldQuaternion(new THREE.Quaternion()).invert());
  const x = c.x, z = c.z, yaw = Math.atan2(f.x, f.z);
  const D = (item.id === 'tama' ? 0.5 : TALK) * K;
  const others = bodies(game).filter((b) => b.root !== r.root && b.root !== game.player.root);
  const toMe = Math.atan2(me.x - x, me.z - z);
  const cands = [];
  for (const dist of [D, D * 0.85, D * 1.2]) for (let i = 0; i < 16; i++) {
    const a = yaw + (i / 16) * Math.PI * 2, cx = x + Math.sin(a) * dist, cz = z + Math.cos(a) * dist;
    if (nav && !nav.free(cx, cz, nav.R + 0.02)) continue;
    if (!clearOf(others, cx, cz, BODY * K)) continue;
    cands.push([Math.abs(angDiff(a, yaw)) * 0.45 + Math.abs(angDiff(a, toMe)) * 0.75 + Math.hypot(cx - me.x, cz - me.z) * 0.15 + Math.abs(dist - D) * 2, cx, cz]);
  }
  cands.sort((p, q) => p[0] - q[0]);
  // the best one he can actually walk to
  for (const [, cx, cz] of cands.slice(0, 8)) {
    if (!nav) return [cx, cz];
    const path = nav.path(me.x, me.z, cx, cz), end = path && path[path.length - 1];
    if (end && Math.hypot(end[0] - cx, end[1] - cz) < 0.15) return [cx, cz];
  }
  return null;
}

// ---------- tapping people ----------
// A tap near a person, or on the floor where the current goal is used, picks them: the distance from the tap to their body (a capsule from the feet to the head,
// as wide as the body on screen plus a finger's margin) or to their pin. People win over things and the floor.
export function pickPerson(game, clientX, clientY, canvas) {
  const P = game.place; if (!P || !game.markers) return null;
  const rect = canvas.getBoundingClientRect(), W = rect.width, H = rect.height, cam = P.camera;
  const scr = (v) => { v.project(cam); return [((v.x + 1) / 2) * W + rect.left, ((1 - v.y) / 2) * H + rect.top]; };
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
  let best = null, bd = 1e9;
  for (const m of game.markers.list) {
    if (!/person/.test(m.kind || '') || !(typeof m.enabled === 'function' ? m.enabled() : m.enabled)) continue;
    const r = P.people && P.people[m.id]; if (!r || !r.root || !r.root.visible) continue;
    const foot = new THREE.Vector3(); r.root.getWorldPosition(foot);
    const head = m.anchor(new THREE.Vector3());
    const small = /small/.test(m.kind || '');
    const [fx, fy] = scr(foot.clone()), [hx, hy] = scr(head.clone());
    const side = scr(foot.clone().addScaledVector(right, (small ? 0.2 : 0.3) * (P.charScale || 1)));
    const half = Math.max(small ? 18 : 22, Math.hypot(side[0] - fx, side[1] - fy)) + 12;   // body half-width + finger
    // distance from the tap to the segment feet -> head
    const sx = hx - fx, sy = hy - fy, L = sx * sx + sy * sy || 1, t = Math.max(0, Math.min(1, ((clientX - fx) * sx + (clientY - fy) * sy) / L));
    const d = Math.hypot(clientX - (fx + sx * t), clientY - (fy + sy * t));
    const pin = Math.hypot(clientX - hx, clientY - (hy - 30));
    // the current goal wins a close call (a tap between two people usually means the one the game points at)
    const score = Math.min(d / half, pin / 34) * (m.goal && m.goal() ? 0.7 : 1);
    if (score < 1 && score < bd) { bd = score; best = m; }
  }
  // a tap on the floor where the goal is to be used (its spot, the ring the game draws there) means the goal
  for (const m of game.markers.list) {
    if (!(m.goal && m.goal()) || !(typeof m.enabled === 'function' ? m.enabled() : m.enabled) || !m.spot) continue;
    const sp = m.spot(); if (!sp) continue;
    const v = new THREE.Vector3(sp[0], P.floorY || 0, sp[1]); P.space.localToWorld(v);
    const [sx, sy] = scr(v), d = Math.hypot(clientX - sx, clientY - sy) / 40 * 0.7;
    if (d < 1 && d < bd) { bd = d; best = m; }
  }
  return best;
}

// ---------- tap feedback on the floor ----------
// A dotted line along the path that the player eats up as he walks, a ring at the end that settles in, and for a
// tap that can't be reached, a small cross that shakes once and fades (with the soft 'nope' sound).
const OK = new THREE.Color('#6fd0c6'), BAD = new THREE.Color('#f08a7e');
export class PathPreview {
  constructor() {
    this.group = new THREE.Group(); this.group.renderOrder = 3;
    const dm = new THREE.MeshBasicMaterial({ color: OK, transparent: true, opacity: 0.8, depthWrite: false });
    this.dotGeo = new THREE.CircleGeometry(0.035, 12); this.dotMat = dm;
    this.dots = [];
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.17, 40), new THREE.MeshBasicMaterial({ color: OK, transparent: true, opacity: 0, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.renderOrder = 3; this.group.add(this.ring);
    this.ghost = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.1, 24), new THREE.MeshBasicMaterial({ color: OK, transparent: true, opacity: 0, depthWrite: false }));
    this.ghost.rotation.x = -Math.PI / 2; this.group.add(this.ghost);
    // the cross: two thin bars
    const xm = new THREE.MeshBasicMaterial({ color: BAD, transparent: true, opacity: 0, depthWrite: false });
    this.cross = new THREE.Group();
    for (const r of [Math.PI / 4, -Math.PI / 4]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.05), xm); b.rotation.set(-Math.PI / 2, 0, r); this.cross.add(b); }
    this.crossMat = xm; this.group.add(this.cross);
    this.t = 0; this.mode = null; this.failT = -1;
  }
  attach(space, y) { if (this.group.parent !== space) space.add(this.group); this.group.position.y = y + 0.013; this.group.visible = true; }
  show(space, from, path, y, tapped) {
    this.attach(space, y);
    for (const d of this.dots) this.group.remove(d); this.dots = [];
    // dots every 0.22 along the path, skipping the first bit under his feet
    let prev = from, acc = 0.3;
    for (const q of path) {
      const dx = q[0] - prev[0], dz = q[1] - prev[1], L = Math.hypot(dx, dz);
      while (acc < L) { const m = new THREE.Mesh(this.dotGeo, this.dotMat.clone()); m.rotation.x = -Math.PI / 2; m.position.set(prev[0] + (dx * acc) / L, 0, prev[1] + (dz * acc) / L); m.userData.i = this.dots.length; this.group.add(m); this.dots.push(m); acc += 0.22; }
      acc -= L; prev = q;
    }
    const end = path[path.length - 1];
    this.ring.position.set(end[0], 0, end[1]); this.ring.material.color.copy(OK);
    // tapped inside something: a faint small ring where the finger was, so the move to the nearest spot reads
    if (tapped) { this.ghost.position.set(tapped[0], 0, tapped[1]); this.ghost.material.opacity = 0.5; } else this.ghost.material.opacity = 0;
    this.t = 0; this.mode = 'walk';
    this.crossMat.opacity = 0; this.failT = -1;
  }
  fail(space, x, z, y) {
    this.attach(space, y);
    this.cross.position.set(x, 0, z); this.failT = 0;
  }
  arrived() { if (this.mode === 'walk') { this.mode = 'land'; this.t = 0; } }
  clear() { for (const d of this.dots) this.group.remove(d); this.dots = []; this.mode = null; this.ring.material.opacity = 0; this.ghost.material.opacity = 0; }
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
      this.ring.scale.setScalar(1 + 0.6 * easeOut(k)); this.ring.material.opacity = 0.85 * (1 - k);
      for (const d of this.dots) d.material.opacity = Math.max(0, d.material.opacity - dt * 5);
      if (k >= 1) this.clear();
    }
    if (this.failT >= 0) {
      this.failT += dt; const k = this.failT / 0.7;
      this.crossMat.opacity = k < 0.1 ? k / 0.1 * 0.9 : Math.max(0, 0.9 * (1 - (k - 0.45) / 0.55));
      this.cross.rotation.y = Math.sin(this.failT * 38) * 0.25 * Math.max(0, 1 - this.failT / 0.3);
      this.cross.scale.setScalar(0.8 + 0.2 * easeOut(Math.min(1, k * 3)));
      if (k >= 1) { this.failT = -1; this.crossMat.opacity = 0; }
    }
  }
}
const easeOut = (k) => 1 - (1 - k) ** 3;

// ---------- the movement check (fast test) ----------
// startMoveCheck(game): samples every game step (it rides on the player's update) and records to window.__moveCheck:
//   overlap  two standing characters closer than their two radii (less 0.03) for more than 0.4 s of game time
//   spin     the player turning faster than 3 rad/s while standing still and not taking turning steps, for > 0.25 s
// fast.mjs fails the build on any overlap or spin.
export function startMoveCheck(game) {
  const C = (window.__moveCheck = { overlaps: [], spins: [], steps: 0 });
  const pl = game.player; if (!pl || pl._checked) return C; pl._checked = true;
  const orig = pl.update.bind(pl), near = new Map(); let lastYaw = null, lastPos = null, spinT = 0;
  pl.update = (dt, ...a) => {
    orig(dt, ...a);
    if (!game.place || dt <= 0) return;
    C.steps++;
    const list = bodies(game).filter((b) => !b.seated && b.root.parent === game.place.space);
    const seen = new Set();
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const A = list[i], B = list[j], d = Math.hypot(A.x - B.x, A.z - B.z);
      if (d >= A.r + B.r - 0.03) continue;
      const k = A.id + '|' + B.id; seen.add(k);
      const t = (near.get(k) || 0) + dt; near.set(k, t);
      if (t > 0.4 && t - dt <= 0.4 && C.overlaps.length < 50) C.overlaps.push(`${game.place.name}: ${A.id} and ${B.id} ${d.toFixed(2)} apart at t=${(game.t || 0).toFixed(1)}${game.busy ? ' (scene)' : ''}`);
    }
    for (const k of [...near.keys()]) if (!seen.has(k)) near.delete(k);
    const o = pl.root, w = game.walker;
    if (lastYaw !== null && !pl.seated && lastPos) {
      const dy = Math.abs(angDiff(o.rotation.y, lastYaw)) / dt, still = Math.hypot(o.position.x - lastPos[0], o.position.z - lastPos[1]) / dt < 0.05;
      spinT = dy > 3 && still && !(w && w.turning) ? spinT + dt : 0;
      if (spinT > 0.25 && spinT - dt <= 0.25 && C.spins.length < 50) C.spins.push(`${game.place.name}: Eric turning on the spot at t=${(game.t || 0).toFixed(1)}${game.busy ? ' (scene)' : ''}`);
    }
    lastYaw = o.rotation.y; lastPos = [o.position.x, o.position.z];
  };
  return C;
}
