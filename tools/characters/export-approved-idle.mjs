// Bake the approved creator idle onto the original game rigs, preserving its skin deformation.
// Run with main served at 8771; SOURCE_BASE may point at another checkout with the candidate assets.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { withBrowserJob } from '../lib/browser-job.mjs';
const sourceBase = process.env.SOURCE_BASE || 'http://127.0.0.1:8771/';
const output = new URL('../../game3d/assets/characters/', import.meta.url);
const source = new URL('../../art/parts/candidates/idle-neutral-3.glb', import.meta.url);
const sourceBytes = fs.readFileSync(process.env.IDLE_SOURCE || source);
const sha256 = createHash('sha256').update(sourceBytes).digest('hex');
if (sha256 !== '2d87466d9d82bf18fc24fcb6be18848b8b921d4981319df6548aa64c58c4ab5e')
  throw Error('Approved idle has changed');
const results = await withBrowserJob('export-approved-idle', async (browser) => {
  const page = await browser.newPage();
  await page.route('**/approved-idle-export', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<script type="importmap">{"imports":{"three":"${sourceBase}game3d/vendor/three/three.module.js"}}</script>`,
    }),
  );
  await page.goto(sourceBase + 'approved-idle-export');
  return page.evaluate(
    async ({ base, extraIds }) => {
      const THREE = await import('three');
      const { loadLibrary, loadSource, makeRig, clipsFor } = await import(base + 'tools/creator/recipe.js');
      const { GLTFLoader } = await import(base + 'game3d/vendor/loaders/GLTFLoader.js');
      const lib = await loadLibrary();
      lib.anims = { approved: 'candidates/idle-neutral-3.glb' };
      lib.retargetRest = false;
      const map = {
        Spine: 'Spine02',
        Spine1: 'Spine01',
        Spine2: 'Spine',
        Neck: 'neck',
        HeadTop_End: 'head_end',
      };
      const shared = (name) =>
        /^mixamorig/.test(name) ? map[name.replace(/^mixamorig:?/, '')] || name.replace(/^mixamorig:?/, '') : name;
      const out = {};
      for (const id of ['eric', 'mio', ...extraIds]) {
        if (!lib.src[id])
          lib.src[id] = await loadSource(
            id,
            {
              glb: `../../game3d/assets/characters/${id}/walk.glb`,
              tex: `../../game3d/assets/characters/${id}/base.webp`,
            },
            lib.src[lib.reference],
          );
        const host = lib.src[id],
          ref = lib.src[lib.reference];
        const nativeCast = !['eric', 'mio'].includes(id);
        // A chibi's head_end position follows its skull shape, not its gaze.
        // Keep the source face's forward orientation while retargeting limb axes.
        if (nativeCast) for (const name of ['Head', 'head_end', 'headfront']) host.B[name].copy(ref.B[name]);
        const { rig, bones } = makeRig(host, ref);
        const clip = (await clipsFor(lib, host)).approved;
        const mixer = new THREE.AnimationMixer(rig);
        mixer.clipAction(clip).play();
        const gltf = await new GLTFLoader().loadAsync(
          base +
            (['eric', 'mio'].includes(id) ? `game3d/assets/${id}/walk.glb` : `game3d/assets/characters/${id}/walk.glb`),
        );
        const model = gltf.scene;
        model.updateMatrixWorld(true);
        let mesh;
        model.traverse((o) => {
          if (o.isSkinnedMesh && !mesh) mesh = o;
        });
        const normalize = new THREE.Matrix4()
          .makeScale(1 / host.raw.H, 1 / host.raw.H, 1 / host.raw.H)
          .multiply(new THREE.Matrix4().makeTranslation(-host.raw.off.x, -host.raw.off.y, -host.raw.off.z));
        const unnormalize = normalize.clone().invert();
        const inverseSharedBind = Object.fromEntries(
          Object.entries(bones).map(([name, bone]) => [name, bone.matrixWorld.clone().invert()]),
        );
        const nativeBind = new Map(
          mesh.skeleton.bones.map((bone, i) => [bone, mesh.skeleton.boneInverses[i].clone().invert()]),
        );
        const mapped = mesh.skeleton.bones.filter((bone) => bones[shared(bone.name)]);
        const values = new Map(mapped.map((bone) => [bone, { position: [], quaternion: [], scale: [] }]));
        const times = Array.from({ length: 121 }, (_, i) => i / 30);
        let maxMatrixError = 0;
        for (const time of times) {
          mixer.setTime(time === 4 ? 0 : time);
          rig.updateMatrixWorld(true);
          const desired = new Map(
            mapped.map((bone) => {
              const name = shared(bone.name);
              return [
                bone,
                unnormalize
                  .clone()
                  .multiply(bones[name].matrixWorld)
                  .multiply(inverseSharedBind[name])
                  .multiply(normalize)
                  .multiply(nativeBind.get(bone)),
              ];
            }),
          );
          for (const bone of mapped) {
            const parentWorld = desired.get(bone.parent) || bone.parent.matrixWorld;
            const local = parentWorld.clone().invert().multiply(desired.get(bone));
            local.decompose(bone.position, bone.quaternion, bone.scale);
            for (const key of ['position', 'quaternion', 'scale']) values.get(bone)[key].push(...bone[key].toArray());
          }
          model.updateMatrixWorld(true);
          for (const bone of mapped)
            for (let k = 0; k < 16; k++)
              maxMatrixError = Math.max(
                maxMatrixError,
                Math.abs(bone.matrixWorld.elements[k] - desired.get(bone).elements[k]),
              );
        }
        if (maxMatrixError > 1e-5) throw Error(`${id}: retarget matrix error ${maxMatrixError}`);
        const tracks = [];
        for (const [bone, properties] of values)
          for (const [property, data] of Object.entries(properties)) {
            const Track = property === 'quaternion' ? THREE.QuaternionKeyframeTrack : THREE.VectorKeyframeTrack;
            tracks.push(new Track(`${bone.name}.${property}`, times, data));
          }
        const nativeClip = new THREE.AnimationClip('relaxed-3', 4, tracks).optimize();
        // Ground the whole pose through its hip translation; the transition blends this
        // offset with the unchanged walk clip instead of snapping the model/root.
        const preview = new THREE.AnimationMixer(model);
        preview.clipAction(nativeClip).play();
        preview.setTime(0);
        model.updateMatrixWorld(true);
        let minY = Infinity;
        const vertex = new THREE.Vector3();
        model.traverse((node) => {
          if (!node.isSkinnedMesh) return;
          for (let i = 0; i < node.geometry.attributes.position.count; i++) {
            node.getVertexPosition(i, vertex).applyMatrix4(node.matrixWorld);
            minY = Math.min(minY, vertex.y);
          }
        });
        const hips = mapped.find((bone) => shared(bone.name) === 'Hips');
        const offset = new THREE.Vector3(0, -minY, 0).applyMatrix3(
          new THREE.Matrix3().setFromMatrix4(hips.parent.matrixWorld.clone().invert()),
        );
        const hipTrack = nativeClip.tracks.find((track) => track.name === `${hips.name}.position`);
        for (let i = 0; i < hipTrack.values.length; i += 3)
          vertex.fromArray(hipTrack.values, i).add(offset).toArray(hipTrack.values, i);
        out[id] = {
          clip: THREE.AnimationClip.toJSON(nativeClip),
          maxMatrixError,
          floorLift: -minY,
        };
      }
      return out;
    },
    {
      base: sourceBase,
      extraIds: process.argv.slice(2).length ? process.argv.slice(2) : ['mori'],
    },
  );
});
for (const [id, result] of Object.entries(results)) {
  result.clip.userData = JSON.stringify({
    approval: 'creator-idle-neutral-3/relaxed-3',
    sourceSha256: sha256,
    maxMatrixError: result.maxMatrixError,
    floorLift: result.floorLift,
  });
  fs.writeFileSync(new URL(`relaxed-idle-${id}.json`, output), JSON.stringify(result.clip) + '\n');
  console.log(`${id}: ${result.clip.tracks.length} tracks, max matrix error ${result.maxMatrixError}`);
}
