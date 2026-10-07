// Real title Continue with a later-day save and fresh onboarding storage.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';

const base = process.env.URL || 'http://127.0.0.1:8771/game3d/';
const out = process.env.OUT || `/tmp/continue-goal-${Date.now()}`;
fs.mkdirSync(out, { recursive: true });
const report = [];
await withBrowserJob('continue-goal', async browser => {
  for (const [width, height] of [[1366, 860], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage(), errors = [];
    let closing = false;
    await context.route('**/*', scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: e => errors.push(e) }));
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ v: 2, textSpeed: 'instant', voiceOn: false, privateMode: false })));
    const state = () => page.evaluate(() => ({
      place: globalThis.__game.place.name, text: globalThis.__game.ui.goalText,
      held: globalThis.__game.ui._heldGoal, shown: globalThis.__game.ui._shownGoal,
      hold: globalThis.__onboard.holdGoal, hidden: globalThis.document.querySelector('#goal').hidden,
    }));
    try {
      await waitForGame(page, 60000, () => page.goto(base + 'index.html'), 'title');
      await page.locator('#title .go').click();
      await waitForGame(page, 60000, async () => {}, 'play');
      await page.waitForFunction(() => globalThis.__onboard.active && globalThis.__onboard.holdGoal);
      const fresh = await state();
      assert.equal(fresh.hidden, true, 'fresh train keeps the controls-first introduction');
      await page.screenshot({ path: `${out}/${width}-fresh-train.png` });

      await waitForGame(page, 60000, () => page.goto(base + 'index.html?day=2&place=office'), 'play');
      await page.waitForFunction(() => !globalThis.__game.busy && !!globalThis.__game.ui.goalText);
      const before = await state();
      assert.equal(before.hidden, false);
      if (width < 700) await page.locator('#qsaveBtn').click();
      else await page.keyboard.press('F5');
      await page.waitForFunction(() => !!globalThis.localStorage.getItem('amakawa-slot-quick'));
      await page.evaluate(() => globalThis.localStorage.removeItem('amakawa-onboard'));
      await waitForGame(page, 60000, () => page.goto(base + 'index.html'), 'title');
      await page.locator('#title .mcont').click();
      await page.locator('.slot[data-id="quick"]').click();
      await page.waitForFunction(() => globalThis.__game?.place?.name === 'office' && !globalThis.__game.busy && !globalThis.document.body.classList.contains('at-title'));
      await page.waitForTimeout(500);
      const continued = await state();
      await page.screenshot({ path: `${out}/${width}-continued-office.png` });
      report.push({ width, height, fresh, before, continued, errors });
      assert.equal(continued.text, before.text, 'saved goal text survives');
      assert.equal(continued.hidden, false, 'the restored goal must be visible');
      assert.equal(continued.shown, before.text);
      assert.equal(continued.held, '');
      assert.deepEqual(errors, []);
    } catch (error) {
      report.push({ width, failure: error.stack, errors });
      await page.screenshot({ path: `${out}/${width}-failure.png` });
      throw error;
    } finally {
      fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
      closing = true;
      await context.close();
    }
  }
}, { timeoutMs: 285000 });
console.log(JSON.stringify(report, null, 2));
