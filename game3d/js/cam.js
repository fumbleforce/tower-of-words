import * as THREE from 'three';

// Fixed high three-quarter view like the references. On a wide screen the whole place fits; on a
// phone the camera stays closer and follows Mio, clamped to the place. closeOn() eases in on a spot for a
// conversation (or a trip), release() eases back.
export class RoomCam {
  constructor({ elev = 56, fov = 22, yaw = 0, space = null } = {}) {
    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.5, 200);
    this.elev = THREE.MathUtils.degToRad(elev); this.yaw = yaw; this.space = space;
    this.target = new THREE.Vector3(); this.want = new THREE.Vector3(); this.dist = 20; this.fitDist = 20;
    this.follow = false; this.clamp = null; this.close = null; this.base = new THREE.Vector3();
  }
  get dir() { return new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.elev), Math.sin(this.elev), Math.cos(this.yaw) * Math.cos(this.elev)); }
  place() {
    this.camera.position.copy(this.target).addScaledVector(this.dir, this.dist);
    this.camera.lookAt(this.target); this.camera.updateMatrixWorld();
  }
  fit(aspect, pts, centre, { limX = 0.98, limY = 0.94, follow = false, clamp = null, lead = 0 } = {}) {
    this.lead = lead;
    this.camera.aspect = aspect; this.camera.updateProjectionMatrix();
    this.target.copy(centre); this.follow = follow; this.clamp = clamp;
    const v = new THREE.Vector3();
    let lo = 1, hi = 150;
    for (let i = 0; i < 40; i++) {
      this.dist = (lo + hi) / 2; this.place();
      let ok = true;
      for (const p of pts) { v.copy(p).project(this.camera); if (Math.abs(v.x) > limX || Math.abs(v.y) > limY) { ok = false; break; } }
      if (ok) hi = this.dist; else lo = this.dist;
    }
    this.dist = hi; this.fitDist = hi; this.place();
    this.base = centre.clone();
    if (this.close) { this.target.copy(this.close.target); this.dist = this.fitDist / this.close.zoom; this.place(); }
  }
  toWorld(x, z, y = 0) { const v = new THREE.Vector3(x, y, z); if (this.space) this.space.localToWorld(v); return v; }
  closeOn([x, z], zoom = 1.8, y = 0.5) { this.close = { target: this.toWorld(x, z, y), zoom }; }
  release() { this.close = null; }
  wanted(p) {
    if (this.close) return [this.close.target, this.fitDist / this.close.zoom];
    if (!this.follow || !p) return [this.base, this.fitDist];
    const w = p.isVector3 && this.space ? this.space.localToWorld(p.clone()) : p;
    this.want.set(w.x, this.base.y, w.z + (this.lead || 0));
    if (this.clamp) { this.want.x = THREE.MathUtils.clamp(this.want.x, this.clamp[0], this.clamp[1]); this.want.z = THREE.MathUtils.clamp(this.want.z, this.clamp[2], this.clamp[3]); }
    return [this.want, this.fitDist];
  }
  update(dt, p) {
    const [t, d] = this.wanted(p);
    const k = Math.min(1, dt * (this.close ? 2.2 : 3));
    this.target.lerp(t, k); this.dist += (d - this.dist) * k;
    this.place();
  }
  snap(p) { const [t, d] = this.wanted(p); this.target.copy(t); this.dist = d; this.place(); }
}
