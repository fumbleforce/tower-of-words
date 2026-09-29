// Capture a real scene autosave, invalidate its story fingerprint, and verify safe recovery in the shipped UI.
import assert from 'node:assert/strict';
import { withBrowserJob } from '../lib/browser-job.mjs';
import { openGame } from '../../game3d/test/support/open-game.mjs';
import fixture from '../../game3d/test/fixtures/save-v1.json' with { type: 'json' };

try {
  await withBrowserJob('save-recovery', async browser => {
    const seed = { ...structuredClone(fixture), place: 'office', period: 'morning',
      flags: { place: 'office' }, runner: { onceDone: [], execution: null }, ui: { goal: 'Greet Mr. Mori.', sideGoal: '' } };
    const seeded = { async newContext(options) {
      const context = await browser.newContext(options);
      await context.addInitScript(data => {
        if (!sessionStorage.getItem('recovery-seeded')) {
          localStorage.setItem('amakawa-day1-save', JSON.stringify(data));
          localStorage.setItem('amakawa-settings', JSON.stringify({ textSpeed: 'instant', voiceOn: false, reduceMotion: true }));
          sessionStorage.setItem('recovery-seeded', '1');
        }
      }, seed);
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
      await page.waitForFunction(() => window.__game.saveEnabled && !window.__game.busy);
      await page.evaluate(() => window.__game.beat(() => window.__game.runner.run('office_in')) && undefined);
      await page.waitForFunction(() => !!window.__game.ui._advance);
      const original = await page.evaluate(() => {
        const data = JSON.parse(localStorage.getItem('amakawa-day1-save'));
        data.runner.execution.frames.at(-1).fingerprint = 'changed-story';
        const text = JSON.stringify(data);
        localStorage.setItem('amakawa-day1-save', text);
        return text;
      });
      await page.reload();
      await continueSave();
      const dialog = page.getByRole('alertdialog', { name: 'Unable to resume scene' });
      await dialog.waitFor();
      const before = await page.evaluate(() => ({ time: window.__game.t, position: window.__game.player.root.position.toArray() }));
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await page.keyboard.press('KeyW');
      await page.keyboard.press('KeyQ');
      const after = await page.evaluate(() => ({ time: window.__game.t, position: window.__game.player.root.position.toArray(),
        paused: window.__game.paused, busy: window.__game.busy, locked: window.__game.walker.locked,
        saved: localStorage.getItem('amakawa-day1-save'), modal: document.querySelector('.save-recovery').matches(':modal') }));
      assert.equal(after.time, before.time);
      assert.deepEqual(after.position, before.position);
      assert.equal(after.paused, true); assert.equal(after.busy, true); assert.equal(after.locked, true);
      assert.equal(after.modal, true); assert.equal(after.saved, original);
      await page.screenshot({ path: '/tmp/codex-save-recovery.png' });
      await dialog.getByRole('button', { name: 'Return to title' }).focus();
      await Promise.all([page.waitForEvent('load'), page.keyboard.press('Enter')]);
      await page.locator('#title .mcont').waitFor();
      assert.equal(await page.evaluate(() => localStorage.getItem('amakawa-day1-save')), original);
      assert.deepEqual(opened.errors, []);
      console.log('PASS recovery: preserved save, blocked input, Escape safety, keyboard return to title');
    } finally { await opened.close(); }
  }, { timeoutMs: 240000 });
} catch (error) {
  console.error(`${error.code === 'LOAD_DEFERRED' ? 'DEFERRED' : 'FAIL'} recovery: ${error.stack || error.message}`);
  process.exitCode = error.code === 'LOAD_DEFERRED' ? 75 : 1;
}
