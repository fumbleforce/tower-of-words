// Focused geometry/prop preview. The fixture contains no dialogue; final routes use the authored story.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366),
  height = width < 700 ? 844 : 860,
  mc = process.argv[3] || 'eric';
const out = new URL('../shots/codex-izakaya/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  'izakaya-staging',
  async (browser) => {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/story/izakaya.js', (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: "export default {start:'arrive',on:{},nodes:{arrive:[]}};",
      }),
    );
    await waitForGame(
      page,
      60000,
      () => page.goto(`http://127.0.0.1:8793/game3d/index.html?place=izakaya&mc=${mc}`),
      'play',
    );
    await page.waitForFunction(() => !document.querySelector('#boot:not(.gone)') && !window.__game.busy);
    await page.evaluate(async () => {
      const g = window.__game,
        { sim } = await import('./js/sim.js'),
        { flags } = await import('./js/narrative/state.js');
      sim.day = 2;
      flags.d2_shift_done = true;
      await g.place.hooks.partySetup();
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}/${width}-${mc}-arrival.png` });
    await page.evaluate(async () => {
      const g = window.__game;
      await g.hooks.sit({ who: 'eric', at: 'party_seat' });
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}/${width}-${mc}-table.png` });
    for (const state of ['toast', 'take', 'drink', 'passVegetables', 'sharePickles', 'packLeftovers']) {
      await page.evaluate((state) => {
        const g = window.__game;
        window._action = g.place.hooks.partyFood({ state, food: 'yakitori' }).catch((e) => {
          window._foodError = e.message;
        });
      }, state);
      await page.waitForTimeout(1050);
      await page.screenshot({ path: `${out}/${width}-${mc}-${state}.png` });
      await page.evaluate(() => window._action);
      if (await page.evaluate(() => window._foodError)) throw new Error(await page.evaluate(() => window._foodError));
    }
    const report = {
      contacts: await page.evaluate(() => window.__game.place.dinner.food.contacts),
      errors,
      people: await page.evaluate(() =>
        Object.fromEntries(
          Object.entries(window.__game.place.people).map(([id, r]) => [
            id,
            { visible: r.root.visible, seated: r.seated, pos: r.root.position.toArray() },
          ]),
        ),
      ),
    };
    fs.writeFileSync(`${out}/${width}-${mc}-staging.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    assert.deepEqual(errors, []);
    for (const c of report.contacts) assert.ok(c.gap < 0.075, `${c.id}/${c.action || 'lift'} gap ${c.gap}`);
    // Interrupt actual real-rig actions through the normal place lifecycle, after the cups leave the table.
    await page.evaluate(() => window.__game.prepare('shotengai'));
    await page.evaluate(() => {
      const g = window.__game;
      window._oldDinner = g.place.dinner;
      window._beforeToast = g.place.dinner.food.state.toast;
      window._cancelledToast = g.place.hooks.partyFood({ state: 'toast' });
    });
    await page.waitForTimeout(850);
    await page.evaluate(() => window.__game.travel('shotengai', { fast: true, via: 'izakaya' }));
    await page.evaluate(() => window._cancelledToast);
    await page.waitForTimeout(1800);
    assert.equal(
      await page.evaluate(() => window._oldDinner.food.state.toast),
      await page.evaluate(() => window._beforeToast),
    );
    assert.ok(
      await page.evaluate(() => {
        const g = window.__game;
        return (
          g.place.name === 'shotengai' &&
          !g.mioNpc.root.visible &&
          Object.values(window._oldDinner.food.models.cups).every(
            (c) => c.parent === window._oldDinner.food.models.group,
          )
        );
      }),
    );
    await page.evaluate(() => window.__game.travel('izakaya', { fast: true, via: 'shotengai' }));
    await page.evaluate(() => {
      const g = window.__game;
      window._oldDinner = g.place.dinner;
      window._cancelledPack = g.place.hooks.partySetup({ state: 'pack' });
    });
    await page.waitForTimeout(180);
    await page.evaluate(() => window.__game.travel('shotengai', { fast: true, via: 'izakaya' }));
    await page.evaluate(() => window._cancelledPack);
    await page.waitForTimeout(700);
    assert.equal(await page.evaluate(() => window._oldDinner.snapshot().packed), false);
    assert.ok(await page.evaluate(() => window._oldDinner.people.kenji.root.visible));
    await page.evaluate(() => window.__game.travel('izakaya', { fast: true, via: 'shotengai' }));
    await page.evaluate(() => {
      const g = window.__game;
      window._oldDinner = g.place.dinner;
      window._beforeDrinks = g.place.dinner.food.state.drinks;
      window._seatAction = g.place.hooks.partyFood({ state: 'drink' });
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => window.__game.travel('shotengai', { fast: true, via: 'izakaya' }));
    await page.evaluate(() => window._seatAction);
    await page.waitForTimeout(700);
    assert.equal(
      await page.evaluate(() => window._oldDinner.food.state.drinks),
      await page.evaluate(() => window._beforeDrinks),
    );
    assert.ok(await page.evaluate(() => window.__game.place.name === 'shotengai' && !window.__game.player.seated));
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      `${out}/${width}-${mc}-lifecycle.json`,
      JSON.stringify({ passed: true, cancelled: ['toast', 'departure', 'seat approach'], errors }, null, 2),
    );
    await page.close();
  },
  { timeoutMs: 120000 },
);
