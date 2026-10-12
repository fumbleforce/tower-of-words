// Public pool bodies: repeated save/outfit swaps, jumps, and a collision-facing trace at the reported spot.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366),
  mc = process.argv[3] || 'eric',
  height = width < 700 ? 844 : 860;
const base = process.env.BASE_URL || 'http://127.0.0.1:8771/game3d';
const out = new URL(`../shots/pool-jump-${mc}-${width}${process.env.BASELINE ? '-baseline' : ''}/`, import.meta.url)
  .pathname;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  `pool-jump-${mc}-${width}`,
  async (browser) => {
    const page = await browser.newPage({ viewport: { width, height } }),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/api/plugins', (r) => r.fulfill({ json: [] }));
    await page.route('**/island/private/**', (r) => r.abort());
    await page.addInitScript(() =>
      globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false, voiceOn: false })),
    );
    await waitForGame(page, 90000, () => page.goto(`${base}/index.html?place=pool&cap&q=0&mc=${mc}`), 'play');
    await page.locator('#boot').waitFor({ state: 'hidden', timeout: 60000 });
    await page.evaluate(async () => {
      const g = globalThis.__game,
        { sim, setPeriod } = await import('./js/sim.js');
      sim.day = 3;
      setPeriod('evening', g);
      await g.place.day3({});
      g.walker.stop();
      g.player.root.position.set(2.82, 0, -15.79);
      g.player.root.rotation.y = -2.92;
      g.walker.sync();
      globalThis.__poolOriginal = { model: g.player.model, update: g.player.update, root: g.player.root };
      globalThis.__poolSamples = [];
    });
    const change = (on) =>
      page.evaluate((on) => {
        const g = globalThis.__game,
          saved = g.place.snapshotState();
        saved.swim.outfits.eric = on;
        saved.swim.swimmers.eric = null;
        g.place.restoreState({ world: saved });
        g.jump.update(0);
        g.player.update(0);
        g.followCamera.holdView();
        g.followCamera.beforeStep();
        g.followCamera.refresh = g.followCamera.beforeStep = g.followCamera.afterStep = () => {};
        g.place.cam.update = () => {};
        const at = g.player.root.getWorldPosition(g.player.root.position.clone());
        g.place.camera.position.copy(at).add({ x: 2.5, y: 2.25, z: 4 });
        g.place.camera.lookAt(at.x, at.y + 0.9, at.z);
        g.place.camera.fov = 38;
        g.place.camera.updateProjectionMatrix();
      }, on);
    const sample = () =>
      page.evaluate(async () => {
        const THREE = await import('three'),
          g = globalThis.__game,
          r = g.player.root,
          m = g.player.model,
          v = new THREE.Vector3();
        r.updateWorldMatrix(true, true);
        const left = m.getObjectByName('LeftArm'),
          right = m.getObjectByName('RightArm');
        const side = left.getWorldPosition(v.clone()).sub(right.getWorldPosition(v.clone())).normalize();
        const forward = side.cross(new THREE.Vector3(0, 1, 0)).normalize(),
          rootForward = r.getWorldDirection(v.clone());
        let attached = false;
        for (let p = m; p; p = p.parent) if (p === g.jump.hop) attached = true;
        return {
          at: r.position.toArray(),
          yaw: r.rotation.y,
          targetFacing: g.walker.targetFacing,
          vx: g.walker.vx,
          vz: g.walker.vz,
          travelFacingDot: Math.cos(r.rotation.y - Math.atan2(g.walker.vx, g.walker.vz)),
          bodyForward: forward.toArray(),
          rootForward: rootForward.toArray(),
          facingDot: forward.dot(rootForward),
          air: g.jump.air,
          height: g.jump.height,
          attached,
          hops: r.children.filter((o) => o.name === 'jump').length,
          model: m.uuid,
          normal: m === globalThis.__poolOriginal.model,
        };
      });
    const rows = [];
    for (let cycle = 0; cycle < 3; cycle++) {
      await change(true);
      rows.push({ stage: `outfit${cycle}`, ...(await sample()) });
      if (!process.env.BASELINE) assert(rows.at(-1).attached, 'active swimsuit is inside active jump hop');
      await page.evaluate(() => {
        const g = globalThis.__game;
        g.jump.press();
        globalThis.__advance(0.08);
        g.jump.release();
      });
      rows.push({ stage: `jump${cycle}`, ...(await sample()) });
      if (!process.env.BASELINE) {
        assert(rows.at(-1).air && rows.at(-1).height > 0.05, 'swimwear jump leaves the dry deck');
        assert(rows.at(-1).attached);
      }
      await page.screenshot({ path: out + `outfit-jump-${cycle}.png` });
      await page.evaluate(() => {
        globalThis.__advance(0.8);
        globalThis.__game.jump.reset();
      });
      await change(false);
      rows.push({ stage: `ordinary${cycle}`, ...(await sample()) });
      if (!process.env.BASELINE) {
        assert(rows.at(-1).normal);
        assert(rows.at(-1).attached);
        assert.equal(rows.at(-1).hops, 1);
      }
    }
    await change(true);
    // Drive into nearby geometry and people from the reported point, then reverse and cross directions.
    for (const key of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) {
      await page.keyboard.down(key);
      for (let i = 0; i < 20; i++) {
        await page.evaluate(() => globalThis.__advance(0.05));
        rows.push({ stage: key, ...(await sample()) });
      }
      await page.keyboard.up(key);
    }
    await page.screenshot({ path: out + 'after-collisions.png' });
    await change(false);
    rows.push({ stage: 'final', ...(await sample()) });
    const waterOverlay = await page.evaluate(() => {
      const g = globalThis.__game,
        dry = g.place.snapshotState(),
        wet = structuredClone(dry);
      wet.swim.outfits.eric = true;
      wet.swim.swimmers.eric = 'swim';
      g.place.restoreState({ world: wet });
      g.jump.update(0);
      g.player.root.rotation.x = 0;
      g.player.update(0.1);
      const swimmingPitch = g.player.root.rotation.x;
      g.place.restoreState({ world: dry });
      g.jump.update(0);
      g.player.update(0);
      return { swimmingPitch, restoredPitch: g.player.root.rotation.x };
    });
    if (!process.env.BASELINE) {
      assert(waterOverlay.swimmingPitch > 0.6, 'cached outfit keeps the restored swimming overlay');
      assert(Math.abs(waterOverlay.restoredPitch) < 0.01, 'leaving water restores upright body');
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(out + 'result.json', JSON.stringify({ base, mc, width, rows, waterOverlay, errors }, null, 2));
    console.log(
      'POOL BODY TRACE',
      out,
      JSON.stringify({
        minFacingDot: Math.min(...rows.map((r) => r.facingDot)),
        detached: rows.filter((r) => !r.attached).map((r) => r.stage),
      }),
    );
    await page.close();
  },
  gpuWaitOptions(900, 180000),
);
