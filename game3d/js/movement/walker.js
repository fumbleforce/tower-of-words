import { Walker } from '../engine.js';
import { PathPreview } from './preview.js';
import { bodies, BODY, angDiff, CORNER, BRAKE, ACCEL, turnToward } from './shared.js';
import { clearOf, reachableNear, pathAround } from './navigation.js';
import * as THREE from 'three';
import { sfx } from '../sfx.js';
import { isPassing, slideStep, isHard, press } from './crowd.js';
import { heldRun, doubleTap } from './run-input.js';

// running (Jørgen, 2026-09-30: "Shift button to run, and caps lock to toggle running"): the walker's speed times RUN
// while Shift is held, Caps Lock is on (run-input.js) or the tapped route was a double tap. gait.run tells the avatar
// to show the run clip (makeGait in mio.js); scripted walks never set it.
export const RUN = 1.8;
const STEER_STOP = 0.3,
  STEER_GO = 0.5; // m from the steer point where a held walk stops, and how far it must move away to set off again

export class SmoothWalker extends Walker {
  constructor(body, nav, opts = {}) {
    super(body, nav, opts);
    this.v = 0; // current ground speed (place units / s)
    this.vx = 0;
    this.vz = 0; // current direction of travel
    this.gait = { v: 0, k: 0, run: false };
    this.preview = new PathPreview();
    this.others = opts.others || (() => bodies(window.__game).filter((b) => b.root !== this.body));
    this._yaw = undefined;
    this._facing = undefined;
    this._pos = null;
    this.runTo = false; // this tapped route is run (a double tap on the floor); ends with the route
    this.steer = null; // { x, z, run }: the floor point a held press steers him toward (steer.js); keys win over it
  }
  stop() {
    super.stop();
    this.preview.clear();
    this.aside = null;
    this.runTo = false;
    this.steer = null;
  }
  // scripted: a scene's walk (game.walkTo), which a key still held from walking doesn't take over. It used to drop
  // the walk and leave Eric where he stood, in the train's doorway as its doors closed (Jørgen, 2026-10-04: "I didnt
  // make it fully onto the platform before the scene triggered, trapping me in the door")
  goTo(x, z, arrive, { scripted = false } = {}) {
    this.preview.clear();
    this.aside = null;
    this.runTo = false;
    super.goTo(x, z, arrive);
    if (this.path) this.path.scripted = scripted;
  }
  // someone walking (dx, dz) is held up by him: step aside, off their line, even during a scene (people do)
  makeRoom(fx, fz, need) {
    const now = performance.now();
    if (this.aside || this.keys.size || this.steer || (this.path && !this.locked) || now - (this._roomT || 0) < 2500)
      return;
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
  // a held press with the way to its point clear: true, he walks straight at it (the steer branch of update). Not
  // clear: false, and the nav's route to it becomes his path, walked by the same code as a tapped route (round the
  // fountain, through a doorway). The route is planned again when the point has moved on, or every second; never
  // every frame, so a fresh plan doesn't tug him back and forth.
  steerDirect(p, dt) {
    const s = this.steer,
      k = this.body.scale.x || 1;
    if (this.nav.clear([p.x, p.z], [s.x, s.z])) {
      if (this.path?.steer) this.path = null;
      return true;
    }
    s.routeT = (s.routeT ?? 9) + dt;
    if (!this.path?.steer || s.routeT > 1 || Math.hypot(s.x - s.planned[0], s.z - s.planned[1]) > 0.6 * k) {
      s.planned = [s.x, s.z];
      s.routeT = 0;
      const route = this.nav.path(p.x, p.z, s.x, s.z);
      if (!route?.length) return true;
      this.path = Object.assign(route, { steer: true });
      this.arrive = null;
    }
    return false;
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
    this.runTo = doubleTap(); // a double tap on the floor runs there (the phone's run; a double click too)
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
      steering = false,
      remain = Infinity;
    const k = (a, b) => this.keys.has(a) || this.keys.has(b);
    const up = k('ArrowUp', 'KeyW'),
      dn = k('ArrowDown', 'KeyS'),
      lf = k('ArrowLeft', 'KeyA'),
      rt = k('ArrowRight', 'KeyD');
    if (this.locked || !(up || dn || lf || rt)) this.keyFrame = null; // a trip or a scene starts a new frame
    const others = this.others();
    const R = BODY * (this.body.scale.x || 1); // his own body, for people (walls use the grid's own radius)
    if (!this.locked && !this.path?.scripted && (up || dn || lf || rt)) {
      if (this.path) {
        this.path = null;
        this.arrive = null;
        this.preview.clear();
      }
      // the camera's forward when the keys went down, kept while any stays held, so a camera that turns by itself
      // (the east lane's, the forecourt's on a phone) doesn't bend a held walk
      if (!this.keyFrame) {
        const f = new THREE.Vector3();
        camera.getWorldDirection(f);
        const par = this.body.parent;
        if (par) {
          const q = new THREE.Quaternion();
          par.getWorldQuaternion(q);
          f.applyQuaternion(q.invert());
        }
        f.y = 0;
        this.keyFrame = f.normalize();
      }
      const f = this.keyFrame;
      const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
      const iy = (up ? 1 : 0) - (dn ? 1 : 0),
        ix = (rt ? 1 : 0) - (lf ? 1 : 0);
      mx = f.x * iy + r.x * ix;
      mz = f.z * iy + r.z * ix;
      keys = true;
    } else if (this.steer && !this.locked && this.steerDirect(p, dt)) {
      // held press, the way clear: straight at the point under the cursor; stops within STEER_STOP of it, sets off
      // again past STEER_GO
      steering = true;
      mx = this.steer.x - p.x;
      mz = this.steer.z - p.z;
      const k = this.body.scale.x || 1; // in the place's own units, like his body
      remain = Math.hypot(mx, mz);
      if (remain < (this.moving ? STEER_STOP : STEER_GO) * k) {
        if (remain > 0.05 * k) this.targetFacing = Math.atan2(mx, mz);
        mx = mz = 0;
      } else remain -= STEER_STOP * k;
      if (this.path) {
        this.path = null;
        this.arrive = null;
      }
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
    if (!this.path) this.runTo = false;
    const run = (heldRun() && !this.locked) || ((this.runTo || this.steer?.run) && !keys);
    const len = Math.hypot(mx, mz);
    // wanted speed: full, less when the facing is far off (turn first, don't moonwalk), braking into the end of a path
    let want = 0;
    if (len > 1e-4) {
      mx /= len;
      mz /= len;
      want = this.speed * (run ? RUN : 1);
      const ang = Math.abs(angDiff(Math.atan2(mx, mz), this.facing));
      want *= THREE.MathUtils.clamp((Math.cos(ang) + 0.35) / 1.35, this.v > 0.4 ? 0.35 : 0.12, 1);
      // a held press swung round behind him: stop and turn on the spot, not a slow shuffle round (the feet slid)
      if (steering && ang > 1.75) want = 0;
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
      if (keys || this.steer || this.path)
        press(window.__game, this, this.body, blockedBy, Math.hypot(nx - ox, nz - oz), step, dt);
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
      // steering into a wall: sliding along it, he turns to walk the way he goes (his feet stepping one way while he
      // slides another read as sliding); pressed into it with hardly any headway, he stands
      if (steering && step > 1e-5) {
        if (moved < step * 0.25) this.v = 0;
        else if (moved < step * 0.9) this.targetFacing = Math.atan2(nx - ox, nz - oz);
      }
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
    // a big turn on the spot (the spin check lets it through); he turns standing, without steps
    const turnLeft = this.targetFacing === undefined ? 0 : Math.abs(angDiff(this.targetFacing, this.facing));
    this.turning = !this.moving && turnLeft > 0.5;
    const sc = this.body.scale.x || 1;
    this.gait.v = this.moving ? this.v / sc : 0;
    this.gait.k = this.moving ? this.v / this.speed : 0;
    this.gait.run = run; // the avatar may show the run clip only while he runs (makeGait)
    this.preview.update(dt, p);
    this._yaw = this.body.rotation.y;
    this._facing = this.facing;
    this._pos = [p.x, p.z];
    return this.moving;
  }
}
