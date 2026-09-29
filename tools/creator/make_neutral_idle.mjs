// One review candidate, derived from Eric's inverse-bind pose. No source assets change.
// Run from any directory: node tools/creator/make_neutral_idle.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import * as THREE from '../../game3d/vendor/three/three.core.js';

const sourcePath = fileURLToPath(new URL('../../art/parts/src/eric/mesh.glb', import.meta.url));
const outputPath = fileURLToPath(new URL('../../art/parts/candidates/idle-neutral-3.glb', import.meta.url));
const metadataPath = outputPath.replace(/\.glb$/, '.json');
if (existsSync(outputPath) || existsSync(metadataPath)) throw Error('Preserve prior attempts: candidate 3 already exists');
const bytes = readFileSync(sourcePath), hash = b => createHash('sha256').update(b).digest('hex');
if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) throw Error('Expected GLB v2');
let gltf, originalBin;
for (let at = 12; at < bytes.length;) {
  const length = bytes.readUInt32LE(at), type = bytes.readUInt32LE(at + 4);
  if (type === 0x4e4f534a) gltf = JSON.parse(bytes.subarray(at + 8, at + 8 + length).toString());
  if (type === 0x004e4942) originalBin = bytes.subarray(at + 8, at + 8 + length);
  at += 8 + length;
}
function accessor(index) {
  const a = gltf.accessors[index], v = gltf.bufferViews[a.bufferView];
  const width = { VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
  const size = { 5121: 1, 5123: 2, 5126: 4 }[a.componentType];
  if (!width || !size || a.sparse || a.normalized || v.buffer !== 0) throw Error(`Unsupported accessor ${index}`);
  return Array.from({ length: width * a.count }, (_, i) => {
    const offset = (v.byteOffset || 0) + (a.byteOffset || 0) + Math.floor(i / width) * (v.byteStride || width * size) + i % width * size;
    return a.componentType === 5126 ? originalBin.readFloatLE(offset) : size === 2 ? originalBin.readUInt16LE(offset) : originalBin.readUInt8(offset);
  });
}
const nodes = gltf.nodes.map(n => {
  const o = new THREE.Object3D(); o.name = n.name || '';
  if (n.matrix) new THREE.Matrix4().fromArray(n.matrix).decompose(o.position, o.quaternion, o.scale);
  else {
    if (n.translation) o.position.fromArray(n.translation);
    if (n.rotation) o.quaternion.fromArray(n.rotation);
    if (n.scale) o.scale.fromArray(n.scale);
  }
  return o;
});
gltf.nodes.forEach((n, i) => (n.children || []).forEach(child => nodes[i].add(nodes[child])));
const scene = new THREE.Group();
gltf.scenes[gltf.scene || 0].nodes.forEach(i => scene.add(nodes[i])); scene.updateMatrixWorld(true);
const byName = Object.fromEntries(nodes.map(n => [n.name, n]));
const skin = gltf.skins[0], ibm = accessor(skin.inverseBindMatrices);
const inverseBind = skin.joints.map((_, i) => new THREE.Matrix4().fromArray(ibm, i * 16));
const bindWorld = new Map(skin.joints.map((id, i) => [nodes[id], inverseBind[i].clone().invert()]));
const bindLocal = new Map();
for (const id of skin.joints) {
  const node = nodes[id], parentWorld = bindWorld.get(node.parent) || node.parent.matrixWorld;
  const matrix = parentWorld.clone().invert().multiply(bindWorld.get(node));
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  matrix.decompose(p, q, s); bindLocal.set(node, { p, q, s });
}
function resetBind() {
  for (const [node, { p, q, s }] of bindLocal) { node.position.copy(p); node.quaternion.copy(q); node.scale.copy(s); }
  scene.updateMatrixWorld(true);
}
resetBind();
const restPositions = new Map([...bindLocal.keys()].map(n => [n, n.getWorldPosition(new THREE.Vector3())]));
const parentQ = new Map([...bindLocal.keys()].map(n => [n, n.parent.getWorldQuaternion(new THREE.Quaternion())]));
const kneeBendDegrees = Object.fromEntries(['Left', 'Right'].map(side => {
  const hip = restPositions.get(byName[`${side}UpLeg`]), knee = restPositions.get(byName[`${side}Leg`]);
  const foot = restPositions.get(byName[`${side}Foot`]);
  return [side, 180 - hip.clone().sub(knee).angleTo(foot.clone().sub(knee)) * 180 / Math.PI];
}));
const footSeparationX = restPositions.get(byName.LeftFoot).x - restPositions.get(byName.RightFoot).x;
if (footSeparationX <= 0) throw Error('Unexpected crossed source feet');
function turnInWorldBindFrame(name, axis, radians) {
  applyWorldBindTurn(name, new THREE.Quaternion().setFromAxisAngle(axis, radians));
}
function applyWorldBindTurn(name, rotation) {
  const node = byName[name], parent = parentQ.get(node);
  const delta = parent.clone().invert().multiply(rotation).multiply(parent);
  node.quaternion.copy(delta.multiply(bindLocal.get(node).q)).normalize();
}
const duration = 4, count = 121, times = Array.from({ length: count }, (_, i) => i * duration / (count - 1));
const rotationValues = new Map(skin.joints.map(id => [id, []]));
const xAxis = new THREE.Vector3(1, 0, 0), zAxis = new THREE.Vector3(0, 0, 1);
const degrees = Math.PI / 180;
// Aim shoulder-to-hand chains down with a little clearance from the torso.
// Keep the source elbow and wrist rotations, including their natural bend.
const relaxedArms = Object.fromEntries(['Left', 'Right'].map(side => {
  const sign = side === 'Left' ? 1 : -1;
  const original = restPositions.get(byName[`${side}Hand`]).clone().sub(restPositions.get(byName[`${side}Arm`])).normalize();
  const target = new THREE.Vector3(sign * Math.sin(12 * degrees), -Math.cos(12 * degrees), 0.08).normalize();
  return [side, new THREE.Quaternion().setFromUnitVectors(original, target)];
}));
const motionBounds = Object.fromEntries(['Head', 'LeftHand', 'RightHand'].map(name => [name, new THREE.Box3()]));
const legNames = ['Hips', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'];
const prim = gltf.meshes[0].primitives[0], positions = accessor(prim.attributes.POSITION);
const joints = accessor(prim.attributes.JOINTS_0), weights = accessor(prim.attributes.WEIGHTS_0);
const soleVertices = [];
const minY = Math.min(...positions.filter((_, i) => i % 3 === 1));
for (let v = 0; v < positions.length / 3; v++) {
  if (positions[v * 3 + 1] > minY + 0.0001) continue;
  let footWeight = 0;
  for (let k = 0; k < 4; k++) if (/Foot|ToeBase/.test(nodes[skin.joints[joints[v * 4 + k]]].name)) footWeight += weights[v * 4 + k];
  if (footWeight > 0.95) soleVertices.push(v);
}
if (!soleVertices.length) throw Error('No sole vertices found for grounding check');
function skinnedVertex(index) {
  const v = new THREE.Vector3().fromArray(positions, index * 3), result = new THREE.Vector3();
  for (let k = 0; k < 4; k++) {
    const joint = joints[index * 4 + k], weight = weights[index * 4 + k];
    if (weight) result.addScaledVector(v.clone().applyMatrix4(inverseBind[joint]).applyMatrix4(nodes[skin.joints[joint]].matrixWorld), weight);
  }
  return result;
}
const soleRest = soleVertices.map(skinnedVertex);
let maxLegJointDrift = 0, maxSoleDrift = 0, minSoleY = Infinity, maxSoleY = -Infinity;
for (const [frame, time] of times.entries()) {
  resetBind();
  const phase = frame === count - 1 ? 0 : time * 2 * Math.PI / duration;
  const breath = Math.sin(phase), sway = Math.sin(phase * 2);
  for (const side of ['Left', 'Right']) {
    const sign = side === 'Left' ? 1 : -1;
    const pendulum = new THREE.Quaternion().setFromAxisAngle(zAxis, sign * breath * 1.2 * degrees);
    applyWorldBindTurn(`${side}Arm`, pendulum.multiply(relaxedArms[side]));
  }
  // Breathing opens the chest; sway and loose arms remain visible from the front.
  // Pelvis and leg chains stay in the inverse-bind pose, retaining the twist fix.
  turnInWorldBindFrame('Spine02', xAxis, breath * 2.5 * degrees);
  turnInWorldBindFrame('Spine01', zAxis, sway * 2 * degrees);
  turnInWorldBindFrame('Spine', xAxis, breath * 1.5 * degrees);
  scene.updateMatrixWorld(true);
  for (const [name, bounds] of Object.entries(motionBounds)) bounds.expandByPoint(byName[name].getWorldPosition(new THREE.Vector3()));
  for (const id of skin.joints) rotationValues.get(id).push(...nodes[id].quaternion.toArray());
  for (const name of legNames) maxLegJointDrift = Math.max(maxLegJointDrift, byName[name].getWorldPosition(new THREE.Vector3()).distanceTo(restPositions.get(byName[name])));
  soleVertices.forEach((index, i) => {
    const p = skinnedVertex(index); maxSoleDrift = Math.max(maxSoleDrift, p.distanceTo(soleRest[i]));
    minSoleY = Math.min(minSoleY, p.y); maxSoleY = Math.max(maxSoleY, p.y);
  });
}
if (maxLegJointDrift > 1e-7 || maxSoleDrift > 1e-6 || Math.abs(minSoleY) > 1e-5 || Math.abs(maxSoleY) > 1e-5) {
  throw Error(`Grounding check failed: ${JSON.stringify({ maxLegJointDrift, maxSoleDrift, minSoleY, maxSoleY })}`);
}
const chunks = [originalBin], pad = n => (4 - n % 4) % 4;
let binLength = originalBin.length;
function addAccessor(values, type, width, bounds = false) {
  if (pad(binLength)) { const padding = Buffer.alloc(pad(binLength)); chunks.push(padding); binLength += padding.length; }
  const data = Buffer.alloc(values.length * 4); values.forEach((v, i) => data.writeFloatLE(v, i * 4));
  const view = gltf.bufferViews.length;
  gltf.bufferViews.push({ buffer: 0, byteOffset: binLength, byteLength: data.length }); chunks.push(data); binLength += data.length;
  const a = { bufferView: view, componentType: 5126, count: values.length / width, type };
  if (bounds) { a.min = [Math.min(...values)]; a.max = [Math.max(...values)]; }
  gltf.accessors.push(a); return gltf.accessors.length - 1;
}
const input = addAccessor(times, 'SCALAR', 1, true), animation = { name: 'Neutral_stand_candidate_v3', channels: [], samplers: [] };
for (const id of skin.joints) {
  const { p, s } = bindLocal.get(nodes[id]);
  for (const [path, type, width, values] of [
    ['rotation', 'VEC4', 4, rotationValues.get(id)],
    ['translation', 'VEC3', 3, times.flatMap(() => p.toArray())],
    ['scale', 'VEC3', 3, times.flatMap(() => s.toArray())],
  ]) {
    animation.channels.push({ sampler: animation.samplers.length, target: { node: id, path } });
    animation.samplers.push({ input, output: addAccessor(values, type, width), interpolation: 'LINEAR' });
  }
}
gltf.animations = [animation]; gltf.buffers[0].byteLength = binLength;
gltf.extras = { ...(gltf.extras || {}), neutralIdleCandidate: {
  source: 'art/parts/src/eric/mesh.glb', sourceSha256: hash(bytes), generator: 'tools/creator/make_neutral_idle.mjs',
  note: 'Unapproved candidate 3. Arms aimed 12 degrees from vertical with source elbow/wrist angles. Four-degree distributed chest breathing, two-degree torso sway and 1.2-degree arm swing. Inverse-bind hips and legs unchanged.',
} };
const rawJson = Buffer.from(JSON.stringify(gltf));
const json = Buffer.concat([rawJson, Buffer.alloc(pad(rawJson.length), 0x20)]);
const bin = Buffer.concat([...chunks, Buffer.alloc(pad(binLength))]);
const header = Buffer.alloc(12), jsonHeader = Buffer.alloc(8), binHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + bin.length, 8);
jsonHeader.writeUInt32LE(json.length, 0); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
binHeader.writeUInt32LE(bin.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
const output = Buffer.concat([header, jsonHeader, json, binHeader, bin]);
mkdirSync(dirname(outputPath), { recursive: true }); writeFileSync(outputPath, output, { flag: 'wx' });
const metadata = { outputPath, sha256: hash(output), sourceSha256: hash(bytes), duration, samples: count,
  motion: { armDegreesFromVertical: 12, forwardArmComponent: 0.08, chestBreathingDegrees: [2.5, 1.5], torsoSwayDegrees: 2, armSwingDegrees: 1.2,
    jointTravel: Object.fromEntries(Object.entries(motionBounds).map(([name, bounds]) => [name, bounds.getSize(new THREE.Vector3()).toArray()])) },
  grounding: { soleVertices: soleVertices.length, maxLegJointDrift, maxSoleDrift, minSoleY, maxSoleY },
  unchangedStance: { footSeparationX, kneeBendDegrees },
  note: 'Source geometry, skin weights, skeleton and materials preserved. Visual clothing fit and Mio retargeting need review.' };
writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(metadata, null, 2));
