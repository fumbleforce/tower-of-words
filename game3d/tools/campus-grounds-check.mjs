import assert from 'node:assert/strict';
import fs from 'node:fs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';

const width = +(process.argv[2] || 1366),
  phone = width < 600;
const serviceOnly = process.env.SERVICE === '1';
const gardenOnly = process.env.GARDEN === '1';
const base = process.env.BASE || '.claude/worktrees/codex-north-grounds/game3d';
const out = new URL(`../shots/north-grounds/${process.env.OUT || 'round1'}/`, import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  `campus-grounds-${width}`,
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
      scopedRoute({
        publicOnly: true,
        isClosing: () => closing,
        onFailure: (e) => errors.push(e),
      }),
    );
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() =>
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({
          privateMode: false,
          voiceOn: false,
          textSpeed: 'instant',
        }),
      ),
    );
    async function shot(id) {
      await page.waitForTimeout(900);
      const state = await page.evaluate(async () => {
        const g = globalThis.__game,
          info = g.renderer.info,
          gl = g.renderer.getContext();
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const calls = [],
          triangles = [];
        info.autoReset = false;
        try {
          for (let i = 0; i < 20; i++) {
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
          position: g.player.root.position.toArray(),
          period: g.sim.period,
          calls: median(calls),
          triangles: median(triangles),
          renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        };
      });
      views.push({ id, ...state });
      await page.screenshot({ path: `${out}${width}-${id}.png` });
      console.log(id, JSON.stringify(state));
    }
    async function walk(point) {
      await page.evaluate(async (p) => {
        const g = globalThis.__game;
        await g.walkTo(...p);
      }, point);
      const state = await page.evaluate((p) => {
        const g = globalThis.__game;
        return {
          place: g.place.name,
          distance: Math.hypot(g.player.root.position.x - p[0], g.player.root.position.z - p[1]),
        };
      }, point);
      assert.equal(state.place, 'campus');
      assert.ok(state.distance < 0.25, JSON.stringify(state));
    }
    try {
      await waitForGame(
        page,
        60000,
        () =>
          page.goto(`http://127.0.0.1:8771/${base}/index.html?day=3&place=campus&mc=${phone ? 'carina' : 'eric'}&q=0`),
        'play',
      );
      await page.evaluate(async () => {
        const { startMoveCheck } = await import('./js/movement/checks.js');
        startMoveCheck(globalThis.__game);
      });
      const points = await page.evaluate(async () => {
        const p = await import('./js/scenes/campus/plan.js');
        return {
          rest: p.BENCH.out,
          coast: p.pt([-41.6, -33.8]),
          coastEdge: p.pt([-42.15, -32.8]),
          print: p.PRINT_STEP,
          service: p.pt([-23.9, -41.35]),
          rear: p.pt([3.8, -19.3]),
        };
      });
      for (const id of serviceOnly
        ? ['print', 'service']
        : gardenOnly
          ? ['coast', 'coastEdge', 'rest']
          : ['coast', 'rest', 'print', 'rear']) {
        await walk(points[id]);
        await shot(id);
      }
      await walk(serviceOnly ? points.service : gardenOnly ? points.rest : points.print);
      await page.evaluate(async () => {
        await globalThis.__game.hooks.period({ to: 'evening' });
      });
      await shot(serviceOnly ? 'service-evening' : gardenOnly ? 'rest-evening' : 'print-evening');
      await walk(serviceOnly ? points.service : points.rest);
      if (!serviceOnly && !gardenOnly) await shot('rest-evening');
      await page.evaluate(async () => {
        await globalThis.__game.hooks.period({ to: 'morning' });
      });
      await shot(serviceOnly ? 'service-morning-restored' : 'rest-morning-restored');
      await page.keyboard.press('m');
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${out}${width}-map.png` });
      await page.keyboard.press('Escape');
      const motion = await page.evaluate(() => ({
        overlaps: globalThis.__moveCheck.overlaps,
        spins: globalThis.__moveCheck.spins,
        gait: globalThis.__gaitCheck.episodes,
      }));
      assert.deepEqual(motion.overlaps, []);
      assert.deepEqual(motion.spins, []);
      assert.deepEqual(motion.gait, []);
      assert.deepEqual(errors, []);
      fs.writeFileSync(`${out}${width}-report.json`, JSON.stringify({ base, views, motion, errors }, null, 2));
      console.log('PASS', width);
    } catch (e) {
      await page.screenshot({ path: `${out}${width}-failure.png` });
      throw e;
    } finally {
      closing = true;
      await context.close();
    }
  },
  { timeoutMs: 280000 },
);
