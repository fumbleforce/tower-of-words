// Candidate-only static seated pose on the native rig; approved idle uses its dedicated exporter.
// Native Meshy walk/run clips remain untouched. Uses the established shared bone names.
import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../../tools/bible/check-scope.mjs';
const root = '/home/jorgen/repo/japanese',
  base = 'http://127.0.0.1:8771/';
const ids = process.argv.slice(2);
if (!ids.length) throw Error('Specify candidate ids');
const results = await withBrowserJob(
  'swimwear-bake-rest',
  async (browser) => {
    const page = await browser.newPage(),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/*', scopedRoute({ publicOnly: true, onFailure: (e) => errors.push(e) }));
    await page.route('**/swimwear-bake', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: '<script type="importmap">{"imports":{"three":"/game3d/vendor/three/three.module.js"}}</script>',
      }),
    );
    await page.addInitScript(() => localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false })));
    await page.goto(base + 'swimwear-bake');
    const result = await page.evaluate(async (ids) => {
      const T = await import('three'),
        { GLTFLoader } = await import('/game3d/vendor/loaders/GLTFLoader.js'),
        R = await import('/tools/characters/parts/retarget.js');
      const loader = new GLTFLoader(),
        out = {};
      for (const candidate of ids) {
        const id = candidate.split('-')[0];
        const model = (await loader.loadAsync('/art/parts/pool-swimwear-1/meshy/' + candidate + '/rigged.glb')).scene;
        model.updateMatrixWorld(true);
        const B = R.bones(model),
          world = (b) => b.getWorldPosition(new T.Vector3());
        // Candidate pose only: align real joint segments, preserving lengths and skin weights.
        const aim = (name, child, direction) => {
          const bone = B[name],
            current = world(B[child]).sub(world(bone)).normalize();
          const desired = new T.Vector3(...direction).normalize();
          const q = new T.Quaternion()
            .setFromUnitVectors(current, desired)
            .multiply(bone.getWorldQuaternion(new T.Quaternion()));
          bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));
          model.updateMatrixWorld(true);
        };
        for (const side of ['Left', 'Right']) {
          const sign = side === 'Left' ? 1 : -1;
          aim(side + 'UpLeg', side + 'Leg', [sign * 0.08, -0.08, 1]);
          aim(side + 'Leg', side + 'Foot', [0, -1, 0.03]);
          aim(side + 'Foot', side + 'ToeBase', [0, 0, 1]);
          aim(side + 'Arm', side + 'ForeArm', [sign * 0.06, -1, 0.2]);
          aim(side + 'ForeArm', side + 'Hand', [sign * -0.05, -0.12, 1]);
        }
        const tracks = [];
        for (const bone of Object.values(B)) {
          for (const property of ['quaternion', 'position', 'scale']) {
            const Track = property === 'quaternion' ? T.QuaternionKeyframeTrack : T.VectorKeyframeTrack;
            tracks.push(
              new Track(bone.name + '.' + property, [0, 1], [...bone[property].toArray(), ...bone[property].toArray()]),
            );
          }
        }
        const baked = new T.AnimationClip('swim-' + id + '-sit', 1, tracks).optimize();
        baked.userData = JSON.stringify({
          source: 'native rig bind pose',
          pose: 'candidate-only upright seat; joint lengths and mesh unchanged',
        });
        out[candidate] = { sit: T.AnimationClip.toJSON(baked) };
      }
      return out;
    }, ids);
    if (errors.length) throw Error(errors.join('\n'));
    return result;
  },
  { timeoutMs: 90000 },
);
for (const [id, clips] of Object.entries(results)) {
  const dir = root + '/art/parts/pool-swimwear-1/game/' + id;
  fs.mkdirSync(dir, { recursive: true });
  for (const [kind, clip] of Object.entries(clips))
    fs.writeFileSync(dir + '/' + kind + '.json', JSON.stringify(clip) + '\n');
  console.log(id, 'seated candidate clip baked; visual validation pending');
}
