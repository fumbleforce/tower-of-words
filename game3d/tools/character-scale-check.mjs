import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366),
  height = width < 600 ? 844 : 860;
const base = process.env.BASE || 'game3d';
const out = new URL(`../shots/character-scale/${process.env.OUT || Date.now()}-${width}/`, import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const trialScale = process.env.SCALE || '85';
assert.ok(['67', '85', 'default'].includes(trialScale), 'supported comparison scale');
const ratio = trialScale === 'default' ? 0.85 : +trialScale / 100;
const report = { errors: [], cases: [] };
await withBrowserJob(
  'character-scale-' + width,
  async (browser) => {
    for (const scale of ['100', trialScale]) {
      const context = await browser.newContext({
        viewport: { width, height },
        isMobile: width < 600,
        hasTouch: width < 600,
      });
      let closing = false;
      await context.route(
        '**/*',
        scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (e) => report.errors.push(e) }),
      );
      await context.addInitScript(() =>
        globalThis.localStorage.setItem(
          'amakawa-settings',
          JSON.stringify({ privateMode: false, voiceOn: false, textSpeed: 'instant', quality: 'high' }),
        ),
      );
      const page = await context.newPage();
      page.on('pageerror', (e) => report.errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') report.errors.push(m.text());
      });
      try {
        for (const place of (process.env.ONLY || 'dorms,forecourt,canteen,plaza').split(',')) {
          await waitForGame(
            page,
            90000,
            () =>
              page.goto(
                `http://127.0.0.1:8771/${base}/index.html?day=2&place=${place}&mc=${process.env.MC || 'eric'}&q=2${scale === 'default' ? '' : '&charscale=' + scale}`,
              ),
            'play',
          );
          // Advance the actual morning start dialogue; other places normally start free.
          for (let i = 0; i < 100 && (await page.evaluate(() => globalThis.__game.busy)); i++) {
            const close = page.locator('#ticketsApp:not([hidden]) .tk-close');
            if (await close.isVisible()) await close.click();
            else {
              const choice = page.locator('.chips .chip:visible').first();
              if (await choice.isVisible()) await choice.click();
              else await page.keyboard.press('Space');
            }
            await page.waitForTimeout(180);
          }
          await page.waitForFunction(() => !globalThis.__game.busy);
          if (place === 'dorms')
            await page.evaluate(async () => {
              const g = globalThis.__game;
              await g.walkTo(...g.place.spots.door_203);
            });
          if (place === 'forecourt') {
            if (process.env.CROWD)
              await page.evaluate(async () => {
                const g = globalThis.__game;
                await g.walkTo(21, -2.5);
                g.place.cam.closeOn([23, -1.5], 1.15, 0.5);
              });
            else
              await page.evaluate(async () => {
                const g = globalThis.__game;
                await g.walkTo(9.7, 9.8);
                // Hold the comparison on an exact world point; walk arrival varies by a few millimetres.
                g.place.cam.closeOn([9.7, 9.8], 1, 0.45);
              });
          }
          if (place === 'canteen')
            await page.evaluate(() => globalThis.__game.hooks.sit({ who: 'eric', at: 'canteen_seat_shared' }));
          await page.waitForTimeout(1800);
          const state = await page.evaluate(async () => {
            const T = await import('three'),
              g = globalThis.__game,
              P = g.place;
            const size = (rig) => {
              if (!rig?.root) return null;
              rig.root.updateWorldMatrix(true, true);
              const box = new T.Box3().setFromObject(rig.model || rig.root);
              return {
                id: rig.id,
                meshy: !!rig.meshy,
                visible: rig.root.visible,
                pos: rig.root.position.toArray(),
                rootScale: rig.root.scale.toArray(),
                holderScale: rig.model?.parent.scale.toArray(),
                height: box.max.y - box.min.y,
                minY: box.min.y,
                state: rig.state,
                seated: rig.seated,
                strides: rig.strides,
              };
            };
            const markers = g.markers.list
              .filter((m) => m.enabled())
              .map((m) => {
                const v = m.anchor(new T.Vector3());
                return { id: m.id, at: v.toArray(), projected: v.clone().project(P.camera).toArray() };
              });
            let seat;
            if (g.player.seated) {
              const { seatUnderside } = await import('./js/movement/sit-height.js');
              const r = g.player,
                s = P.seats.canteen_seat_shared;
              let hips;
              r.model.traverse((bone) => { if (bone.isBone && /hips/i.test(bone.name)) hips = bone; });
              const hip = r.root.worldToLocal(hips.getWorldPosition(new T.Vector3()));
              const local = seatUnderside('trial-probe-' + globalThis.location.search, r.model, r.root, hip);
              seat = {
                top: s.top,
                underside: r.root.position.y + local * r.root.scale.y,
                delta: r.root.position.y + local * r.root.scale.y - s.top,
              };
            }
            return {
              place: P.name,
              build: globalThis.BUILD,
              player: size(g.player),
              people: Object.fromEntries(Object.entries(P.people || {}).map(([id, r]) => [id, size(r)])),
              crowd: (P.crowd || []).map(size),
              camera: { matrix: P.camera.matrixWorld.toArray(), projection: P.camera.projectionMatrix.toArray() },
              markers,
              seat,
            };
          });
          report.cases.push({ scale, ...state });
          fs.writeFileSync(out + 'report.json', JSON.stringify(report, null, 2));
          assert.equal(state.place, place);
          assert.ok(state.player.meshy, 'approved Meshy player loaded');
          if (state.seat) assert.ok(Math.abs(state.seat.delta) < 0.03, `seat contact ${state.seat.delta}`);
          await page.screenshot({ path: `${out}${place}-${scale}.png` });
          if (place === 'canteen') {
            await page.evaluate(() => {
              const g = globalThis.__game,
                s = g.place.seats.canteen_seat_shared;
              g.place.cam.closeOn([s.x, s.z - 0.65], 2.4, 0.5);
            });
            await page.waitForTimeout(1800);
            await page.screenshot({ path: `${out}canteen-detail-${scale}.png` });
            if (process.env.PICK) {
              const target = await page.evaluate(() => {
                const g = globalThis.__game,
                  m = g.markers.list.find((m) => m.id === 'canteen_shirt');
                const b = m.el.getBoundingClientRect();
                return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
              });
              await page.mouse.click(target.x, target.y);
              await page.waitForFunction(
                () => globalThis.__game.busy || globalThis.__game.ui.actFor?.id === 'canteen_shirt',
              );
              const use = page.locator('#actMenu:not([hidden]) .act.use');
              if (await use.isVisible()) await use.click();
              await page.waitForFunction(() => globalThis.__game.ui.talking);
              await page.waitForTimeout(1600);
              await page.screenshot({ path: `${out}canteen-talk-${scale}.png` });
              report.cases.at(-1).pickedConversation = await page.evaluate(() => ({
                node: globalThis.__game.runner.currentNode,
                talk: globalThis.__game.ui.talking,
              }));
            }
          }
          fs.writeFileSync(out + 'report.json', JSON.stringify(report, null, 2));
          console.log('captured', place, scale, state.player.height, state.seat || '');
        }
      } catch (error) {
        await page.screenshot({ path: out + 'failure-' + scale + '.png' });
        throw error;
      } finally {
        closing = true;
        await context.close();
      }
    }
    for (const a of report.cases.filter((r) => r.scale === '100')) {
      const b = report.cases.find((r) => r.scale === trialScale && r.place === a.place);
      assert.ok(Math.abs(b.player.holderScale[0] / a.player.holderScale[0] - ratio) < 1e-8);
      const match = (x, y) =>
        x.forEach((v, i) =>
          assert.ok(Math.abs(v - y[i]) < 0.015, `same camera ${a.place} component ${i}: ${v} vs ${y[i]}`),
        );
      match(a.camera.matrix, b.camera.matrix);
      match(a.camera.projection, b.camera.projection);
      for (const [id, r] of Object.entries(a.people)) {
        if (r?.meshy && b.people[id]?.meshy)
          assert.ok(Math.abs(b.people[id].holderScale[0] / r.holderScale[0] - ratio) < 1e-8, id);
      }
      for (let i = 0; i < a.crowd.length; i++) {
        if (a.crowd[i]?.meshy && b.crowd[i]?.meshy)
          assert.ok(Math.abs(b.crowd[i].holderScale[0] / a.crowd[i].holderScale[0] - ratio) < 1e-8, `crowd ${i}`);
      }
    }
    assert.deepEqual(report.errors, []);
    console.log('PASS', out);
  },
  { timeoutMs: 285000 },
);
