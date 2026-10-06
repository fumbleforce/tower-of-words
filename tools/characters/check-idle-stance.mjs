// Runtime regression for native cast idle export: floor contact, motion and transitions.
// Serve the checkout at BASE_URL. Optional IDLE_DIR overrides only the baked JSONs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../lib/browser-job.mjs';

const base = process.env.BASE_URL || 'http://127.0.0.1:8771/';
const ids = process.argv.slice(2);
if (!ids.length) throw Error('Pass the native cast ids to check');
const output = process.env.OUT || '/tmp/codex-idle-stance.json';
await withBrowserJob('check-idle-stance', async browser => {
  const page = await browser.newPage();
  const errors = [];
  if (process.env.GAIT_FILE) await page.route('**/movement/gait.js', route => route.fulfill({ path: process.env.GAIT_FILE, contentType: 'text/javascript' }));
  page.on('pageerror', error => errors.push(error.message));
  if (process.env.IDLE_DIR) await page.route('**/relaxed-idle-*.json*', route => {
    const file = path.join(process.env.IDLE_DIR, path.basename(new URL(route.request().url()).pathname));
    return fs.existsSync(file) ? route.fulfill({ path: file, contentType: 'application/json' }) : route.continue();
  });
  await page.route('**/idle-stance-check', route => route.fulfill({ contentType: 'text/html', body:
    `<script type="importmap">{"imports":{"three":"${base}game3d/vendor/three/three.module.js","three/addons/":"${base}game3d/vendor/"}}</script>` }));
  await page.goto(base + 'idle-stance-check');
  const result = await page.evaluate(async ({ base, ids }) => {
    const T = await import('three');
    const { loadMeshy } = await import(base + 'game3d/js/avatar.js');
    const rows = [];
    for (const id of ids) {
      const actor = await loadMeshy(id, { height: 1.12, extra: false });
      const bones = [], meshes = [];
      actor.model.traverse(node => { if (node.isBone) bones.push(node); if (node.isSkinnedMesh) meshes.push(node); });
      const named = name => bones.find(bone => bone.name === name);
      const position = name => actor.root.worldToLocal(named(name).getWorldPosition(new T.Vector3()));
      const snapshot = () => {
        actor.root.updateMatrixWorld(true);
        return bones.map(bone => actor.root.worldToLocal(bone.getWorldPosition(new T.Vector3())));
      };
      const floor = () => {
        let low = Infinity;
        const point = new T.Vector3();
        for (const mesh of meshes) for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
          mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
          low = Math.min(low, actor.root.worldToLocal(point).y);
        }
        return low;
      };
      const row = { id, footTravel: 0, minFloor: Infinity, maxFloor: -Infinity, minKnee: Infinity,
        headAngles: [], headTravel: 0, maxTransitionStep: 0, maxImmediateStep: 0 };
      const headBounds = new T.Box3(), feet = {};
      for (let frame = 0; frame <= 240; frame++) {
        actor.update(1 / 60); snapshot();
        const torso = position('Head').sub(position('Hips'));
        row.headAngles.push(T.MathUtils.radToDeg(Math.atan2(torso.z, torso.y)));
        headBounds.expandByPoint(position('Head'));
        for (const side of ['Left', 'Right']) {
          const hip = position(side + 'UpLeg'), knee = position(side + 'Leg'), ankle = position(side + 'Foot');
          feet[side] ||= ankle.clone();
          row.footTravel = Math.max(row.footTravel, feet[side].distanceTo(ankle));
          const lineZ = hip.z + (ankle.z - hip.z) * (knee.y - hip.y) / (ankle.y - hip.y);
          row.minKnee = Math.min(row.minKnee, (knee.z - lineZ) / (hip.distanceTo(knee) + knee.distanceTo(ankle)));
        }
        if (frame % 15 === 0) {
          const y = floor(); row.minFloor = Math.min(row.minFloor, y); row.maxFloor = Math.max(row.maxFloor, y);
        }
      }
      row.headAngleRange = [Math.min(...row.headAngles), Math.max(...row.headAngles)];
      delete row.headAngles;
      row.headTravel = headBounds.getSize(new T.Vector3()).length();
      for (const motion of ['walk', 'idle', 'run', 'idle']) {
        let before = snapshot();
        actor.setState(motion === 'run' ? 'walk' : motion);
        actor.setGait(null, { run: motion === 'run' });
        let now = snapshot();
        now.forEach((point, i) => { row.maxImmediateStep = Math.max(row.maxImmediateStep, point.distanceTo(before[i])); });
        for (let frame = 0; frame < 120; frame++) {
          before = now;
          if (motion !== 'idle') actor.root.position.z += actor.strides[motion === 'run' ? 'runV' : 'walkV'] / 60;
          actor.update(1 / 60); now = snapshot();
          if (frame < 18) now.forEach((point, i) => {
            row.maxTransitionStep = Math.max(row.maxTransitionStep, point.distanceTo(before[i]));
          });
          if (now.some(point => !Number.isFinite(point.length()))) throw Error(id + ': non-finite pose');
        }
      }
      rows.push(row);
    }
    return rows;
  }, { base, ids });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  assert.deepEqual(errors, []);
  for (const row of result) {
    assert(row.footTravel < 1e-5, `${row.id}: idle feet move`);
    assert(row.minFloor > -0.003 && row.maxFloor < 0.005, `${row.id}: idle leaves floor`);
    assert(row.minKnee > -0.005, `${row.id}: idle knee bends backward`);
    assert(row.headTravel > 0.003, `${row.id}: frozen idle`);
    assert(row.maxImmediateStep < 0.001 && row.maxTransitionStep < 0.07, `${row.id}: pose transition jumps`);
  }
}, { timeoutMs: 120000 });
