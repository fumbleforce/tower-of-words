// Player movement with weight: the engine's Walker (engine.js: the grid, A*, collision) with acceleration,
// braking, a turn rate, rounded path corners and a gait value for the animation, plus the tap feedback:
// a path preview on the floor, a destination ring, and a clear "can't get there" mark.
//
//   game.walker = new SmoothWalker(body, nav, { speed: 1.3 });
//   game.walker.tapRay(raycaster, place)     // a tap on the canvas that hit no marker
//   walker.gait                              // { v: ground speed in the body's own units / s, k: 0..1 of top speed }
//
// Numbers (measured on the Meshy clips, tools in the feel notes): Eric's walk clip covers about 0.44 body units / s
// at time scale 1, his run clip about 1.1. The top speed is set so the run clip plays at about its own speed at
// the office and lobby scale (1.18), so feet don't slide once the avatar blends walk and run by gait.v.
import * as THREE from 'three';
import { Walker } from './engine.js';
import { sfx } from './sfx.js';

const ACCEL = 5.5;       // m/s² from standing
const BRAKE = 7.5;       // m/s² when stopping (keys released, or the end of a path)
const TURN = 11;         // rad/s at most
const CORNER = 0.32;     // start turning toward the next waypoint this far before a corner

export class SmoothWalker extends Walker {
  constructor(body, nav, opts = {}) {
    super(body, nav, opts);
    this.v = 0;                           // current ground speed (place units / s)
    this.vx = 0; this.vz = 0;             // current direction of travel
    this.gait = { v: 0, k: 0 };
    this.preview = new PathPreview();
  }
  stop() { super.stop(); this.preview.clear(); }
  goTo(x, z, arrive) { this.preview.clear(); super.goTo(x, z, arrive); }
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
    const path = inside ? N.path(from.x, from.z, p.x, p.z) : null;
    const last = path && path.length ? path[path.length - 1] : null;
    // unreachable: off the walkable map, no route, or the nearest reachable spot is well away from the tap
    // (a wall, a closed room): don't walk off somewhere else, say no where the finger was
    if (!last || Math.hypot(last[0] - p.x, last[1] - p.z) > 0.8) {
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
    let mx = 0, mz = 0, keys = false, remain = Infinity;
    const k = (a, b) => this.keys.has(a) || this.keys.has(b);
    const up = k('ArrowUp', 'KeyW'), dn = k('ArrowDown', 'KeyS'), lf = k('ArrowLeft', 'KeyA'), rt = k('ArrowRight', 'KeyD');
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
      if (Math.hypot(mx, mz) < 0.05) {
        this.path.shift();
        if (!this.path.length) {
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
    let moving = false;
    if (this.v > 1e-3) {
      const dl = Math.hypot(this.vx, this.vz) || 1, step = this.v * dt;
      const ox = p.x, oz = p.z;
      const [nx, nz] = this.nav.collide(ox + (this.vx / dl) * step, oz + (this.vz / dl) * step, ox, oz);
      p.x = nx; p.z = nz;
      const moved = Math.hypot(nx - ox, nz - oz);
      // blocked: the speed drops to what actually happened (sliding along a wall is slower)
      if (step > 1e-5) this.v = Math.min(this.v, (moved / dt) * 1.02 + 0.02);
      moving = moved > step * 0.2 && this.v > 0.05;
      if (this.path) {
        this.stuck = moved < step * 0.2 ? this.stuck + dt : 0;
        if (this.stuck > 0.5) { this.stuck = 0; const ar = this.arrive; this.path = null; this.arrive = null; this.preview.clear(); if (ar) ar(); }
      }
    }
    if (this.targetFacing !== undefined) {
      const d = angDiff(this.targetFacing, this.facing);
      const turn = Math.sign(d) * Math.min(Math.abs(d), Math.max(Math.abs(d) * (1 - Math.exp(-dt * 14)), 0), TURN * dt);
      this.facing += turn;
    }
    this.body.rotation.y = this.facing;
    this.moving = moving;
    const sc = this.body.scale.x || 1;
    this.gait.v = moving ? this.v / sc : 0; this.gait.k = moving ? this.v / this.speed : 0;
    this.preview.update(dt, p);
    return moving;
  }
}
const angDiff = (a, b) => { const d = a - b; return Math.atan2(Math.sin(d), Math.cos(d)); };

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
