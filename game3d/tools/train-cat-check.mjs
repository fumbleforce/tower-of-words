import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
const base = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}`;
const output = new URL(`../shots/train-cat/${Date.now()}/`, import.meta.url);
fs.mkdirSync(output, { recursive: true });
const rows = [];
await withBrowserJob(
  'train-cat-landing',
  async (browser) => {
    for (const [width, height, mc] of [
      [1366, 860, 'eric'],
      [390, 844, 'carina'],
    ]) {
      let closing = false;
      const blocked = [];
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage(),
        errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await context.route(
        '**/*',
        scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (s) => blocked.push(s) }),
      );
      await page.addInitScript(() =>
        globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false, voiceOn: false })),
      );
      try {
        await page.goto(`${base}/index.html?day=3&place=train&q=0&mc=${mc}`);
        await page.waitForFunction(() => globalThis.__game?.place?.name === 'train' && !globalThis.__game.busy, null, {
          timeout: 45000,
        });
        await page.evaluate(async () => {
          const g = globalThis.__game;
          const cat = g.place.people.tama;
          // Reproduce the reported petting corridor at its adjacent navigation-grid point.
          g.walker.stop();
          g.player.root.position.set(-0.85, 0, -0.15);
          g.walker.sync();
          cat.root.visible = true;
          cat.root.position.set(-0.85, 0.55, -0.98);
          cat.set('wash', { now: true });
          await g.place.hooks.doorsOpen();
          globalThis.__catNear = { distance: 99 };
          const update = g.place.update;
          g.place.update = function (...args) {
            update.apply(this, args);
            if (cat.root.position.y > 0.05) return;
            const a = g.player.root.position,
              b = cat.root.position,
              d = Math.hypot(a.x - b.x, a.z - b.z);
            if (d < globalThis.__catNear.distance)
              globalThis.__catNear = { distance: d, player: a.toArray(), cat: b.toArray() };
          };
          const { startMoveCheck } = await import('./js/movement/checks.js');
          startMoveCheck(g);
          globalThis.__catDone = false;
          g.beat(async () => {
            await g.place.hooks.catTo({ to: [-3, 2.9] });
            globalThis.__catDone = true;
          });
        });
        await page.waitForFunction(() => globalThis.__catDone, null, { timeout: 45000 });
        const row = await page.evaluate(() => ({
          nearest: globalThis.__catNear,
          overlaps: globalThis.__moveCheck.overlaps,
          spins: globalThis.__moveCheck.spins,
          end: globalThis.__game.place.people.tama.root.position.toArray(),
        }));
        rows.push({ width, mc, ...row });
        fs.writeFileSync(new URL('result.json', output), JSON.stringify(rows, null, 2));
        const catHits = row.overlaps.filter((s) => s.includes('and tama'));
        if (process.env.EXPECT_OVERLAP)
          assert.ok(
            row.nearest.distance < 0.42,
            'baseline hop intrudes into the actor radii even if avoidance escapes before a sustained warning',
          );
        else {
          assert.deepEqual(catHits, []);
          assert.ok(row.nearest.distance >= 0.42, 'floor motion preserves combined player/cat body clearance');
          assert.ok(Math.hypot(row.end[0] + 3, row.end[2] - 2.9) < 0.4, 'cat reaches the existing exit destination');
        }
        assert.deepEqual(errors, []);
        assert.deepEqual(blocked, []);
        await page.screenshot({ path: new URL(`${width}-${mc}.png`, output).pathname });
      } finally {
        closing = true;
        await context.close();
      }
    }
  },
  { timeoutMs: 150000 },
);
console.log('PASS train cat hook', JSON.stringify(rows));
console.log('artifacts:', output.pathname);
