// The island's cats and the insects (catalog.js).
//   cats         sit up on a wall, a planter or a bench (or at the foot of a wall), looking out over the street;
//                the tail swishes and flicks, and the head follows Eric while he is close, otherwise looks about.
//                One left far behind, out of sight, finds another spot nearer him. None of them is Tama.
//   butterflies  wander in loops over lawns and planting; red dragonflies hover, then dart a little way.
import * as THREE from 'three';
import { catGeometry, butterflyGeometry, dragonflyGeometry } from './models.js';
import { InsectMeshes } from './meshes.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const angle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

let catMat;
export class Cat {
  constructor(def, W, parent) {
    const g = catGeometry(def.coat);
    catMat ||= new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.92,
    });
    catMat.userData.noLook = true;
    const mesh = (geo) => {
      const m = new THREE.Mesh(geo, catMat);
      m.receiveShadow = true;
      m.userData.creature = true;
      return m;
    };
    this.W = W;
    this.def = def;
    this.root = new THREE.Group();
    this.root.userData.noBatch = true;
    this.root.scale.setScalar(W.K * 1.1);
    this.body = mesh(g.body);
    this.head = new THREE.Group();
    this.head.position.set(...g.headAt);
    this.head.add(mesh(g.head));
    this.tail = new THREE.Group();
    this.tail.position.set(...g.tailAt);
    this.tail.add(mesh(g.tail));
    this.root.add(this.body, this.head, this.tail);
    this.root.visible = false;
    parent.add(this.root);
    this.look = 0;
    this.lookAt = 0;
    this.lookT = 0;
    this.flick = 0;
    this.phase = Math.random() * 6;
  }
  // a spot: on a low perch, else at the foot of a wall; seen = must be on screen (true), off it (false), either
  place(seen) {
    const W = this.W;
    const s =
      W.claim('low', this, { min: 4, max: 16, view: seen, maxY: 1.6 }) ||
      W.claim('ground', this, {
        min: 4,
        max: 16,
        view: seen,
        edge: true,
        clear: 2,
      });
    if (!s) return (this.root.visible = false);
    this.root.position.copy(s.p);
    // face out over the open ground: the direction round it with the most walkable space
    let best = 0,
      bn = -1;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      let n = 0;
      for (const r of [0.8, 1.6, 2.4])
        n += W.nav.free(s.p.x + Math.sin(a) * r * W.K, s.p.z + Math.cos(a) * r * W.K, 0.05) ? 1 : 0;
      if (n > bn) ((bn = n), (best = a));
    }
    this.root.rotation.y = best + rnd(-0.4, 0.4);
    this.root.visible = true;
    return true;
  }
  step(dt, active) {
    const W = this.W,
      r = this.root;
    if (!active) {
      if (r.visible && !W.inView(r.position)) ((r.visible = false), W.free(this));
      return;
    }
    if (!r.visible) {
      if ((this.wait = (this.wait ?? 0) - dt) <= 0) this.place(false) || (this.wait = 3);
      return;
    }
    if (r.position.distanceTo(W.eric) > 30 * W.K && !W.inView(r.position)) {
      W.free(this);
      r.visible = false;
      this.wait = rnd(1, 4);
      return;
    }
    this.phase += dt;
    // the head: on Eric while he is near, else a slow look about
    const dx = W.eric.x - r.position.x,
      dz = W.eric.z - r.position.z;
    this.lookT -= dt;
    if (Math.hypot(dx, dz) < 5 * W.K)
      this.lookAt = THREE.MathUtils.clamp(angle(Math.atan2(dx, dz) - r.rotation.y), -1.1, 1.1);
    else if (this.lookT <= 0) ((this.lookT = rnd(2.5, 7)), (this.lookAt = rnd(-0.9, 0.9)));
    this.look += (this.lookAt - this.look) * Math.min(1, dt * 3);
    this.head.rotation.y = this.look;
    this.head.rotation.z = 0.08 * Math.sin(this.phase * 0.5);
    // the tail: a slow swish, and now and then a quick flick of the tip
    if (this.flick <= 0 && Math.random() < dt * 0.25) this.flick = 0.35;
    const f = this.flick > 0 ? Math.sin((1 - this.flick / 0.35) * Math.PI) * 0.6 : 0;
    this.flick -= dt;
    this.tail.rotation.y = 0.3 * Math.sin(this.phase * 0.8) + f;
    this.tail.rotation.x = -0.1 * f;
    this.body.scale.y = 1 + 0.015 * Math.sin(this.phase * 2.4); // breathing
    W.blob(r.position, 0.16 * W.K, r.position.y);
  }
  reset(active) {
    this.W.free(this);
    this.root.visible = false;
    this.wait = 0;
    if (active) this.place(Math.random() < 0.7 ? true : undefined);
  }
}

// butterflies and dragonflies of one kind, in one instanced mesh
const TINTS = ['#fbf8ee', '#f4dd6a', '#f7f3e6', '#f2c27a'].map((c) => new THREE.Color(c));
export class Insects {
  constructor(def, n, W, parent) {
    this.W = W;
    this.kind = def.kind;
    const geo = def.kind === 'butterfly' ? butterflyGeometry() : dragonflyGeometry();
    this.meshes = new InsectMeshes(geo, n, W.K * (def.kind === 'butterfly' ? 1.6 : 1.5));
    parent.add(this.meshes.mesh);
    this.bugs = Array.from({ length: n }, (_, i) => ({
      i,
      on: false,
      at: new THREE.Vector3(),
      p: new THREE.Vector3(),
      to: new THREE.Vector3(),
      yaw: 0,
      t: Math.random() * 10,
      hold: 0,
      tint: TINTS[i % TINTS.length],
      f: [rnd(0.5, 0.9), rnd(0.7, 1.2), rnd(0.3, 0.6)],
    }));
  }
  home(b, seen) {
    const s = this.W.pick('green', { min: 2, max: 14, view: seen }) || this.W.pick('green', { min: 2, max: 14 });
    if (!s) return (b.on = false);
    b.at.copy(s.p);
    b.p.copy(s.p).y += 0.6 * this.W.K;
    b.to.copy(b.p);
    b.on = true;
  }
  step(dt, active) {
    const W = this.W,
      K = W.K;
    let any = false;
    for (const b of this.bugs) {
      if (!b.on && active && Math.random() < dt) this.home(b, false);
      // out of its time of day it drifts up and away; left far behind out of sight, it is gone
      if (b.on && !active) {
        b.at.y += dt * 0.5 * K;
        b.at.x += dt * 0.4 * K;
        b.gone = (b.gone || 0) + dt;
      } else b.gone = 0;
      if (b.on && (b.gone > 5 || (!active && !W.inView(b.p)) || (b.at.distanceTo(W.eric) > 24 * K && !W.inView(b.p))))
        b.on = false;
      if (!b.on) {
        this.meshes.hide(b.i);
        continue;
      }
      any = true;
      b.t += dt;
      const px = b.p.x,
        pz = b.p.z;
      if (this.kind === 'butterfly') {
        // loops over the planting, rising and dipping
        const [a, c, h] = b.f;
        b.p.set(
          b.at.x + Math.sin(b.t * a) * 1.3 * K + Math.sin(b.t * 2.1) * 0.12 * K,
          b.at.y + (0.45 + h * Math.sin(b.t * 1.3) * 0.5 + 0.1 * Math.sin(b.t * 7)) * K,
          b.at.z + Math.sin(b.t * c + 1.3) * 1.1 * K,
        );
        this.meshes.pose(b.i, b.p, b.yaw, Math.abs(Math.sin(b.t * 11)) * 0.9, b.tint);
      } else {
        // hover, then dart to a spot nearby
        b.hold -= dt;
        if (b.hold <= 0) {
          b.hold = rnd(0.6, 2.2);
          const a = Math.random() * 6.28,
            r = rnd(0.4, 1.6) * K;
          b.to.set(b.at.x + Math.cos(a) * r, b.at.y + rnd(0.7, 1.5) * K, b.at.z + Math.sin(a) * r);
        }
        b.p.lerp(b.to, Math.min(1, dt * 7));
        b.p.y += 0.004 * Math.sin(b.t * 9);
        this.meshes.pose(b.i, b.p, b.yaw, 0.12 * Math.abs(Math.sin(b.t * 70)));
      }
      const dx = b.p.x - px,
        dz = b.p.z - pz;
      if (dx * dx + dz * dz > 1e-6) b.yaw += angle(Math.atan2(dx, dz) - b.yaw) * Math.min(1, dt * 6);
    }
    this.meshes.commit(any);
  }
  reset(active) {
    for (const b of this.bugs) {
      b.on = false;
      if (active) this.home(b, Math.random() < 0.7);
    }
  }
}
