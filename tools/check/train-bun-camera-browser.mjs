// Real Start, visible bun pin, authored shopping-bag action and held first line.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { withBrowserJob, gpuWaitOptions } from '../lib/browser-job.mjs';
import { openGame } from '../../game3d/test/support/open-game.mjs';
import { scopedRoute } from '../bible/check-scope.mjs';

const [width = 2560, height = 1440] = process.argv.slice(2).map(Number);
const phone = width < 700;
const output = process.env.OUT || path.resolve('game3d/shots/train-bun-camera', `${Date.now()}-${width}x${height}`);
fs.mkdirSync(output, { recursive: true });
const report = { width, height, output, frames: [], errors: [] };
try {
  await withBrowserJob(
    'train-bun-camera',
    async (browser) => {
      let closing = false;
      const scopeErrors = [];
      const run = await openGame(browser, {
        viewport: { width, height },
        touch: phone,
        mode: 'play',
        beforeNavigate: async (page, context) => {
          await context.route(
            '**/*',
            scopedRoute({
              publicOnly: true,
              isClosing: () => closing,
              onFailure: (message) => scopeErrors.push(message),
            }),
          );
          await page.addInitScript(() => {
            globalThis.__FULL__ = false;
          });
        },
      });
      const { page } = run;
      try {
        await page.waitForFunction(() => !window.__game.busy && !window.__game.runner.frames.length);
        await page.screenshot({ path: path.join(output, '01-start.png') });
        // Marker IDs are runtime data, so inspect the rendered pin rather than assume an attribute.
        const point = await page.evaluate(() => {
          const marker = window.__game.markers.list.find((m) => m.id === 'bun')?.el;
          const rect = marker?.querySelector('.pin')?.getBoundingClientRect();
          if (!rect?.width) throw new Error('Bun interaction pin is not visible');
          const xy = [rect.x + rect.width / 2, rect.y + rect.height / 2];
          if (document.elementFromPoint(...xy)?.closest('.mark') !== marker) throw new Error('Bun pin is covered');
          return xy;
        });
        await page.mouse.click(...point);
        await page.waitForFunction(
          () =>
            window.__game.runner.frames.some((f) => f.trigger === 'talk:bun') ||
            !document.getElementById('actMenu').hidden,
          null,
          { timeout: 20000 },
        );
        const menu = page.locator('#actMenu');
        if (await menu.isVisible()) {
          await menu.locator('button.use').click();
        }
        await page.waitForFunction(() => window.__game.runner.frames.some((f) => f.trigger === 'talk:bun'), null, {
          timeout: 20000,
        });
        await page.evaluate(async () => {
          const THREE = await import('three');
          const poles = [];
          window.__game.place.scene.traverse((o) => {
            if (
              o.geometry?.type === 'CylinderGeometry' &&
              o.geometry.parameters.radiusTop <= 0.023 &&
              o.geometry.parameters.height > 1
            )
              poles.push(o);
          });
          const ray = new THREE.Raycaster(),
            center = new THREE.Vector3();
          window.__bunCameraFrames = [];
          const began = performance.now();
          const sample = () => {
            const g = window.__game,
              p = g.place,
              c = p.camera;
            const sightlines = ['head', 'torso'].map((part) => {
              const bounds = new THREE.Box3().setFromObject(g.player.model || g.player.rig.root);
              bounds.getCenter(center);
              center.y = bounds.min.y + (bounds.max.y - bounds.min.y) * (part === 'head' ? 0.8 : 0.47);
              const delta = center.clone().sub(c.position);
              ray.set(c.position, delta.clone().normalize());
              ray.far = delta.length() - 0.05;
              return {
                part,
                center: center.toArray(),
                poleHits: ray.intersectObjects(poles, false).length,
                screen: center.clone().project(c).toArray(),
              };
            });
            window.__bunCameraFrames.push({
              sightlines,
              ms: performance.now() - began,
              close: p.cam.close && { ...p.cam.close },
              camera: c.position.toArray(),
              target: p.cam.target.toArray(),
              player: g.player.root.position.toArray(),
              bun: p.people.bun.root.position.toArray(),
              talk: !document.getElementById('talk').hidden,
              busy: g.busy,
            });
            if (!window.__bunCameraStop) requestAnimationFrame(sample);
          };
          sample();
        });
        for (let i = 0; i < 12; i++) {
          await page.screenshot({ path: path.join(output, `02-in-${String(i).padStart(2, '0')}.png`) });
          await page.waitForTimeout(300);
        }
        await page.waitForFunction(
          () =>
            !document.getElementById('talk').hidden &&
            document.getElementById('talk').innerText.includes('Woman with a bun'),
          null,
          { timeout: 15000 },
        );
        await page.screenshot({ path: path.join(output, '03-dialogue.png') });
        await page.waitForTimeout(2200);
        await page.screenshot({ path: path.join(output, '04-settled.png') });
        report.held = await page.evaluate(() => ({
          camera: window.__game.place.camera.position.toArray(),
          target: window.__game.place.cam.target.toArray(),
          close: window.__game.place.cam.close,
        }));
        const save = page.locator('#qsaveBtn');
        if (await save.isVisible()) await save.click();
        else await page.keyboard.press('F5');
        await page.waitForTimeout(300);
        await page.locator('#talkHit').click();
        await page.waitForTimeout(1200);
        await page.locator('#talkHit').click();
        for (let i = 0; i < 8; i++) {
          await page.screenshot({ path: path.join(output, `05-out-${String(i).padStart(2, '0')}.png`) });
          await page.waitForTimeout(300);
        }
        await page.evaluate(() => {
          window.__bunCameraStop = true;
        });
        report.frames = await page.evaluate(() => window.__bunCameraFrames);
        await page.reload();
        await page.locator('#title .mcont').waitFor({ state: 'visible', timeout: 60000 });
        await page.locator('#title .mcont').click();
        await page.locator('#saves button.slot').filter({ hasText: 'Quick save' }).click();
        await page.waitForFunction(
          () =>
            !document.body.classList.contains('at-title') &&
            !document.getElementById('talk').hidden &&
            document.getElementById('talk').innerText.includes('Woman with a bun'),
          null,
          { timeout: 30000 },
        );
        await page.waitForTimeout(2200);
        await page.screenshot({ path: path.join(output, '06-continued.png') });
        report.continued = await page.evaluate(() => ({
          camera: window.__game.place.camera.position.toArray(),
          target: window.__game.place.cam.target.toArray(),
          close: window.__game.place.cam.close,
        }));
        const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
        assert.deepEqual(report.continued.close, report.held.close, 'Continue restores the authored close-up');
        assert(distance(report.continued.target, report.held.target) < 0.01, 'Continue restores the held target');
        assert(
          distance(report.continued.camera, report.held.camera) < 0.03,
          'Continue restores the held angle and distance',
        );
        report.continued.sightlines = await page.evaluate(async () => {
          const THREE = await import('three'),
            g = window.__game,
            c = g.place.camera,
            poles = [];
          g.place.scene.traverse((o) => {
            if (
              o.geometry?.type === 'CylinderGeometry' &&
              o.geometry.parameters.radiusTop <= 0.023 &&
              o.geometry.parameters.height > 1
            )
              poles.push(o);
          });
          if (!poles.length) throw new Error('No carriage poles found for restored sightlines');
          const ray = new THREE.Raycaster(),
            center = new THREE.Vector3();
          return ['head', 'torso'].map((part) => {
            const bounds = new THREE.Box3().setFromObject(g.player.model || g.player.rig.root);
            bounds.getCenter(center);
            center.y = bounds.min.y + (bounds.max.y - bounds.min.y) * (part === 'head' ? 0.8 : 0.47);
            const delta = center.clone().sub(c.position);
            ray.set(c.position, delta.clone().normalize());
            ray.far = delta.length() - 0.05;
            return {
              part,
              poleHits: ray.intersectObjects(poles, false).length,
              screen: center.clone().project(c).toArray(),
            };
          });
        });
        for (const line of report.continued.sightlines) {
          assert.equal(line.poleHits, 0, `Continue keeps ${line.part} clear of poles`);
          assert(
            Math.abs(line.screen[0]) < 0.95 && Math.abs(line.screen[1]) < 0.95,
            `Continue keeps ${line.part} in frame`,
          );
        }
        assert.deepEqual(scopeErrors, [], 'Public browser request scope');
        report.errors = run.errors;
        if (run.errors.length) throw new Error(run.errors.join(' | '));
        console.log('PASS real Start and authored bun interaction');
      } finally {
        if (!report.frames.length) report.frames = await page.evaluate(() => window.__bunCameraFrames || []);
        report.errors.push(...run.errors);
        report.errors.push(...scopeErrors);
        closing = true;
        await run.close();
      }
    },
    gpuWaitOptions(1800, 300000),
  );
} catch (error) {
  report.errors.push(error.stack);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(output);
}
