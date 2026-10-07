import assert from 'node:assert/strict';
import fs from 'node:fs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366),
  phone = width < 600;
const gameURL = `http://127.0.0.1:${process.env.PORT || 8771}/${process.env.BASE || 'game3d'}/index.html`;
const out = new URL(`../shots/station-garden/${process.env.OUT || 'round1'}/`, import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  `station-garden-${width}`,
  async (browser) => {
    const context = await browser.newContext({
      viewport: { width, height: phone ? 844 : 860 },
      isMobile: phone,
      hasTouch: phone,
    });
    const page = await context.newPage(),
      errors = [],
      views = [];
    let closing = false;
    await context.route(
      '**/*',
      scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (e) => errors.push(e) }),
    );
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() =>
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({ privateMode: false, voiceOn: false, textSpeed: 'instant' }),
      ),
    );
    async function shot(id) {
      await page.waitForTimeout(1000);
      const state = await page.evaluate(async () => {
        const g = globalThis.__game,
          garden = g.place.stationGarden,
          gl = g.renderer.getContext(),
          ext = gl.getExtension('WEBGL_debug_renderer_info');
        const info = g.renderer.info,
          calls = [],
          triangles = [];
        info.autoReset = false;
        try {
          for (let i = 0; i < 12; i++) {
            info.reset();
            await new Promise(globalThis.requestAnimationFrame);
            calls.push(info.render.calls);
            triangles.push(info.render.triangles);
          }
        } finally {
          info.autoReset = true;
        }
        const median = (a) => a.sort((a, b) => a - b)[Math.floor(a.length / 2)];
        return {
          place: g.place.name,
          at: g.player.root.position.toArray(),
          routine: garden.routine.snapshot(),
          contact: garden.routine.contact,
          renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
          calls: median(calls),
          triangles: median(triangles),
        };
      });
      views.push({ id, ...state });
      await page.screenshot({ path: `${out}${width}-${id}.png` });
      console.log(id, JSON.stringify(state));
    }
    async function continueSaved() {
      if (phone) await page.locator('#qsaveBtn').tap();
      else await page.keyboard.press('F5');
      await page.waitForTimeout(600);
      await page.goto(`${gameURL}?q=0`);
      if (phone) await page.locator('#title .mcont').tap();
      else await page.locator('#title .mcont').click();
      if (phone) await page.locator('.slot[data-id="quick"]').tap();
      else await page.locator('.slot[data-id="quick"]').click();
    }
    async function continueBench(id) {
      const before = await page.evaluate(() => {
        const p = globalThis.__game.player;
        return { at: [p.root.position.x, p.root.position.z], yaw: p.root.rotation.y, out: p.seatOut };
      });
      await continueSaved();
      await page.waitForFunction(
        () =>
          globalThis.__game?.player?.seated &&
          !globalThis.__game.busy &&
          !globalThis.document.body.classList.contains('at-title'),
        null,
        { timeout: 65000 },
      );
      const after = await page.evaluate(() => {
        const p = globalThis.__game.player;
        return { at: [p.root.position.x, p.root.position.z], yaw: p.root.rotation.y, out: p.seatOut };
      });
      assert.deepEqual(after, before, 'seated Continue keeps bench position, facing and safe stand exit');
      await shot(id + '-continued');
    }

    try {
      await waitForGame(
        page,
        60000,
        () =>
          page.goto(
            `${gameURL}?day=3&place=shotengai&mc=${phone ? 'carina' : 'eric'}&q=0`,
          ),
        'play',
      );
      await page.evaluate(() => {
        const g = globalThis.__game;
        g.player.root.position.set(-4.15, 0, -79.5);
        g.walker.sync();
        g.place.cam.snap(g.player.root.position);
        g.place.stationGarden.routine.restore({ patch: 0, phase: 'sweep', time: 0 });
      });
      await shot('garden');
      await page.evaluate(async () => {
        const g = globalThis.__game;
        g.place.stationGarden.routine.pause();
        await g.walkTo(...g.place.things.station_worker.spot());
      });
      await shot('walking-approach');
      await page.waitForTimeout(5500);
      await shot('walking-approach-clear');
      await page.evaluate((phone) => {
        const g = globalThis.__game,
          p = g.place.stationGarden.worker.root.position;
        g.place.cam.closeOn([p.x, p.z], 1, 0.4, { conversation: 'station_worker' });
        if (phone) {
          g.place.cam.close.conversationShot.minDistance = 4.5;
          g.place.cam.close.conversationShot.halfWidth = 1.25;
        }
      }, phone);
      await shot('sweep-contact');
      await page.evaluate(() => {
        const g = globalThis.__game;
        g.place.stationGarden.routine.restore({ patch: 0, phase: 'collect', time: 1, collected: [0.3, 0] });
        g.place.stationGarden.routine.pause();
      });
      await shot('collect-contact');
      if (process.env.CONTACT === '1') {
        const clearance = await page.evaluate(async () => {
          const g = globalThis.__game,
            P = g.place,
            r = P.stationGarden.routine,
            worker = P.stationGarden.worker;
          const { PATCHES } = await import('./js/scenes/station-garden/plan.js');
          const result = [];
          for (const [kind, person] of [
            ['resident', P.people.aoi],
            ['crowd', P.crowd.find((p) => p.root.visible)],
          ]) {
            const at = person.root.position.clone(),
              visible = person.root.visible;
            r.restore({ phase: 'walk', patch: 1, at: PATCHES[0], collected: [1, 0] });
            person.root.position.copy(worker.root.position);
            person.root.position.x += 0.4;
            person.root.visible = true;
            const before = worker.root.position.clone();
            r.update(0.1, g.t);
            result.push({ kind, moved: worker.root.position.distanceTo(before) });
            person.root.position.copy(at);
            person.root.visible = visible;
          }
          r.restore({ phase: 'walk', patch: 1, at: PATCHES[0], collected: [1, 0] });
          r.resume();
          P.cam.release();
          return result;
        });
        for (const item of clearance) assert.equal(item.moved, 0, item.kind + ' yields');
        await page.waitForFunction(() => globalThis.__game.place.stationGarden.routine.state.phase === 'sweep', null, {
          timeout: 20000,
        });
        await shot('worker-next-patch');
        console.log('native resident/crowd blocked-step clearance', JSON.stringify(clearance));
        return;
      }
      if (process.env.FULL === '1') {
        const local = ([x, z]) => [20.15 - z, x - 64.5];
        async function walk(point) {
          await page.evaluate(async (p) => {
            await globalThis.__game.walkTo(...p);
          }, point);
          const distance = await page.evaluate((p) => {
            const v = globalThis.__game.player.root.position;
            return Math.hypot(v.x - p[0], v.z - p[1]);
          }, point);
          assert.ok(distance < 0.3, `route ${point}: ${distance}`);
        }
        await page.evaluate(() => {
          const g = globalThis.__game;
          g.place.cam.release();
          g.place.stationGarden.routine.resume();
        });
        if (process.env.ACTIVITY !== '1') {
          const route = [
            [-10.9, 24.5],
            [-11.2, 25.95],
            [-14.45, 25.95],
            [-14.45, 28],
            [-4.25, 28],
            [-4.25, 24.5],
          ].map(local);
          for (const point of route) await walk(point);
          await shot('arcade-link');
          for (const point of [...route].reverse()) await walk(point);
          await walk(local([-14.45, 16.6]));
          await shot('covered-approach');
          await walk(local([-14.45, 12]));
          await shot('station-boundary');
        }
        await walk(local([-14.45, 23.5]));
        await page.evaluate(async () => {
          await globalThis.__game.runner.trigger('talk:garden_bench_1');
        });
        await page.waitForFunction(() => globalThis.__game.player.seated && !globalThis.__game.busy);
        assert.equal(await page.evaluate(() => globalThis.__game.player.seated), true);
        await shot('bench-sit');
        await continueBench('bench-1');
        await page.evaluate(() => globalThis.__game.standUp());
        await page.waitForFunction(() => !globalThis.__game.player.seated && !globalThis.__game.busy);
        await page.evaluate(async () => {
          await globalThis.__game.runner.trigger('talk:garden_bench_2');
        });
        await page.waitForFunction(() => globalThis.__game.player.seated && !globalThis.__game.busy);
        await shot('bench-2-sit');
        await continueBench('bench-2');
        await page.evaluate(() => globalThis.__game.standUp());
        await page.waitForFunction(() => !globalThis.__game.player.seated && !globalThis.__game.busy);
        await page.evaluate(async () => {
          const g = globalThis.__game;
          g.place.stationGarden.routine.restore({ patch: 0, phase: 'sweep', time: 1 });
          g.place.stationGarden.routine.pause();
          await g.walkTo(...g.place.things.station_worker.spot());
          void g.runner.trigger('talk:station_worker');
        });
        await page.waitForFunction(
          () =>
            globalThis.__game.place.cam.close?.conversationShot?.who === 'station_worker' &&
            globalThis.__game.ui._advance,
        );
        await shot('talk-first');
        const before = await page.evaluate(() => {
          const g = globalThis.__game;
          return {
            garden: g.place.snapshotState().stationGarden,
            shot: g.place.cam.close,
            player: g.player.root.position.toArray(),
          };
        });
        await continueSaved();
        await page.waitForFunction(
          () =>
            globalThis.__game?.place?.cam?.close?.conversationShot?.who === 'station_worker' &&
            globalThis.__game.ui._advance &&
            !globalThis.document.body.classList.contains('at-title'),
          null,
          { timeout: 65000 },
        );
        await shot('talk-continued');
        const after = await page.evaluate(() => {
          const g = globalThis.__game;
          return {
            garden: g.place.snapshotState().stationGarden,
            shot: g.place.cam.close,
            player: g.player.root.position.toArray(),
          };
        });
        assert.deepEqual(after, before, 'real title Continue keeps garden staging and pair camera');
        async function dismiss() {
          for (let n = 0; n < 5; n++) {
            if (!(await page.evaluate(() => globalThis.__game.busy))) break;
            if (await page.locator('#talk .more').isVisible()) {
              if (phone) await page.locator('#talkHit').tap();
              else await page.locator('#talkHit').click();
            }
            await page.waitForTimeout(400);
          }
          await page.waitForFunction(() => !globalThis.__game.busy);
        }
        await dismiss();
        await page.evaluate(async () => {
          const g = globalThis.__game;
          g.place.stationGarden.routine.restore({ patch: 0, phase: 'rest', time: 1, collected: [1, 0] });
          await g.walkTo(...g.place.things.station_worker.spot());
          void g.runner.trigger('talk:station_worker');
        });
        await page.waitForFunction(() => globalThis.__game.ui._advance);
        await shot('talk-repeat');
        await dismiss();
        await page.evaluate(async () => {
          const g = globalThis.__game;
          g.place.stationGarden.routine.restore({ patch: 0, phase: 'collect', time: 0.5, collected: [0.15, 0] });
          g.place.stationGarden.routine.pause();
          await g.walkTo(...g.place.things.station_worker.spot());
          void g.runner.trigger('talk:station_worker');
        });
        await page.waitForFunction(() => globalThis.__game.ui._advance);
        await shot('talk-busy');
        await dismiss();
        await page.evaluate(async () => {
          const g = globalThis.__game;
          g.place.stationGarden.routine.restore({ phase: 'rest', collected: [1, 1] });
          await g.walkTo(...g.place.things.station_worker.spot());
          void g.runner.trigger('talk:station_worker');
        });
        await page.waitForFunction(() => globalThis.__game.ui._advance);
        await shot('talk-done');
        await dismiss();
        assert.equal(await page.evaluate(() => globalThis.__game.place.cam.camera.fov), 24);
        await page.evaluate(async () => {
          const g = globalThis.__game;
          g.place.stationGarden.routine.restore({ day: 3, period: 'morning', phase: 'rest', collected: [1, 1] });
          await g.hooks.period({ to: 'evening' });
        });
        assert.equal(await page.evaluate(() => globalThis.__game.place.stationGarden.worker.root.visible), false);
        await shot('evening');
        await page.evaluate(async () => {
          await globalThis.__game.hooks.period({ to: 'morning' });
        });
        assert.equal(await page.evaluate(() => globalThis.__game.place.stationGarden.worker.root.visible), true);
        assert.deepEqual(
          await page.evaluate(() => globalThis.__game.place.stationGarden.routine.state.collected),
          [0, 0],
        );
        await shot('morning-return');
        if (!phone) {
          await page.evaluate(async () => {
            const { setSetting } = await import('./js/settings.js');
            setSetting('cameraMode', 'follow');
          });
          await page
            .waitForFunction(() => globalThis.__game.followCamera.active, null, { timeout: 10000 })
            .catch(async (e) => {
              console.log(
                'follow blocked',
                await page.evaluate(() => {
                  const g = globalThis.__game;
                  return {
                    save: g.saveEnabled,
                    busy: g.busy,
                    paused: g.paused,
                    map: g.mapOpen,
                    saying: g.saying,
                    transition: g.transition,
                    scripted: g.player.scripted,
                    close: g.place.cam.close,
                    releasing: g.place.cam.releasing,
                    talking: g.ui.talking,
                    menu: g.ui.menuClosed(),
                    mode: globalThis.__settings.cameraMode,
                    coarse: globalThis.matchMedia('(pointer: coarse)').matches,
                  };
                }),
              );
              throw e;
            });
          await shot('desktop-follow');
        }
      }
      assert.deepEqual(errors, []);
    } finally {
      fs.writeFileSync(`${out}${width}.json`, JSON.stringify({ width, errors, views }, null, 2));
      closing = true;
      await context.close();
    }
  },
  { gpuWaitMs: 45000, timeoutMs: 420000 },
);
