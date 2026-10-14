import * as THREE from 'three';
import { damp } from '../cam.js';

// From the left end of the aisle, Eric and the shopping bag sit to the left of
// the middle grab poles. Portrait keeps its existing end-on view.
export function trainBunCamera(cam, bunPosition) {
  const place = cam.place,
    update = cam.update,
    snap = cam.snap;
  const axis = new THREE.Vector3(0, 1, 0),
    offset = new THREE.Vector3();
  const velocity = [0];
  let yaw = 0;
  const desired = () => {
    const close = cam.close,
      bun = bunPosition();
    return !cam.follow && close && Math.hypot(close.x - bun.x, close.z - bun.z) < 0.05 ? -0.8 : 0;
  };
  cam.place = function () {
    place.call(this);
    if (this.follow || !yaw) return;
    offset.copy(this.camera.position).sub(this.target).applyAxisAngle(axis, yaw);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  };
  cam.update = function (dt, ...args) {
    if (dt > 0) yaw = damp(yaw, desired(), velocity, 0, 0.7, dt);
    return update.call(this, dt, ...args);
  };
  cam.snap = function (...args) {
    yaw = desired();
    velocity[0] = 0;
    return snap.apply(this, args);
  };
  return {
    reset() {
      yaw = 0;
      velocity[0] = 0;
    },
  };
}
