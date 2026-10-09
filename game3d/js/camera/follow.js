import * as THREE from 'three';
import { HF } from '../train/car.js';
import { cameraObstruction } from './obstruction.js';
import { playerFraming } from './framing.js';

// The approved 1c lens. Authored cameras continue to update underneath; their exact pose/lens is restored
// before the next step, resize, pause or scene, so their fitting never uses this camera's field of view.
export function followCamera(game, place) {
  const camera = place.camera,
    player = game.player.root;
  const visibilityCamera = camera.clone();
  const enclosures = [];
  place.space.traverse((o) => {
    if (o.userData.followEnclosure) enclosures.push(o);
  });
  const feet = new THREE.Vector3(),
    forward = new THREE.Vector3(),
    pivot = new THREE.Vector3();
  const target = new THREE.Vector3(),
    desired = new THREE.Vector3(),
    local = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const actors = new Set([
    player,
    game.mioNpc?.root,
    ...[...Object.values(place.people || {}), ...(place.crowd || [])].map((p) => p?.root),
  ]);
  const obstruct = cameraObstruction(place, actors);
  const framing = playerFraming(player);
  let authored = null,
    yaw = 0,
    pitch = 0;
  player.getWorldDirection(forward);
  yaw = Math.atan2(forward.x, forward.z);
  const api = {
    visibilityCamera,
    setActive(value) {
      if (!value) framing.reset();
      player.getWorldPosition(feet);
      for (const group of enclosures) {
        const data = group.userData.followEnclosure,
          region = data.region;
        local.copy(feet);
        group.parent.worldToLocal(local);
        data.inside =
          !region || (local.x >= region[0] && local.x <= region[1] && local.z >= region[2] && local.z <= region[3]);
        group.visible = value && (data.exterior || data.inside);
      }
    },
    blocked: false,
    collisionMs: 0,
    distance: 0,
    get yaw() {
      return yaw;
    },
    look(dx, dy) {
      yaw -= dx * 0.003;
      pitch = THREE.MathUtils.clamp(pitch + dy * 0.001875, place.farView?.pitchMin ?? -0.18, 0.65);
    },
    // shot tools: a set view (yaw as from look(); pitch clamped as look() clamps it)
    aim(y, p) {
      yaw = y;
      pitch = p;
      api.look(0, 0);
    },
    restore() {
      if (authored) {
        camera.position.copy(authored.position);
        camera.quaternion.copy(authored.quaternion);
        camera.fov = authored.fov;
        camera.near = authored.near;
        camera.far = authored.far;
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        authored = null;
      }
      framing.restore();
    },
    movementFrame() {
      forward.set(Math.sin(yaw), 0, Math.cos(yaw));
      if (player.parent) forward.applyQuaternion(player.parent.getWorldQuaternion(rotation).invert());
      forward.y = 0;
      return forward.normalize().clone();
    },
    update() {
      api.restore();
      authored = {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        fov: camera.fov,
        near: camera.near,
        far: camera.far,
      };
      player.getWorldPosition(feet);
      forward.set(Math.sin(yaw), 0, Math.cos(yaw));
      pivot.copy(feet);
      pivot.y += 1.12 * (place.charScale || 1) * 0.85;
      target.copy(pivot).addScaledVector(forward, 1.2);
      desired.copy(feet).addScaledVector(forward, -3.6 * Math.cos(pitch));
      desired.y += 2.8 + 3.6 * Math.sin(pitch);
      local.copy(desired);
      place.space.worldToLocal(local);
      if (place.name === 'train') local.y = Math.min(local.y, HF - 0.17);
      for (const group of enclosures) {
        if (!group.visible || group.userData.followEnclosure.inside === false) continue;
        const ceiling = group.parent.localToWorld(
          new THREE.Vector3(0, group.userData.followEnclosure.height - 0.16, 0),
        );
        place.space.worldToLocal(ceiling);
        local.y = Math.min(local.y, ceiling.y);
      }
      const nav = place.nav;
      if (nav) {
        local.x = THREE.MathUtils.clamp(local.x, nav.x0 + 0.15, nav.x1 - 0.15);
        local.z = THREE.MathUtils.clamp(local.z, nav.z0 + 0.15, nav.z1 - 0.15);
      }
      desired.copy(local);
      place.space.localToWorld(desired);
      const collisionStart = performance.now();
      api.blocked = obstruct(pivot, desired);
      api.collisionMs = performance.now() - collisionStart;
      api.distance = desired.distanceTo(pivot);
      camera.position.copy(desired);
      camera.fov = 50;
      camera.near = 0.04;
      // the far view (look/sky.js): the far plane just past where the haze is whole, so the island's edge never shows
      if (place.farView) camera.far = place.farView.far;
      camera.updateProjectionMatrix();
      camera.lookAt(target);
      camera.updateMatrixWorld();
      visibilityCamera.copy(camera, false);
      framing.update(api.distance, place.charScale || 1);
    },
  };
  return api;
}
