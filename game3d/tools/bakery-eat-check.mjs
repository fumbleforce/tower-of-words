import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const w = +(process.argv[2] || 390),
  mc = process.argv[3] || 'carina',
  out = `game3d/shots/codex-bakery/${process.env.ROUND || 'eat'}`;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  'bakery-eat',
  async (browser) => {
    const page = await browser.newPage({ viewport: { width: w, height: w < 700 ? 844 : 860 } });
    await page.addInitScript(() =>
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({ textSpeed: 'instant', voiceOn: false, privateMode: false }),
      ),
    );
    await waitForGame(
      page,
      60000,
      () => page.goto(`http://127.0.0.1:8794/game3d/index.html?day=4&place=shotengai&mc=${mc}`),
      'play',
    );
    await page.waitForFunction(() => !globalThis.__game.busy && !globalThis.document.querySelector('#boot:not(.gone)'));
    await page.evaluate(async () => {
      const g = globalThis.__game;
      await g.travel('bakery', { fast: true, via: 'shotengai' });
    });
    await page.waitForFunction(() => !globalThis.__game.busy);
    await page.evaluate(async () => {
      const g = globalThis.__game;
      g.sim.inv.push('curry_bread');
      await g.place.bakery.act({ state: 'frame' });
      const hook = g.place.hooks.bakeryShop;
      g.place.hooks.bakeryShop = async (a) => {
        if (a.state === 'eat') globalThis.__eatAt = performance.now();
        return hook(a);
      };
      g.runner.trigger('talk:bakery_seat');
    });
    await page
      .locator('#talk .chips button')
      .filter({ hasText: 'Eat a curry bread' })
      .waitFor()
      .catch(async (e) => {
        await page.screenshot({ path: `${out}/${w}-${mc}-failure.png` });
        throw e;
      });
    await page.waitForTimeout(1100);
    await page.locator('#talk .chips button').filter({ hasText: 'Eat a curry bread' }).click();
    await page.waitForFunction(() => globalThis.__eatAt && performance.now() - globalThis.__eatAt > 1350);
    await page.screenshot({ path: `${out}/${w}-${mc}-bite.png` });
    const motion = await page.evaluate(() => {
      const g = globalThis.__game;
      return {
        contacts: g.place.bakery.contacts,
        head: g.player.head?.position.toArray(),
        pos: g.player.root.position.toArray(),
      };
    });
    await page.waitForFunction(() => !globalThis.__game.busy);
    assert.equal(await page.evaluate(() => globalThis.__game.sim.inv.includes('curry_bread')), false);
    await page.screenshot({ path: `${out}/${w}-${mc}-seated.png` });
    fs.writeFileSync(`${out}/${w}-${mc}.json`, JSON.stringify(motion, null, 2));
    await page.close();
    console.log('PASS real Runner eat action');
  },
  { timeoutMs: 120000 },
);
