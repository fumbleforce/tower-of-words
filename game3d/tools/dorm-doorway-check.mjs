// Doorway staging: inside 203, floor level, looking north from kitchenette into bedroom,
// then south toward kitchenette. Native follow lens at default character scale; overview on phone.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withNativeBrowser } from '../../reviews/camera-plan-1/native-browser.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
const base = process.env.URL || 'http://127.0.0.1:8771/game3d';
const out = process.env.OUT || new URL(`../shots/dorm-doorway/${Date.now()}/`, import.meta.url).pathname;
const desktopWidth = +(process.env.WIDTH || 1366),
  desktopHeight = +(process.env.HEIGHT || 860);
fs.mkdirSync(out, { recursive: true });
const report = { cases: [], errors: [] };
await withNativeBrowser('dorm-doorway', async (browser, native) => {
  for (const [width, height, mc] of [
    [desktopWidth, desktopHeight, 'eric'],
    [desktopWidth, desktopHeight, 'carina'],
    [390, 844, 'eric'],
  ]) {
    const key = `${width}-${mc}`,
      page = await browser.newPage({ viewport: { width, height } });
    let closing = false;
    await page.route(
      '**/*',
      scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (e) => report.errors.push(e) }),
    );
    page.on('pageerror', (e) => report.errors.push(e.message));
    await page.addInitScript(() =>
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({ v: 99, privateMode: false, voiceOn: false, cameraMode: 'follow', textSpeed: 'instant' }),
      ),
    );
    const item = { key, frames: [] };
    report.cases.push(item);
    try {
      await page.goto(`${base}/index.html?cap&perf&place=dorms&mc=${mc}&q=1&charscale=100`);
      await page.waitForFunction(() => globalThis.__done);
      await page.evaluate(() => {
        globalThis.__run = true;
        globalThis.document.body.classList.remove('cap');
      });
      await page.waitForFunction(() => !globalThis.__game.busy);
      await page.evaluate(async () => {
        const g = globalThis.__game;
        await g.walkTo(...g.place.things.door_203.spot());
        await g.place.things.door_203.act();
        await g.walkTo(-0.15, 0.3);
      });
      await page.waitForFunction(() => !globalThis.__game.busy);
      await page.waitForFunction((w) => globalThis.__game.followCamera.active === w > 700, width);
      item.metrics = await page.evaluate(async () => {
        const g = globalThis.__game,
          T = await import('three'),
          l = await import('./js/scenes/dorms/layout.js');
        if (l.DOORWAY_H) assertWide();
        function assertWide() {
          if (!g.place.nav.free(-0.42, 0, 0.17)) throw Error('new passage width is blocked');
        }
        const b = new T.Box3().setFromObject(g.player.root);
        return {
          opening: l.DOORWAY,
          height: l.DOORWAY_H || 1,
          body: b.getSize(new T.Vector3()).toArray(),
          charScale: g.place.charScale,
          navRadius: g.place.nav.R,
        };
      });
      for (const [direction, yaw, target] of [
        ['north', Math.PI, [-0.15, -0.65]],
        ['south', 0, [-0.15, 0.3]],
      ]) {
        if (width > 700) {
          // The native harness has a 1600px Xvfb display. Turn within it, then restore
          // the requested capture viewport before walking; both use the same follow lens.
          if (width > 1600) {
            await page.setViewportSize({ width: 1366, height: 860 });
            await page.waitForTimeout(300);
          }
          for (let attempt = 0; attempt < 3; attempt++) {
            await native.clickElement(page, page.locator('#cameraLook'));
            await page.waitForTimeout(200);
            if (await page.evaluate(() => globalThis.__game.followCamera.captured)) break;
          }
          await page.waitForFunction(() => globalThis.__game.followCamera.captured);
          for (let turn = 0; turn < 30; turn++) {
            const angle = await page.evaluate(() => globalThis.__game.followCamera.yaw),
              delta = Math.atan2(Math.sin(angle - yaw), Math.cos(angle - yaw));
            if (Math.abs(delta) < 0.015) break;
            native.move(Math.round(Math.max(-150, Math.min(150, delta / 0.003))), 0);
            await page.waitForTimeout(80);
          }
          await page.waitForTimeout(120);
          await page.keyboard.press('Escape');
          if (width > 1600) await page.setViewportSize({ width, height });
          const actual = await page.evaluate(() => globalThis.__game.followCamera.yaw);
          assert.ok(
            Math.abs(Math.atan2(Math.sin(actual - yaw), Math.cos(actual - yaw))) < 0.02,
            `native camera faces requested direction: ${actual} vs ${yaw}`,
          );
        }
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${out}/${key}-${direction}-before.png` });
        await page.evaluate((target) => {
          const g = globalThis.__game;
          globalThis.__doorWalkDone = false;
          g.walkTo(...target).then(() => {
            globalThis.__doorWalkDone = true;
          });
        }, target);
        for (let frame = 0; frame < 18; frame++) {
          await page.waitForTimeout(80);
          const state = await page.evaluate(() => {
            const g = globalThis.__game;
            return {
              position: g.player.root.position.toArray(),
              camera: g.place.camera.position.toArray(),
              distance: g.followCamera.distance,
              visible: g.player.root.visible,
              active: g.followCamera.active,
              done: globalThis.__doorWalkDone,
              yaw: g.followCamera.yaw,
              collisionMs: g.followCamera.collisionMs,
            };
          });
          item.frames.push({ direction, frame, ...state });
          await page.screenshot({ path: `${out}/${key}-${direction}-${String(frame).padStart(2, '0')}.png` });
          if (state.done) break;
        }
        await page.waitForFunction(() => globalThis.__doorWalkDone);
        const pos = await page.evaluate(() => globalThis.__game.player.root.position.toArray());
        assert.ok(Math.hypot(pos[0] - target[0], pos[2] - target[1]) < 0.1, 'crosses passage');
      }
      await page.waitForTimeout(300);
      item.performance = await page.evaluate(() => globalThis.__perfReport());
    } catch (e) {
      await page.screenshot({ path: `${out}/${key}-failure.png` });
      throw e;
    } finally {
      closing = true;
      await page.close();
      fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
    }
  }
  assert.deepEqual(report.errors, []);
});
console.log('PASS both passage directions, Eric/Carina desktop and phone overview', out);
