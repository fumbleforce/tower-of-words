// Native traversal through 203; video and per-frame measurements include the fade boundary.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withNativeBrowser } from '../../reviews/camera-plan-1/native-browser.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
const base = process.env.URL || 'http://127.0.0.1:8771/game3d';
const scale = +(process.env.SCALE || 100);
const benchmark = !!process.env.PERF;
const screenshots = !benchmark && !process.env.RECORD_ONLY;
const out = process.env.OUT || new URL(`../shots/follow-tight/${Date.now()}/`, import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const report = { cases: [], errors: [] };
await withNativeBrowser('follow-tight', async (browser, native) => {
  const cases = (process.env.SCALES || String(scale))
    .split(',')
    .flatMap((size) => ['eric', 'carina'].map((mc) => [mc, +size]));
  for (const [mc, runScale] of process.env.SANITY ? [] : cases) {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 860 },
      ...(benchmark ? {} : { recordVideo: { dir: out, size: { width: 1366, height: 860 } } }),
    });
    const page = await context.newPage();
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
    const item = { mc, scale: runScale, frames: [] };
    report.cases.push(item);
    try {
      await page.goto(`${base}/?cap&perf&place=dorms&mc=${mc}&q=1&charscale=${runScale}`);
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
      });
      await page.waitForFunction(() => !globalThis.__game.busy && globalThis.__game.place.things.window.enabled());
      await page.waitForTimeout(1200);
      await page.evaluate(async () => {
        await globalThis.__game.walkTo(-0.15, 0.3);
      });
      await page.waitForFunction(() => globalThis.__game.followCamera.active);
      for (const [direction, yaw, target, key] of [
        ['north', Math.PI, -1.85, 'w'],
        ['north-retreat', Math.PI, 0.3, 's'],
        ['north-repeat', Math.PI, -1.85, 'w'],
        ['south', 0, 0.3, 'w'],
      ]) {
        for (
          let attempt = 0;
          attempt < 3 && !(await page.evaluate(() => globalThis.__game.followCamera.captured));
          attempt++
        ) {
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
        const actual = await page.evaluate(() => globalThis.__game.followCamera.yaw);
        assert.ok(Math.abs(Math.atan2(Math.sin(actual - yaw), Math.cos(actual - yaw))) < 0.02, 'native yaw');
        await page.waitForTimeout(300);
        await page.evaluate(() => {
          globalThis.__frames = [];
          globalThis.__sampling = true;
          function sample() {
            const g = globalThis.__game;
            let alpha = 0;
            g.player.root.traverse((o) => {
              if (o.material) {
                const m = Array.isArray(o.material) ? o.material : [o.material];
                alpha = Math.max(alpha, ...m.map((m) => m.opacity));
              }
            });
            globalThis.__frames.push({
              time: performance.now(),
              position: g.player.root.position.toArray(),
              camera: g.place.camera.position.toArray(),
              distance: g.followCamera.distance,
              visible: g.player.root.visible,
              alpha,
              active: g.followCamera.active,
              yaw: g.followCamera.yaw,
              fov: g.place.camera.fov,
              collisionMs: g.followCamera.collisionMs,
            });
            if (globalThis.__sampling) globalThis.requestAnimationFrame(sample);
          }
          globalThis.requestAnimationFrame(sample);
        });
        if (screenshots) await page.screenshot({ path: `${out}/${mc}-${runScale}-${direction}-before.png` });
        let stopped = false;
        const decreasing = target < 0;
        native.down(key);
        const walking = page
          .waitForFunction(
            ({ target, decreasing }) =>
              decreasing
                ? globalThis.__game.player.root.position.z <= target
                : globalThis.__game.player.root.position.z >= target,
            { target, decreasing },
            { timeout: 10000 },
          )
          .then(() => {
            native.up(key);
            stopped = true;
          });
        try {
          for (let frame = 0; frame < 16 && !stopped; frame++) {
            await page.waitForTimeout(70);
            if (screenshots)
              await page.screenshot({
                path: `${out}/${mc}-${runScale}-${direction}-${String(frame).padStart(2, '0')}.png`,
              });
          }
          await walking;
        } finally {
          native.up(key);
        }
        await page.waitForTimeout(400);
        if (screenshots) await page.screenshot({ path: `${out}/${mc}-${runScale}-${direction}-after.png` });
        item.frames.push({
          direction,
          samples: await page.evaluate(() => {
            globalThis.__sampling = false;
            return globalThis.__frames;
          }),
        });
        const pos = await page.evaluate(() => globalThis.__game.player.root.position.toArray());
        assert.ok(
          target < 0 ? pos[2] < -1.7 && pos[2] > -2.5 : pos[2] > 0.2 && pos[2] < 0.9,
          `native ${direction} reaches ${target}: ${pos}`,
        );
      }
      item.performance = await page.evaluate(() => globalThis.__perfReport());
    } catch (e) {
      item.failure = e.message;
      if (screenshots) await page.screenshot({ path: `${out}/${mc}-${runScale}-failure.png` });
      throw e;
    } finally {
      closing = true;
      await context.close();
      if (!benchmark) await page.video().saveAs(`${out}/${mc}-${runScale}-traversal.webm`);
      fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
    }
  }
  if (process.env.SANITY)
    for (const [place, width, height] of [
      ['dorms', 390, 844],
      ['train', 1366, 860],
      ['karaoke_booth', 1366, 860],
    ]) {
      const page = await browser.newPage({ viewport: { width, height } });
      let closing = false;
      const item = { place, width, height, scale, views: [] };
      report.cases.push(item);
      await page.route(
        '**/*',
        scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (e) => report.errors.push(e) }),
      );
      page.on('pageerror', (e) => report.errors.push(e.message));
      await page.addInitScript(() =>
        globalThis.localStorage.setItem(
          'amakawa-settings',
          JSON.stringify({ v: 99, privateMode: false, voiceOn: false, cameraMode: 'follow' }),
        ),
      );
      try {
        await page.goto(`${base}/?cap&perf&place=${place}&q=1&charscale=${scale}`);
        await page.waitForFunction(() => globalThis.__done);
        await page.evaluate(() => {
          globalThis.__run = true;
          globalThis.document.body.classList.remove('cap');
        });
        await page.waitForFunction(() => !globalThis.__game.busy);
        if (place === 'dorms') {
          await page.evaluate(async () => {
            const g = globalThis.__game;
            await g.walkTo(...g.place.things.door_203.spot());
            await g.place.things.door_203.act();
          });
          await page.waitForFunction(() => !globalThis.__game.busy && globalThis.__game.place.things.window.enabled());
          await page.waitForTimeout(1200);
          await page.evaluate(async () => {
            await globalThis.__game.walkTo(-0.15, 0.3);
          });
        }
        await page.waitForFunction((w) => globalThis.__game.followCamera.active === w > 700, width);
        if (width > 700) {
          await native.clickElement(page, page.locator('#cameraLook'));
          await page.waitForFunction(() => globalThis.__game.followCamera.captured);
        }
        for (let angle = 0; angle < (width > 700 ? 4 : 1); angle++) {
          if (angle) {
            native.move(145, 0);
            await page.waitForTimeout(150);
            native.move(145, 0);
            await page.waitForTimeout(150);
            native.move(145, 0);
          }
          await page.waitForTimeout(300);
          item.views.push(
            await page.evaluate(() => {
              const g = globalThis.__game;
              return {
                camera: g.place.camera.position.toArray(),
                distance: g.followCamera.distance,
                visible: g.player.root.visible,
                active: g.followCamera.active,
                yaw: g.followCamera.yaw,
                fov: g.place.camera.fov,
              };
            }),
          );
          if (screenshots) await page.screenshot({ path: `${out}/${place}-${width}-${angle}.png` });
        }
      } finally {
        closing = true;
        await page.close();
        fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
      }
    }
  assert.deepEqual(report.errors, []);
});
console.log('PASS native Eric/Carina traversal', out);
