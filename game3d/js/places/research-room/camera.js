import * as THREE from 'three';
// A close shot owns its direction/lens only while its exact close object is active.
export function referenceCamera(game, P) {
  const cam = P.cam,
    dir = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(cam), 'dir').get;
  const original = { closeOn: cam.closeOn, release: cam.release, wanted: cam.wanted };
  let owned = null,
    restoredOwner = null,
    shot = null;
  const lens = () => {
    const fov = cam.close?.researchShot?.fov ?? (cam.camera.aspect < 1 ? 50 : 32);
    if (cam.camera.fov !== fov) {
      cam.camera.fov = fov;
      cam.camera.updateProjectionMatrix();
    }
  };
  Object.defineProperty(cam, 'dir', {
    configurable: true,
    get() {
      const s = cam.close?.researchShot;
      return s
        ? new THREE.Vector3(Math.sin(s.yaw) * Math.cos(s.elev), Math.sin(s.elev), Math.cos(s.yaw) * Math.cos(s.elev))
        : dir.call(cam);
    },
  });
  cam.closeOn = function (...args) {
    const v = original.closeOn.apply(this, args);
    lens();
    return v;
  };
  cam.release = function (...args) {
    const v = original.release.apply(this, args);
    lens();
    return v;
  };
  cam.wanted = function (...args) {
    lens();
    if (this.close?.researchShot) this.close.zoom = this.fitDist / this.close.researchShot.distance;
    return original.wanted.apply(this, args);
  };
  return {
    focus(
      point,
      { distance = 2.8, height = 0.45, yaw = 0.12, elev = 0.35, owner = globalThis.crypto.randomUUID() } = {},
    ) {
      shot = { point, distance, height, yaw, elev, owner };
      cam.closeOn(point, cam.fitDist / distance, height);
      owned = cam.close;
      owned.researchShot = { owner, distance, yaw, elev, fov: P.camera.aspect < 1 ? 65 : 48 };
      lens();
      cam.snap(game.player.root.position);
    },
    release() {
      if (cam.close === owned || (restoredOwner && cam.close?.researchShot?.owner === restoredOwner)) cam.release();
      owned = null;
      restoredOwner = null;
      shot = null;
    },
    snapshot: () =>
      cam.close === owned || (restoredOwner && cam.close?.researchShot?.owner === restoredOwner) ? shot : null,
    restore(saved) {
      this.release();
      if (!saved) return;
      this.focus(saved.point, saved);
      // Runner restores its serialized camera immediately after the place state.
      // Adopt only this saved shot's token, never another close-up.
      restoredOwner = saved.owner;
    },
    snap() {
      cam.snap(game.player.root.position);
    },
  };
}
