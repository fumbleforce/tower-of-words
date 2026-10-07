// Native default-size staging: actual loaded bodies, seats, head pins and held props.
// Diagnostic close cameras change framing only. Query overrides remain separate comparison controls.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366),
  height = width < 600 ? 844 : 860;
const base = process.env.BASE || 'game3d',
  mc = process.env.MC || 'eric';
const out = new URL(`../shots/character-scale/${process.env.OUT || Date.now()}-${mc}-${width}/`, import.meta.url)
  .pathname;
fs.mkdirSync(out, { recursive: true });
const report = { errors: [], cases: [] };
await withBrowserJob(
  'scale-default-' + width,
  async (browser) => {
    const context = await browser.newContext({ viewport: { width, height } });
    let closing = false;
    await context.route(
      '**/*',
      scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (e) => report.errors.push(e) }),
    );
    await context.addInitScript(() =>
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({ privateMode: false, voiceOn: false, textSpeed: 'instant' }),
      ),
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => report.errors.push(e.message));
    try {
      for (const place of (process.env.ONLY || 'office,train,canteen,pool').split(',')) {
        await waitForGame(
          page,
          90000,
          () =>
            page.goto(
              `http://127.0.0.1:8771/${base}/index.html?cap&place=${place}&mc=${mc}&day=${place === 'pool' ? 3 : place === 'train' ? 1 : 2}&q=2${process.env.QS || ''}`,
            ),
          'play',
        );
        await page.waitForFunction(() => globalThis.__done);
        await page.evaluate(() => {
          globalThis.__run = true;
        });
        await page.waitForTimeout(1000);
        const initial = await page.evaluate(async () => {
          const g = globalThis.__game,
            T = await import('three');
          const { CHARACTER_SCALE, characterHead } = await import('./js/character-scale.js');
          const { chibi } = await import('./js/train/people.js');
          const { bodies } = await import('./js/movement/shared.js');
          const rig = (r) => {
            if (!r?.root) return null;
            const head = characterHead(r),
              world = head?.getWorldPosition(new T.Vector3());
            return {
              id: r.id,
              meshy: !!r.meshy,
              visible: r.root.visible,
              rootScale: r.root.scale.toArray(),
              holderScale: r.model?.parent.scale.toArray(),
              head: world?.toArray(),
              seated: r.seated,
              state: r.state,
              strides: r.strides,
            };
          };
          const dummy = chibi({ skin: '#f6d9c6', top: '#234455', bottom: '#334455', hair: '#223344', scale: 1 });
          const fallbackScale = dummy.root.scale.x;
          dummy.root.traverse((o) => {
            o.geometry?.dispose();
          });
          const people = { ...g.place.people, eric: g.player, mio: g.mioNpc };
          const pins = g.markers.list
            .filter((m) => people[m.id] && m.enabled())
            .map((m) => {
              const r = people[m.id],
                a = m.anchor(new T.Vector3()),
                h = characterHead(r)?.getWorldPosition(new T.Vector3());
              return { id: m.id, anchor: a.toArray(), head: h?.toArray(), clearance: h ? a.y - h.y : null };
            });
          return {
            place: g.place.name,
            scale: CHARACTER_SCALE,
            fallbackScale,
            playerSpeed: g.walker.speed,
            people: Object.fromEntries(Object.entries(people).map(([id, r]) => [id, rig(r)])),
            crowd: (g.place.crowd || []).map(rig),
            pins,
            collision: bodies(g).map((b) => ({ id: b.id, radius: b.r })),
            seats: g.place.seats,
          };
        });
        assert.equal(initial.scale, process.env.QS?.includes('charscale=100') ? 1 : 0.85);
        assert.equal(initial.fallbackScale, initial.scale);
        report.cases.push(initial);
        await page.screenshot({ path: `${out}${place}-arrival.png` });
        if (place === 'plaza') {
          initial.grips = await page.evaluate(async () => {
            const g = globalThis.__game,
              T = await import('three');
            const held = (g.place.crowd || [])
              .filter((r) => r.meshy && r.carries && !r.seated && r.root.visible)
              .map((r) => {
                const hand = r.model.getObjectByName('LeftHand');
                const mount = hand?.children.find((c) => c.isGroup && c.children.some((b) => b.isGroup));
                const bag = mount?.children[0];
                if (!bag) return null;
                const handAt = hand.getWorldPosition(new T.Vector3());
                const handle = bag.children.find((c) => c.geometry?.boundingBox || c.geometry);
                const top = new T.Box3().setFromObject(bag);
                return {
                  rig: r,
                  at: handAt.toArray(),
                  bagTop: top.max.y,
                  gap: top.max.y - handAt.y,
                  origin: bag.getWorldPosition(new T.Vector3()).toArray(),
                  mountPosition: mount.position.toArray(),
                  mountScale: mount.scale.toArray(),
                  hasHandle: !!handle,
                };
              })
              .filter(Boolean);
            const chosen = held[0];
            if (chosen) {
              globalThis.__run = false;
              g.paused = true;
              const target = chosen.rig.root.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 0.65, 0));
              const camera = g.place.camera;
              camera.position.copy(target).add(new T.Vector3(-1.2, 0.3, 1.6));
              camera.lookAt(target);
              camera.fov = 55;
              camera.updateProjectionMatrix();
              camera.updateMatrixWorld(true);
            }
            return held.map(({ rig, ...values }) => ({ id: rig.id, ...values }));
          });
          await page.waitForTimeout(500);
          await page.screenshot({ path: `${out}plaza-grip.png` });
        }
        if (place === 'office' && process.env.MIO) {
          await page.evaluate(async () => {
            const g = globalThis.__game;
            g.flagsRef.d2_ticket_done = true;
            g.place.hooks.officeDay2({ state: 'arrive' });
          });
          await page.waitForTimeout(500);
          initial.mio = await page.evaluate(async () => {
            const g = globalThis.__game,
              T = await import('three'),
              r = g.mioNpc;
            const { characterHead } = await import('./js/character-scale.js');
            const h = characterHead(r).getWorldPosition(new T.Vector3());
            const marker = g.markers.list.find((m) => m.id === 'mio');
            const a = marker.anchor(new T.Vector3());
            const camera = g.place.camera,
              target = r.root.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 0.5, 0));
            globalThis.__run = false;
            g.paused = true;
            camera.position.copy(target).add(new T.Vector3(-1.8, 0.7, -1.3));
            camera.lookAt(target);
            camera.fov = 55;
            camera.updateProjectionMatrix();
            camera.updateMatrixWorld(true);
            return {
              visible: r.root.visible,
              seated: r.seated,
              head: h.toArray(),
              anchor: a.toArray(),
              clearance: a.y - h.y,
              markerEnabled: marker.enabled(),
            };
          });
          await page.waitForTimeout(200);
          await page.screenshot({ path: `${out}office-mio.png` });
          assert.ok(initial.mio.visible && initial.mio.seated && initial.mio.markerEnabled);
          assert.ok(Math.abs(initial.mio.clearance - 0.24 * 0.85 * 1.18) < 1e-8);
          await page.evaluate(() => {
            globalThis.__game.paused = false;
            globalThis.__run = true;
          });
        }
        const seatId = {
          office: 'my_seat',
          train: 'seat_near_r',
          canteen: 'canteen_seat_shared',
          pool: 'deck_bench_n',
        }[place];
        if (seatId) {
          await page.evaluate(
            async ({ seatId }) => {
              const g = globalThis.__game,
                r = g.player,
                s = g.place.seats[seatId];
              if (!s) throw Error('Missing actual seat ' + seatId);
              r.sitAt(s.x, s.top, s.z, s.ry || 0);
              r.seated = true;
              g.walker.stop();
              g.busy = true;
            },
            { seatId },
          );
          await page.waitForTimeout(500);
          const contact = await page.evaluate(async (seatId) => {
            const g = globalThis.__game,
              T = await import('three'),
              r = g.player,
              s = g.place.seats[seatId];
            const { seatUnderside } = await import('./js/movement/sit-height.js');
            r.root.updateWorldMatrix(true, true);
            let hips;
            r.model.traverse((b) => {
              if (b.isBone && /hips/i.test(b.name)) hips = b;
            });
            const hip = r.root.worldToLocal(hips.getWorldPosition(new T.Vector3()));
            const under = seatUnderside('default-probe-' + g.place.name, r.model, r.root, hip);
            return {
              seatId,
              top: s.top,
              hip: hip.toArray(),
              underside: r.root.position.y + under * r.root.scale.y,
              delta: r.root.position.y + under * r.root.scale.y - s.top,
            };
          }, seatId);
          initial.contact = contact;
          await page.evaluate(async (seatId) => {
            const g = globalThis.__game,
              T = await import('three'),
              s = g.place.seats[seatId],
              camera = g.place.camera;
            globalThis.__run = false;
            g.paused = true;
            const target = g.place.space.localToWorld(new T.Vector3(s.x, s.top + 0.4, s.z));
            const yaw = (s.ry || 0) + 0.9,
              distance = 2.15;
            const offset = new T.Vector3(Math.sin(yaw) * distance, 0.65, Math.cos(yaw) * distance);
            offset.applyQuaternion(g.place.space.getWorldQuaternion(new T.Quaternion()));
            camera.position.copy(target).add(offset);
            camera.lookAt(target);
            camera.fov = 55;
            camera.updateProjectionMatrix();
            camera.updateMatrixWorld(true);
          }, seatId);
          await page.waitForTimeout(150);
          await page.screenshot({ path: `${out}${place}-seat.png` });
          assert.ok(Math.abs(contact.delta) < 0.03, `${mc} ${place} seat contact ${contact.delta}`);
        }
        fs.writeFileSync(out + 'report.json', JSON.stringify(report, null, 2));
        console.log('checked', place, initial.contact || 'standing');
      }
      assert.deepEqual(report.errors, []);
      console.log('PASS', out);
    } catch (error) {
      report.failure = error.stack;
      await page.screenshot({ path: out + 'failure.png' });
      throw error;
    } finally {
      fs.writeFileSync(out + 'report.json', JSON.stringify(report, null, 2));
      closing = true;
      await context.close();
    }
  },
  { timeoutMs: 285000 },
);
