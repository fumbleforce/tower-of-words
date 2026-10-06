import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { openGame } from '../test/support/open-game.mjs';
import { FINDS } from '../story/days3-5-finds.js';
const width = +(process.env.WIDTH || 390),
  height = +(process.env.HEIGHT || 844),
  mc = process.env.MC || 'eric';
const chosen = process.argv.slice(2),
  list = chosen.length ? FINDS.filter((f) => chosen.includes(f.id)) : FINDS;
const out = new URL('../shots/flavor-finds/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  'flavor-finds',
  async (browser) => {
    for (const f of list) {
      const day = process.env.DAY_CAP ? Math.min(f.from, +process.env.DAY_CAP) : f.from,
        period = f.id === 'pool_key_tag' ? 'evening' : 'morning';
      const seed = {
        v: 1,
        day,
        period,
        place: f.place,
        mc,
        known: [],
        seen: [],
        found: [],
        met: [],
        taught: {},
        inv: [],
        yen: 1234,
        bonds: {},
        flags: { day, period, place: f.place, met_emi: true, d4_started: true },
        runner: { onceDone: [] },
      };
      const open = await openGame(browser, {
        mode: 'title',
        viewport: { width, height },
        url: `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html?q=0`,
        beforeNavigate: async (page) => {
          await page.addInitScript((seed) => {
            localStorage.setItem('amakawa-day1-save', JSON.stringify(seed));
            localStorage.setItem(
              'amakawa-settings',
              JSON.stringify({ textSpeed: 'instant', voiceOn: false, privateMode: false }),
            );
          }, seed);
        },
      });
      const page = open.page;
      await page.locator('#title .mcont').click();
      await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
      await page.waitForFunction((place) => window.__game?.place?.name === place && !window.__game.busy, f.place, {
        timeout: 45000,
      });
      await page.evaluate(async (f) => {
        const g = window.__game;
        g.sim.day = f.from;
        g.flagsRef.day = f.from;
        if (f.id === 'pool_key_tag') {
          g.flagsRef.club_swimming = true;
          const { clubs } = await import(new URL('js/clubs/index.js', location.href));
          clubs.attend('swimming', 3);
        }
        g.sim.day = f.from - 1;
        g.flagsRef.day = g.sim.day;
        g.place.onPeriod(g.sim.period);
        if (g.place.things['flavor_' + f.id] || g.story.nodes[f.node])
          throw Error('Find available before its first day');
        g.sim.day = f.from;
        g.flagsRef.day = f.from;
        g.place.onPeriod(g.sim.period);
        if (f.until) {
          g.sim.day = f.until + 1;
          g.flagsRef.day = g.sim.day;
          g.place.onPeriod(g.sim.period);
          if (g.place.things['flavor_' + f.id]) throw Error('Find outlived its final day');
          g.sim.day = f.from;
          g.flagsRef.day = f.from;
        }
        if (f.id === 'pool_key_tag') {
          g.flagsRef.club_swimming = false;
          g.place.onPeriod(g.sim.period);
          if (g.place.things['flavor_' + f.id]) throw Error('Nonmember pool find');
          g.flagsRef.club_swimming = true;
          g.sim.period = 'morning';
          g.flagsRef.period = 'morning';
          g.place.onPeriod('morning');
          if (g.place.things['flavor_' + f.id]) throw Error('Morning pool find');
          g.sim.period = 'evening';
          g.flagsRef.period = 'evening';
        }
        g.place.onPeriod(g.sim.period);
        g.setHurry(true);
        window.__flavorDone = false;
        g.use({ id: 'flavor_' + f.id, ...g.place.things['flavor_' + f.id] });
      }, f);
      try {
        await page.waitForFunction(() => document.querySelector('#talk.flavor-written:not([hidden])'), null, {
          timeout: 45000,
        });
      } catch (error) {
        console.error(
          await page.evaluate((id) => {
            const g = window.__game,
              p = g.place.flavorFinds.props.get(id);
            return {
              place: g.place.name,
              busy: g.busy,
              player: g.player.root.position.toArray(),
              prop: p.at,
              stand: p.stand,
              enabled: g.place.things['flavor_' + id].enabled(),
              talk: document.querySelector('#talk').innerText,
            };
          }, f.id),
        );
        await page.screenshot({ path: out + '/' + width + '-' + mc + '-' + f.id + '-failure.png' });
        throw error;
      }
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${out}/${width}-${mc}-${f.id}.png` });
      const saved = await page.evaluate(async () => {
        const g = window.__game,
          { save, loadSave } = await import(new URL('js/sim.js', location.href));
        save(g);
        return loadSave();
      });
      assert.equal(saved.runner.execution, null, f.id + ' must restart an interrupted look');
      assert.equal(saved.flags['flavor_' + f.id + '_seen'], undefined);
      assert.equal(saved.yen, 1234);
      assert.deepEqual(saved.inv, []);
      assert.deepEqual(saved.found, []);
      await page.evaluate(async () => {
        const { ui } = await import(new URL('js/ui.js', location.href));
        ui.auto = true;
        ui._advance?.();
      });
      await page.waitForFunction(
        (id) => window.__game.flagsRef['flavor_' + id + '_seen'] && !window.__game.busy,
        f.id,
        { timeout: 15000 },
      );
      const final = await page.evaluate(async (f) => {
        const g = window.__game,
          before = JSON.stringify(g.flagsRef);
        await g.runner.run(f.node);
        const p = g.place.flavorFinds.props.get(f.id);
        if (p.axis) {
          const [field, component] = p.axis.split('.');
          const expected = f.id === 'book_return' ? 0 : p.initial;
          if (Math.abs(p.moving[field][component] - expected) > 1e-6) throw Error('Object was not returned');
        }
        return {
          enabled: g.place.things['flavor_' + f.id].enabled(),
          unchanged: before === JSON.stringify(g.flagsRef),
          yen: g.sim.yen,
          period: g.sim.period,
        };
      }, f);
      assert.equal(final.enabled, false);
      assert.equal(final.unchanged, true);
      assert.equal(final.yen, 1234);
      assert.equal(final.period, period);
      await page.evaluate(async () => {
        const g = window.__game;
        g.setHurry(true);
        await g.walkTo(...g.place.start);
      });
      if (process.env.RELOAD === '1') {
        // A new public context uses the captured real save.
        await open.close();
        const resumed = await openGame(browser, {
          mode: 'title',
          viewport: { width, height },
          url: `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html?q=0`,
          beforeNavigate: async (p) => {
            await p.addInitScript((saved) => {
              localStorage.setItem('amakawa-day1-save', JSON.stringify(saved));
              localStorage.setItem(
                'amakawa-settings',
                JSON.stringify({ textSpeed: 'instant', voiceOn: false, privateMode: false }),
              );
            }, saved);
          },
        });
        await resumed.page.locator('#title .mcont').click();
        await resumed.page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
        await resumed.waitForSettled();
        assert.equal(
          await resumed.page.evaluate((id) => !!window.__game.place.things['flavor_' + id]?.enabled(), f.id),
          true,
        );
        assert.equal(
          await resumed.page.evaluate((id) => {
            const p = window.__game.place.flavorFinds.props.get(id);
            if (!p.axis) return true;
            const [field, component] = p.axis.split('.');
            return p.moving[field][component] === p.initial;
          }, f.id),
          true,
          'restored object must be untouched',
        );
        assert.deepEqual(resumed.errors, []);
        await resumed.close();
      } else {
        assert.deepEqual(open.errors, []);
        await open.close();
      }
      console.log(`PASS ${f.id} ${width} ${mc}`);
    }
  },
  { timeoutMs: 280000 },
);
