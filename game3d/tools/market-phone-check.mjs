// Real phone floor taps must keep going south after the plaza/market seam.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
const base = process.env.BASE || 'game3d';
const out = process.argv[2] || '/tmp/market-phone';
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  'market-phone-taps',
  async (browser) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage(),
      errors = [],
      steps = [];
    await context.route('**/*', scopedRoute({ publicOnly: true, onFailure: (m) => errors.push(m) }));
    await page.route('**/api/plugins', (route) => route.fulfill({ json: [] }));
    await page.addInitScript(() =>
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({ v: 99, privateMode: false, cameraMode: 'overview', voiceOn: false, textSpeed: 'instant' }),
      ),
    );
    page.on('pageerror', (e) => errors.push(e.message));
    const state = () =>
      page.evaluate(async () => {
        const g = globalThis.__game,
          p = g.player.root.position;
        const L = await import('./js/scenes/island-layout.js');
        return {
          place: g.place.name,
          island: L.toIsland(g.place.name, p.x, p.z),
          local: p.toArray(),
          busy: g.busy,
          moving: g.walker.moving,
          pick: g.lastPick,
        };
      });
    const settle = async () => {
      await page.waitForFunction(() => !globalThis.__game.busy && !globalThis.__game.walker.moving, null, {
        timeout: 30000,
      });
      await page.waitForTimeout(700);
    };
    const tap = async (x, y, name) => {
      await page.touchscreen.tap(x, y);
      await page.waitForTimeout(300);
      await settle();
      const s = await state();
      steps.push({ name, tap: [x, y], ...s });
      await page.screenshot({ path: `${out}/${name}.png` });
      return s;
    };
    const projected = (x, z) =>
      page.evaluate(
        async ([x, z]) => {
          const g = globalThis.__game;
          const L = await import('./js/scenes/island-layout.js');
          const { Vector3 } = await import('three');
          const [u, v] = L.toLocal(g.place.name, x, z);
          const p = new Vector3(u, 0, v);
          g.place.space?.localToWorld(p);
          p.project(g.place.camera);
          return [(p.x + 1) * 195, (1 - p.y) * 422];
        },
        [x, z],
      );
    try {
      await page.goto(`http://127.0.0.1:8771/${base}/index.html?day=2&place=plaza&q=0`);
      await page.waitForFunction(
        () =>
          globalThis.__game?.place?.name === 'plaza' &&
          !globalThis.__game.busy &&
          !globalThis.document.querySelector('#boot:not(.gone)'),
        null,
        { timeout: 120000 },
      );
      await settle();
      await page.screenshot({ path: `${out}/start.png` });
      await tap(292, 700, 'plaza-approach-1');
      await tap(338, 672, 'plaza-approach-2');
      // Use the visible south exit arrow through the ordinary touch handler.
      const exit = await page.evaluate(async () => {
        const g = globalThis.__game;
        const { Vector3 } = await import('three');
        const p = g.place.things.shop_walk.anchor(new Vector3()).project(g.place.camera);
        return [(p.x + 1) * 195, (1 - p.y) * 422];
      });
      await tap(...exit, 'market-arrival');
      await page.waitForFunction(() => globalThis.__game.place.name === 'shotengai' && !globalThis.__game.busy, null, {
        timeout: 60000,
      });
      await settle();
      const arrival = await state();
      steps.push({ name: 'arrival-settled', ...arrival });
      await page.screenshot({ path: `${out}/arrival-settled.png` });
      const after1 = await tap(138, 737, 'onward-tap-1');
      const after2 = await tap(122, 741, 'onward-tap-2');
      assert.equal(after1.place, 'shotengai');
      assert.equal(after2.place, 'shotengai');
      assert.ok(after1.island[1] > arrival.island[1] + 0.2, 'first downward tap moves south');
      assert.ok(after2.island[1] > after1.island[1] + 0.2, 'second downward tap keeps moving south');
      // Continue with real floor taps projected onto the visible central path, then return the same way.
      const reach = async (x, z, name) => {
        for (let i = 0; i < 30; i++) {
          const current = await state();
          if (current.place === 'plaza') return current;
          const [cx, cz] = current.island;
          if (Math.hypot(cx - x, cz - z) < 0.4) return current;
          const next = [cx + Math.max(-1.3, Math.min(1.3, x - cx)), cz + Math.max(-2, Math.min(2, z - cz))];
          const pt = await projected(...next);
          assert.ok(pt[0] > 15 && pt[0] < 375 && pt[1] > 170 && pt[1] < 745, `route point ${next} visible: ${pt}`);
          await tap(...pt, `${name}-${i}`);
        }
        throw Error('Taps did not reach ' + name);
      };
      await reach(37.29, 40, 'shore');
      const right = await reach(40.29, 42.6, 'dry-sand-right');
      assert.ok(right.island[0] > 39.7 && right.island[1] > 42.2, 'walks off mat onto right sand');
      const left = await reach(34.29, 42.6, 'dry-sand-left');
      assert.ok(left.island[0] < 34.8 && left.island[1] > 42.2, 'walks off mat onto left sand');
      await reach(37.29, 40, 'mat-return');
      await reach(37.29, 12.7, 'north-return');
      await page.waitForFunction(() => globalThis.__game.place.name === 'plaza' && !globalThis.__game.busy, null, {
        timeout: 60000,
      });
      await page.screenshot({ path: `${out}/plaza-return.png` });
      assert.deepEqual(errors, []);
      console.log('PASS normal phone floor taps continue south across seam, reach beach and return north');
    } finally {
      fs.writeFileSync(`${out}/report.json`, JSON.stringify({ steps, errors }, null, 2));
      await context.close();
    }
  },
  { timeoutMs: 290000, gpuWaitMs: 900000 },
);
