// CPU-only GLB orientation probe. No assets are written and no renderer is created.
// Usage: node tools/creator/inspect_animation.mjs [animation.glb ...]
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as THREE from '../../game3d/vendor/three/three.core.js';

const defaults = ['idle', 'walk'].map(name => fileURLToPath(new URL(`../../art/parts/anim/${name}.glb`, import.meta.url)));
const degrees = n => n * 180 / Math.PI;
const round = n => Number(n.toFixed(3));

function load(path) {
  const bytes = readFileSync(path);
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) throw Error('Expected GLB v2');
  let json, bin;
  for (let offset = 12; offset < bytes.length;) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString());
    if (type === 0x004e4942) bin = chunk;
    offset += 8 + length;
  }
  function accessor(index) {
    const a = json.accessors[index], view = json.bufferViews[a.bufferView];
    const width = { SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
    if (a.componentType !== 5126 || !width || a.sparse || view.buffer !== 0) throw Error(`Unsupported accessor ${index}`);
    return Array.from({ length: a.count * width }, (_, i) => bin.readFloatLE(
      (view.byteOffset || 0) + (a.byteOffset || 0) + Math.floor(i / width) * (view.byteStride || width * 4) + i % width * 4));
  }
  const nodes = json.nodes.map(n => {
    const o = new THREE.Object3D(); o.name = n.name || '';
    if (n.matrix) new THREE.Matrix4().fromArray(n.matrix).decompose(o.position, o.quaternion, o.scale);
    else {
      if (n.translation) o.position.fromArray(n.translation);
      if (n.rotation) o.quaternion.fromArray(n.rotation);
      if (n.scale) o.scale.fromArray(n.scale);
    }
    return o;
  });
  json.nodes.forEach((n, i) => (n.children || []).forEach(child => nodes[i].add(nodes[child])));
  const scene = new THREE.Group();
  json.scenes[json.scene || 0].nodes.forEach(i => scene.add(nodes[i])); scene.updateMatrixWorld(true);
  const tracks = json.animations[0].channels.map(c => {
    const s = json.animations[0].samplers[c.sampler], interpolation = s.interpolation || 'LINEAR';
    if (!['LINEAR', 'STEP'].includes(interpolation)) throw Error(`Unsupported interpolation ${interpolation}`);
    const property = { translation: 'position', rotation: 'quaternion', scale: 'scale' }[c.target.path];
    const Track = property === 'quaternion' ? THREE.QuaternionKeyframeTrack : THREE.VectorKeyframeTrack;
    return new Track(`${nodes[c.target.node].uuid}.${property}`, accessor(s.input), accessor(s.output),
      interpolation === 'STEP' ? THREE.InterpolateDiscrete : THREE.InterpolateLinear);
  });
  const clip = new THREE.AnimationClip(json.animations[0].name, -1, tracks);
  const mixer = new THREE.AnimationMixer(scene); mixer.clipAction(clip).play();
  const skin = json.skins[0], inverses = accessor(skin.inverseBindMatrices), bind = {};
  skin.joints.forEach((id, i) => {
    const matrix = new THREE.Matrix4().fromArray(inverses, i * 16).invert();
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    matrix.decompose(p, q, s); bind[nodes[id].name] = q;
  });
  const byName = Object.fromEntries(nodes.map(n => [n.name, n]));
  function measure(time) {
    // LoopOnce-style endpoint: avoid wrapping at exactly duration.
    mixer.setTime(Math.min(time, clip.duration - 1e-7)); scene.updateMatrixWorld(true);
    const result = { time: round(time) };
    for (const name of ['Hips', 'Head']) {
      const q = byName[name].getWorldQuaternion(new THREE.Quaternion()).multiply(bind[name].clone().invert()).normalize();
      const front = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
      result[name] = {
        yaw: round(degrees(Math.atan2(front.x, front.z))),
        tilt: round(degrees(Math.acos(THREE.MathUtils.clamp(up.y, -1, 1)))),
      };
    }
    return result;
  }
  const samples = Array.from(new Set([0, 0.4, 1, 2, 3, clip.duration].filter(t => t <= clip.duration))).map(measure);
  const all = Array.from({ length: Math.ceil(clip.duration * 120) + 1 }, (_, i) => measure(Math.min(i / 120, clip.duration)));
  const ranges = Object.fromEntries(['Hips', 'Head'].map(name => [name, Object.fromEntries(['yaw', 'tilt'].map(key => [key,
    [Math.min(...all.map(s => s[name][key])), Math.max(...all.map(s => s[name][key]))]]))]));
  mixer.stopAllAction(); scene.updateMatrixWorld(true);
  const parentQuaternion = byName.Hips.parent.getWorldQuaternion(new THREE.Quaternion()).toArray().map(round);
  return { path, sha256: createHash('sha256').update(bytes).digest('hex'), clip: clip.name,
    duration: round(clip.duration), hipsParentQuaternion: parentQuaternion,
    units: 'degrees relative to inverse-bind world orientation; yaw about world Y; tilt from world up', samples, ranges };
}

for (const path of process.argv.length > 2 ? process.argv.slice(2) : defaults) console.log(JSON.stringify(load(path), null, 2));
