// Normal-input regression for #527/#528. A prior Saturday history is loaded through Continue;
// no ui.auto, speed overrides or DOM click dispatch. Real pointer clicks must reach the awaited board.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';
import { openGame } from '../test/support/open-game.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';

const [W = '1366', H = '860'] = process.argv.slice(2);
const out = `game3d/shots/travel-club-527/${W}`;
fs.mkdirSync(out, { recursive: true });
const base = `http://127.0.0.1:${process.env.PORT || 8771}/${process.env.BASE || 'game3d'}`;
const saved = { v: 1, day: 3, period: 'morning', place: 'plaza',
  flags: { day: 3, period: 'morning', place: 'plaza', d3_started: true, d3_aoi_intro: true },
  known: ['ohayo', 'yoroshiku', 'sumimasen'], met: ['aoi'], found: [], seen: [], inv: [], yen: 4000,
  ui: { goal: 'Read the club posters in the fountain plaza.' },
  runner: { onceDone: [], execution: null }, pendingStart: null };

await withBrowserJob(`travel-club-${W}`, async browser => {
  const opened = await openGame(browser, { viewport: { width: +W, height: +H }, mode: 'title', touch: +W < 700,
    url: `${base}/index.html?q=0`, timeoutMs: 90000, beforeNavigate: async (page, context) => {
      await context.route('**/*', scopedRoute({ publicOnly: true }));
      await page.addInitScript(saved => {
        globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false, textSpeed: 'instant' }));
        globalThis.localStorage.setItem('amakawa-onboard', JSON.stringify({ moved: true, talked: true, uses: 9, sayUsed: true }));
        if (!globalThis.sessionStorage.getItem('travel-club-seeded')) {
          globalThis.localStorage.setItem('amakawa-day1-save', JSON.stringify(saved));
          globalThis.sessionStorage.setItem('travel-club-seeded', '1');
        }
      }, saved);
    } });
  const { page, errors } = opened;
  const click = selector => +W < 700 ? page.locator(selector).tap() : page.locator(selector).click();
  const continued = async () => {
    await click('#title .mcont');
    await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
    await page.waitForFunction(() => globalThis.window.__game?.saveEnabled && !globalThis.document.body.classList.contains('at-title') &&
      !globalThis.document.body.classList.contains('title-leaving'), null, { timeout: 90000 });
  };
  const idle = () => page.waitForFunction(() => {
    const g = globalThis.window.__game;
    return !g.busy && !g.saying && !g.pendingStart && !g.transition && !g.walker.path && !g.walker.locked;
  }, null, { timeout: 45000 });
  const mapOffice = async expected => {
    await page.keyboard.press('m');
    await page.waitForSelector('#mapView:not([hidden])');
    if (+W < 700) await click('#mapView .mv-places');
    await click('#mapView .mv-list [data-pick="office"]');
    const actual = await page.locator('#mapView .mv-go').isEnabled();
    assert.equal(actual, expected, await page.locator('#mapView .mv-side').innerText());
  };
  try {
    await continued(); await idle();
    await mapOffice(true);
    await page.screenshot({ path: `${out}/idle-map.png` });
    await page.keyboard.press('Escape');
    // The real Use handler approaches the physical board; the defect is its modal pointer input.
    const read = async () => {
      await page.evaluate(() => { const g = globalThis.window.__game; g.use(g.markers.list.find(m => m.id === 'noticeboard')); });
      await page.waitForSelector('#boardView:not([hidden])', { timeout: 45000 });
      await page.waitForTimeout(400);
    };
    await read();
    await mapOffice(false);
    await page.screenshot({ path: `${out}/board-map.png` });
    await page.keyboard.press('Escape');
    const slip = page.locator('#boardView .poster').filter({ hasText: 'Swimming club' }).locator('button.slip');
    // Playwright's hit testing must succeed; force-click would conceal the original bug.
    if (+W < 700) await slip.tap(); else await slip.click();
    assert.equal(await page.locator('#boardView .poster').filter({ hasText: 'Swimming club' }).locator('.slip.joined').count(), 1);
    assert.match(await page.locator('#toast').innerText(), /Joined the Swimming club/);
    await page.screenshot({ path: `${out}/joined.png` });
    await page.keyboard.press('Escape'); await idle();
    assert(await page.evaluate(() => JSON.parse(globalThis.localStorage.getItem('amakawa-day1-save')).flags.club_swimming));
    await mapOffice(true); await page.keyboard.press('Escape');
    // Repeat visits, backdrop close, and Continue cannot leave a pending board beat behind.
    await read(); await page.mouse.click(4, +H / 2); await idle();
    await page.reload(); await page.waitForSelector('#title .mcont', { timeout: 90000 });
    await continued(); await idle();
    await mapOffice(true); await click('#mapView .mv-go');
    await page.waitForFunction(() => globalThis.window.__game.place?.name === 'office', null, { timeout: 60000 });
    await idle();
    await page.screenshot({ path: `${out}/arrived-b2.png` });
    assert.deepEqual(errors, []);
    console.log(`PASS ${W}x${H}: idle map, real slip click, Joined, Escape/backdrop, Continue, B2 travel; ${out}`);
  } catch (error) {
    await page.screenshot({ path: `${out}/failure.png` });
    console.error(await page.evaluate(() => { const g = globalThis.window.__game; return { busy: g.busy, locked: g.walker?.locked,
      pending: g.pendingStart, queue: g.queue.length, node: g.runner.currentNode, transition: g.transition }; }));
    throw error;
  } finally { await opened.close(); }
}, gpuWaitOptions(900, 280000));
