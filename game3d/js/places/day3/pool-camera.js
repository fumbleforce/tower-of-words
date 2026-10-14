// Water dialogue uses a low three-quarter view; release restores the normal walking camera.
export function poolCamera(game) {
  let cam, release, home, shot, held;
  function clear() {
    if (home && cam) Object.assign(cam, home);
    home = shot = held = null;
  }
  function bind() {
    if (cam === game.place.cam) return;
    cam = game.place.cam;
    release = cam.release;
    cam.release = function (...args) {
      clear();
      return release.apply(this, args);
    };
  }
  function update() {
    if (shot && cam.close !== held) {
      // Runner staging restores a serialized clone after the place restores its own state.
      if (cam.close?.poolWaterShot) held = cam.close;
      else clear();
    }
    if (shot?.untilStanding && !game.player.seated) {
      cam.release();
      return;
    }
    if (!shot || !cam.close) return;
    Object.assign(cam, { yaw: shot.yaw, elev: shot.elev });
    const width = Math.max(1, cam.camera.aspect);
    const distance = shot.span / (2 * Math.tan((cam.camera.fov * Math.PI) / 360) * Math.min(1, cam.camera.aspect));
    cam.close.zoom = cam.fitDist / (distance / Math.min(1.25, width));
  }
  return {
    frame(point, { span = 3.8, y = 0.3, yaw = 3.65, elev = 0.48, cut = false, untilStanding = false } = {}) {
      bind();
      home ||= { yaw: cam.yaw, elev: cam.elev };
      shot = { point, span, y, yaw, elev, untilStanding };
      cam.closeOn(point, 1, y);
      held = cam.close;
      held.poolWaterShot = true;
      update();
      if (cut) cam.snap(game.player.root.position);
    },
    track(point) {
      if (!shot || !cam?.close) return;
      shot.point = [...point];
      cam.close.target.copy(cam.toWorld(point[0], point[1], shot.y));
    },
    clear,
    update,
    snapshot: () => shot && { shot, home },
    restore(saved) {
      if (!saved) return;
      bind();
      ({ shot, home } = saved);
      cam.closeOn(shot.point, 1, shot.y);
      held = cam.close;
      held.poolWaterShot = true;
      update();
    },
    dispose() {
      clear();
      if (cam) cam.release = release;
      cam = null;
    },
  };
}
