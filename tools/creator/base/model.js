// The creator's characters, as built in Blender (tools/creator/blender/): one GLB per body with the original rig,
// the bare body, its own hair, Eric's stubble and every garment as separate named meshes. Nothing is cut, patched
// or repainted here: pieces are shown or hidden, and their colours set.
//
//   const ch = await loadModel('eric'); scene.add(ch.root); ch.play('walk'); ch.dress(look); ch.update(dt);
//
// The clips are the game's own: the walk from game3d/assets/<body>/walk.glb and the approved relaxed idle, both in
// the rig's native bone names, so they play on the model unchanged.
import * as THREE from 'three';
import { GLTFLoader } from '../../../game3d/vendor/loaders/GLTFLoader.js';
import { loadRelaxedIdle } from '../../../game3d/js/relaxed-idle.js';

const ROOT = new URL('../../../', import.meta.url).href;
export const BODIES = { mio: 'Mio', eric: 'Eric' };
export const OUTFITS = { hoodie: 'Hoodie and trousers', shirt: 'Shirt and skirt', none: 'None' };
// which garment pieces make each outfit, and which of them is the top and which the bottom (for colours)
const PIECES = { hoodie: { top: ['hoodie', 'hood'], bottom: ['trousers'], other: ['zip', 'sneakers'] },
  shirt: { top: ['shirt', 'collar'], bottom: ['skirt'], other: ['sneakers'] }, none: { top: [], bottom: [], other: [] } };
const loader = new GLTFLoader();

// skin, and the face picture laid over it by its alpha (eyes and brows only; clear everywhere else)
function faceMaterial(src, flat) {
  const m = new THREE.MeshLambertMaterial({ color: src.color.clone(), map: src.map, flatShading: flat });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>',
      '#ifdef USE_MAP\n vec4 texel = texture2D( map, vMapUv );\n diffuseColor.rgb = mix( diffuseColor.rgb, texel.rgb, texel.a );\n#endif');
  };
  return m;
}

function lambert(src, flat) {
  const m = new THREE.MeshLambertMaterial({ color: src.color.clone(), flatShading: flat, map: src.map || null });
  if (src.map) { m.transparent = false; m.alphaTest = 0.5; }   // the stubble picture: drawn where it has paint
  m.name = src.name;
  return m;
}

export async function loadModel(body) {
  const [gltf, walk, idle] = await Promise.all([
    loader.loadAsync(`${ROOT}art/parts/blender/${body}.glb`),
    loader.loadAsync(`${ROOT}game3d/assets/${body}/walk.glb`),
    loadRelaxedIdle(body),
  ]);
  const model = gltf.scene;
  const flat = body === 'mio';
  const meshes = {}, base = {};
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    o.frustumCulled = false;
    // the piece's node name ('eric-hair'); a mesh with several materials is a group of meshes under that node
    const piece = new RegExp(`^${body}-[a-z]+$`);
    let node = o;
    while (node && !piece.test(node.name)) node = node.parent;
    const name = node ? node.name : o.name;
    const mats = (Array.isArray(o.material) ? o.material : [o.material]).map((src) => {
      const m = src.name === 'face' ? faceMaterial(src, flat) : lambert(src, flat);
      m.name = src.name;
      base[m.uuid] = m.color.clone();
      src.dispose();
      return m;
    });
    o.material = Array.isArray(o.material) ? mats : mats[0];
    (meshes[name] ||= []).push(o);
  });
  // the face material carries the face picture as its colour texture, so its own colour came through white: it is
  // the skin, like the rest of the body
  const bodyMats = (meshes[`${body}-body`] || []).flatMap((m) => (Array.isArray(m.material) ? m.material : [m.material]));
  const skin = bodyMats.find((m) => m.name === 'skin');
  for (const m of bodyMats) if (m.name === 'face' && skin) { m.color.copy(skin.color); base[m.uuid] = skin.color.clone(); }
  // stand at height 1, feet on the floor
  const box = new THREE.Box3().setFromObject(model);
  const holder = new THREE.Group(), root = new THREE.Group();
  holder.scale.setScalar(1 / (box.max.y - box.min.y));
  holder.position.y = -box.min.y / (box.max.y - box.min.y);
  holder.add(model); root.add(holder);
  const mixer = new THREE.AnimationMixer(model);
  const actions = { neutral: mixer.clipAction(idle), walk: mixer.clipAction(walk.animations[0]) };
  // the walk clip moves the hips forward a little: keep them over the spot
  let hips = null;
  model.traverse((o) => { if (o.isBone && !hips && /hips$/i.test(o.name)) hips = o; });
  const hipRest = hips.position.clone();
  let cur = null;
  const ch = {
    body, root, model, mixer, actions, meshes,
    play(name) {
      mixer.stopAllAction();
      cur = actions[name];
      cur.reset().setEffectiveWeight(1).play();
      ch.cur = cur;
    },
    update(dt) {
      mixer.update(dt);
      hips.position.x = hipRest.x; hips.position.z = hipRest.z;
    },
    // look: { hair: 'own'|'none', hairColour, stubble: 'own'|'none', outfit, topColour, bottomColour, skin }
    dress(look) {
      const set = (piece, on) => { for (const m of meshes[`${body}-${piece}`] || []) m.visible = on; };
      set('hair', look.hair !== 'none');
      set('stubble', look.stubble !== 'none');
      for (const p of Object.values(PIECES)) for (const k of [...p.top, ...p.bottom, ...p.other]) set(k, false);
      const outfit = PIECES[look.outfit] || PIECES.none;
      for (const k of [...outfit.top, ...outfit.bottom, ...outfit.other]) set(k, true);
      const paint = (pieces, colour) => {
        for (const piece of pieces) for (const mesh of meshes[`${body}-${piece}`] || []) {
          for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            if (m.name === 'sole') continue;
            const inside = /inside$/.test(m.name);
            if (colour) m.color.set(colour).multiplyScalar(inside ? 0.62 : 1);
            else m.color.copy(base[m.uuid]);
          }
        }
      };
      paint(outfit.top, look.topColour);
      paint(outfit.bottom, look.bottomColour);
      // hair: the main colour; the shade and the inside follow it darker; Mio's teal locks keep their colour
      for (const mesh of meshes[`${body}-hair`] || []) {
        for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          if (/accent/.test(m.name)) continue;
          if (look.hairColour) m.color.set(look.hairColour).multiplyScalar(/shade|inside/.test(m.name) ? 0.6 : 1);
          else m.color.copy(base[m.uuid]);
        }
      }
      for (const mesh of meshes[`${body}-body`] || []) {
        for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          if (look.skin) m.color.set(look.skin); else m.color.copy(base[m.uuid]);
        }
      }
    },
    dispose() {
      root.removeFromParent();
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.geometry.dispose();
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) { m.map?.dispose(); m.dispose(); }
      });
    },
  };
  return ch;
}

// The original game model (as the game has it before its colour changes), for comparing side by side.
export async function loadOriginal(body) {
  const [gltf, idle, tex, faces] = await Promise.all([
    loader.loadAsync(`${ROOT}game3d/assets/${body}/walk.glb`),
    loadRelaxedIdle(body),
    new THREE.TextureLoader().loadAsync(`${ROOT}game3d/assets/${body}/${body === 'mio' ? 'base-clean' : 'base'}.webp`),
    body === 'mio' ? fetch(`${ROOT}game3d/assets/mio/base-clean.json`).then((r) => r.json()) : null,
  ]);
  tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace;
  const model = gltf.scene;
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = false; o.castShadow = true;
    if (faces) {
      // her flat palette: each triangle its own colour, the texture only where it has none (her eyes)
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
      const n = g.attributes.position.count, col = new Float32Array(n * 3).fill(1), use = new Float32Array(n).fill(1);
      const c = new THREE.Color();
      faces.faces.forEach((rgb, f) => {
        if (!rgb) return;
        c.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace);
        for (let k = 0; k < 3; k++) { c.toArray(col, (f * 3 + k) * 3); use[f * 3 + k] = 0; }
      });
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setAttribute('useTex', new THREE.BufferAttribute(use, 1));
      o.geometry = g;
      const m = new THREE.MeshLambertMaterial({ map: tex, vertexColors: true, flatShading: true });
      m.onBeforeCompile = (sh) => {
        sh.vertexShader = 'attribute float useTex;\nvarying float vUseTex;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvUseTex = useTex;');
        sh.fragmentShader = 'varying float vUseTex;\n' + sh.fragmentShader.replace('#include <map_fragment>',
          '#ifdef USE_MAP\n vec4 texel = texture2D( map, vMapUv );\n diffuseColor *= mix( vec4( 1.0 ), texel, vUseTex );\n#endif');
      };
      o.material = m;
    } else {
      o.material = new THREE.MeshLambertMaterial({ map: tex });
    }
  });
  const box = new THREE.Box3().setFromObject(model);
  const holder = new THREE.Group(), root = new THREE.Group();
  holder.scale.setScalar(1 / (box.max.y - box.min.y));
  holder.position.y = -box.min.y / (box.max.y - box.min.y);
  holder.add(model); root.add(holder);
  const mixer = new THREE.AnimationMixer(model);
  const actions = { neutral: mixer.clipAction(idle), walk: mixer.clipAction(gltf.animations[0]) };
  let hips = null;
  model.traverse((o) => { if (o.isBone && !hips && /hips$/i.test(o.name)) hips = o; });
  const hipRest = hips.position.clone();
  let cur = null;
  return {
    root, mixer, actions,
    get cur() { return cur; },
    play(name) { mixer.stopAllAction(); cur = actions[name]; cur.reset().setEffectiveWeight(1).play(); },
    update(dt) { mixer.update(dt); hips.position.x = hipRest.x; hips.position.z = hipRest.z; },
    dispose() {
      root.removeFromParent(); mixer.stopAllAction(); mixer.uncacheRoot(model);
      model.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
      tex.dispose();
    },
  };
}
