import * as THREE from "three";
import { HF } from "../../game3d/js/train/car.js";

export const PRESETS = {
  "1a": [2.8, 2.1],
  "1b": [2.3, 1.45],
  "1c": [3.6, 2.8],
};
const clamp = THREE.MathUtils.clamp;
const angle = (from, to) =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));

// Review-only adapter: all camera changes live in this frame. The production camera still updates underneath.
export function installCamera(game, initial) {
  const place = game.place,
    camera = place.camera,
    player = game.player.root;
  const authored = { fov: camera.fov, near: camera.near };
  const oldUpdate = place.cam.update.bind(place.cam);
  let mode = "1a",
    yaw = 0,
    lookYaw = 0,
    pitch = 0,
    zoom = 1,
    lastLook = -Infinity,
    fresh = true;
  const feet = new THREE.Vector3(),
    forward = new THREE.Vector3(),
    target = new THREE.Vector3(),
    desired = new THREE.Vector3();
  const pivot = new THREE.Vector3(),
    local = new THREE.Vector3(),
    ray = new THREE.Raycaster();
  const ignored = new Set([
    player,
    game.mioNpc.root,
    ...Object.values(place.people || {}).map((person) => person?.root),
  ]);
  const visible = (object) => {
    for (let node = object; node; node = node.parent)
      if (!node.visible || ignored.has(node)) return false;
    return true;
  };
  const blockers = [];
  place.scene.traverse((object) => {
    if (!object.isMesh || object.isSkinnedMesh) return;
    blockers.push(object);
  });
  const materials = new Map();
  player.traverse((object) => {
    if (!object.isMesh) return;
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material])
      if (material && !materials.has(material))
        materials.set(material, {
          opacity: material.opacity,
          transparent: material.transparent,
        });
  });
  function fadePlayer(fade) {
    for (const [material, original] of materials) {
      const transparent = fade || original.transparent;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.needsUpdate = true;
      }
      material.opacity = fade ? 0 : original.opacity;
    }
  }
  function heading() {
    player.getWorldDirection(forward);
    return Math.atan2(forward.x, forward.z);
  }
  function reset() {
    yaw = heading();
    lookYaw = 0;
    pitch = 0;
    zoom = 1;
    fresh = true;
    lastLook = -Infinity;
  }
  function setMode(next) {
    if (!(next in PRESETS) && next !== "overview" && next !== "orbit") return;
    mode = next;
    camera.fov = authored.fov;
    camera.near = authored.near;
    camera.updateProjectionMatrix();
    place.fit(camera.aspect);
    place.cam.snap?.(player.position);
    fadePlayer(false);
    reset();
  }
  function look(dx, dy) {
    if (mode === "overview") return;
    lookYaw -= dx * 0.008;
    pitch = clamp(pitch + dy * 0.005, -0.18, 0.65);
    lastLook = performance.now();
  }
  function obstruction(from, to) {
    const delta = to.clone().sub(from),
      distance = delta.length();
    ray.set(from, delta.normalize());
    ray.near = 0.12;
    ray.far = distance;
    const objects = blockers.filter(
      (object) =>
        visible(object) &&
        (Array.isArray(object.material)
          ? object.material
          : [object.material]
        ).some((material) => material?.opacity >= 0.4),
    );
    // Rays from inside a room must also see its outward-facing wall triangles.
    const sides = new Map();
    for (const object of objects)
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        if (!sides.has(material)) sides.set(material, material.side);
        material.side = THREE.DoubleSide;
      }
    let hit;
    try {
      hit = ray.intersectObjects(objects, false)[0];
    } finally {
      for (const [material, side] of sides) material.side = side;
    }
    if (hit)
      to.copy(from).addScaledVector(delta, Math.max(0.22, hit.distance - 0.15));
    return !!hit;
  }
  place.cam.update = (dt, ...args) => {
    oldUpdate(dt, ...args);
    if (mode === "overview") return;
    player.getWorldPosition(feet);
    const facing = heading();
    if (fresh) yaw = facing;
    const moving = game.walker.gait.v > 0.08;
    if (mode !== "orbit" && moving) {
      yaw += angle(yaw, facing) * (1 - Math.exp(-dt / 0.6));
      if (performance.now() - lastLook > 2000) lookYaw *= Math.exp(-dt / 0.6);
    }
    const [back, up] = PRESETS[mode] || PRESETS["1a"];
    const bearing = yaw + lookYaw;
    forward.set(Math.sin(bearing), 0, Math.cos(bearing));
    const height = 1.12 * (place.charScale || 1);
    pivot.copy(feet);
    pivot.y += height * 0.85;
    target.copy(pivot).addScaledVector(forward, mode === "orbit" ? 0 : 1.2);
    desired.copy(feet).addScaledVector(forward, -back * zoom * Math.cos(pitch));
    desired.y += up * zoom + back * zoom * Math.sin(pitch);
    // Keep the train camera under its low roof; other rooms retain their open ceiling for this review.
    local.copy(desired);
    place.space.worldToLocal(local);
    if (place.name === "train") local.y = Math.min(local.y, HF - 0.17);
    const nav = place.nav;
    local.x = clamp(local.x, nav.x0 + 0.15, nav.x1 - 0.15);
    local.z = clamp(local.z, nav.z0 + 0.15, nav.z1 - 0.15);
    desired.copy(local);
    place.space.localToWorld(desired);
    const blocked = obstruction(pivot, desired);
    camera.position.copy(desired);
    const fov = camera.aspect < 1 ? 65 : 50;
    if (camera.fov !== fov || camera.near !== 0.06) {
      camera.fov = fov;
      camera.near = 0.06;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(target);
    camera.updateMatrixWorld();
    fadePlayer(camera.position.distanceTo(pivot) < 0.7);
    api.blocked = blocked;
    api.distance = camera.position.distanceTo(pivot);
    fresh = false;
  };
  const api = {
    get mode() {
      return mode;
    },
    get yaw() {
      return yaw + lookYaw;
    },
    setMode,
    reset,
    look,
    zoom(delta) {
      if (mode === "orbit")
        zoom = clamp(zoom * Math.exp(delta * 0.001), 0.5, 2.5);
    },
    blocked: false,
    distance: 0,
  };
  setMode(initial || "1a");
  return api;
}
