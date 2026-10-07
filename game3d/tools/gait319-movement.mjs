// Public native B2 movement and lift continuity; every attempt gets a separate output directory.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366),
  phone = width < 600,
  height = phone ? 844 : 860;
const mc = process.env.MC || (phone ? 'carina' : 'eric'),
  base = process.env.BASE || 'game3d';
const out = `game3d/shots/gait319/${process.env.TAG || `movement-${mc}-${width}-${Date.now()}`}`;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  `gait319-movement-${width}`,
  async (browser) => {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: phone, hasTouch: phone });
    const page = await context.newPage(),
      errors = [],
      checks = [];
    let closing = false;
    await context.route(
      '**/*',
      scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (e) => errors.push(e) }),
    );
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() =>
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({ privateMode: false, voiceOn: false, textSpeed: 'instant' }),
      ),
    );
    const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
    const report = async () => {
      const state = await page.evaluate(() => ({
        motion: globalThis.__moveCheck,
        gait: globalThis.__gaitCheck,
        legs: globalThis.__gait319Legs,
        samples: globalThis.__gait319Steps,
        place: globalThis.__game?.place?.name,
      }));
      fs.writeFileSync(`${out}/report.json`, JSON.stringify({ mc, width, checks, errors, ...state }, null, 2));
      return state;
    };
    async function lift(to) {
      await page.evaluate(async () => {
        const g = globalThis.__game;
        await g.walkTo(...g.place.things.lift.spot());
      });
      await page.waitForTimeout(350);
      if (await page.evaluate((to) => globalThis.__game.place.name !== to && !globalThis.__game.busy, to)) {
        // Invoke the authored transition after native walking. This tests movement, not marker hit testing.
        await page.evaluate(() => {
          const g = globalThis.__game;
          g.runner.trigger(g.place.name === 'forecourt' ? 'talk:office_entrance' : 'talk:lift');
        });
      }
      await page.waitForFunction((to) => globalThis.__game.place.name === to && !globalThis.__game.busy, to, {
        timeout: 45000,
      });
      checks.push(`lift to ${to}`);
      await shot(`lift-${to}`);
    }
    try {
      await waitForGame(
        page,
        60000,
        () => page.goto(`http://127.0.0.1:8771/${base}/index.html?day=3&place=office&mc=${mc}&q=0`),
        'play',
      );
      await page.waitForTimeout(500);
      await page.evaluate(async () => {
        const { startMoveCheck } = await import('./js/movement/checks.js');
        const T = await import('three');
        const g = globalThis.__game;
        startMoveCheck(g);
        globalThis.__gait319Legs = [];
        globalThis.__gait319Steps = [];
        const feet = [];
        g.player.model.traverse((o) => {
          if (o.isBone && /(left|right).*foot$/i.test(o.name.replace(/[^a-z]/gi, ''))) feet.push(o);
        });
        const C = globalThis.__gaitCheck,
          sample = C.sample;
        C.sample = function (clock) {
          sample(clock);
          if (clock !== 'drawn')
            globalThis.__gait319Steps.push({
              t: g.t,
              place: g.place.name,
              at: g.player.root.position.toArray(),
              parent: g.player.root.parent.uuid,
              walk: !!g.player._walk,
              scripted: !!g.player.scripted,
              run: g.walker.gait.run,
              v: g.walker.gait.v,
              state: g.player.state,
              feet: feet.map((f) => g.player.root.worldToLocal(f.getWorldPosition(new T.Vector3())).toArray()),
            });
        };
      });
      for (const [i, spot] of ['corridor_e', 'corridor_w', 'corridor_e', 'corridor_w'].entries()) {
        await page.evaluate(
          ({ i, spot }) => {
            const g = globalThis.__game,
              start = g.t;
            globalThis.__gait319Moving = true;
            g.walker.goTo(...g.place.spots[spot], () => {
              globalThis.__gait319Legs.push({
                spot,
                run: !!(i % 2),
                seconds: g.t - start,
                at: g.player.root.position.toArray(),
              });
              globalThis.__gait319Moving = false;
            });
            g.walker.runTo = !!(i % 2);
          },
          { i, spot },
        );
        await page.waitForFunction(() => globalThis.__game.walker.gait.v > 0.35, null, { timeout: 10000 });
        await shot(`leg-${i}-a`);
        await page.waitForTimeout(180);
        await shot(`leg-${i}-b`);
        await page.waitForFunction(() => !globalThis.__gait319Moving, null, { timeout: 30000 });
        await page.waitForTimeout(500);
      }
      await lift('forecourt');
      await lift('office');
      const result = await report();
      assert.equal(result.legs.length, 4);
      assert.ok(
        result.legs.every((l) => l.seconds > 1.5),
        'each walk/run is sustained',
      );
      assert.deepEqual(result.motion.overlaps, []);
      assert.deepEqual(result.motion.spins, []);
      assert.deepEqual(
        result.gait.episodes.filter((e) => e.line.includes(': eric ')),
        [],
      );
      assert.deepEqual(errors, []);
      console.log('PASS', out, result.legs, result.gait.episodes);
    } catch (e) {
      await report();
      await shot('failure');
      throw e;
    } finally {
      closing = true;
      await context.close();
    }
  },
  { timeoutMs: 250000 },
);
