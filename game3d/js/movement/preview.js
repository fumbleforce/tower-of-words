import * as THREE from 'three';

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
