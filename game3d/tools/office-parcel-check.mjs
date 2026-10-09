import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366),
  height = width < 600 ? 844 : 860;
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
      await page.evaluate(async () => {
        const THREE = await import('./vendor/three/three.module.js');
        const P = globalThis.__game.place,
          c = P.camera,
          r = P._commuters[2].r,
          original = c.updateMatrixWorld;
        // Exact camera transform from the user-flagged neutral-parcel-390-gate-through original.
        globalThis.__parcelCheckThree = THREE;
        c.updateMatrixWorld = function (...args) {
          if (r.root.visible) {
            const center = r.root.getWorldPosition(new THREE.Vector3());
            center.y += 0.58;
            const direction = new THREE.Vector3(0.65, 0, 1)
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
      });
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
          { base, expected, seen: [...seen], rode, arrived, shots: [...shots], rows, errors, violations, privateMode },
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
  },
  { timeoutMs: 260000 },
);
