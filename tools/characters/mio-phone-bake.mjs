// Carry Mio's existing phone pose onto the selected native rig. Models and locomotion stay untouched.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { withBrowserJob } from '../lib/browser-job.mjs';
import { scopedRoute } from '../bible/check-scope.mjs';

const base = process.env.BASE || '';
const url = `http://127.0.0.1:8771/${base ? base + '/' : ''}`;
const failures = [];
const clip = await withBrowserJob('mio-phone-bake', async (browser) => {
  const context = await browser.newContext();
  try {
    await context.route('**/*', scopedRoute({ publicOnly: true, onFailure: (e) => failures.push(e) }));
    await context.route('**/mio-phone-export', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<script type="importmap">{"imports":{"three":"${url}game3d/vendor/three/three.module.js"}}</script>`,
      }),
    );
    const page = await context.newPage();
    await page.goto(url + 'mio-phone-export');
    return await page.evaluate(async (url) => {
      const T = await import('three');
      const { GLTFLoader } = await import(url + 'game3d/vendor/loaders/GLTFLoader.js');
      const R = await import(url + 'tools/characters/parts/retarget.js');
      const loader = new GLTFLoader();
      const [source, target, json] = await Promise.all([
        loader.loadAsync(url + 'game3d/assets/mio/walk.glb'),
        loader.loadAsync(url + 'game3d/assets/characters/mio2/walk.glb'),
        fetch(url + 'game3d/assets/characters/mio/phone.json').then((r) => r.json()),
      ]);
      const rt = R.bindRetarget(source.scene, target.scene);
      const mixer = new T.AnimationMixer(source.scene);
      mixer.clipAction(T.AnimationClip.parse(json)).play();
      mixer.update(0);
      source.scene.updateMatrixWorld(true);
      R.applyRetarget(rt);
      const tracks = rt.map
        .filter(({ t }) => /Spine|neck|Head$|Shoulder|Arm|Hand$/.test(t.name))
        .map(({ t }) => new T.QuaternionKeyframeTrack(t.name + '.quaternion', [0], t.quaternion.toArray()));
      if (tracks.length !== 13) throw Error(`Expected thirteen upper-body tracks, got ${tracks.length}`);
      return T.AnimationClip.toJSON(new T.AnimationClip('Mio phone', 0, tracks));
    }, url);
  } finally {
    await context.close();
  }
});
if (failures.length) throw Error(failures.join('\n'));
const target = new URL('../../game3d/assets/characters/mio2/phone.json', import.meta.url);
if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) throw Error('Refusing to overwrite a linked asset');
fs.writeFileSync(target, JSON.stringify(clip));
const sources = [
  'game3d/assets/mio/walk.glb',
  'game3d/assets/characters/mio/phone.json',
  'game3d/assets/characters/mio2/walk.glb',
];
const hashes = Object.fromEntries(
  sources.map((p) => [
    p,
    createHash('sha256')
      .update(fs.readFileSync(new URL('../../' + p, import.meta.url)))
      .digest('hex'),
  ]),
);
console.log(JSON.stringify({ target: target.pathname, tracks: clip.tracks.length, sources: hashes }, null, 2));
