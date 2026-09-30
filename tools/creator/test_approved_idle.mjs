// Native-export round trip and synchronized overlay playback; bounded browser job.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../lib/browser-job.mjs';
const base = process.env.BASE_URL || 'http://127.0.0.1:8771/';
const output = process.env.OUT || '/tmp/codex-creator-approved-idle';
fs.mkdirSync(output, { recursive: true });
await withBrowserJob('creator-approved-idle', async browser => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/idle-round-trip', route => route.fulfill({ contentType: 'text/html', body:
    `<script type="importmap">{"imports":{"three":"${base}game3d/vendor/three/three.module.js"}}</script>` }));
  await page.goto(base + 'idle-round-trip');
  const results = await page.evaluate(async base => {
    const THREE = await import('three');
    const { loadLibrary, makeRig, clipsFor } = await import(base + 'tools/creator/recipe.js');
    const { approvedIdleFor } = await import(base + 'tools/creator/approved-idle.js');
    const library = await loadLibrary();
    const referenceLibrary = { ...library, anims: { neutral: 'candidates/idle-neutral-3.glb' }, clips: {}, retargetRest: false };
    const results = [];
    for (const body of ['eric', 'mio']) {
      const host = library.src[body], reference = library.src[library.reference];
      const actual = makeRig(host, reference), expected = makeRig(host, reference);
      const [clip, referenceClips] = await Promise.all([approvedIdleFor(library, body), clipsFor(referenceLibrary, host)]);
      const mixers = [new THREE.AnimationMixer(actual.rig), new THREE.AnimationMixer(expected.rig)];
      mixers[0].clipAction(clip).play(); mixers[1].clipAction(referenceClips.neutral).play();
      let maxError = 0, maxFootTravel = 0;
      const initialFeet = {}, headBounds = new THREE.Box3();
      for (let frame = 0; frame <= 120; frame++) {
        for (let i = 0; i < mixers.length; i++) { mixers[i].setTime(frame / 30); [actual, expected][i].rig.updateMatrixWorld(true); }
        for (const name of Object.keys(actual.bones)) {
          const a = actual.bones[name].matrixWorld, b = expected.bones[name].matrixWorld.clone();
          b.elements[13] += (clip.userData.floorLift || 0) / host.raw.H;
          for (let k = 0; k < 16; k++) maxError = Math.max(maxError, Math.abs(a.elements[k] - b.elements[k]));
          if (/Foot$/.test(name)) {
            const position = actual.bones[name].getWorldPosition(new THREE.Vector3());
            initialFeet[name] ||= position.clone(); maxFootTravel = Math.max(maxFootTravel, position.distanceTo(initialFeet[name]));
          }
        }
        headBounds.expandByPoint(actual.bones.Head.getWorldPosition(new THREE.Vector3()));
      }
      results.push({ body, duration: clip.duration, maxError, maxFootTravel, headTravel: headBounds.getSize(new THREE.Vector3()).length() });
    }
    return results;
  }, base);
  for (const row of results) {
    assert.equal(row.duration, 4); assert(row.maxError < 3e-6, JSON.stringify(row));
    assert(row.maxFootTravel < 1e-6, JSON.stringify(row)); assert(row.headTravel > .01, JSON.stringify(row));
  }
  for (const body of ['mio', 'eric']) {
    await page.goto(base + `tools/creator/base/overlay.html?body=${body}&version=source15&colours=original&source=0`);
    await page.waitForFunction(() => globalThis.__done || globalThis.__err);
    const initial = await page.evaluate(() => ({ ...(({ ready, error, motion, playing, duration }) => ({ ready, error, motion, playing, duration }))(globalThis.__creatorOverlay) }));
    assert.equal(initial.error, null); assert(initial.ready && initial.playing); assert.equal(initial.motion, 'neutral'); assert.equal(initial.duration, 4);
    await page.locator('#play').click();
    const samples = await page.evaluate(() => {
      const state = globalThis.__creatorOverlay, slider = globalThis.document.getElementById('time');
      let maxSyncError = 0;
      const poses = [];
      for (const time of [0, 1, 2, 3]) {
        slider.value = time; slider.dispatchEvent(new slider.ownerDocument.defaultView.Event('input', { bubbles: true }));
        for (const name of Object.keys(state.original.bones)) {
          const a = state.original.bones[name].matrixWorld.elements, b = state.candidate.bones[name].matrixWorld.elements;
          for (let i = 0; i < 16; i++) maxSyncError = Math.max(maxSyncError, Math.abs(a[i] - b[i]));
        }
        poses.push({ time, leftArm: state.original.bones.LeftArm.quaternion.toArray(), head: state.original.bones.Head.matrixWorld.elements.slice(12, 15) });
      }
      return { maxSyncError, poses };
    });
    assert(samples.maxSyncError < 1e-7, JSON.stringify(samples));
    results.find(row => row.body === body).overlay = samples;
    for (const time of [1, 3]) {
      await page.locator('#time').evaluate((slider, time) => { slider.value = time; slider.dispatchEvent(new slider.ownerDocument.defaultView.Event('input', { bubbles: true })); }, time);
      await page.screenshot({ path: `${output}/${body}-${time}.png` });
    }
    await page.locator('#motion').selectOption('walk');
    assert.equal(await page.evaluate(() => globalThis.__creatorOverlay.motion), 'walk');
    assert(await page.evaluate(() => globalThis.__creatorOverlay.playing));
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(output + '/results.json', JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results.map(({ overlay, ...row }) => ({ ...row, maxSyncError: overlay.maxSyncError })), null, 2));
});
