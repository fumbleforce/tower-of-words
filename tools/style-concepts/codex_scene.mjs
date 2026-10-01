// Offline forecourt export. Uses the actual scene builders and RoomCam, without a WebGL framebuffer.
// Canvas signage, texture maps and shader/post-processing effects cannot be reproduced by this DOM shim.
import fs from 'node:fs';
import { registerHooks } from 'node:module';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'three') return { url: new URL('../../game3d/vendor/three/three.module.js', import.meta.url).href, shortCircuit: true };
  if (specifier.startsWith('three/addons/')) return { url: new URL('../../game3d/vendor/' + specifier.slice(13), import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });
const ctx = new Proxy({}, { get(target, key) {
  if (key === 'measureText') return () => ({ width: 50 });
  if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
  if (key === 'getImageData') return () => ({ data: new Uint8ClampedArray(512 * 512 * 4) });
  return target[key] || (() => {});
}, set(target, key, value) { target[key] = value; return true; } });
globalThis.location = { search: '?plainlook' };
globalThis.window = { __settings: {}, addEventListener() {}, matchMedia: () => ({ matches: false }) };
globalThis.document = {
  documentElement: { style: { setProperty() {} } },
  body: { classList: { contains: () => false, toggle() {}, add() {}, remove() {} } },
  createElement: () => ({ getContext: () => ctx, style: {}, addEventListener() {} }),
  fonts: { ready: Promise.resolve() },
};
globalThis.requestAnimationFrame = () => 0;
globalThis.addEventListener = () => {};
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.innerWidth = 1366; globalThis.innerHeight = 860; globalThis.devicePixelRatio = 1;
const THREE = await import('three');
const { buildForecourt } = await import('../../game3d/js/scenes/forecourt.js');
const { RoomCam } = await import('../../game3d/js/cam.js');
const { K } = await import('../../game3d/js/scenes/office.js');
const w = buildForecourt();
const eric = new THREE.Vector3(5.2, 0, -0.3);
const characters = { eric: eric.toArray(), mio: [4.15, 0, -0.3] };
for (const [name, p] of Object.entries(characters)) {
  if (!w.nav.free(p[0], p[2])) throw new Error(`${name} staging point is not walkable`);
}
const cameras = {};
const visible = {};
for (const [name, resolution] of [['desk', [1366, 860]], ['phone', [390, 844]]]) {
  const cam = new RoomCam(w.camera);
  const aspect = resolution[0] / resolution[1];
  const vectors = (a) => a.map((p) => new THREE.Vector3(...p));
  if (name === 'desk') {
    cam.fit(aspect, vectors([[-5.9, 0, 0.6], [4.4, 0, 0.6], [-0.75, 3.2, -6.8], [w.doorX, 0, w.stationExit[1] - 0.2]]),
      new THREE.Vector3(5.2, 0, -1.2), { follow: true, clamp: [5.2, 26, -6.2, 3.5], limY: 0.96 });
  } else {
    cam.fit(aspect, vectors([[-2.9, 0, 0], [2.9, 0, 0], [0, 0, -2.6], [0, 1.2, 2.4]]),
      new THREE.Vector3(), { follow: true, clamp: [-1, 30, -8.4, 8], lead: -1.6 });
    // places/forecourt.js: at this position the eastward phone turn is fully settled (k = 1).
    cam.yaw = -1.2;
    cam.elev = THREE.MathUtils.degToRad(33);
    cam.fitDist *= 1.36;
    cam.lead = -6.3;
  }
  cam.snap(eric);
  w.station.update(eric, Infinity, cam.dir);
  w.headOffice.update(eric, Infinity);
  w.scene.updateMatrixWorld(true);
  visible[name] = new Set();
  w.scene.traverseVisible((o) => visible[name].add(o.uuid));
  cameras[name] = { resolution, position: cam.camera.position.toArray(), matrix: cam.camera.matrixWorld.toArray(),
    fov: cam.camera.fov, aspect, elevation: THREE.MathUtils.radToDeg(cam.elev), yaw: cam.yaw,
    target: cam.target.toArray(), distance: cam.dist, near: cam.camera.near, far: cam.camera.far };
}
const meshes = [], materials = [], lights = [], omitted = [], matIds = new Map();
function material(m) {
  if (!matIds.has(m.uuid)) {
    matIds.set(m.uuid, materials.length);
    materials.push({ color: m.color?.toArray() || [0.5, 0.5, 0.5], emissive: m.emissive?.toArray() || [0, 0, 0],
      emissiveIntensity: m.emissiveIntensity ?? 0, opacity: m.alphaHash ? 1 : m.opacity, roughness: m.roughness ?? 0.8,
      metalness: m.metalness ?? 0, vertexColors: !!m.vertexColors, unlit: !!m.isMeshBasicMaterial, textureOmitted: !!m.map });
  }
  return matIds.get(m.uuid);
}
w.scene.traverse((o) => {
  if (o.isLight) lights.push({ type: o.type, color: o.color.toArray(), intensity: o.intensity,
    position: o.position.toArray(), target: o.target?.position.toArray(), groundColor: o.groundColor?.toArray() });
  if (!o.isMesh || !o.geometry.attributes.position) return;
  const views = Object.keys(visible).filter((name) => visible[name].has(o.uuid));
  if (!views.length) return;
  const g = o.geometry, ms = Array.isArray(o.material) ? o.material : [o.material];
  if (ms.some((m) => m.map && m.transparent)) {
    omitted.push({ name: o.name || 'texture plane', reason: 'transparent canvas texture' });
    return;
  }
  if (o.isInstancedMesh) throw new Error('Instanced geometry needs explicit instance matrices');
  meshes.push({ name: o.name || 'forecourt', positions: Array.from(g.attributes.position.array),
    indices: g.index ? Array.from(g.index.array) : null,
    colors: g.attributes.color ? Array.from(g.attributes.color.array) : null,
    normals: g.attributes.normal ? Array.from(g.attributes.normal.array) : null,
    matrix: o.matrixWorld.toArray(), materials: ms.map(material), groups: g.groups, views, castShadow: o.castShadow });
});
const out = process.argv[2] || '/tmp/codex-forecourt.json';
fs.writeFileSync(out, JSON.stringify({
  source: ['game3d/js/scenes/forecourt.js', 'game3d/js/places/forecourt.js', 'game3d/js/cam.js'],
  label: 'Offline Blender recreation of actual forecourt geometry; not an actual game framebuffer. Printed canvas signage, textures, UI and game post-processing omitted.',
  meshes, materials, lights, omitted, cameras, characters,
  scale: { baseAvatarHeight: 1.2, placeCharScale: K, stagedHeight: 1.2 * K,
    source: ['game3d/js/avatar.js:loadMeshy', 'game3d/js/scenes/office.js:K', 'game3d/js/places/lifecycle.js'] },
}));
console.log(out, meshes.length, 'meshes;', materials.length, 'materials;', omitted.length, 'omitted texture planes');
console.log(JSON.stringify({ characters, cameras, scale: 1.2 * K }, null, 2));
