// Native map controls, direct lift landings and Continue for the discovered B2 stop.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../lib/browser-job.mjs';
const phone = process.argv.includes('--phone');
const viewport = phone ? { width: 390, height: 844 } : { width: 1366, height: 860 };
const base = `http://127.0.0.1:${process.env.PORT || 8771}`;
const shots = new URL('../../game3d/shots/codex-b2-travel/', import.meta.url);
fs.mkdirSync(shots, { recursive: true });
await withBrowserJob('b2-map', async browser => {
  for (const day of [2, 3, 4, 5]) {
    const mc = phone ? 'carina' : 'eric';
    const context = await browser.newContext({ viewport, hasTouch: phone, isMobile: phone });
    await context.addInitScript(() => {
      localStorage.setItem('amakawa-settings', JSON.stringify({ voiceOn: false, textSpeed: 'instant', reduceMotion: true }));
      setInterval(() => {
        const g = window.__game;
        if (g) { g.setHurry(true); g.ui.auto = true; g.ui._advance?.(); }
      }, 30);
      const write = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key === 'amakawa-day1-save') {
          const data = JSON.parse(value);
          if (data.transition?.fast && data.transition.to === 'office') window.__fastSave ||= data;
        }
        return write.call(this, key, value);
      };
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const settled = name => page.waitForFunction(name => {
      const g = window.__game;
      return g?.place?.name === name && !g.busy && !g.transition && !g.pendingStart &&
        !g.player.scripted && document.querySelector('#talk')?.hidden &&
        (!document.querySelector('#boot') || +getComputedStyle(document.querySelector('#boot')).opacity === 0);
    }, name, { timeout: 40000 });
    const state = () => page.evaluate(async () => {
      const g = window.__game, { sim } = await import('/game3d/js/sim.js');
      return { place: g.place.name, day: sim.day, period: sim.period, yen: sim.yen,
        pos: g.player.root.position.toArray(), free: g.place.nav.free(g.player.root.position.x, g.player.root.position.z),
        trace: g.runner.trace || [], ride: !!window.__lift?.ride?.on, replay: window.__liftReplays || 0 };
    });
    const travel = async destination => {
      await page.locator('#minimap').click();
      if (phone) {
        await page.locator(`#mapView .mv-pins [data-pick="forecourt"] .dot`).click();
        if (destination === 'office') await page.locator('#mapView .mv-inside [data-pick="office"]').click();
      } else await page.locator(`#mapView .mv-list [data-pick="${destination}"]`).click();
      await page.locator('#mapView .mv-go').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#mapView .mv-go').isEnabled(), true, `${day}/${mc}: ${destination} enabled`);
      if (day === 3 && destination === 'office') await page.screenshot({ path: new URL(`${viewport.width}-b2-map.png`, shots).pathname });
      await page.locator('#mapView .mv-go').click();
      await settled(destination);
    };
    try {
      await page.goto(`${base}/game3d/index.html?day=${day}&place=plaza&mc=${mc}&q=0`);
      await settled('plaza');
      await page.evaluate(async () => {
        const g = window.__game;
        for (const name of ['office', 'forecourt']) {
          const { place } = await g.prepare(name);
          if (name === 'office') {
            const original = place.tripIn;
            place.tripIn = function(...args) { window.__liftReplays = (window.__liftReplays || 0) + 1; return original.apply(this, args); };
          } else {
            const original = place.tripInFrom.office;
            place.tripInFrom.office = function(...args) { window.__liftReplays = (window.__liftReplays || 0) + 1; return original.apply(this, args); };
          }
        }
      });
      const before = await state();
      await travel('office');
      const arrived = await state();
      assert.equal(arrived.period, before.period); assert.equal(arrived.yen, before.yen);
      assert.equal(arrived.free, true); assert.equal(arrived.ride, false); assert.equal(arrived.replay, 0);
      assert.ok(Math.abs(arrived.pos[0] + 5.45) < .02 && Math.abs(arrived.pos[2] + 2.4) < .02);
      if (day === 3) {
        await page.screenshot({ path: new URL(`${viewport.width}-b2-arrival.png`, shots).pathname });
        // Replay the real transition autosave through title Continue, then continue a settled save too.
        for (const transition of [true, false]) {
          const saved = await page.evaluate(async transition => {
            const g = window.__game, S = await import('/game3d/js/sim.js');
            S.save(g);
            const data = transition ? window.__fastSave : S.loadSave();
            if (!data) throw Error('No real fast-trip autosave');
            localStorage.setItem('amakawa-day1-save', JSON.stringify(data));
            return data;
          }, transition);
          if (transition) assert.equal(saved.transition.fast, true);
          await page.goto(`${base}/game3d/index.html?mc=${mc}&q=0`);
          await page.locator('#title .mcont').click();
          await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
          await settled('office');
          const resumed = await state();
          assert.equal(resumed.free, true); assert.equal(resumed.period, before.period); assert.equal(resumed.yen, before.yen);
          assert.equal(resumed.ride, false);
          assert.ok(!resumed.trace.some(n => /lift|descend/.test(n)), JSON.stringify(resumed.trace));
        }
      }
      await travel('forecourt');
      const returned = await state();
      assert.equal(returned.free, true); assert.equal(returned.ride, false); assert.equal(returned.replay, 0);
      assert.equal(returned.period, before.period); assert.equal(returned.yen, before.yen);
      assert.deepEqual(errors, []);
      console.log(`PASS B2 native map day${day} ${mc} ${viewport.width}: direct entry/return${day === 3 ? ', transition and settled Continue' : ''}`);
    } catch (error) {
      console.error('B2 failure', await state().catch(() => null), errors);
      await page.screenshot({ path: new URL(`${viewport.width}-failure.png`, shots).pathname });
      throw error;
    } finally { await context.close(); }
  }
}, { timeoutMs: 285000 });
