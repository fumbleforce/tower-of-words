import * as THREE from 'three';
import { GLTFLoader } from '../../../../game3d/vendor/loaders/GLTFLoader.js';
import { loadRelaxedIdle } from '../../../../game3d/js/relaxed-idle.js';

const ROOT = new URL('../../../../', import.meta.url).href;
const loader = new GLTFLoader();
const garments = /-(hoodie|hood|zip|trousers|pockets|sneakers)(?:[-_]|$)/;

export async function loadAstra(body) {
  const [gltf, walk, idle] = await Promise.all([
    loader.loadAsync(`${ROOT}art/parts/astra/${body}.glb`),
    loader.loadAsync(`${ROOT}game3d/assets/${body}/walk.glb`),
    loadRelaxedIdle(body),
  ]);
  const model = gltf.scene;
  const pieces = [];
  model.traverse(mesh => {
    if (!mesh.isMesh) return;
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    let node = mesh;
    while (node.parent && !node.name.startsWith(`${body}-`)) node = node.parent;
    pieces.push({ mesh, name: node.name });
    const convert = src => {
      // Match diffuse lighting; retain the exported normals and opaque painted face.
      const mat = new THREE.MeshLambertMaterial({ color: src.color, map: src.map || null, flatShading: false, side: src.side });
      mat.name = src.name;
      src.dispose();
      return mat;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(convert) : convert(mesh.material);
  });
  const box = new THREE.Box3().setFromObject(model), height = box.max.y - box.min.y;
  const holder = new THREE.Group(), root = new THREE.Group();
  holder.scale.setScalar(1 / height); holder.position.y = -box.min.y / height;
  holder.add(model); root.add(holder);
  const mixer = new THREE.AnimationMixer(model);
  const actions = { neutral: mixer.clipAction(idle), walk: mixer.clipAction(walk.animations[0]) };
  let hips;
  model.traverse(node => { if (!hips && node.isBone && /hips$/i.test(node.name)) hips = node; });
  const hipRest = hips?.position.clone();
  const character = {
    root, model, mixer, actions, cur: null,
    play(name) { mixer.stopAllAction(); character.cur = actions[name]; character.cur.reset().setEffectiveWeight(1).play(); },
    update(dt) { mixer.update(dt); if (hips) { hips.position.x = hipRest.x; hips.position.z = hipRest.z; } },
    dress({ hair, outfit }) {
      for (const { mesh, name } of pieces) {
        if (new RegExp(`^${body}-hair(?:-|$)`).test(name)) mesh.visible = hair !== 'none';
        else if (garments.test(name)) mesh.visible = outfit !== 'none';
      }
    },
    dispose() {
      root.removeFromParent(); mixer.stopAllAction(); mixer.uncacheRoot(model);
      const resources = new Set();
      model.traverse(mesh => {
        if (!mesh.isMesh) return;
        resources.add(mesh.geometry);
        if (mesh.skeleton) resources.add(mesh.skeleton);
        for (const mat of [].concat(mesh.material)) { resources.add(mat); if (mat.map) resources.add(mat.map); }
      });
      for (const item of resources) item.dispose();
    },
  };
  return character;
}
