// The birds' groups (catalog.js): where each one goes and when.
//   pigeons, sparrows   a flock feeding on the paving somewhere Eric can see it. Someone walking close scatters it:
//                       each bird takes off a moment apart, some to a roof (pigeons) or a wall or hedge (sparrows)
//                       nearby, the rest away out of the place. A little later the flock comes down again, on another
//                       bit of paving, flying in from where it went.
//   crows               one to a roof or a canopy, each looking about and cawing now and then; every half minute or so
//                       one flies to another roof nearer Eric.
//   gulls               most circle over the water (over the place where there is none), gliding, a few beats now and
//                       then; the others sit on the water, a quay or a roof. They swap every so often. After work
//                       they only sit.
// A group out of its time of day (catalog.js `when`) flies off, and one coming into it flies in.
import * as THREE from 'three';
import { HABITS, newBird, setDown, flyTo, flyIn, flyAway, stepBird } from './motion.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const _v = new THREE.Vector3();

class Group {
  constructor(def, meshes, n, W) {
    Object.assign(this, { def, meshes, W, habit: HABITS[def.kind] });
    this.birds = Array.from({ length: n }, () => newBird(meshes.used++));
    this.active = false;
    this.timer = 0;
  }
  // a person within reach of bird b? (the nearest one, or null)
  threat(b, r) {
    for (const t of this.W.threats)
      if (Math.abs(t.x - b.p.x) < r && Math.abs(t.z - b.p.z) < r && t.distanceTo(b.p) < r) return t;
    return null;
  }
  leave() {
    this.state = 'up'; // a flock comes down afresh when its time comes again
    for (const b of this.birds) {
      this.W.free(b);
      if (b.mode === 'off') continue;
      if (this.W.inView(b.p)) flyAway(b, this.W.eric, this.habit, this.W.K);
      else b.mode = 'off';
    }
  }
  step(dt, active) {
    if (active !== this.active) {
      this.active = active;
      if (!active) this.leave();
      else this.timer = rnd(0.5, 3); // coming in
    }
    for (const b of this.birds) {
      stepBird(b, dt, this.habit, this.W);
      if (b.mode === 'off') this.meshes.hide(b.i);
      else {
        this.meshes.pose(b.i, b);
        if (b.mode === 'rest' && b.on?.kind !== 'water') this.W.blob(b.p, 0.09 * this.habit.spread * this.W.K, b.p.y);
      }
    }
    if (this.active) this.think(dt);
  }
}

// pigeons and sparrows
export class Flock extends Group {
  constructor(def, meshes, n, W) {
    super(def, meshes, n, W);
    this.state = 'up';
    this.home = new THREE.Vector3();
    this.perchKinds = def.kind === 'sparrow' ? ['hedge', 'low'] : ['high', 'low'];
  }
  // the flock down on a new bit of paving: at once (entering) or flying in
  land(at, now) {
    const W = this.W,
      K = W.K;
    this.home.copy(at);
    for (const b of this.birds) {
      let x = at.x,
        z = at.z;
      for (let k = 0; k < 6; k++) {
        const a = Math.random() * 6.28,
          r = Math.sqrt(Math.random()) * this.habit.spread * K;
        if (W.nav.free(at.x + Math.cos(a) * r, at.z + Math.sin(a) * r, 0.05)) {
          x = at.x + Math.cos(a) * r;
          z = at.z + Math.sin(a) * r;
          break;
        }
      }
      b.home = this.home;
      W.free(b);
      if (now) setDown(b, x, at.y, z, { kind: 'ground' });
      else {
        b.delay = rnd(0, 1.2);
        b.order = (bb) => {
          _v.set(x, at.y, z);
          if (bb.mode === 'off') flyIn(bb, _v, { kind: 'ground' }, this.habit, K);
          else flyTo(bb, _v, { kind: 'ground' }, this.habit, K);
        };
      }
    }
    this.state = 'down';
  }
  scatter(from) {
    const W = this.W;
    this.state = 'up';
    this.timer = rnd(10, 22);
    W.sound('flap', this.home);
    for (const b of this.birds) {
      if (b.mode === 'off') continue;
      b.delay = rnd(0, 0.35);
      b.order = (bb) => {
        const spot =
          Math.random() < 0.65
            ? W.claim(this.perchKinds, bb, {
                near: bb.p,
                max: 14,
                awayFrom: from,
              })
            : null;
        if (spot) flyTo(bb, spot.p, spot.on, this.habit, W.K);
        else flyAway(bb, from, this.habit, W.K);
      };
    }
  }
  think(dt) {
    const W = this.W;
    this.timer -= dt;
    if (this.state === 'down') {
      for (const b of this.birds) {
        if (b.mode !== 'rest' || b.on?.kind !== 'ground') continue;
        const t = this.threat(b, this.habit.scare * W.K);
        if (t) return this.scatter(t);
      }
      // Eric has walked on and the flock is out of sight: it moves on too, to come down near him again
      if (this.home.distanceTo(W.eric) > 26 * W.K && !W.inView(this.home)) {
        for (const b of this.birds) b.mode = 'off';
        this.state = 'up';
        this.timer = rnd(2, 6);
      }
    } else if (this.timer <= 0) {
      const spot =
        W.pick('ground', { min: 6, max: 17, view: true, clear: 4 }) || W.pick('ground', { min: 6, max: 24, clear: 4 });
      if (spot) this.land(spot.p, false);
      else this.timer = 3;
    }
  }
  // entering the place: down at once on paving in view, or coming in shortly if there is none
  reset(active) {
    this.active = active;
    for (const b of this.birds) ((b.mode = 'off'), (b.delay = 0), (b.order = null));
    if (!active) return;
    const W = this.W,
      spot =
        W.pick('ground', { min: 3.5, max: 15, view: true, clear: 3 }) ||
        W.pick('ground', { min: 4.5, max: 24, clear: 3.5 });
    if (spot) this.land(spot.p, true);
    else ((this.state = 'up'), (this.timer = rnd(1, 4)));
  }
}

// crows: each on a roof of its own
export class Perchers extends Group {
  place(b, now) {
    const W = this.W;
    W.free(b);
    const kinds = Math.random() < 0.5 ? ['high', 'tree', 'low'] : ['tree', 'high', 'low'];
    const spot = W.claim(kinds, b, {
      near: W.eric,
      min: 5,
      max: 20,
      view: true,
      maxY: 14,
    });
    if (!spot) return false;
    if (now) setDown(b, spot.p.x, spot.p.y, spot.p.z, spot.on);
    else if (b.mode === 'off') flyIn(b, spot.p, spot.on, this.habit, W.K);
    else flyTo(b, spot.p, spot.on, this.habit, W.K);
    return true;
  }
  think(dt) {
    const W = this.W;
    this.timer -= dt;
    for (const b of this.birds) {
      // one sitting low (a wall, a railing) moves off when someone comes close
      if (b.mode === 'rest' && b.p.y - W.eric.y < 2.4 * W.K && this.threat(b, this.habit.scare * W.K)) {
        W.sound('caw', b.p);
        this.place(b, false) || flyAway(b, W.eric, this.habit, W.K);
        continue;
      }
      // too far behind him and out of sight: it comes along
      if (b.mode === 'rest' && b.p.distanceTo(W.eric) > 30 * W.K && !W.inView(b.p))
        ((b.mode = 'off'), (b.wait = rnd(2, 8)));
      if (b.mode === 'off' && b.delay <= 0 && (b.wait -= dt) <= 0) this.place(b, false) || (b.wait = 4);
    }
    if (this.timer <= 0) {
      this.timer = rnd(20, 45);
      const b = this.birds[Math.floor(Math.random() * this.birds.length)];
      if (b.mode === 'rest') this.place(b, false);
    }
  }
  reset(active) {
    this.active = active;
    this.timer = rnd(15, 35);
    for (const b of this.birds) {
      b.mode = 'off';
      b.wait = rnd(0.5, 4);
      if (active) this.place(b, true);
    }
  }
}

// gulls
export class Gulls extends Group {
  constructor(def, meshes, n, W) {
    super(def, meshes, n, W);
    this.restOnly = def.when === 'evening';
    this.centre = new THREE.Vector3();
  }
  // where they circle: a little way out toward the nearest water, low enough to stay in the camera's view
  aim() {
    const W = this.W;
    if (!this.water || W.t > this.waterAt) {
      this.water = W.pick('water', { max: 40, nearest: true })?.p || null;
      this.waterAt = W.t + 2;
    }
    if (this.water) _v.subVectors(this.water, W.eric).setY(0);
    else _v.set(1, 0, -1);
    const d = Math.min(_v.length(), 5 * W.K);
    _v.normalize().multiplyScalar(d);
    this.centre.lerp(_v.add(W.eric), this.centre.lengthSq() ? 0.02 : 1);
    this.centre.y = (W.eric.y || 0) + 4.5 * W.K;
  }
  sit(b, now) {
    const W = this.W;
    W.free(b);
    const spot = W.claim(['water', 'low', 'high'], b, {
      near: W.eric,
      min: 3,
      max: 18,
      view: true,
      maxY: 14,
    });
    if (!spot) return false;
    if (now) setDown(b, spot.p.x, spot.p.y, spot.p.z, spot.on);
    else if (b.mode === 'off') flyIn(b, spot.p, spot.on, this.habit, W.K);
    else flyTo(b, spot.p, spot.on, this.habit, W.K);
    b.until = rnd(12, 30);
    return true;
  }
  soar(b, now) {
    this.W.free(b);
    const K = this.W.K;
    b.soar = {
      r: rnd(3, 6.5) * K,
      h: rnd(-1, 1.5) * K,
      a: Math.random() * 6.28,
      w: 0,
      beat: rnd(0, 4),
    };
    b.soar.w = ((Math.random() < 0.5 ? -1 : 1) * this.habit.speed * 0.55 * K) / b.soar.r;
    if (now || b.mode === 'off') {
      const s = b.soar;
      b.p.set(this.centre.x + Math.cos(s.a) * s.r, this.centre.y + s.h, this.centre.z + Math.sin(s.a) * s.r);
      if (!now) b.p.y += 6 * K;
    }
    b.mode = 'soar';
    b.fold = 0;
    b.until = rnd(15, 35);
  }
  circling(b, dt) {
    const s = b.soar,
      c = this.centre;
    s.a += s.w * dt;
    _v.set(c.x + Math.cos(s.a) * s.r, c.y + s.h + 0.6 * Math.sin(s.a * 0.7), c.z + Math.sin(s.a) * s.r);
    const dx = _v.x - b.p.x,
      dz = _v.z - b.p.z;
    b.p.lerp(_v, Math.min(1, dt * 1.5));
    if (dx * dx + dz * dz > 1e-5)
      b.yaw +=
        Math.atan2(Math.sin(Math.atan2(dx, dz) - b.yaw), Math.cos(Math.atan2(dx, dz) - b.yaw)) * Math.min(1, dt * 4);
    b.roll += ((s.w > 0 ? 0.35 : -0.35) - b.roll) * Math.min(1, dt * 2);
    b.pitch *= 0.9;
    s.beat -= dt;
    if (s.beat < -1.6) s.beat = rnd(3, 8); // a few wing beats, then a long glide
    b.phase += dt * this.habit.hz * 6.283;
    b.flap = s.beat < 0 ? this.habit.amp * Math.sin(b.phase) : 0.12 + 0.03 * Math.sin(b.phase * 0.3);
    b.fold = 0;
  }
  think(dt) {
    const W = this.W;
    this.aim();
    for (const b of this.birds) {
      if (b.mode === 'soar') this.circling(b, dt);
      if (b.mode === 'rest' && b.on?.kind !== 'water') {
        const t = this.threat(b, this.habit.scare * W.K);
        if (t) {
          W.free(b);
          flyAway(b, t, this.habit, W.K);
          W.sound('flap', b.p);
          continue;
        }
      }
      if (b.mode === 'off' && b.delay <= 0 && (b.wait = (b.wait ?? 0) - dt) <= 0) {
        b.wait = 3;
        if (this.restOnly || Math.random() < 0.4) this.sit(b, false);
        else this.soar(b, false);
      }
      if (b.mode === 'rest' || b.mode === 'soar') {
        b.until -= dt;
        if (b.until <= 0) {
          if (b.mode === 'soar' || this.restOnly) this.sit(b, false) || (b.until = 5);
          else this.soar(b, false);
          if (Math.random() < 0.5 && W.inView(b.p)) W.sound('gull', b.p);
        }
      }
    }
  }
  reset(active) {
    this.active = active;
    for (const b of this.birds) ((b.mode = 'off'), (b.wait = rnd(1, 5)));
    if (!active) return;
    this.aim();
    this.birds.forEach((b, i) => (this.restOnly || i % 3 === 2 ? this.sit(b, true) : false) || this.soar(b, true));
  }
}

export const GROUPS = {
  pigeon: Flock,
  sparrow: Flock,
  crow: Perchers,
  gull: Gulls,
};
