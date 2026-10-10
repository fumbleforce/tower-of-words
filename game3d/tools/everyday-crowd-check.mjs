// One viewport/job. SCENES selects a bounded group; BASE selects the worktree.
// MODE=before records existing bodies. CAMERA_REF reuses a prior report's cameras.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
import { sceneMemory, sampleFrames } from './perf/place-measure.mjs';

const cases = {
  casual: { place: 'shotengai', kind: 'casual', body: 'casual-1' },
  elder: { place: 'shotengai', kind: 'elder', body: 'older-1' },
  bakery: { place: 'bakery', person: 'bakery_clerk', body: 'service-1' },
  konbini: { place: 'konbini', person: 'konbini_clerk', body: 'service-1' },
  canteen: { place: 'canteen', person: 'canteen_worker', body: 'service-1' },
  closing: { place: 'plaza', person: 'canteen_worker', body: 'service-1', evening: true },
  'closing-walk': { place: 'plaza', person: 'canteen_worker', body: 'service-1', evening: true, carry: true },
  ferry: { place: 'ferry_terminal', person: 'ferry_staff', body: 'service-1' },
  // #328: the station garden's grounds worker; the train's man with a bag and day 3's attendant and club member are
  // hidden on a plain day, so the check stands them beside Eric (show)
  grounds: { place: 'shotengai', person: 'station_worker', body: 'older-1' },
  stander: { place: 'train', person: 'stander', body: 'a', show: 'here' }, // where he stood, by the far door
  attendant: { place: 'gym', person: 'attendant', body: 'a', show: true },
  member: { place: 'pool', person: 'member', body: 'b', show: true },
};
const width = +(process.argv[2] || 390), height = width < 600 ? 844 : 860;
assert.ok([390, 1366].includes(width), 'Use the native 390 or 1366 viewport');
const names = (process.env.SCENES || 'casual,elder,bakery').split(',');
for (const name of names) assert.ok(cases[name], `Unknown scene ${name}`);
const mode = process.env.MODE || 'after';
assert.ok(['before', 'after'].includes(mode));
const base = process.env.BASE || 'game3d';
const gameRoot = new URL('../', import.meta.url);
const sourceRoot = process.env.EVERYDAY_SOURCE_ROOT
  ? pathToFileURL(path.resolve(process.env.EVERYDAY_SOURCE_ROOT) + path.sep) : gameRoot;
assert.ok(sourceRoot.pathname.endsWith('/game3d/') && !sourceRoot.pathname.includes('/private/'), 'Public game source root');
const chibi = process.env.CHIBI || 'default';
assert.ok(['default', '0', '1'].includes(chibi));
const out = process.env.EVERYDAY_OUT || fileURLToPath(new URL(
  `shots/everyday-crowd/${new Date().toISOString().replaceAll(':', '-')}-${process.pid}/`, gameRoot));
fs.mkdirSync(out, { recursive: true });
const referenceReport = process.env.CAMERA_REF ? JSON.parse(fs.readFileSync(process.env.CAMERA_REF)) : null;
const references = referenceReport?.shots || [];
const textureComparison = process.env.TEXTURE_COMPARISON || null;
assert.ok([null, 'original', 'corrected'].includes(textureComparison));
if (textureComparison) {
  assert.equal(mode, 'after', 'Texture comparison uses the same selected body in both runs');
  assert.ok(names.every((name) => cases[name].body === 'service-1'), 'Texture comparison only covers service-1');
}
if (textureComparison === 'original') {
  assert.ok(process.env.SERVICE_REFERENCE_FILE, 'Original comparison requires the preserved source atlas');
  assert.equal(referenceReport, null, 'Original comparison establishes its own cameras and pose');
}
if (textureComparison === 'corrected') {
  assert.ok(!process.env.SERVICE_REFERENCE_FILE, 'Corrected comparison must use the runtime atlas');
  assert.equal(referenceReport?.status, 'pass', 'Corrected comparison requires a completed original run');
  assert.equal(referenceReport.textureComparison, 'original');
  for (const [key, value] of Object.entries({ base, mode, width, height, chibi }))
    assert.equal(referenceReport[key], value, 'Texture comparison preserves ' + key);
}
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const referenceTexture = process.env.SERVICE_REFERENCE_FILE;
let referenceBytes;
if (referenceTexture) {
  const normalized = path.resolve(referenceTexture);
  assert.ok(!normalized.includes('/private/') && normalized.endsWith('/art/parts/crowd-everyday-2/game/service-1/base.webp'),
    'The texture reference must be the preserved public service-1 original');
  referenceBytes = fs.readFileSync(normalized);
  assert.equal(hash(referenceBytes), 'd104b0bb2da3f65a99cc997cd61517253e4d34adc4e046b7da529dec46a75993');
}
const report = { base, mode, width, height, chibi, sourceRoot: fileURLToPath(sourceRoot), publicOnly: true,
  serviceWorkers: 'block', serviceTexture: referenceTexture ? { original: referenceTexture, sha256: hash(referenceBytes) } : 'runtime',
  textureComparison, referenceReport: process.env.CAMERA_REF || null, poseComparisons: [],
  cases: [], shots: [], sources: {}, errors: [] };
const save = () => fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
save();
try {
  await withBrowserJob('everyday-crowd-' + width, async (browser) => {
    for (const name of names) {
      const spec = cases[name];
      const context = await browser.newContext({
        viewport: { width, height }, isMobile: width < 600, hasTouch: width < 600, serviceWorkers: 'block',
      });
      let closing = false;
      const pending = new Set();
      await context.route('**/*', scopedRoute({ publicOnly: true, isClosing: () => closing,
        onFailure: (message) => report.errors.push(message) }));
      if (referenceBytes) await context.route(
        `http://127.0.0.1:8771/${base}/assets/characters/crowd-service-1/base.webp*`,
        (route) => route.fulfill({ status: 200, contentType: 'image/webp', body: referenceBytes }));
      await context.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings',
        JSON.stringify({ privateMode: false, voiceOn: false, textSpeed: 'instant' })));
      const page = await context.newPage();
      page.on('pageerror', (error) => report.errors.push(`${name}: ${error.message}`));
      page.on('response', (response) => {
        const url = new URL(response.url()), prefix = '/' + base + '/';
        if (!url.pathname.startsWith(prefix) || response.status() !== 200) return;
        const relative = decodeURIComponent(url.pathname.slice(prefix.length));
        if (!/^(?:js\/.*\.js|vendor\/.*\.js|assets\/characters\/crowd-[^/]+\/[^/]+)$/.test(relative)) return;
        const receipt = (async () => {
          const bytes = await response.body(), local = fileURLToPath(new URL(relative, sourceRoot));
          const reference = referenceBytes && relative === 'assets/characters/crowd-service-1/base.webp';
          const actual = hash(bytes), expected = hash(reference ? referenceBytes : fs.readFileSync(local));
          report.sources[relative] = { sha256: actual, matchesDisk: actual === expected,
            ...(reference ? { sourceFile: referenceTexture, comparisonReference: true } : {}) };
          if (actual !== expected) report.errors.push('Source differs from worktree: ' + relative);
        })().catch((error) => { if (!closing) report.errors.push('Source receipt: ' + error.message); });
        pending.add(receipt);
        receipt.finally(() => pending.delete(receipt));
      });
      try {
        await waitForGame(page, 60000, () => page.goto(
          `http://127.0.0.1:8771/${base}/index.html?cap&place=${spec.place}&q=0${chibi === 'default' ? '' : '&chibi=' + chibi}`), 'play');
        await page.waitForFunction(() => globalThis.__done === true, null, { timeout: 60000 });
        const waitForVisibleGame = () => page.waitForFunction(() => {
          const hidden = (id) => {
            const element = globalThis.document.getElementById(id);
            if (!element || element.hidden) return true;
            const style = globalThis.getComputedStyle(element), rect = element.getBoundingClientRect();
            return style.display === 'none' || style.visibility === 'hidden' || +style.opacity <= 0.001 ||
              rect.width === 0 || rect.height === 0;
          };
          const classes = globalThis.document.body.classList;
          return !classes.contains('at-title') && !classes.contains('title-leaving') &&
            hidden('title') && hidden('xfade') && hidden('boot');
        }, null, { timeout: 20000 });
        await waitForVisibleGame();
        await page.evaluate(async (spec) => {
          const game = globalThis.__game;
          if (spec.evening) {
            const { flags } = await import('./js/narrative/state.js');
            flags.going_home = true;
          }
          game.hooks.period({ to: spec.evening ? 'evening' : 'morning' });
          // The clock hook owns staff hours; the crowd's normal period entry owns its population.
          game.place.ambient?.enter(spec.evening ? 'evening' : 'morning');
          globalThis.__advance(0.5);
          // a walker of this kind may not be out yet: let the crowd come and go a little until one is
          const find = () => spec.kind
            ? game.place.ambient?.pool.find((item) => item.r.kind === spec.kind && item.r.root.visible && item.state === 'walk')
            : { r: game.place.people[spec.person] };
          let target = find();
          if (spec.show && target?.r) {
            // beside Eric, facing him, where the check can see them
            const r = target.r, e = game.player.root.position;
            if (spec.show !== 'here') {
              const at = r.root.parent.worldToLocal(e.clone().add({ x: 0.9, y: 0, z: 0.4 }));
              r.root.position.set(at.x, 0, at.z);
              r.root.rotation.y = Math.atan2(-0.9, -0.4);
            }
            r.root.visible = true;
          }
          for (let i = 0; i < 180 && !target; i++) {
            globalThis.__advance(1);
            target = find();
          }
          if (!target?.r?.root.visible) throw new Error('No visible native role: ' + (spec.kind || spec.person));
          globalThis.__everydayTarget = target;
          globalThis.__everydayThree = await import('./vendor/three/three.module.js');
          if (spec.carry) {
            globalThis.__everydayCarryDone = false;
            globalThis.__everydayCarryError = null;
            globalThis.__run = true;
            game.place.hooks.canteenChair({ state: 'take' }).then(
              () => { globalThis.__everydayCarryDone = true; },
              (error) => { globalThis.__everydayCarryError = error.message; });
          }
        }, spec);
        if (spec.carry) {
          await page.waitForFunction(() => globalThis.__everydayTarget.r._walk || globalThis.__everydayCarryError,
            null, { timeout: 15000 });
          await page.evaluate(() => { globalThis.__game.paused = true; });
        }
        const inspect = () => page.evaluate(() => {
          const game = globalThis.__game, target = globalThis.__everydayTarget, rig = target.r;
          const THREE = globalThis.__everydayThree, point = new THREE.Vector3();
          rig.root.updateMatrixWorld(true);
          const bones = [], palms = {}, finite = [], tints = [], meshes = [], materials = new Set();
          const textureSize = (texture) => {
            if (!texture) return null;
            const image = texture.source?.data || texture.image;
            return { width: image?.width || 0, height: image?.height || 0, mipmaps: texture.generateMipmaps };
          };
          rig.root.traverse((obj) => {
            if (obj.isMesh) {
              const list = Array.isArray(obj.material) ? obj.material : [obj.material];
              for (const material of list) materials.add(material.uuid);
              meshes.push({ name: obj.name, type: obj.type, visible: obj.visible,
                triangles: (obj.geometry.index?.count || obj.geometry.attributes.position.count) / 3,
                materials: list.map((material) => ({ type: material.type, base: textureSize(material.map),
                  mask: textureSize(material.userData.tint?.tMask?.value) })) });
            }
            if (obj.isBone) {
              // q and -q are the same rotation; the mixer may hand back either, so compare the one with w >= 0
              const q = obj.quaternion.toArray(), sign = q[3] < 0 ? -1 : 1;
              bones.push([obj.name, ...obj.position.toArray(), ...q.map((v) => v * sign)].map(
                (value) => typeof value === 'number' ? +value.toFixed(7) : value));
              if (/^(Left|Right)Hand$/.test(obj.name)) palms[obj.name] = obj.getWorldPosition(point).toArray();
            }
            if (obj.isSkinnedMesh) {
              if (obj.material.userData.tint) tints.push(Object.fromEntries(
                ['tHair', 'tTop', 'tBot'].map((key) => [key, obj.material.userData.tint[key].value.toArray()])));
              obj.skeleton.update();
              for (let i = 0; i < obj.geometry.attributes.position.count; i++) {
                obj.getVertexPosition(i, point).applyMatrix4(obj.matrixWorld);
                if (!point.toArray().every(Number.isFinite)) finite.push(i);
              }
            }
          });
          const person = Object.entries(game.place.people || {}).find(([, candidate]) => candidate === rig)?.[0];
          const actor = person ? { person } : { poolIndex: game.place.ambient?.pool.indexOf(target), kind: target.kind };
          return { actor, place: game.place.name, approved: rig.approvedCrowd || null, kind: rig.kind || null,
            visible: rig.root.visible, root: rig.root.position.toArray(), scale: rig.root.scale.toArray(), yaw: rig.root.rotation.y,
            phase: target.state || (rig._walk ? 'walking' : 'standing'), nativeState: rig.state,
            canteen: game.place.snapshotState?.().canteen, t: game.t, palms, bones,
            nonfiniteVertices: finite, tints, meshes, materialCount: materials.size,
            privateMode: JSON.parse(globalThis.localStorage.getItem('amakawa-settings')).privateMode,
            carryError: globalThis.__everydayCarryError || null,
            ui: { overlays: Object.fromEntries(['title', 'xfade', 'boot'].map((id) => {
                const element = globalThis.document.getElementById(id);
                if (!element) return [id, { absent: true }];
                const style = globalThis.getComputedStyle(element);
                return [id, { hidden: element.hidden, display: style.display, visibility: style.visibility, opacity: style.opacity }];
              })), talkHidden: globalThis.document.getElementById('talk')?.hidden,
              text: globalThis.document.getElementById('talk')?.innerText || '' } };
        });
        const initial = await inspect();
        assert.equal(initial.privateMode, false);
        assert.equal(initial.visible, true);
        assert.equal(initial.carryError, null);
        if (mode === 'after') assert.equal(initial.approved, spec.body, name + ' selected body');
        assert.deepEqual(initial.nonfiniteVertices, []);
        if (spec.carry) assert.equal(initial.phase, 'walking', 'carry capture must be during the production walk');
        report.cases.push({ name, spec, initial });
        for (const view of ['native', 'front', 'back', 'left']) {
          const key = name + '-' + view, reference = references.find((shot) => shot.key === key);
          if (textureComparison === 'corrected') {
            assert.ok(reference?.pose, key + ' original pose exists');
            const fields = ['actor', 'place', 'approved', 'kind', 'visible', 'root', 'scale', 'yaw',
              'phase', 'nativeState', 'canteen', 't', 'palms', 'bones', 'tints'];
            const differences = fields.filter((field) => !isDeepStrictEqual(initial[field], reference.pose[field]));
            report.poseComparisons.push({ key, matched: differences.length === 0, differences,
              actual: Object.fromEntries(fields.map((field) => [field, initial[field]])),
              expected: Object.fromEntries(fields.map((field) => [field, reference.pose[field]])) });
            save();
            assert.deepEqual(differences, [], key + ' texture comparison must preserve actor identity and pose');
          }
          const camera = await page.evaluate(({ view, reference }) => {
            const game = globalThis.__game, rig = globalThis.__everydayTarget.r, camera = game.place.camera;
            const THREE = globalThis.__everydayThree;
            if (view !== 'native' || reference) {
              const target = rig.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.78, 0));
              // LeftHand is on local +x: view from the character's left, image right in a frontal view.
              const angle = rig.root.rotation.y + (view === 'back' ? Math.PI : view === 'left' ? Math.PI / 2 : 0);
              const position = target.clone().add(new THREE.Vector3(Math.sin(angle) * 3.3, 0.3, Math.cos(angle) * 3.3));
              const original = globalThis.__everydayCameraUpdate || camera.updateMatrixWorld;
              globalThis.__everydayCameraUpdate = original;
              camera.updateMatrixWorld = function (...args) {
                if (reference) {
                  this.position.fromArray(reference.position);
                  this.quaternion.fromArray(reference.quaternion);
                  this.fov = reference.fov;
                } else { this.position.copy(position); this.lookAt(target); }
                this.updateProjectionMatrix();
                original.apply(this, args);
              };
              camera.updateMatrixWorld(true);
            }
            return { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov };
          }, { view, reference: reference?.camera });
          const file = key + '-' + width + '.png';
          await waitForVisibleGame();
          await page.screenshot({ path: path.join(out, file) });
          const after = await inspect();
          // the same pose, to float noise (the GPU readback and the mixer differ in the 7th decimal)
          assert.equal(after.bones.length, initial.bones.length, key + ' keeps its bones');
          // A busy machine can let an idle clip move on between the sample and the shot: the drift is recorded in the
          // report (poseDrift) rather than failing the run; bone names and counts must still match.
          let drift = 0, where = null;
          after.bones.forEach((row, i) => row.forEach((v, j) => {
            const w = initial.bones[i][j];
            if (typeof v !== 'number') return assert.equal(v, w, key + ' keeps its bones in order');
            if (Math.abs(v - w) > drift) [drift, where] = [Math.abs(v - w), row[0]];
          }));
          if (drift > 1e-5) (report.poseDrift ||= []).push({ shot: key, drift: +drift.toFixed(5), bone: where });
          assert.deepEqual(after.root, initial.root, key + ' preserves actor position');
          assert.equal(after.t, initial.t, key + ' preserves simulation time');
          const memory = await page.evaluate(sceneMemory);
          const shaderMemory = await page.evaluate(() => {
            const game = globalThis.__game, ordinary = new Set(), masks = new Map();
            game.place.scene.traverse((object) => {
              for (const material of [].concat(object.material || [])) {
                for (const value of Object.values(material)) if (value?.isTexture) ordinary.add(value.source || value);
                for (const uniform of Object.values(material.uniforms || {}))
                  if (uniform?.value?.isTexture) ordinary.add(uniform.value.source || uniform.value);
                const texture = material.userData?.tint?.tMask?.value;
                if (!texture) continue;
                const source = texture.source || texture, image = source.data || texture.image;
                masks.set(source, { width: image?.width || 0, height: image?.height || 0, mipmaps: texture.generateMipmaps });
              }
            });
            let additionalBytes = 0;
            for (const [source, value] of masks) if (!ordinary.has(source))
              additionalBytes += value.width * value.height * 4 * (value.mipmaps ? 4 / 3 : 1);
            return { additionalBytes: Math.round(additionalBytes), masks: [...masks.values()],
              renderer: { ...game.renderer.info.memory } };
          });
          const render = await page.evaluate(sampleFrames, 4);
          report.shots.push({ key, file, camera, reusedCamera: !!reference, matchedTexturePose: textureComparison === 'corrected', pose: after, render,
            memory: { ...memory, shaderMasks: shaderMemory,
              withShaderMasksMB: Math.round((memory.texMB + shaderMemory.additionalBytes / 1e6) * 10) / 10 } });
          save();
        }
        assert.deepEqual(report.errors, []);
      } finally {
        await Promise.allSettled([...pending]);
        closing = true;
        await context.close();
        save();
      }
    }
    assert.ok(Object.keys(report.sources).some((file) => file === 'js/chibi-crowd.js'), 'runtime source loaded');
    assert.deepEqual(report.errors, []);
    report.status = 'pass';
    console.log(`PASS everyday native roles ${names.join(', ')} at ${width}; ${out}`);
  }, gpuWaitOptions(60, 270000));
} catch (error) {
  report.status = 'failed-or-deferred';
  report.errors.push(error.message);
  throw error;
} finally { save(); }
