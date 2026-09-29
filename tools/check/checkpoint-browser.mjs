// Capture saves written by actual story nodes, then Continue them through the title.
import assert from 'node:assert/strict';
import { withBrowserJob } from '../lib/browser-job.mjs';
import { openGame } from '../../game3d/test/support/open-game.mjs';
import fixture from '../../game3d/test/fixtures/save-v1.json' with { type: 'json' };

const cases = [
  { node: 'office_in', leaf: 'office_in', period: 'morning', finish: 'morning' },
  { node: 'mio_lunch_end', leaf: 'mio_bond', period: 'lunch', finish: 'afternoon' },
  { node: 'work_afternoon', leaf: 'emi_drops_in', period: 'afternoon', finish: 'evening' },
  { node: 'legacy_office', leaf: 'office_in', place: 'office', legacy: true, period: 'morning', finish: 'morning', goal: 'Greet Mr. Mori.' },
  { node: 'legacy_gate', leaf: 'lobby_in', place: 'gate', legacy: true, period: 'early', finish: 'early', goal: 'Say good morning to the guard.' },
];
const selected = process.argv[2];
if (selected && !cases.some(c => c.node === selected)) throw new Error('Unknown checkpoint case: ' + selected);
try {
  await withBrowserJob('scene-checkpoints', async browser => {
    for (const scenario of cases.filter(c => !selected || c.node === selected)) {
      const place = scenario.place || 'office';
      const saved = { ...structuredClone(fixture), place, period: scenario.period,
        flags: scenario.legacy ? { place, period: scenario.period, held_doors: true, mio_warm: 2,
          ...(place === 'office' ? { gate_through: true } : {}) }
          : { ...fixture.flags, place, period: scenario.period, greeted_mori: true,
            chairHome: true, machineOpen: true, copier_done: true, lunch_on: true },
        runner: { onceDone: [], execution: null }, ui: { goal: '', sideGoal: '' } };
      const seeded = { async newContext(options) {
        const context = await browser.newContext(options);
        await context.addInitScript(data => {
          if (!sessionStorage.getItem('checkpoint-seeded')) {
            localStorage.setItem('amakawa-day1-save', JSON.stringify(data));
            localStorage.setItem('amakawa-settings', JSON.stringify({ textSpeed: 'instant', voiceOn: false, reduceMotion: true }));
            sessionStorage.setItem('checkpoint-seeded', '1');
          }
        }, saved);
        return context;
      } };
      const opened = await openGame(seeded, { mode: 'title' });
      const { page } = opened;
      const continueSave = async () => {
        await page.locator('#title .mcont').click();
        await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
      };
      try {
        await continueSave();
        if (!scenario.legacy) await page.waitForFunction(() => window.__game.saveEnabled && !window.__game.busy);
        await page.evaluate(async ({ node, leaf, legacy }) => {
          const g = window.__game;
          const { ui } = await import('/game3d/js/ui.js');
          ui.auto = false;
          // Speed only; the actual hooks, world, Runner and save functions remain in use.
          window.__checkpointSpeed = setInterval(() => {
            if (g.busy) g.setHurry(true);
            if (g.runner.currentNode !== leaf) ui._advance?.();
          }, 30);
          if (!legacy) g.beat(() => g.runner.run(node));
        }, scenario);
        await page.waitForFunction(leaf => {
          return window.__game.runner.currentNode === leaf && !!window.__game.ui._advance;
        }, scenario.leaf, { timeout: 60000 });
        const actual = await page.evaluate(() => JSON.parse(localStorage.getItem('amakawa-day1-save')));
        assert.equal(actual.runner.execution.frames.at(-1).node, scenario.leaf);
        await page.reload();
        assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('amakawa-day1-save'))), actual,
          'title boot must preserve the actual scene autosave');
        await continueSave();
        await page.waitForFunction(leaf => {
          return window.__game.runner.currentNode === leaf && !!window.__game.ui._advance;
        }, scenario.leaf, { timeout: 60000 });
        const resumed = await page.evaluate(async () => {
          const g = window.__game, S = await import('/game3d/js/sim.js');
          return { trace: g.runner.trace, yen: S.sim.yen, inv: S.sim.inv, bonds: S.bonds.toJSON() };
        });
        assert.deepEqual(resumed.trace, [scenario.leaf], 'resume starts only the unfinished scene');
        assert.equal(resumed.yen, actual.yen);
        assert.deepEqual(resumed.inv, actual.inv);
        assert.deepEqual(resumed.bonds, actual.rel.bonds);
        await page.evaluate(async () => {
          const g = window.__game, { ui } = await import('/game3d/js/ui.js');
          ui.auto = true;
          window.__checkpointSpeed = setInterval(() => { if (g.busy) g.setHurry(true); ui._advance?.(); }, 30);
          ui._advance?.();
        });
        await page.waitForFunction(() => !window.__game.busy && !window.__game.runner.frames.length, null, { timeout: 60000 });
        const completed = await page.evaluate(() => JSON.parse(localStorage.getItem('amakawa-day1-save')));
        assert.equal(completed.period, scenario.finish);
        assert.equal(completed.runner.execution, null);
        if (scenario.goal) assert.equal(completed.ui.goal, scenario.goal);
        assert.deepEqual(opened.errors, []);
        console.log(`PASS checkpoint ${scenario.node} → ${scenario.leaf} → ${scenario.finish}`);
      } finally { await opened.close(); }
    }
  }, { timeoutMs: 240000 });
} catch (error) {
  console.error(`${error.code === 'LOAD_DEFERRED' ? 'DEFERRED' : 'FAIL'} checkpoints: ${error.stack || error.message}`);
  process.exitCode = error.code === 'LOAD_DEFERRED' ? 75 : 1;
}
