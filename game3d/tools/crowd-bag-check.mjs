// Native crowd prop diagnostics: the production bodies and animation poses in the plaza.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const base = process.env.BASE || 'game3d';
const out = process.env.OUT || `game3d/shots/crowd-bags/${Date.now()}`;
const scale = process.env.SCALE || '100';
const mode = process.env.MODE || 'normal';
const report = { scale, mode, errors: [], frames: [], cycles: [] };
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  'crowd-bags',
  async (browser) => {
    const context = await browser.newContext({ viewport: { width: 1366, height: 860 } });
    let closing = false;
    await context.route(
      '**/*',
      scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (e) => report.errors.push(e) }),
    );
    if (mode === 'fallback')
      await context.route('**/assets/characters/crowd-*/**', (route) =>
        route.fulfill({ status: 404, body: 'Diagnostic: approved crowd unavailable' }),
      );
    const page = await context.newPage();
    page.on('pageerror', (e) => report.errors.push(e.message));
    await page.addInitScript(() =>
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({ v: 2, privateMode: false, voiceOn: false, chibi: false, textSpeed: 'instant' }),
      ),
    );
    try {
      await waitForGame(
        page,
        90000,
        () =>
          page.goto(
            `http://127.0.0.1:8771/${base}/index.html?day=2&place=plaza&cap&charscale=${scale}&chibi=${mode === 'generated' ? 1 : 0}`,
          ),
        'play',
      );
      await page.waitForFunction(() => !globalThis.__game.busy);
      report.setup = await page.evaluate(async () => {
        const g = globalThis.__game,
          T = await import('three');
        globalThis.__run = false;
        g.paused = true;
        for (const r of g.place.crowd || []) r.root.visible = false;
        g.player.root.visible = false;
        const benches = [];
        g.place.space.updateMatrixWorld(true);
        g.place.space.traverse((o) => {
          for (const s of o.userData.seats || []) {
            const at = g.place.space.worldToLocal(new T.Vector3(s.x, 0.34, s.z).applyMatrix4(o.matrixWorld));
            const forward = g.place.space.worldToLocal(
              new T.Vector3(s.x + Math.sin(s.facing), 0.34, s.z + Math.cos(s.facing)).applyMatrix4(o.matrixWorld),
            );
            benches.push({ at: at.toArray(), yaw: Math.atan2(forward.x - at.x, forward.z - at.z) });
          }
        });
        globalThis.__bagBench = benches[0];
        return { benches, gpu: g.renderer.userData.gpu };
      });
      const cases =
        mode === 'fallback'
          ? [
              ['office', 0],
              ['office', 1],
              ['office', 2],
            ]
          : mode === 'generated'
            ? [
                ['casual', 0],
                ['casual', 2],
                ['elder', 1],
              ]
            : [
                ['office', 0],
                ['office', 1],
                ['office', 2],
                ['casual', 0],
                ['casual', 2],
                ['elder', 1],
              ];
      for (const [kind, index] of cases) {
        await page.evaluate(
          async ({ kind, index }) => {
            globalThis.__bagRig?.root.removeFromParent();
            const { makeBody } = await import('./js/crowd/looks.js');
            const r = makeBody(kind, index);
            globalThis.__bagRig = r;
            globalThis.__game.place.space.add(r.root);
          },
          { kind, index },
        );
        for (const state of ['idle', 'walk', 'sit', 'restore']) {
          const data = await page.evaluate(async (state) => {
            const T = await import('three'),
              g = globalThis.__game,
              r = globalThis.__bagRig;
            const { standPose, stride, benchSit } = await import('./js/crowd/motion.js');
            standPose(r);
            r.root.position.set(10, 0, -0.3);
            r.root.rotation.y = 0;
            if (state === 'restore') {
              const b = globalThis.__bagBench;
              benchSit(r, b.at[0], b.at[2], b.yaw, b.at[1]);
              standPose(r);
              r.root.position.set(10, 0, -0.3);
              r.root.rotation.y = 0;
              for (let i = 0; i < 12; i++) r.update?.(1 / 30);
            }
            if (state === 'sit') {
              const b = globalThis.__bagBench;
              benchSit(r, b.at[0], b.at[2], b.yaw, b.at[1]);
            } else if (state === 'walk') {
              for (let i = 0; i < 18; i++) {
                stride({ r, kind: r.kind, moved: 0.6, ph: r.ph }, 1 / 30, true);
                r.update?.(1 / 30);
              }
            } else r.update?.(0);
            g.place.scene.updateMatrixWorld(true);
            const hand = r.model?.getObjectByName('LeftHand') || r.arms[1].userData.hand;
            const bag = r.root.getObjectByName('crowd-bag');
            if (!bag) throw Error('No hand-held bag for this native body');
            const handle = bag.children[1];
            handle.geometry.computeBoundingBox();
            const grip = handle.geometry.boundingBox.getCenter(new T.Vector3()).applyMatrix4(handle.matrixWorld);
            const at = hand.getWorldPosition(new T.Vector3());
            const skin = new T.Box3();
            let vertices = 0;
            if (r.model)
              r.model.traverse((o) => {
                if (!o.isSkinnedMesh) return;
                const a = o.geometry.attributes;
                for (let i = 0; i < a.position.count; i++) {
                  let weight = 0;
                  for (let k = 0; k < 4; k++)
                    if (o.skeleton.bones[a.skinIndex.getComponent(i, k)] === hand)
                      weight += a.skinWeight.getComponent(i, k);
                  if (weight < 0.7) continue;
                  skin.expandByPoint(o.getVertexPosition(i, new T.Vector3()).applyMatrix4(o.matrixWorld));
                  vertices++;
                }
              });
            else skin.setFromObject(hand);
            globalThis.__bagTarget = grip.clone().lerp(at, 0.5);
            return {
              rigId: r.id,
              meshy: !!r.meshy,
              approved: r.approvedCrowd,
              state,
              supported: bag.parent.parent === r.root,
              seatHeight: g.place.space.localToWorld(new T.Vector3(0, globalThis.__bagBench.at[1], 0)).y,
              hand: at.toArray(),
              handle: grip.toArray(),
              gap: grip.distanceTo(at),
              handSkin: {
                min: skin.min.toArray(),
                max: skin.max.toArray(),
                center: skin.getCenter(new T.Vector3()).toArray(),
                vertices,
              },
              bagBounds: {
                min: new T.Box3().setFromObject(bag).min.toArray(),
                max: new T.Box3().setFromObject(bag).max.toArray(),
              },
              root: r.root.position.toArray(),
              rootScale: r.root.scale.toArray(),
            };
          }, state);
          for (const view of ['front', 'side']) {
            await page.evaluate(async (view) => {
              const T = await import('three'),
                g = globalThis.__game,
                r = globalThis.__bagRig;
              const target = globalThis.__bagTarget
                .clone()
                .lerp(r.root.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 0.5, 0)), 0.25);
              const offset = new T.Vector3(
                view === 'front' ? 1.1 : 1.7,
                0.45,
                view === 'front' ? 1.6 : -0.4,
              ).applyAxisAngle(new T.Vector3(0, 1, 0), r.root.rotation.y);
              g.place.camera.position.copy(target).add(offset);
              g.place.camera.lookAt(target);
              g.place.camera.fov = 38;
              g.place.camera.updateProjectionMatrix();
              g.place.camera.updateMatrixWorld(true);
            }, view);
            await page.waitForTimeout(140);
            const id = `${kind}-${index}-${state}-${view}`;
            await page.screenshot({ path: `${out}/${id}.png` });
            report.frames.push({ id, ...data });
          }
        }
        const cycle = await page.evaluate(async () => {
          const T = await import('three'),
            r = globalThis.__bagRig;
          const { standPose, stride } = await import('./js/crowd/motion.js');
          standPose(r);
          r.root.position.set(10, 0, -0.3);
          r.root.rotation.y = 0;
          const hand = r.model?.getObjectByName('LeftHand') || r.arms[1].userData.hand;
          const bag = r.root.getObjectByName('crowd-bag');
          const grip = bag.children[1].geometry.boundingBox.getCenter(new T.Vector3());
          const point = new T.Vector3(),
            box = new T.Box3(),
            handTravel = new T.Box3();
          let initial,
            maxGripDrift = 0,
            minFloor = Infinity;
          for (let i = 0; i < 180; i++) {
            stride({ r, kind: r.kind, moved: 0.6, ph: r.ph }, 1 / 30, true);
            r.update?.(1 / 30);
            r.root.updateMatrixWorld(true);
            minFloor = Math.min(minFloor, box.setFromObject(bag).min.y);
            handTravel.expandByPoint(hand.getWorldPosition(point));
            hand.worldToLocal(point.copy(grip).applyMatrix4(bag.children[1].matrixWorld));
            initial ??= point.clone();
            maxGripDrift = Math.max(maxGripDrift, initial.distanceTo(point));
          }
          return { minFloor, maxGripDrift, handTravel: handTravel.getSize(new T.Vector3()).length(), frames: 180 };
        });
        report.cycles.push({ kind, index, ...cycle });
      }
      assert.deepEqual(report.errors, []);
      for (const frame of report.frames) {
        if (frame.supported) {
          assert.equal(frame.state, 'sit', `Bag not restored to hand: ${frame.id}`);
          assert.ok(
            Math.abs(frame.bagBounds.min[1] - frame.seatHeight) < 0.002,
            `Bag not supported on seat: ${frame.id}`,
          );
          continue;
        }
        for (let axis = 0; axis < 3; axis++)
          assert.ok(
            frame.handle[axis] >= frame.handSkin.min[axis] - 0.01 &&
              frame.handle[axis] <= frame.handSkin.max[axis] + 0.01,
            `Handle outside hand: ${frame.id}`,
          );
      }
      for (const cycle of report.cycles) {
        assert.ok(cycle.maxGripDrift < 0.00001, `Grip drift: ${JSON.stringify(cycle)}`);
        assert.ok(cycle.handTravel > 0.01, `Stalled gait: ${JSON.stringify(cycle)}`);
        assert.ok(cycle.minFloor >= 0.005, `Bag crosses paving: ${JSON.stringify(cycle)}`);
      }
      console.log(JSON.stringify({ frames: report.frames.length, errors: report.errors }));
    } finally {
      closing = true;
      fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
      await context.close();
    }
  },
  { timeoutMs: 285000 },
);
