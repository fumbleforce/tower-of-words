// Inspect physical Monday actions through their production hooks, with saved public-day state.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { openGame } from '../test/support/open-game.mjs';
const base = process.env.BASE || 'game3d';
const width = +(process.env.WIDTH || 390), height = +(process.env.HEIGHT || 844);
const out = new URL('../shots/day5-build/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('day5-staging', async browser => {
  for (const [place, period, hook, states] of [
    ['forecourt', 'morning', 'labelRepair', ['show', 'format', 'print', 'check']],
    ['karaoke_booth', 'lunch', 'selectorRepair', ['show', 'key', 'book', 'verify']],
    ['office', 'evening', 'teamDrinks', ['gather', 'aside', 'private', 'phoneAway', 'clear', 'printLesson', 'deliveryPose', 'ordinaryServe', 'free']],
    ['dorm_commons', 'evening', 'day5Commons', ['seat', 'sit', 'sketch']],
  ]) {
    const opened = await openGame(browser, { mode: 'title', viewport: { width, height }, url: `http://127.0.0.1:8771/${base}/index.html?q=0`, beforeNavigate: async page => {
      await page.addInitScript(({ place, period }) => {
        localStorage.setItem('amakawa-day1-save', JSON.stringify({ v: 1, day: 5, period, place, known: ['dashite', 'matte'], seen: [], found: [], met: [], taught: {}, inv: [], yen: 4000, bonds: {}, flags: { day: 5, period, place, d5_started: true }, runner: { onceDone: [] } }));
        localStorage.setItem('amakawa-settings', JSON.stringify({ textSpeed: 'instant', voiceOn: false, privateMode: false }));
      }, { place, period });
    } });
    const { page } = opened;
    await page.locator('#title .mcont').click();
    await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
    await page.waitForFunction(place => window.__game?.place?.name === place && !window.__game.busy, place, { timeout: 30000 });
    await page.evaluate(() => { window.__game.busy = true; window.__game.setHurry(true); });
    for (const state of states) {
      await page.evaluate(async ({ hook, state }) => { const g = window.__game; await g.place.hooks[hook]({ state }); }, { hook, state });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${out}/${width}-${place}-${state}.png` });
    }
    const saved = await page.evaluate(() => {
      const g = window.__game, before = g.place.snapshotState();
      g.place.restoreState({ world: before, flags: g.flagsRef });
      return { before: before.monday, after: g.place.snapshotState().monday, people: Object.fromEntries(Object.entries(g.place.people).map(([id, p]) => [id, { visible: p.root.visible, at: p.root.position.toArray() }])) };
    });
    assert.deepEqual(saved.before, saved.after, `${place} physical snapshot roundtrip`);
    fs.writeFileSync(`${out}/${width}-${place}-state.json`, JSON.stringify(saved, null, 2));
    assert.deepEqual(opened.errors, []);
    await opened.close();
  }
}, { timeoutMs: 280000 });
console.log(`Monday physical shots: ${out}`);
