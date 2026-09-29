// Close-ups of the performance overlay (F3) and its Settings switch, desktop and phone.
// node game3d/tools/perf/overlay-shots.mjs  ->  game3d/shots/perf-overlay/
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';
import { openGame } from '../../test/support/open-game.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../../shots/perf-overlay/', import.meta.url));
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('perf-overlay-shots', async (browser) => {
  for (const [name, viewport, touch] of [['desktop', { width: 1366, height: 860 }, false], ['phone', { width: 390, height: 844 }, true]]) {
    const game = await openGame(browser, { viewport, mode: 'play', quality: 1, touch });
    const { page } = game;
    await game.waitForSettled();
    if (touch) {
      // the switch in Settings (phone has no F3)
      await page.evaluate(() => window.__shell.openSettings());
      await page.waitForTimeout(400);
      const sw = page.locator('#settings [data-key="perfOverlay"]');
      await sw.scrollIntoViewIfNeeded();
      await sw.tap();
      await page.waitForTimeout(300);
      await page.screenshot({ path: out + `${name}-settings.png` });
      await page.locator('#settings .done').tap();
      await page.waitForTimeout(400);
    } else {
      await page.keyboard.press('F3');
    }
    await page.waitForTimeout(2500);
    await page.screenshot({ path: out + `${name}.png` });
    const box = await page.locator('#perfHud').boundingBox();
    if (box) await page.screenshot({ path: out + `${name}-closeup.png`, clip: { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 40), width: Math.min(viewport.width - Math.max(0, box.x - 40), box.width + 80), height: box.height + 80 } });
    console.log(name, JSON.stringify(box), await page.evaluate(() => [document.getElementById('perfHud')?.innerText, document.getElementById('perfHud')?.hidden]));
    if (!touch) {
      await page.keyboard.press('F3');
      await page.waitForTimeout(200);
      console.log('after second F3 hidden:', await page.evaluate(() => document.getElementById('perfHud').hidden));
    }
    console.log('errors:', game.errors.join(' | ') || 'none');
    await game.close();
  }
}, { timeoutMs: 240000 });
