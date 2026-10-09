import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const tapOnly = process.env.TAP_ONLY === '1';
const tapReviewFile = process.env.TAP_REVIEW_FILE;
if (tapOnly && tapReviewFile)
  assert.ok(!fs.existsSync(tapReviewFile), 'TAP_REVIEW_FILE must be a fresh path for this run');
const width = +(process.argv[2] || 1366);
const out = new URL(
  `../shots/office-parcel/${new Date().toISOString().replaceAll(':', '-')}-${process.pid}/`,
  import.meta.url,
).pathname;
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'game3d',
  expected = {
    worker_a: 'b',
    worker_b: 'a',
    commuter_1: 'a',
    commuter_2: 'a',
    commuter_3: 'a',
    sales1: 'a',
    sales2: 'b',
  };
await withBrowserJob(
  'office-people-route-' + width,
  async (browser) => {
    const capture = async (width) => {
      const height = width < 600 ? 844 : 860;
      const context = await browser.newContext({
        viewport: { width, height },
        isMobile: width < 600,
        hasTouch: width < 600,
        serviceWorkers: 'block',
      });
      let closing = false;
      const errors = [],
        rows = [],
        seen = new Set(),
        shots = new Set();
      let rode = false,
        arrived = false;
      const measured = new Set(),
        violations = [];
      await context.route(
        '**/*',
        scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (e) => errors.push(e) }),
      );
      await context.addInitScript(() =>
        globalThis.localStorage.setItem(
          'amakawa-settings',
          JSON.stringify({ privateMode: false, voiceOn: false, textSpeed: 'instant' }),
        ),
      );
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      try {
        await waitForGame(
          page,
          60000,
          () => page.goto(`http://127.0.0.1:8771/${base}/index.html?test=fast&ts=3&place=gate&q=0`),
          'play',
        );
        await page.evaluate(async (tapOnly) => {
          const THREE = await import('./vendor/three/three.module.js');
          const P = globalThis.__game.place,
            c = P.camera,
            r = P._commuters[2].r,
            original = c.updateMatrixWorld;
          // Exact camera transform from the user-flagged neutral-parcel-390-gate-through original.
          globalThis.__parcelCheckThree = THREE;
          globalThis.__parcelTapOnly = tapOnly;
          globalThis.__parcelCameraSide = [0.65, 0, 1];
          c.updateMatrixWorld = function (...args) {
            const commuter = P._commuters[2];
            const talk = globalThis.document.getElementById('talk');
            const state = P.snapshotState();
            if (
              tapOnly &&
              commuter.stage === 'tap' &&
              commuter.t >= 0.15 &&
              state.gateOpen &&
              !state.jam &&
              talk.hidden &&
              !globalThis.__game.busy &&
              !globalThis.__parcelTapFrozen
            ) {
              globalThis.__parcelTapFrozen = true;
              globalThis.__game.paused = true;
            }
            if (r.root.visible) {
              if (globalThis.__parcelTapCamera) {
                const { eye, target } = globalThis.__parcelTapCamera;
                const position = new THREE.Vector3(...eye);
                this.position.copy(this.parent ? this.parent.worldToLocal(position) : position);
                this.lookAt(new THREE.Vector3(...target));
                this.fov = 50;
                this.updateProjectionMatrix();
                return original.apply(this, args);
              }
              const center = r.root.getWorldPosition(new THREE.Vector3());
              center.y += 0.58;
              const direction = new THREE.Vector3(...globalThis.__parcelCameraSide)
                .normalize()
                .applyQuaternion(r.root.getWorldQuaternion(new THREE.Quaternion()));
              const eye = center.clone().addScaledVector(direction, 3.6);
              eye.y += 0.9;
              this.position.copy(this.parent ? this.parent.worldToLocal(eye) : eye);
              this.lookAt(center);
              this.fov = 38;
              this.updateProjectionMatrix();
            }
            return original.apply(this, args);
          };
        }, tapOnly);
        if (tapOnly) {
          const dialogue = [];
          for (let i = 0; i < 600; i++) {
            const state = await page.evaluate(() => ({
              frozen: !!globalThis.__parcelTapFrozen,
              talk: !globalThis.document.getElementById('talk').hidden,
              canAdvance: !!globalThis.__game.ui._advance,
              speaker: globalThis.document.querySelector('#talk .who')?.textContent,
              node: globalThis.__game.runner.currentNode,
            }));
            if (state.frozen) break;
            if (state.talk && state.canAdvance) {
              dialogue.push(state);
              await page.keyboard.press('Space');
            }
            await page.waitForTimeout(150);
          }
          assert.ok(
            await page.evaluate(() => globalThis.__parcelTapFrozen),
            'real unjammed tap after dialogue completed',
          );
          const pose = () => {
            const game = globalThis.__game,
              c = game.place._commuters[2],
              r = c.r;
            return {
              stage: c.stage,
              phaseTime: c.t,
              gameTime: game.t,
              paused: game.paused,
              position: r.root.position.toArray(),
              rotation: r.root.rotation.toArray(),
              joints: ['LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand'].map((name) => ({
                name,
                q: r.model.getObjectByName(name).quaternion.toArray(),
              })),
            };
          };
          const before = await page.evaluate(pose),
            views = [];
          assert.equal(before.stage, 'tap');
          const staging = await page.evaluate(() => {
            const THREE = globalThis.__parcelCheckThree,
              P = globalThis.__game.place,
              r = P._commuters[2].r;
            const carton = r.root.getObjectByName('office-parcel');
            const bounds = new THREE.Box3().setFromObject(carton);
            const target = bounds.getCenter(new THREE.Vector3());
            target.y = bounds.min.y + 0.015;
            const q = r.root.getWorldQuaternion(new THREE.Quaternion());
            const left = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
            const front = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
            const arch = P.space.children.find((o) => typeof o.userData.flaps === 'function');
            const posts = arch.children
              .filter((o) => o.isMesh && new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()).y > 1)
              .map((o) => {
                const b = new THREE.Box3().setFromObject(o);
                return { min: b.min.toArray(), max: b.max.toArray() };
              });
            return {
              root: r.root.getWorldPosition(new THREE.Vector3()).toArray(),
              carton: { min: bounds.min.toArray(), max: bounds.max.toArray() },
              palm: r.model.getObjectByName('LeftHand').getWorldPosition(new THREE.Vector3()).toArray(),
              reader: P.things.reader_l.anchor(new THREE.Vector3()).toArray(),
              posts,
              target: target.toArray(),
              cameras: [
                {
                  name: 'close-left-front',
                  eye: target
                    .clone()
                    .addScaledVector(left, 0.65)
                    .addScaledVector(front, 0.85)
                    .add(new THREE.Vector3(0, 0.4, 0))
                    .toArray(),
                },
                {
                  name: 'close-left',
                  eye: target
                    .clone()
                    .addScaledVector(left, 0.85)
                    .addScaledVector(front, 0.45)
                    .add(new THREE.Vector3(0, 0.3, 0))
                    .toArray(),
                },
              ],
              talkHidden: globalThis.document.getElementById('talk').hidden,
              gate: P.snapshotState(),
            };
          });
          assert.equal(staging.talkHidden, true, 'dialogue finished normally, not hidden');
          for (const { name, eye } of staging.cameras) {
            await page.evaluate(
              ({ eye, target }) => {
                globalThis.__parcelTapCamera = { eye, target };
              },
              { eye, target: staging.target },
            );
            await page.waitForTimeout(80);
            const atCapture = await page.evaluate(pose);
            assert.deepEqual(atCapture, before, 'camera-only capture keeps the actual tap pose');
            await page.screenshot({ path: out + width + '-tap-' + name + '.png' });
            const after = await page.evaluate(pose);
            assert.deepEqual(after, before, 'tap phase and joints unchanged through capture');
            views.push({ name, eye, target: staging.target, atCapture, after });
          }
          fs.writeFileSync(
            out + width + '-tap-report.json',
            JSON.stringify({ base, before, staging, dialogue, views, errors }, null, 2),
          );
          assert.deepEqual(errors, []);
          console.log('PASS preserved actual tap pose, camera-only views; artifacts: ' + out);
          return;
        }
        for (let i = 0; i < 1000; i++) {
          const row = await page.evaluate(() => {
            const p = globalThis.__game.place,
              lift = globalThis.__lift;
            const THREE = globalThis.__parcelCheckThree,
              carrier = p._commuters?.[2];
            let parcel = null;
            if (carrier?.r.root.visible) {
              const r = carrier.r,
                prop = r.root.getObjectByName('office-parcel');
              r.root.updateMatrixWorld(true);
              const inverse = r.root.matrixWorld.clone().invert();
              const box = new THREE.Box3(),
                point = new THREE.Vector3();
              prop.traverse((mesh) => {
                if (!mesh.isMesh) return;
                mesh.geometry.computeBoundingBox();
                box.union(
                  mesh.geometry.boundingBox
                    .clone()
                    .applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld)),
                );
              });
              let bodyGap = Infinity,
                supportGap = Infinity,
                bodyInside = 0,
                armInside = 0;
              r.model.traverse((mesh) => {
                if (!mesh.isSkinnedMesh) return;
                mesh.skeleton.update();
                const { position, skinIndex, skinWeight } = mesh.geometry.attributes;
                for (let i = 0; i < position.count; i++) {
                  let body = 0,
                    arm = 0,
                    hand = 0;
                  for (let j = 0; j < 4; j++) {
                    const name = mesh.skeleton.bones[skinIndex.getComponent(i, j)].name,
                      w = skinWeight.getComponent(i, j);
                    if (/^(Hips|Spine\d*|LeftUpLeg|RightUpLeg|LeftLeg|RightLeg)$/.test(name)) body += w;
                    if (/^Left(Arm|ForeArm|Hand)$/.test(name)) arm += w;
                    if (name === 'LeftHand') hand += w;
                  }
                  mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
                  if (body > 0.5) bodyGap = Math.min(bodyGap, box.distanceToPoint(point));
                  if (box.containsPoint(point)) {
                    if (body > 0.5) bodyInside++;
                    if (arm > 0.5) armInside++;
                  }
                  if (
                    hand > 0.6 &&
                    point.x > box.min.x &&
                    point.x < box.max.x &&
                    point.z > box.min.z &&
                    point.z < box.max.z
                  )
                    supportGap = Math.min(supportGap, box.min.y - point.y);
                }
              });
              parcel = {
                stage: carrier.stage,
                bodyGap,
                supportGap,
                bodyInside,
                armInside,
                size: box.getSize(new THREE.Vector3()).toArray(),
              };
            }
            return {
              parcel,
              place: p.name,
              ride: !!lift?.ride.on,
              floor: globalThis.__game.liftFloor || lift?.ride.floor,
              people: Object.entries({ ...p.extras, ...p.people })
                .filter(([id]) => /^(worker_|commuter_|sales)/.test(id))
                .map(([id, r]) => ({
                  id,
                  approved: r.approvedCrowd,
                  visible: r.root.visible,
                  bridge: r.bridge,
                  ph: r.ph,
                  finite:
                    r.root.children.every((o) => o.position.toArray().every(Number.isFinite)) &&
                    Number.isFinite(r.torso.scale.y),
                })),
              commuters: p._commuters?.map((c) => ({
                stage: c.stage,
                arm: c.r.arms[0].rotation.toArray().slice(0, 3),
                left: c.r.arms[1].rotation.toArray().slice(0, 3),
              })),
            };
          });
          rows.push(row);
          if (row.parcel) {
            const m = row.parcel;
            measured.add(m.stage);
            if (m.bodyInside || m.armInside || !(m.bodyGap > 0.005) || !(m.supportGap >= 0 && m.supportGap < 0.006))
              violations.push(m);
          }
          for (const r of row.people) {
            assert.equal(r.approved, expected[r.id], r.id + ' model');
            assert.equal(r.bridge, true, r.id + ' bridge');
            assert.ok(Number.isFinite(r.ph) && r.finite, r.id + ' finite pose');
            if (r.visible) seen.add(r.id);
          }
          const keys = [];
          if (row.place === 'gate') {
            if (i === 0) keys.push('gate-native');
            for (const phase of ['in', 'toqueue', 'queue', 'tap', 'through', 'out'])
              if (row.commuters?.[2]?.stage === phase) keys.push('gate-' + phase);
          }
          if (row.ride) {
            rode = true;
            keys.push('ride-' + String(row.floor).replaceAll('-', ''));
          }
          for (const key of keys)
            if (!shots.has(key)) {
              shots.add(key);
              await page.screenshot({ path: out + width + '-' + key + '.png' });
            }
          if (rode && row.place === 'office' && !row.ride) {
            arrived = true;
            await page.screenshot({ path: out + width + '-arrived-office.png' });
            break;
          }
          await page.waitForTimeout(150);
        }
        const privateMode = await page.evaluate(
          () => JSON.parse(globalThis.localStorage.getItem('amakawa-settings')).privateMode,
        );
        fs.writeFileSync(
          out + width + '-report.json',
          JSON.stringify(
            {
              base,
              expected,
              seen: [...seen],
              rode,
              arrived,
              shots: [...shots],
              rows,
              errors,
              violations,
              privateMode,
            },
            null,
            2,
          ),
        );
        for (const phase of ['in', 'toqueue', 'queue', 'tap', 'through'])
          assert.ok(measured.has(phase), 'measured ' + phase);
        assert.deepEqual(violations, [], 'parcel geometry across route');
        assert.deepEqual([...seen].sort(), Object.keys(expected).sort(), 'seven visible roles');
        assert.ok(rode && arrived, 'actual lift completed');
        assert.ok(shots.has('gate-tap') && shots.has('gate-through'), 'tap then passage');
        assert.deepEqual(errors, []);
        assert.equal(privateMode, false);
        console.log(
          'PASS parcel clearance/support across actual gate phases and lift route ' + width + '; artifacts: ' + out,
        );
      } finally {
        fs.writeFileSync(
          out + width + '-attempt.json',
          JSON.stringify(
            { base, seen: [...seen], measured: [...measured], rode, arrived, shots: [...shots], rows, errors },
            null,
            2,
          ),
        );
        closing = true;
        await context.close();
      }
    };
    await capture(width);
    if (tapOnly && tapReviewFile && width < 600) {
      console.log('PHONE REVIEW READY: ' + out);
      console.log('To accept this framing, write "desktop ' + out + '" to ' + tapReviewFile);
      const deadline = Date.now() + 60000;
      while (Date.now() < deadline && !fs.existsSync(tapReviewFile))
        await new Promise((resolve) => setTimeout(resolve, 500));
      if (
        fs.existsSync(tapReviewFile) &&
        fs.readFileSync(tapReviewFile, 'utf8').trim() === 'desktop ' + out
      )
        await capture(1366);
      else console.log('Desktop held: no phone framing acceptance supplied.');
    }
  },
  { timeoutMs: 260000 },
);
