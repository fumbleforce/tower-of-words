import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const out = process.env.OUT || 'game3d/shots/flock-spacing/current';
const base = new URL((process.env.BASE || 'game3d') + '/', 'http://127.0.0.1:8771/').href;
const report = { base, sources: {}, views: [] };
for (const file of ['birds.js', 'motion.js', 'ground-spacing.js']) {
  const url = base + 'js/creatures/' + file,
    r = await fetch(url);
  if (r.ok)
    report.sources[file] = crypto
      .createHash('sha256')
      .update(await r.text())
      .digest('hex');
}
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('flock-spacing', async (browser) => {
  for (const width of [1366, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 860 },
      serviceWorkers: 'block',
    });
    const errors = [];
    let closing = false;
    await context.route(
      '**/*',
      scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (m) => errors.push(m) }),
    );
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({ privateMode: false, voiceOn: false, textSpeed: 'instant' }),
      );
      globalThis.localStorage.setItem(
        'amakawa-onboard',
        JSON.stringify({ moved: true, talked: true, uses: 5, sayUsed: true }),
      );
    });
    try {
      await waitForGame(page, 60000, () => page.goto(base + 'index.html?day=6&place=works&q=1'), 'play');
      await page.waitForFunction(() => !globalThis.__game.busy && globalThis.__game.place.creatures);
      await page.evaluate(() => {
        const g = globalThis.__game,
          api = g.place.creatures;
        let seed = 338;
        const random = Math.random;
        Math.random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
        api.reset();
        Math.random = random;
        const result = (globalThis.flockCheck = {
          samples: 0,
          overlaps: 0,
          walks: 0,
          minimum: Infinity,
          groundMax: 0,
          scatter: false,
          returned: false,
        });
        const original = g.place.update;
        g.place.update = function (dt, t) {
          original.call(this, dt, t);
          const birds = api.groups
            .filter((x) => ['pigeon', 'sparrow'].includes(x.def.kind))
            .flatMap((x) => x.birds.map((b) => ({ b, scale: x.meshes.scale, kind: x.def.kind })));
          const ground = birds.filter(({ b }) => b.mode === 'rest' && b.on?.kind === 'ground');
          result.samples++;
          result.groundMax = Math.max(result.groundMax, ground.length);
          result.walks += ground.filter(({ b }) => ['walk', 'hop'].includes(b.act?.type)).length;
          for (let i = 0; i < ground.length; i++)
            for (let j = 0; j < i; j++) {
              const a = ground[i],
                b = ground[j];
              const clearance = (v) => (v.kind === 'pigeon' ? 0.3 : 0.17) * 1.2 * v.scale * v.b.size;
              const gap = Math.hypot(a.b.p.x - b.b.p.x, a.b.p.z - b.b.p.z) - clearance(a) - clearance(b);
              result.minimum = Math.min(result.minimum, gap);
              if (gap < -1e-5) result.overlaps++;
            }
          const pigeons = birds.filter((x) => x.kind === 'pigeon');
          if (result.approached && pigeons.some(({ b }) => b.mode === 'fly')) result.scatter = true;
          if (result.scatter && pigeons.every(({ b }) => b.mode !== 'rest' || b.on?.kind !== 'ground'))
            result.departed = true;
          if (
            result.departed &&
            result.retreat &&
            pigeons.filter(({ b }) => b.mode === 'rest' && b.on?.kind === 'ground').length >= 3
          )
            result.returned = true;
        };
      });
      await page.waitForTimeout(1800);
      await page.screenshot({ path: `${out}/${width}-native-initial.png` });
      await page.waitForTimeout(7000);
      await page.screenshot({ path: `${out}/${width}-native-feeding.png` });
      const framed = await page.evaluate(() => {
        const g = globalThis.__game,
          group = g.place.creatures.groups.find(
            (x) => x.def.kind === 'pigeon' && x.birds.some((b) => b.mode === 'rest'),
          );
        if (!group) return false;
        globalThis.flockCheck.wasBusy = g.busy;
        g.busy = true;
        g.place.cam.closeOn(
          [group.home.x, group.home.z],
          g.place.cam.fitDist / (globalThis.innerWidth < 600 ? 16 : 8),
          0.35,
        );
        g.place.cam.snap(g.player.root.position);
        return true;
      });
      if (framed) {
        await page.waitForTimeout(700);
        await page.screenshot({ path: `${out}/${width}-diagnostic-flock.png` });
      }
      await page.evaluate(() => {
        const g = globalThis.__game,
          group = g.place.creatures.groups.find((x) => x.def.kind === 'pigeon');
        g.busy = globalThis.flockCheck.wasBusy ?? false;
        globalThis.flockCheck.playerStart = g.player.root.position.toArray();
        g.player.root.position.copy(group.home);
        g.walker.sync();
        globalThis.flockCheck.approached = true;
        g.place.cam.release();
        g.place.cam.snap(g.player.root.position);
      });
      await page.waitForTimeout(1600);
      await page.screenshot({ path: `${out}/${width}-staged-approach.png` });
      await page.evaluate(() => {
        const g = globalThis.__game;
        g.player.root.position.fromArray(globalThis.flockCheck.playerStart);
        g.walker.sync();
        g.place.cam.snap(g.player.root.position);
        globalThis.flockCheck.retreat = true;
      });
      await page.waitForFunction(() => globalThis.flockCheck.returned, null, { timeout: 35000 });
      await page.screenshot({ path: `${out}/${width}-native-return.png` });
      const result = await page.evaluate(() => ({
        width: globalThis.innerWidth,
        ...globalThis.flockCheck,
        info: globalThis.__game.place.creatures.info(),
      }));
      report.views.push(result);
      assert(result.samples > 100 && result.groundMax >= 3 && result.walks > 0 && result.scatter && result.returned);
      if (process.env.EXPECT_CLEAR === '1') assert.equal(result.overlaps, 0, `ground overlap at ${width}`);
      assert.deepEqual(errors, []);
      console.log(
        JSON.stringify({
          width,
          samples: result.samples,
          overlaps: result.overlaps,
          minimum: result.minimum,
          scatter: result.scatter,
          returned: result.returned,
        }),
      );
    } finally {
      fs.writeFileSync(out + '/report.json', JSON.stringify(report, null, 2));
      closing = true;
      await context.close();
    }
  }
});
