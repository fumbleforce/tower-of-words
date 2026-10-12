// Reproduce the sports approach that prepares swimwear while the player faces north.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366),
  mc = process.argv[3] || 'eric';
const base = process.env.BASE_URL || 'http://127.0.0.1:8771/game3d';
const baseline = !!process.env.BASELINE;
const out = new URL(`../shots/pool-facing-529/${mc}-${width}${baseline ? '-baseline' : ''}/`, import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  `pool-facing-${mc}-${width}`,
  async (browser) => {
    const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 860 } });
    const errors = [],
      rows = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/api/plugins', (r) => r.fulfill({ json: [] }));
    await page.route('**/island/private/**', (r) => r.abort());
    await page.addInitScript(() =>
      globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false, voiceOn: false })),
    );
    await waitForGame(page, 90000, () => page.goto(`${base}/index.html?place=sports&q=0&mc=${mc}`), 'play');
    await page.locator('#boot').waitFor({ state: 'hidden', timeout: 60000 });
    const preparation = await page.evaluate(async () => {
      const g = globalThis.__game,
        { sim, setPeriod } = await import('./js/sim.js');
      sim.day = 3;
      setPeriod('evening', g);
      if (g.prepared.pool) throw Error('Pool was already prepared before the high-yaw approach');
      g.walker.stop();
      g.walker.locked = true;
      const [x, z] = g.place.things.pool.spot();
      g.player.root.position.set(x, 0, z + 6);
      g.player.root.rotation.set(0, -2.92, 0);
      g.walker.sync();
      const before = g.player.root.rotation.toArray();
      g.place.update(0); // the real sports proximity trigger requests pool preparation
      if (!g.prepared.pool) throw Error('Sports proximity did not prepare the pool');
      await g.prepared.pool;
      const after = g.player.root.rotation.toArray();
      g.walker.locked = false;
      return { before, after };
    });
    if (!baseline) assert.deepEqual(preparation.after, preparation.before, 'pool preparation preserves Euler facing');
    await page.evaluate(() => globalThis.__game.travel('pool', { fast: true, via: 'sports' }));
    await page.waitForFunction(() => !globalThis.__game.busy && globalThis.__game.place.name === 'pool', null, {
      timeout: 60000,
    });
    await page.evaluate(() => {
      const g = globalThis.__game;
      g.walker.stop();
      g.player.root.position.set(2.82, 0, -15.79);
      g.player.root.rotation.y = -2.92; // normal gameplay writes yaw alone; never repair X/Z in this fixture
      g.walker.sync();
      globalThis.__poolWallContacts = 0;
      const nav = g.walker.nav,
        collide = nav.collide;
      nav.collide = function (x, z, ...rest) {
        const result = collide.call(this, x, z, ...rest);
        if (Math.hypot(result[0] - x, result[1] - z) > 0.0001) globalThis.__poolWallContacts++;
        return result;
      };
      g.followCamera.holdView();
      g.followCamera.beforeStep();
      g.followCamera.refresh = g.followCamera.beforeStep = g.followCamera.afterStep = () => {};
      g.place.cam.update = () => {};
      const at = g.player.root.getWorldPosition(g.player.root.position.clone());
      g.place.camera.position.copy(at).add({ x: 2.5, y: 2.25, z: 4 });
      g.place.camera.lookAt(at.x, at.y + 0.9, at.z);
      g.place.camera.fov = 38;
      g.place.camera.updateProjectionMatrix();
    });
    const sample = (stage) =>
      page.evaluate(async (stage) => {
        const THREE = await import('three'),
          g = globalThis.__game,
          r = g.player.root,
          m = g.player.model;
        r.updateWorldMatrix(true, true);
        const v = new THREE.Vector3(),
          expected = new THREE.Vector3(Math.sin(r.rotation.y), 0, Math.cos(r.rotation.y));
        const side = m
          .getObjectByName('LeftArm')
          .getWorldPosition(v.clone())
          .sub(m.getObjectByName('RightArm').getWorldPosition(v.clone()))
          .normalize();
        const bodyForward = side.cross(new THREE.Vector3(0, 1, 0)).normalize();
        return {
          stage,
          rotation: r.rotation.toArray(),
          at: r.position.toArray(),
          rootFacingDot: r.getWorldDirection(v).dot(expected),
          bodyFacingDot: bodyForward.dot(expected),
        };
      }, stage);
    for (const wearing of [false, true, false, true]) {
      await page.evaluate((wearing) => {
        const g = globalThis.__game,
          saved = g.place.snapshotState();
        saved.swim.outfits.eric = wearing;
        saved.swim.swimmers.eric = null;
        g.place.restoreState({ world: saved });
      }, wearing);
      for (const key of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) {
        await page.keyboard.down(key);
        await page.waitForTimeout(700);
        rows.push(await sample(`${wearing ? 'swimwear' : 'ordinary'}-${key}`));
        await page.keyboard.up(key);
      }
      // Save restoration snaps the overview; frame the exact body again for visual QA.
      await page.evaluate(() => {
        const g = globalThis.__game,
          at = g.player.root.getWorldPosition(g.player.root.position.clone());
        g.place.camera.position.copy(at).add({ x: 2.5, y: 2.25, z: 4 });
        g.place.camera.lookAt(at.x, at.y + 0.9, at.z);
        g.place.camera.fov = 38;
        g.place.camera.updateProjectionMatrix();
      });
      await page.screenshot({ path: out + `turns-${rows.length}.png` });
    }
    assert.deepEqual(errors, []);
    const wallContacts = await page.evaluate(() => globalThis.__poolWallContacts);
    const result = { base, mc, width, preparation, wallContacts, rows, errors };
    fs.writeFileSync(out + 'result.json', JSON.stringify(result, null, 2));
    if (!baseline) {
      assert(
        rows.every((r) => r.rootFacingDot > 0.999),
        'all later yaw turns face the intended world direction',
      );
      assert(
        rows.every((r) => r.bodyFacingDot > 0.85),
        'visible model faces the intended direction after collisions and outfit swaps',
      );
    }
    console.log(
      'POOL FACING',
      out,
      JSON.stringify({
        preparation,
        minRoot: Math.min(...rows.map((r) => r.rootFacingDot)),
        minBody: Math.min(...rows.map((r) => r.bodyFacingDot)),
      }),
    );
    await page.close();
  },
  gpuWaitOptions(900, 240000),
);
