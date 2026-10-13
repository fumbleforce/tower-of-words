import { glide } from '../../move.js';
// At the public doorway, an eye-height west view can see beneath the existing canopy.
export function researchEntranceView(game, P, door) {
  const cam = P.cam,
    normalFov = cam.camera.fov;
  let owned = null;
  const lens = (fov) => {
    if (cam.camera.fov !== fov) {
      cam.camera.fov = fov;
      cam.camera.updateProjectionMatrix();
    }
  };
  function focus() {
    cam.closeOn([door.local[0] - 0.4, door.local[1]], cam.fitDist / 4.2, 0.85);
    owned = cam.close;
    lens(cam.camera.aspect < 1 ? 65 : 48);
  }
  function release() {
    if (cam.close === owned) cam.release();
    owned = null;
    lens(normalFov);
  }
  return {
    update() {
      const p = game.player.root.position,
        near = Math.hypot(p.x - door.step[0], p.z - door.step[1]) < 2.15;
      if (owned && cam.close !== owned) {
        owned = null;
        lens(normalFov);
      }
      if (near && !cam.close) focus();
      else if (!near && owned) release();
    },
    async leave() {
      await game.walkTo(...door.step);
      game.player.scripted = true;
      game.walker.locked = true;
      focus();
      await glide(game, game.player.root, door.local, 1.1);
      game.player.setState('idle');
    },
    async arrive() {
      const r = game.player;
      r.scripted = true;
      r.root.position.set(door.local[0], 0, door.local[1]);
      r.root.rotation.y = -Math.PI / 2;
      focus();
      cam.snap(r.root.position);
      await glide(game, r.root, door.step, 1.1);
      r.setState('idle');
      r.scripted = false;
      game.walker.sync();
    },
    release,
  };
}
