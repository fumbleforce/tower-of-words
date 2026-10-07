// An owned-grocery fixture verifies the shared Bag reader and saved labels without another purchase.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 390), phone = width < 700;
const out = 'game3d/shots/codex-konbini/labels';
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('konbini-labels', async browser => {
  const page = await browser.newPage({ viewport: { width, height: phone ? 844 : 860 }, hasTouch: phone });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ textSpeed: 'instant', voiceOn: false, privateMode: false })));
  async function tap(locator) { await locator.waitFor({state:'visible'}); const b = await locator.boundingBox(); assert.ok(b); if (phone) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
  async function read(id, text) {
    await tap(page.locator(`[data-read-item="${id}"]`));
    await page.waitForFunction(text => globalThis.document.querySelector('#talk .line')?.textContent.includes(text), text);
    await page.waitForTimeout(400);
    const textContent = await page.locator('#talk .line').textContent();
    assert.equal(textContent.includes('<br>'), false);
    assert.equal(textContent.includes('\\n'), false);
    assert.equal(textContent.split('\n').length, 3);
    await page.screenshot({ path: `${out}/${width}-${id}.png` });
    await tap(page.locator('#talk .more'));
    await page.waitForFunction(() => !globalThis.__game.busy && !globalThis.document.querySelector('#bagPanel').hidden);
    await page.waitForFunction(id => globalThis.document.activeElement?.dataset.readItem === id, id, { timeout: 2000 });
  }
  try {
    await waitForGame(page, 60000, () => page.goto(`http://127.0.0.1:8794/game3d/index.html?day=3&place=konbini&mc=${phone ? 'carina' : 'eric'}`), 'play');
    await page.waitForFunction(() => !globalThis.__game.busy && !globalThis.document.querySelector('#boot:not(.gone)'));
    await page.evaluate(() => { const g = globalThis.__game; g.sim.inv.push('milk', 'riceball'); g.ui.refreshBag(g.sim); });
    const before = await page.evaluate(() => ({ inv: [...globalThis.__game.sim.inv], yen: globalThis.__game.sim.yen }));
    await tap(page.locator('#bagBtn')); await read('milk', 'MILK'); await read('riceball', 'SALTED RICE BALL'); await read('milk', 'MILK');
    await tap(page.locator('#bagPanel .close'));
    if (phone) await tap(page.locator('#qsaveBtn')); else await page.keyboard.press('F5');
    await page.waitForFunction(() => /Quick saved/.test(globalThis.document.querySelector('#toast')?.textContent || ''));
    await waitForGame(page, 60000, () => page.goto('http://127.0.0.1:8794/game3d/index.html'), 'title');
    await tap(page.locator('#title .mcont')); await waitForGame(page, 60000, () => tap(page.locator('.slot[data-id="quick"]')), 'play');
    await page.waitForFunction(() => !globalThis.__game.busy && !globalThis.document.querySelector('#boot:not(.gone)'));
    await page.waitForTimeout(650);
    await tap(page.locator('#bagBtn')); await read('riceball', 'SALTED RICE BALL');
    assert.deepEqual(await page.evaluate(() => ({ inv: [...globalThis.__game.sim.inv], yen: globalThis.__game.sim.yen })), before);
    assert.deepEqual(errors, []);
    fs.writeFileSync(`${out}/${width}.json`, JSON.stringify({ labels: 2, repeated: true, continued: true, restoredFocus: true, unchanged: before, errors }, null, 2));
    console.log('PASS', width);
  } finally { await page.close(); }
}, { timeoutMs: 180000, gpuWaitMs: 180000 });
