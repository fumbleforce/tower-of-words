import * as THREE from 'three';

// Fixed high three-quarter view like the references. On a wide screen the whole place fits; on a phone the
// camera stays closer and follows the player, clamped to the place. closeOn() eases in on a spot for a
// conversation (or a trip), release() eases back.
//
// Motion: every move is a critically damped spring (the smoothDamp of most engines), so the camera starts and
// stops softly, never overshoots and runs the same at any frame rate. While following, it leads a little in the
// direction the player walks (look-ahead from a smoothed velocity), so on a phone you see where you're going.
// Story shots use a slower spring than following, so a cut-in feels like a deliberate camera move.

// critically damped spring toward `to` (one number); returns the new value, keeps velocity in v[i]
export function damp(cur, to, v, i, smooth, dt) {
  const w = 2 / Math.max(1e-4, smooth), x = w * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const ch = cur - to, tmp = (v[i] + w * ch) * dt;
  v[i] = (v[i] - w * tmp) * e;
  let out = to + (ch + tmp) * e;
  if ((to - cur > 0) === (out > to)) { out = to; v[i] = 0; }
  return out;
}

const FOLLOW = 0.32, CLOSE = 0.7, RELEASE = 0.85;   // spring times (s): following, easing into a story shot, easing out
const AHEAD = 0.5, AHEAD_MAX = 0.65;                 // look-ahead: seconds of travel, capped (world units)
// the Reduce motion setting (settings.js): no push-ins, a smaller lead
const calm = () => !!(window.__settings && window.__settings.reduceMotion);

export class RoomCam {
  constructor({ elev = 56, fov = 22, yaw = 0, space = null } = {}) {
    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.5, 200);
    this.elev = THREE.MathUtils.degToRad(elev); this.yaw = yaw; this.space = space;
    this.target = new THREE.Vector3(); this.want = new THREE.Vector3(); this.dist = 20; this.fitDist = 20;
    this.follow = false; this.clamp = null; this.close = null; this.base = new THREE.Vector3();
    this.vel = [0, 0, 0, 0];                 // spring velocities: x, y, z, dist
    this.pv = new THREE.Vector3(); this.pPrev = null; this.ahead = new THREE.Vector3();
    this.smooth = FOLLOW; this.nudgeK = 0;
  }
  get dir() { return new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.elev), Math.sin(this.elev), Math.cos(this.yaw) * Math.cos(this.elev)); }
  place() {
    const d = this.dist * (1 - 0.05 * this.nudgeK);
    this.camera.position.copy(this.target).addScaledVector(this.dir, d);
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
  closeOn([x, z], zoom = 1.8, y = 0.5) { this.close = { target: this.toWorld(x, z, y), zoom }; this.smooth = CLOSE; }
  release() { if (this.close) this.smooth = RELEASE; this.close = null; }
  // a small push-in and back (learned moments): k 0..1 of 5 % closer, over `secs`
  nudge(secs = 0.9) { if (calm()) return; this.nudgeT = 0; this.nudgeDur = secs; }
  wanted(p) {
    if (this.close) return [this.close.target, this.fitDist / this.close.zoom];
    if (!this.follow || !p) return [this.base, this.fitDist];
    const w = p.isVector3 && this.space ? this.space.localToWorld(p.clone()) : p;
    this.want.set(w.x + this.ahead.x, this.base.y, w.z + this.ahead.z + (this.lead || 0));
    if (this.clamp) { this.want.x = THREE.MathUtils.clamp(this.want.x, this.clamp[0], this.clamp[1]); this.want.z = THREE.MathUtils.clamp(this.want.z, this.clamp[2], this.clamp[3]); }
    return [this.want, this.fitDist];
  }
  // player velocity, smoothed, for the look-ahead (only while following)
  track(dt, p) {
    if (!p || dt <= 0) return;
    const w = p.isVector3 && this.space ? this.space.localToWorld(p.clone()) : p.clone();
    if (this.pPrev) {
      const vx = (w.x - this.pPrev.x) / dt, vz = (w.z - this.pPrev.z) / dt;
      // a jump (snap, a new place) is not walking
      if (Math.hypot(vx, vz) < 6) { const k = 1 - Math.exp(-dt / 0.25); this.pv.x += (vx - this.pv.x) * k; this.pv.z += (vz - this.pv.z) * k; }
    }
    this.pPrev = w;
    const A = calm() ? AHEAD * 0.4 : AHEAD, ax = this.pv.x * A, az = this.pv.z * A, m = Math.hypot(ax, az), s = m > AHEAD_MAX ? AHEAD_MAX / m : 1;
    // the lead itself eases, so stopping doesn't swing the view back at once
    // growing toward the lead is quick; letting it go (he stopped or turned) is slow, so the view doesn't swing back
    const grow = (ax * s) * this.ahead.x + (az * s) * this.ahead.z >= this.ahead.x ** 2 + this.ahead.z ** 2 - 1e-6;
    const k = 1 - Math.exp(-dt / (grow ? 0.6 : 1.8));
    this.ahead.x += (ax * s - this.ahead.x) * k; this.ahead.z += (az * s - this.ahead.z) * k;
  }
  update(dt, p) {
    if (dt <= 0) return;
    if (this.follow && !this.close) this.track(dt, p); else { this.pPrev = null; this.pv.set(0, 0, 0); this.ahead.multiplyScalar(Math.exp(-dt / 0.4)); }
    const [t, d] = this.wanted(p);
    // back to the follow spring once a story move has arrived
    if (!this.close && this.smooth !== FOLLOW && Math.hypot(t.x - this.target.x, t.z - this.target.z) < 0.03 && Math.abs(d - this.dist) < 0.05) this.smooth = FOLLOW;
    const s = this.smooth;
    this.target.x = damp(this.target.x, t.x, this.vel, 0, s, dt);
    this.target.y = damp(this.target.y, t.y, this.vel, 1, s, dt);
    this.target.z = damp(this.target.z, t.z, this.vel, 2, s, dt);
    this.dist = damp(this.dist, d, this.vel, 3, s * 1.15, dt);
    if (this.nudgeDur) { this.nudgeT += dt; const k = this.nudgeT / this.nudgeDur; this.nudgeK = k >= 1 ? 0 : Math.sin(Math.PI * k) ** 2; if (k >= 1) this.nudgeDur = 0; }
    this.place();
  }
  snap(p) {
    this.pPrev = null; this.pv.set(0, 0, 0); this.ahead.set(0, 0, 0); this.vel.fill(0); this.smooth = this.close ? CLOSE : FOLLOW;
    const [t, d] = this.wanted(p); this.target.copy(t); this.dist = d; this.place();
  }
}
