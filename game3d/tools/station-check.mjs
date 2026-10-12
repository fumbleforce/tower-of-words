// Shopping street to the station garden and covered approach, in Saturday morning light.
// node game3d/tools/station-check.mjs [width] [quality]; BASE_URL can select an isolated worktree.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366),
  quality = +(process.argv[3] || 2),
  phone = width < 700,
  height = phone ? 844 : 860;
const base = process.env.BASE_URL || 'http://127.0.0.1:8771/game3d';
const out = new URL('../shots/station-fix/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  `station-check-${width}-${quality}`,
  async (browser) => {
    const page = await browser.newPage({
      viewport: { width, height },
      isMobile: phone,
      hasTouch: phone,
    });
    await page.route('**/*', (route) =>
      new URL(route.request().url()).pathname.includes('/private/') ? route.abort() : route.continue(),
    );
    await page.addInitScript(() =>
      globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false, voiceOn: false })),
    );
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await waitForGame(page, 180000, () => page.goto(`${base}/index.html?place=shotengai&q=${quality}`), 'play');
    await page.locator('#boot').waitFor({ state: 'hidden', timeout: 180000 });
    const normals = await page.evaluate(async () => {
      const { sim, setPeriod } = await import('./js/sim.js');
      const { flags } = await import('./js/narrative/state.js');
      const { toLocal } = await import('./js/scenes/island-layout.js');
      const { stationModel } = await import('./js/scenes/station-model.js');
      const g = globalThis.__game;
      sim.day = flags.day = 3;
      sim.date = 'Sat 3 Oct';
      setPeriod('morning', g);
      g.place.onPeriod('morning');
      const p = toLocal('shotengai', -4.25, 24.5);
      g.player.root.position.set(p[0], 0, p[1]);
      g.walker.sync();
      g.place.cam.snap(g.player.root.position);
      return Object.entries(stationModel()).map(([name, geometry]) => {
        const normal = geometry.attributes.normal;
        if (!normal) return { name, invalid: geometry.attributes.position.count };
        let invalid = 0;
        for (let i = 0; i < normal.count; i++) {
          const length = Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i));
          if (!Number.isFinite(length) || Math.abs(length - 1) > 1e-5) invalid++;
        }
        return { name, invalid };
      });
    });
    assert.ok(normals.length > 10, 'loaded full station model');
    assert.deepEqual(
      normals.filter((node) => node.invalid),
      [],
      'every station shadow receiver has unit normals',
    );
    const routes = [
      ['square', -14.45, 24],
      ['canopy', -14.45, 17.6],
      ['glass', -14.45, 11.8],
      ['turn', -14.45, 16.2],
      ['stairs', -26.5, 16.2],
      ['back', -14.45, 16.2],
      ['return', -4.25, 24.5],
    ];
    for (const [name, x, z] of routes) {
      const reached = await page.evaluate(
        async ([x, z]) => {
          const { toLocal } = await import('./js/scenes/island-layout.js');
          const g = globalThis.__game,
            target = toLocal('shotengai', x, z);
          await g.walkTo(...target);
          return Math.hypot(g.player.root.position.x - target[0], g.player.root.position.z - target[1]);
        },
        [x, z],
      );
      if (name === 'glass')
        await page.waitForFunction(() => !globalThis.__game.place.scene.getObjectByName('station:st_metal').visible);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${out}${width}-q${quality}-${name}.png` });
      if (reached >= 0.3)
        console.log(
          await page.evaluate(async () => {
            const g = globalThis.__game;
            const { bodies } = await import('./js/movement/shared.js');
            return {
              pos: g.player.root.position.toArray(),
              path: g.walker.path,
              others: bodies(g).map((o) => ({ x: o.x, z: o.z, r: o.r, name: o.root?.name })),
              busy: g.busy,
            };
          }),
        );
      assert.ok(reached < 0.3, `${name} reachable: ${reached}`);
    }
    assert.deepEqual(errors, []);
    console.log(
      `PASS station ${width} q${quality}: ${normals.length} normal fields, shopping street / square / glass / stairs / return`,
    );
    await page.close();
  },
  { timeoutMs: 300000, ...gpuWaitOptions(900) },
);
