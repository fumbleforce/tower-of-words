// CPU-only probe of the real creator rig, retargeting, update and base mesh code.
// Gate: node tools/creator/base/check_deformation.mjs --strict --all-crossings [base-id ...]
// Optional: --host-rest, --keep-poses, --all-frames; --crossings samples only five poses.
// Use source-eric/source-mio instead of a base ID to compare original source skin.
// Uses cached GLB animation data instead of browser fetch/texture loading.
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import * as THREE from '../../../game3d/vendor/three/three.core.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = path => readFileSync(join(root, path));
const json = path => JSON.parse(read(path));
const hash = path => createHash('sha256').update(read(path)).digest('hex');
const round = n => Number(n.toFixed(6));
const strict = process.argv.includes('--strict');
const allCrossings = process.argv.includes('--all-crossings');
if (strict && !allCrossings) {
  console.error('--strict requires --all-crossings; a five-pose sample is not a regression gate.');
  process.exit(2);
}
const allFrames = allCrossings || process.argv.includes('--all-frames');
const crossings = process.argv.includes('--crossings') || allCrossings;
const keepPoses = process.argv.includes('--keep-poses');
const hostRest = process.argv.includes('--host-rest');
const flags = new Set(['--strict', '--crossings', '--all-crossings', '--all-frames', '--keep-poses', '--host-rest']);
const ids = process.argv.slice(2).filter(arg => !flags.has(arg));
const DEFAULT_BASE_VERSION = 'v14';
if (!ids.length) ids.push(`clean-eric-${DEFAULT_BASE_VERSION}`, `clean-mio-${DEFAULT_BASE_VERSION}`);

// Execute the checked-in implementation, only replacing its browser imports.
// Loading a missing cache entry is an error, never an accidental network request.
const unavailable = () => { throw Error('Unexpected browser asset loading in CPU probe'); };
const helperCode = read('tools/creator/retarget.js').toString().replace(/^import .*;$/gm, '').replace(/^export /gm, '');
const retargetRotationValues = new Function('THREE', helperCode + '\nreturn retargetRotationValues;')(THREE);
const recipeCode = read('tools/creator/recipe.js').toString()
  .replace(/^import .*;$/gm, '')
  .replace(/^export /gm, '')
  .replace(/const ROOT = .*;/, `const ROOT = ${JSON.stringify(new URL('../../../art/parts/', import.meta.url).href)};`);
const recipe = new Function('THREE', 'GLTFLoader', 'plainFace', 'reshapeJaw', 'retargetRotationValues',
  recipeCode + '\nreturn { ROOT, BONES, buildCharacter, partGeometry, partMaterial };')(
  THREE, class { load() { unavailable(); } }, unavailable, unavailable, retargetRotationValues);
const baseCode = read('tools/creator/base/base.js').toString().replace(/^import .*;$/gm, '').replace(/^export /gm, '');
const { baseMesh } = new Function('THREE', ...Object.keys(recipe), baseCode + '\nreturn { baseMesh };')(
  THREE, ...Object.values(recipe));

function loadGLB(path) {
  const bytes = read(path);
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) throw Error(`${path}: not GLB v2`);
  let data, binary;
  for (let offset = 12; offset < bytes.length;) {
    const size = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + size);
    if (type === 0x4e4f534a) data = JSON.parse(chunk.toString());
    if (type === 0x004e4942) binary = chunk;
    offset += size + 8;
  }
  function accessor(index) {
    const a = data.accessors[index], view = data.bufferViews[a.bufferView];
    const width = { SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
    if (a.componentType !== 5126 || !width || a.sparse || view.buffer !== 0) throw Error(`${path}: unsupported accessor ${index}`);
    return Float32Array.from({ length: a.count * width }, (_, i) => binary.readFloatLE(
      (view.byteOffset || 0) + (a.byteOffset || 0) + Math.floor(i / width) * (view.byteStride || width * 4) + i % width * 4));
  }
  const nodes = data.nodes.map(n => {
    const node = new THREE.Object3D(); node.name = n.name || '';
    if (n.matrix) new THREE.Matrix4().fromArray(n.matrix).decompose(node.position, node.quaternion, node.scale);
    else {
      if (n.translation) node.position.fromArray(n.translation);
      if (n.rotation) node.quaternion.fromArray(n.rotation);
      if (n.scale) node.scale.fromArray(n.scale);
    }
    return node;
  });
  data.nodes.forEach((n, i) => (n.children || []).forEach(child => nodes[i].add(nodes[child])));
  const scene = new THREE.Group();
  data.scenes[data.scene || 0].nodes.forEach(i => scene.add(nodes[i]));
  scene.updateMatrixWorld(true);
  const animations = (data.animations || []).map(animation => {
    const tracks = animation.channels.map(channel => {
      const sampler = animation.samplers[channel.sampler], interpolation = sampler.interpolation || 'LINEAR';
      if (!['LINEAR', 'STEP'].includes(interpolation)) throw Error(`${path}: unsupported ${interpolation}`);
      const prop = { translation: 'position', rotation: 'quaternion', scale: 'scale' }[channel.target.path];
      if (!prop) throw Error(`${path}: unsupported animation path ${channel.target.path}`);
      const Track = prop === 'quaternion' ? THREE.QuaternionKeyframeTrack : THREE.VectorKeyframeTrack;
      return new Track(`${nodes[channel.target.node].name}.${prop}`, accessor(sampler.input), accessor(sampler.output),
        interpolation === 'STEP' ? THREE.InterpolateDiscrete : THREE.InterpolateLinear);
    });
    return new THREE.AnimationClip(animation.name, -1, tracks);
  });
  return { data, accessor, scene, nodes, animations };
}

function source(id, meta) {
  const data = json(`art/parts/base/src-${id}.json`);
  return { ...data, meta,
    P: Object.fromEntries(Object.entries(data.P).map(([k, v]) => [k, new THREE.Vector3(...v)])),
    B: Object.fromEntries(Object.entries(data.B).map(([k, v]) => [k, new THREE.Quaternion(...v)])),
  };
}

// Recover the reference's raw normalization from its actual bind geometry, as
// loadSource does. Source JSON rounds joint frames but omits this raw metadata.
function referenceNormalization(ref, glb) {
  const nodeIndex = glb.data.nodes.findIndex(n => n.skin !== undefined && n.mesh !== undefined);
  const node = glb.data.nodes[nodeIndex], skin = glb.data.skins[node.skin];
  const primitive = glb.data.meshes[node.mesh].primitives[0];
  const positions = glb.accessor(primitive.attributes.POSITION), vector = new THREE.Vector3();
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    // The repo's GLTFLoader binds every mesh with the identity matrix (line
    // 4297); loadSource applies that bindMatrix, not the current node transform.
    vector.fromArray(positions, i);
    minY = Math.min(minY, vector.y); maxY = Math.max(maxY, vector.y);
  }
  const hipsIndex = skin.joints.findIndex(i => glb.nodes[i].name === 'Hips');
  const inverse = new THREE.Matrix4().fromArray(glb.accessor(skin.inverseBindMatrices), hipsIndex * 16).invert();
  const hips = new THREE.Vector3().setFromMatrixPosition(inverse);
  ref.raw = { off: new THREE.Vector3(hips.x, minY, hips.z), H: maxY - minY };
  if (Math.abs(ref.raw.H - ref.height) > 1e-5) throw Error('Reference height does not match source snapshot');
}

const manifest = json('art/parts/library.json');
const lib = { ...manifest, retargetRest: hostRest, src: {}, clips: {}, anims: { walk: manifest.anims.walk, neutral: 'candidates/idle-neutral.glb' } };
for (const [id, meta] of Object.entries(lib.sources)) lib.src[id] = source(id, meta);
referenceNormalization(lib.src[lib.reference], loadGLB(`art/parts/${lib.sources[lib.reference].glb}`));
for (const file of Object.values(lib.anims)) lib.clips[file] = loadGLB(`art/parts/${file}`);
const provenance = Object.fromEntries(['tools/creator/recipe.js', 'tools/creator/base/base.js', 'tools/creator/retarget.js',
  ...Object.values(lib.anims).map(p => `art/parts/${p}`), ...Object.keys(lib.src).map(id => `art/parts/base/src-${id}.json`)]
  .map(path => [path, hash(path)]));
const temporary = crossings || keepPoses ? mkdtempSync(join(tmpdir(), 'creator-deformation-')) : null;
const results = [];
try {
  for (const id of ids) {
    const original = id.startsWith('source-'), sid = id.slice('source-'.length);
    const path = `art/parts/base/${original ? `src-${sid}` : id}.json`;
    const data = original ? { ...json(path), id, source: sid, skin: [1, 1, 1] } : json(path);
    const ch = await recipe.buildCharacter(lib, { body: data.source, parts: {}, height: 1 });
    const mesh = baseMesh(lib, ch, { d: data, tex: null }); ch.rig.add(mesh);
    const position = mesh.geometry.attributes.position, point = new THREE.Vector3();
    const vertexIds = new Map(), unique = [], triangles = [];
    for (let i = 0; i < position.count; i++) {
      const key = `${position.getX(i)},${position.getY(i)},${position.getZ(i)}`;
      if (!vertexIds.has(key)) { vertexIds.set(key, unique.length); unique.push(i); }
      triangles.push(vertexIds.get(key));
    }
    const rest = unique.map(i => new THREE.Vector3().fromBufferAttribute(position, i));
    ch.root.updateMatrixWorld(true); ch.skeleton.update();
    const bindPoseMaxError = Math.max(...unique.map((vertex, i) =>
      mesh.applyBoneTransform(vertex, point.copy(rest[i])).distanceTo(rest[i])));
    // Original snapshots also round skin weights to four decimals, so their
    // influence sums can differ slightly from one. Preserve those input data.
    if (bindPoseMaxError > (original ? 1e-3 : 1e-6)) throw Error(`${id}: bind pose recovery failed (${bindPoseMaxError})`);
    const influences = vertex => {
      const weights = {};
      for (let k = 0; k < 4; k++) {
        const weight = data.sw[vertex * 4 + k];
        if (weight) weights[recipe.BONES[data.si[vertex * 4 + k]]] = weight;
      }
      return weights;
    };
    const edges = new Map();
    for (let i = 0; i < triangles.length; i += 3) for (let k = 0; k < 3; k++) {
      const a = triangles[i + k], b = triangles[i + (k + 1) % 3];
      edges.set([a, b].sort((x, y) => x - y).join(','), [a, b, rest[a].distanceTo(rest[b])]);
    }
    const soles = { left: [], right: [] };
    rest.forEach((v, i) => { if (v.y < 1e-5) soles[v.x > 0 ? 'left' : 'right'].push(i); });
    const animations = {};
    for (const name of Object.keys(lib.anims)) {
      ch.bindPose(); ch.play(name, 0);
      const duration = ch.actions[name].getClip().duration;
      const frames = 33, box = new THREE.Box3(), soleRanges = { left: [Infinity, -Infinity], right: [Infinity, -Infinity] };
      let maxStretch = 0, minRatio = Infinity, maxSoleDisplacement = 0, finite = true, firstSoles, worstStretch;
      const snapshots = [], crossingFrames = [];
      let lastTime = 0;
      for (let frame = 0; frame < frames; frame++) {
        const time = Math.min(duration - 1e-7, frame * duration / (frames - 1));
        ch.update(time - lastTime); lastTime = time;
        ch.root.updateMatrixWorld(true); ch.skeleton.update();
        const posed = unique.map(i => mesh.applyBoneTransform(i, point.fromBufferAttribute(position, i)).clone());
        finite &&= posed.every(p => [p.x, p.y, p.z].every(Number.isFinite))
          && ch.skeleton.bones.every(b => b.matrixWorld.elements.every(Number.isFinite));
        for (const p of posed) box.expandByPoint(p);
        for (const [a, b, length] of edges.values()) {
          const ratio = posed[a].distanceTo(posed[b]) / length;
          if (ratio > maxStretch) worstStretch = { time: round(time), bindLength: round(length),
            posedLength: round(posed[a].distanceTo(posed[b])),
            bindVertices: [rest[a].toArray().map(round), rest[b].toArray().map(round)],
            influences: [influences(unique[a]), influences(unique[b])] };
          maxStretch = Math.max(maxStretch, ratio); minRatio = Math.min(minRatio, ratio);
        }
        if (!firstSoles) firstSoles = posed.map(p => p.clone());
        for (const [side, indices] of Object.entries(soles)) for (const i of indices) {
          soleRanges[side][0] = Math.min(soleRanges[side][0], posed[i].y);
          soleRanges[side][1] = Math.max(soleRanges[side][1], posed[i].y);
          maxSoleDisplacement = Math.max(maxSoleDisplacement, posed[i].distanceTo(firstSoles[i]));
        }
        if (allFrames || [0, 8, 16, 24, 32].includes(frame)) {
          const bounds = new THREE.Box3().setFromPoints(posed);
          snapshots.push({ time: round(time), min: bounds.min.toArray().map(round), max: bounds.max.toArray().map(round) });
          if (temporary) {
            const filename = join(temporary, `${id}-${name}-${frame}.json`);
            writeFileSync(filename, JSON.stringify({ time, pos: triangles.flatMap(i => posed[i].toArray()),
              bones: recipe.BONES, boneMatrices: Array.from(ch.skeleton.boneMatrices),
              boneWorldMatrices: ch.skeleton.bones.map(b => b.matrixWorld.toArray()) }));
            if (crossings) {
              const result = JSON.parse(execFileSync('/home/jorgen/ai/flat-venv/bin/python',
                [join(root, 'tools/creator/base/build_clean_base.py'), '--check', filename],
                { encoding: 'utf8', timeout: 20000, env: { ...process.env, OPENBLAS_NUM_THREADS: '1', OMP_NUM_THREADS: '1' } }));
              if (!Number.isInteger(result.proper_crossings) || result.proper_crossings < 0) {
                throw Error(`Invalid crossing count from builder for ${filename}`);
              }
              crossingFrames.push({ time: round(time), properCrossings: result.proper_crossings, pairs: result.pairs });
            }
          }
        }
      }
      animations[name] = { duration: round(duration), sampledFrames: frames, finite,
        bounds: { min: box.min.toArray().map(round), max: box.max.toArray().map(round) },
        surfaceMinimumY: round(box.min.y),
        edgeLengthRatio: [round(minRatio), round(maxStretch)],
        worstStretch,
        soleVertexY: Object.fromEntries(Object.entries(soleRanges).map(([k, v]) => [k, v.map(round)])),
        maxSoleDisplacementFromFirstFrame: round(maxSoleDisplacement), snapshots, crossingFrames };
      if (!finite || strict && crossingFrames.some(frame => frame.properCrossings > 0)) process.exitCode = 1;
    }
    results.push({ id, sha256: hash(path), bindPoseMaxError, uniqueVertices: unique.length, triangles: data.T,
      soleVertices: Object.fromEntries(Object.entries(soles).map(([k, v]) => [k, v.length])), animations });
    ch.mixer.stopAllAction(); mesh.geometry.dispose(); mesh.material.dispose(); ch.skeleton.dispose();
  }
} finally {
  if (temporary && !keepPoses) rmSync(temporary, { recursive: true });
}
console.log(JSON.stringify({ provenance, strict, proposedHostRestCorrection: hostRest, posesDirectory: keepPoses ? temporary : null, units: 'source-normalized body height (creator height=1)',
  limitations: '33 frames per clip, not continuous collision detection. Proper crossings exclude coplanar overlap and tangency; minimum clearance is not measured, so near misses can pass. No clothing fit, rendered normals, visual quality, foot contact solver or locomotion-speed test. Floor penetration is reported but does not fail this intersection gate. Source snapshots round joint frames to six decimals.', results }, null, 2));
