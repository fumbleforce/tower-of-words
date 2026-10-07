import * as THREE from 'three';

// Opt-in authored pair views. The entire override travels with the saved close
// shot; release or any other closeOn restores the place's ordinary direction.
export function conversationCamera(game, place, views) {
  const cam = place.cam;
  const direction = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(cam), 'dir').get;
  const closeOn = cam.closeOn,
    release = cam.release,
    wanted = cam.wanted,
    fit = cam.fit;
  const homeFov = cam.camera.fov;
  const lens = () => {
    const fov = cam.close?.conversationShot?.fov ?? homeFov;
    if (cam.camera.fov !== fov) {
      cam.camera.fov = fov;
      cam.camera.updateProjectionMatrix();
    }
  };
  const distance = (shot) =>
    Math.max(
      shot.minDistance,
      shot.halfWidth / (Math.tan(THREE.MathUtils.degToRad(cam.camera.fov / 2)) * cam.camera.aspect),
    );
  cam.wanted = function (...args) {
    lens();
    if (this.close?.conversationShot) this.close.zoom = this.fitDist / distance(this.close.conversationShot);
    return wanted.apply(this, args);
  };
  cam.release = function (...args) {
    const result = release.apply(this, args);
    lens();
    return result;
  };
  cam.fit = function (...args) {
    const shot = this.close;
    if (!shot?.conversationShot) {
      lens();
      return fit.apply(this, args);
    }
    this.close = null;
    lens();
    try {
      return fit.apply(this, args);
    } finally {
      this.close = shot;
      lens();
      if (shot?.conversationShot) this.snap(game.player.root.position);
    }
  };
  const leave = place.leave;
  place.leave = function (...args) {
    cam.release();
    return leave?.apply(this, args);
  };
  Object.defineProperty(cam, 'dir', {
    configurable: true,
    get() {
      const shot = cam.close?.conversationShot;
      if (!shot) return direction.call(cam);
      const { yaw, elev } = shot;
      return new THREE.Vector3(Math.sin(yaw) * Math.cos(elev), Math.sin(elev), Math.cos(yaw) * Math.cos(elev));
    },
  });
  cam.closeOn = function (point, zoom, y, options) {
    const id = options?.conversation,
      view = views[id],
      person = place.people?.[id] || (id === 'mio' && game.mioNpc);
    if (!view || !person?.root.visible || (view.seated && !person.seated)) {
      const result = closeOn.call(this, point, zoom, y, options);
      lens();
      return result;
    }
    const a = person.root.position,
      b = game.player.root.position;
    closeOn.call(this, [(a.x + b.x) / 2, (a.z + b.z) / 2], zoom, view.height ?? 0.25);
    cam.close.conversationShot = {
      who: id,
      yaw: view.yaw,
      elev: THREE.MathUtils.degToRad(view.elev),
      fov: view.fov ?? homeFov,
      minDistance: view.minDistance ?? 8,
      halfWidth: view.halfWidth ?? 1.2,
    };
    lens();
    cam.close.zoom = cam.fitDist / distance(cam.close.conversationShot);
  };
}
