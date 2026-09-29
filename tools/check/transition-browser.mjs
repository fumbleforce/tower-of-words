// Real train/lift continuations outside a Runner scene, plus pending openings and the end card.
import assert from 'node:assert/strict';
import { withBrowserJob } from '../lib/browser-job.mjs';
import { openGame } from '../../game3d/test/support/open-game.mjs';
import fixture from '../../game3d/test/fixtures/save-v1.json' with { type: 'json' };

const names = ['braking', 'lift-leaving', 'lift-arriving', 'pending-start', 'ended'];
const selection = process.argv[2];
if (selection && !names.includes(selection)) throw new Error('Unknown transition scenario: ' + selection);
try {
  await withBrowserJob('transition-saves', async browser => {
    for (const scenario of selection ? [selection] : names) {
      const place = scenario === 'braking' ? 'train' : scenario.startsWith('lift') ? 'gate' : 'office';
      const saved = { ...structuredClone(fixture), place, period: place === 'office' ? 'morning' : 'early',
        flags: { ...fixture.flags, place, sat: true, gateOpen: true, cardOk: true, gate_through: true },
        runner: { onceDone: [], execution: null }, ui: { goal: '', sideGoal: '' } };
      if (scenario === 'pending-start') saved.pendingStart = 'office';
      if (scenario === 'ended') { saved.ended = true; saved.period = 'evening'; }
      const seeded = { async newContext(options) {
        const context = await browser.newContext(options);
        await context.addInitScript(data => {
          if (!sessionStorage.getItem('transition-seeded')) {
            localStorage.setItem('amakawa-day1-save', JSON.stringify(data));
            localStorage.setItem('amakawa-settings', JSON.stringify({ textSpeed: 'instant', voiceOn: false, reduceMotion: true }));
            sessionStorage.setItem('transition-seeded', '1');
          }
          const write = Storage.prototype.setItem;
          Storage.prototype.setItem = function(key, value) {
            if (key === 'amakawa-day1-save') {
              const data = JSON.parse(value);
              if (data.transition?.phase === 'arriving') window.__arrivingSave ||= data;
            }
            return write.call(this, key, value);
          };
        }, saved);
        return context;
      } };
      const opened = await openGame(seeded, { mode: 'title' });
      const { page } = opened;
      const continueSave = async () => {
        await page.locator('#title .mcont').click();
        await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
      };
      const accelerate = async auto => page.evaluate(auto => {
        const g = window.__game;
        g.ui.auto = auto;
        clearInterval(window.__transitionSpeed);
        window.__transitionSpeed = setInterval(() => { g.setHurry(true); if (g.ui.auto) g.ui._advance?.(); }, 30);
      }, auto);
      try {
        await continueSave();
        if (scenario === 'ended') {
          await page.waitForFunction(() => !document.querySelector('#end')?.hidden);
          assert.deepEqual(await page.evaluate(() => window.__game.runner.trace || []), []);
        } else if (scenario === 'pending-start') {
          await page.waitForFunction(() => window.__game.runner.currentNode === 'office_in' && !!window.__game.ui._advance);
          await accelerate(true);
          await page.waitForFunction(() => !window.__game.busy && window.__game.ui.goalText === 'Greet Mr. Mori.');
          assert.equal(await page.evaluate(() => window.__game.hold), 'mori');
        } else {
          await page.waitForFunction(() => window.__game.saveEnabled && !window.__game.busy);
          await accelerate(scenario === 'lift-arriving');
          await page.evaluate(scenario => {
            const g = window.__game;
            if (scenario === 'braking') g.beat(() => g.runner.run('approach'));
            else g.runner.trigger('zone:lift_front');
          }, scenario);
          if (scenario === 'braking') await page.waitForFunction(() => {
            const g = window.__game;
            return !g.busy && g.place._st.mode === 'brake';
          }, null, { timeout: 60000 });
          else if (scenario === 'lift-arriving') await page.waitForFunction(() => !!window.__arrivingSave, null, { timeout: 90000 });
          else await page.waitForFunction(() => window.__game.transition?.phase === 'leaving'
            && !window.__game.runner.frames.length && !!window.__game.ui._advance, null, { timeout: 60000 });
          const captured = await page.evaluate(async scenario => {
            const g = window.__game, S = await import('/game3d/js/sim.js');
            g.paused = true;
            if (scenario === 'lift-arriving') {
              localStorage.setItem('amakawa-day1-save', JSON.stringify(window.__arrivingSave));
            } else if (scenario === 'lift-leaving') S.save(g); // a real manual save during the ride
            return S.loadSave();
          }, scenario);
          if (scenario === 'braking') {
            assert.equal(captured.world.motion.mode, 'brake');
            assert.equal(captured.runner.execution, null);
            assert.equal(captured.flags.arriving, true);
          } else {
            assert.equal(captured.transition.to, 'office');
            assert.equal(captured.transition.phase, scenario === 'lift-arriving' ? 'arriving' : 'leaving');
            assert.ok(captured.runner.onceDone.includes('zone:lift_front>to_lift'));
          }
          await page.reload();
          await page.waitForFunction(() => window.__game?.place && !document.querySelector('#title')?.hidden);
          assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('amakawa-day1-save'))), captured);
          await accelerate(scenario !== 'braking');
          await continueSave();
          if (scenario === 'braking') {
            await page.waitForFunction(() => window.__game.runner.currentNode === 'arrival' && !!window.__game.ui._advance,
              null, { timeout: 60000 });
            const state = await page.evaluate(() => ({ arrived: window.__game.place._st.arrived, trace: window.__game.runner.trace }));
            assert.equal(state.arrived, true);
            assert.equal(state.trace.filter(node => node === 'arrival').length, 1);
            assert.ok(!state.trace.includes('approach'));
          } else {
            await page.waitForFunction(() => window.__game.place.name === 'office' && !window.__game.busy
              && window.__game.ui.goalText === 'Greet Mr. Mori.', null, { timeout: 90000 });
            const result = await page.evaluate(() => JSON.parse(localStorage.getItem('amakawa-day1-save')));
            assert.equal(result.transition, undefined);
            assert.equal(result.pendingStart, null);
            assert.equal(result.runner.execution, null);
            assert.equal(result.period, 'morning');
            assert.equal(result.ui.hold, 'mori');
          }
        }
        assert.deepEqual(opened.errors, []);
        console.log(`PASS transition ${scenario}`);
      } catch (error) {
        console.error('Transition page errors', opened.errors);
        console.error('Transition failure state', scenario, await page.evaluate(() => {
          const g = window.__game;
          if (!g) return { booted: false };
          return { place: g.place?.name, busy: g.busy, paused: g.paused, transition: g.transition,
            goal: g.ui.goalText, auto: g.ui.auto, advance: !!g.ui._advance,
            trace: g.runner.trace, step: g.runner.lastStep, position: g.player.root.position.toArray(),
            time: g.t, hurry: g.hurry, errors: window.__bootError };
        }));
        throw error;
      } finally { await opened.close(); }
    }
  }, { timeoutMs: 285000 });
} catch (error) {
  console.error(`${error.code === 'LOAD_DEFERRED' ? 'DEFERRED' : 'FAIL'} transitions: ${error.stack || error.message}`);
  process.exitCode = error.code === 'LOAD_DEFERRED' ? 75 : 1;
}
