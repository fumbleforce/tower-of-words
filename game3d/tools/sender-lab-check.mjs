import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
const base = new URL((process.env.BASE || 'game3d') + '/', `http://127.0.0.1:${process.env.PORT || 8771}/`).href;
const out = '/tmp/codex-sender-lab-proof-2';
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('codex-sender-lab', async (browser) => {
  for (const [width, height] of [[390, 844], [1366, 860]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.goto(`${base}tools/sender-lab.html`);
      await page.getByRole('dialog').waitFor();
      await page.screenshot({ path: `${out}/${width}-initial.png` });
      await page.getByRole('button', { name: 'Attempt 2, item 25, started', exact: true }).click();
      await page.getByRole('button', { name: 'Attempt 1, item 25, started', exact: true }).click();
      await page.getByRole('button', { name: 'Hold item 26', exact: true }).click();
      await page.getByRole('button', { name: 'Retry pending', exact: true }).click();
      await page.getByRole('button', { name: 'Retry pending', exact: true }).waitFor();
      await page.screenshot({ path: `${out}/${width}-wrong-hold.png` });
      await page.getByRole('button', { name: 'Hold item 25', exact: true }).click();
      await page.getByRole('button', { name: 'Retry pending', exact: true }).click();
      await page.waitForFunction(() => JSON.parse(globalThis.localStorage.getItem('sender-lab')).acknowledged.includes(26));
      await page.reload();
      await page.waitForFunction(() => JSON.parse(globalThis.localStorage.getItem('sender-lab')).acknowledged.includes(27));
      await page.screenshot({ path: `${out}/${width}-delivered.png` });
      const state = await page.evaluate(() => JSON.parse(globalThis.localStorage.getItem('sender-lab')));
      assert.deepEqual(state.acknowledged, [24, 26, 27]);
      assert.equal(state.held, 25);
      assert.equal(await page.getByRole('button', { name: 'Retry pending', exact: true }).isDisabled(), true);
      assert.deepEqual(errors, []);
      fs.writeFileSync(`${out}/${width}.json`, JSON.stringify({ width, state, errors }, null, 2));
      console.log(`PASS sender lab ${width}: compare, wrong hold, replacement, delivery and reload`);
    } finally { await context.close(); }
  }
});
