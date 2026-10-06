// Physical Sunday staging, using the actual hooks in the public build. No text is advanced on a timer.
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { openGame } from '../test/support/open-game.mjs';
const base = process.env.BASE || 'game3d';
const place = process.env.PLACE || 'sports';
const out = new URL('../shots/day4-build/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const width = +(process.env.WIDTH || 390), height = +(process.env.HEIGHT || 844);
await withBrowserJob('day4-staging', async browser => {
  const opened = await openGame(browser, { mode: 'title', viewport: { width, height }, url: `http://127.0.0.1:8771/${base}/index.html?q=0`, beforeNavigate: async page => {
    await page.addInitScript(place => {
      localStorage.setItem('amakawa-day1-save', JSON.stringify({ v: 1, day: 4, period: place === 'sports' ? 'evening' : 'morning', place, known: ['ugoite'], seen: [], found: [], met: [], taught: {}, inv: [], yen: 4000, bonds: {}, flags: { day: 4, period: place === 'sports' ? 'evening' : 'morning', place, met_emi: true, d4_started: true }, runner: { onceDone: [] } }));
      localStorage.setItem('amakawa-settings', JSON.stringify({ textSpeed: 'instant', voiceOn: false, privateMode: false }));
    }, place);
  } });
  const { page } = opened;
  page.on('pageerror', e => process.stderr.write(e.stack+'\n'));
  await page.locator('#title .mcont').click();
  await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
  await page.waitForFunction(place => window.__game?.place?.name === place && !window.__game.busy, place, { timeout: 45000 });
  await page.evaluate(async () => {
    const g = window.__game, { ui } = await import(new URL('js/ui.js', location.href));
    ui.auto = false; g.busy = true; g.setHurry(true); g.flagsRef.club_tennis = true;
    if (g.place.name === 'sports') await g.place.hooks.tennisSession({ state: 'begin' });
  });
  async function shot(name) {
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${out}/${width}-${name}.png` });
  }
  if (place === 'sports') {
  await shot('offer');
  for (const state of ['racket', 'basketDown', 'aoiRally', 'fetch', 'aoiAgain', 'doubles', 'drink', 'shoe', 'free', 'bottle']) {
    await page.evaluate(async state => { const g = window.__game; g.setHurry(true); if (state === 'doubles') g.flagsRef.d4_tennis_done = true; await g.place.hooks.tennisSession({ state }); }, state);
    if (['racket', 'aoiRally', 'fetch', 'drink', 'shoe', 'bottle'].includes(state)) await shot(state);
  }
  for (const state of ['fault', 'reseat', 'verify']) { await page.evaluate(async state => { const g = window.__game; g.setHurry(true); await g.place.hooks.courtRepair({ state }); }, state); await shot('display-'+state); }
  } else {
    for (const state of ['show', 'lever', 'oscillate']) { await page.evaluate(async state => { const g = window.__game; g.setHurry(true); await g.place.hooks.fanRepair({ state }); }, state); await shot('fan-'+state); }
  }
  const physical = await page.evaluate(() => ({ people: Object.fromEntries(Object.entries(window.__game.place.people).map(([id,p]) => [id, { visible: p.root.visible, at: p.root.position.toArray() }])), saved: window.__game.place.snapshotState().sunday }));
  fs.writeFileSync(`${out}/${width}-physical.json`, JSON.stringify(physical,null,2));
  if (opened.errors.length) throw new Error(opened.errors.join('\n'));
  await opened.close();
}, { timeoutMs: 280000 });
console.log(`Day 4 staging ${width}x${height}: ${out}`);
