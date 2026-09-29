// Reproduce C-0051: Continue an actual platform autosave after the train left.
import assert from 'node:assert/strict';
import { withBrowserJob } from '../lib/browser-job.mjs';
import { openGame } from '../../game3d/test/support/open-game.mjs';
import fixture from '../../game3d/test/fixtures/save-v1.json' with { type: 'json' };

const node = process.argv[2] || 'platform';
if (!['platform', 'arrival'].includes(node)) throw new Error('Unknown staging scene: ' + node);
try {
  await withBrowserJob(node + '-staging', async browser => {
    const seeded = { async newContext(options) {
      const context = await browser.newContext(options);
      await context.addInitScript(data => {
        if (!sessionStorage.getItem('staging-seeded')) {
          localStorage.setItem('amakawa-day1-save', JSON.stringify(data));
          localStorage.setItem('amakawa-settings', JSON.stringify({ textSpeed: 'instant', voiceOn: false, reduceMotion: true }));
          sessionStorage.setItem('staging-seeded', '1');
        }
        const set = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          set.call(this, key, value);
          if (key !== 'amakawa-day1-save' || !window.__captureDeparture) return;
          const saved = JSON.parse(value);
          const scene = window.__captureDeparture;
          if (saved.flags[scene === 'platform' ? 'held_doors' : 'alighted']
            && saved.runner?.execution?.frames.at(-1)?.node === scene && !window.__departureSave) {
            window.__departureSave = saved;
            window.__game.paused = true;
            window.__game.ui.auto = false;
          }
        };
      }, { ...structuredClone(fixture), place: 'train', period: 'early',
        flags: { place: 'train', arrived: true, alighted: node === 'platform', sat: true, lesson_done: true, arriving: true },
        known: ['ohayo', 'yoroshiku', ...(node === 'platform' ? ['sumimasen'] : [])], ui: { goal: 'Get off the train.', sideGoal: '' },
        runner: { onceDone: [], execution: null }, pendingStart: null });
      return context;
    } };
    const opened = await openGame(seeded, { mode: 'title', viewport: { width: 960, height: 600 } });
    const { page } = opened;
    try {
      await page.locator('#title .mcont').click();
      await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
      await page.waitForFunction(() => window.__game.saveEnabled && !window.__game.busy);
      await page.evaluate(node => {
        const g = window.__game;
        window.__captureDeparture = node;
        g.ui.auto = true;
        window.__stagingSpeed = setInterval(() => { if (g.busy) g.setHurry(true); g.ui._advance?.(); }, 30);
        g.beat(async () => {
          if (node === 'arrival') { await g.hooks.stand({ who: 'mio' }); await g.hooks.walk({ who: 'mio', to: [-2, 0.1] }); }
          await g.runner.run(node);
        });
      }, node);
      await page.waitForFunction(() => !!window.__departureSave, null, { timeout: 100000 });
      const captured = await page.evaluate(() => window.__departureSave);
      assert.equal(captured.world.departed, node === 'platform');
      assert.equal(captured.runner.execution.frames.at(-1).staging.world.departed, false);
      if (node === 'arrival') assert.equal(captured.world.people.aoi.visible, false);
      console.log(`Captured ${node} save: ${JSON.stringify(captured).length} bytes`);
      await page.evaluate(saved => localStorage.setItem('amakawa-day1-save', JSON.stringify(saved)), captured);
      await page.goto('http://127.0.0.1:8771/game3d/index.html?q=0');
      await page.waitForFunction(() => window.__game?.place && document.querySelector('#title .mcont'));
      await page.evaluate(async () => {
        const { ui } = await import('/game3d/js/ui.js');
        const g = window.__game, restore = g.restoreStaging;
        g.restoreStaging = staging => {
          restore(staging);
          window.__restoredGeometry ||= g.place.snapshotState().geometry;
        };
        ui.auto = false;
        window.__typedAgain = 0;
        const prompt = ui.typePrompt;
        ui.typePrompt = function (...args) { window.__typedAgain++; return prompt.apply(this, args); };
        window.__stagingSpeed = setInterval(() => {
          const g = window.__game;
          if (g?.busy) g.setHurry(true);
        }, 30);
      });
      await page.locator('#title .mcont').click();
      await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
      await page.waitForFunction(node => window.__game.runner.currentNode === node && !!window.__game.ui._advance, node, { timeout: 60000 });
      await page.waitForFunction(() => document.querySelector('#title')?.hidden && !document.body.classList.contains('at-title')
        && !document.body.classList.contains('title-leaving'));
      const restarted = await page.evaluate(async () => {
        const g = window.__game, S = await import('/game3d/js/sim.js');
        return { world: g.place.snapshotState(), yen: S.sim.yen, inv: S.sim.inv,
          restoredGeometry: window.__restoredGeometry,
          bonds: S.bonds.toJSON(), known: [...(await import('/game3d/js/lang.js')).known],
          line: document.querySelector('#talk .line')?.textContent, error: g.runner.recoveryError };
      });
      assert.equal(restarted.error, null);
      assert.match(restarted.line, node === 'platform' ? /sleeping guy/ : /she's in the way/);
      assert.equal(restarted.world.departed, false);
      const entry = captured.runner.execution.frames.at(-1).staging.world;
      // Check before the first line changes camera cutaways and idle animation.
      assert.deepEqual(restarted.restoredGeometry, entry.geometry, 'train geometry returns to its scene-entry transforms');
      assert.equal(restarted.world.people.kuroda.seated, true);
      assert.deepEqual(restarted.world.people.kuroda.position, entry.people.kuroda.position);
      if (node === 'arrival') assert.equal(restarted.world.people.aoi.visible, true, 'Aoi returns for the excuse-me lesson');
      assert.equal(restarted.yen, captured.yen);
      assert.deepEqual(restarted.inv, captured.inv);
      assert.deepEqual(restarted.bonds, captured.rel.bonds);
      assert.deepEqual(restarted.known, captured.known);
      await page.screenshot({ path: `/tmp/codex-${node}-restarted.png` });
      await page.evaluate(() => {
        const g = window.__game;
        g.ui.auto = true;
        window.__stagingAdvance = setInterval(() => g.ui._advance?.(), 30);
        g.ui._advance?.();
      });
      await page.waitForFunction(() => !window.__game.busy && !window.__game.runner.frames.length, null, { timeout: 90000 });
      const finished = await page.evaluate(() => ({ saved: JSON.parse(localStorage.getItem('amakawa-day1-save')),
        prompts: window.__typedAgain, error: window.__game.runner.recoveryError }));
      assert.equal(finished.error, null);
      assert.equal(finished.prompts, 0, 'already learned typing prompt must not be repeated');
      assert.equal(finished.saved.world.departed, node === 'platform');
      if (node === 'arrival') assert.equal(finished.saved.world.people.aoi.visible, false);
      assert.equal(finished.saved.runner.execution, null);
      assert.equal(finished.saved.yen, captured.yen);
      assert.deepEqual(finished.saved.inv, captured.inv);
      assert.deepEqual(finished.saved.rel.bonds, captured.rel.bonds);
      assert.deepEqual(opened.errors, []);
      console.log(`PASS ${node}: passengers restored, physical action repeated, progress and typed word retained`);
    } catch (error) {
      console.error('State:', await page.evaluate(() => ({ node: window.__game?.runner?.currentNode,
        recovery: window.__game?.runner?.recoveryError, line: document.querySelector('#talk .line')?.textContent,
        errors: window.__test?.errors, log: window.__test?.log?.slice(-15),
        flags: window.__game?.flags, place: window.__game?.place?.name,
        step: window.__game?.runner?.lastStep, saved: localStorage.getItem('amakawa-day1-save')?.slice(-400) } )).catch(() => 'unavailable'));
      throw error;
    } finally { await opened.close(); }
  }, { timeoutMs: 280000 });
} catch (error) {
  console.error(`${error.code === 'LOAD_DEFERRED' ? 'DEFERRED' : 'FAIL'} staging: ${error.stack || error.message}`);
  process.exitCode = error.code === 'LOAD_DEFERRED' ? 75 : 1;
}
