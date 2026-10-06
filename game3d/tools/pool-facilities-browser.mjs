// Focused physical diagnostics; the actual dialogue/Continue routes are pool-staging-check.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { blockedSource } from '../../tools/bible/check-scope.mjs';
const base = `http://127.0.0.1:${process.env.PORT || 8771}/${process.env.BASE || 'game3d'}/`;
const out = process.env.OUT || 'game3d/shots/pool-facilities';
fs.mkdirSync(out, { recursive: true });
const reports = [];
await withBrowserJob('pool-facilities', async browser => {
  for (const [width, height, mc] of [[1366, 860, 'eric'], [390, 844, 'carina']]) {
    const context = await browser.newContext({ viewport: { width, height } }), errors = [];
    await context.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ v: 2, privateMode: false, voiceOn: false })));
    await context.route('**/*', route => {
      if (blockedSource(route.request().url(), true)) { errors.push('Protected request attempted'); return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}?day=3&place=pool&q=1&perf=1&mc=${mc}`);
    await page.waitForFunction(() => globalThis.__game?.place?.name === 'pool' && !globalThis.__game.busy, null, { timeout: 90000 });
    await page.evaluate(async () => {
      const g = globalThis.__game, { setPeriod } = await import('./js/sim.js');
      g.flagsRef.club_swimming = true; setPeriod('evening', g); await g.place.day3({});
      globalThis.__poolBaseUpdate = g.player.update;
      g.setHurry(true); await g.walkTo(...g.place.changing.locker); g.setHurry(false);
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${width}-${mc}-lockers.png` });
    await page.evaluate(async () => {
      const g = globalThis.__game; g.setHurry(true);
      await g.walkTo(...g.place.changing.shower); g.setHurry(false);
    });
    await page.screenshot({ path: `${out}/${width}-${mc}-shower.png` });
    const lights = await page.evaluate(async () => {
      const g = globalThis.__game, { setPeriod } = await import('./js/sim.js');
      const read = () => { const values = []; g.place.scene.traverse(o => { if (o.name === 'pool:floodlight') values.push(o.intensity); }); return values; };
      const evening = read(); setPeriod('morning', g);
      await new Promise(r => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(r)));
      const morning = read(); setPeriod('evening', g);
      await new Promise(r => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(r)));
      return { evening, morning, restored: read() };
    });
    assert.equal(lights.evening.length, 4);
    assert.ok(lights.evening.every(x => x > 0) && lights.morning.every(x => x === 0) && lights.restored.every(x => x > 0));
    const canceled = await page.evaluate(async () => {
      const g = globalThis.__game, P = g.place;
      // Cancel an actual awaited walk, then let its old callbacks run before checking for late movement.
      const pending = P.hooks.poolSession({ state: 'enter' });
      await new Promise(r => setTimeout(r, 100)); P.leave(); await pending;
      await new Promise(r => setTimeout(r, 100));
      const before = g.player.root.position.clone();
      await new Promise(r => setTimeout(r, 400));
      const result = { drift: before.distanceTo(g.player.root.position), scripted: g.player.scripted,
        path: !!g.walker.path, updateRestored: g.player.update === globalThis.__poolBaseUpdate, swim: P.snapshotState().swim.swimmers.eric };
      await P.day3({});
      g.setHurry(true); await g.walkTo(...P.spots.pool_steps); await P.hooks.poolSession({ state: 'begin' }); g.setHurry(false);
      return result;
    });
    assert.ok(canceled.drift < .001 && !canceled.scripted && !canceled.path && canceled.updateRestored && !canceled.swim, JSON.stringify(canceled));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/${width}-${mc}-evening.png` });
    const perf = await page.evaluate(() => globalThis.__perfReport());
    reports.push({ width, mc, lights, canceled, perf, errors });
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS', width, mc, 'locker/shower route, live period lights, in-flight cancellation');
  }
}, { timeoutMs: 240000 });
fs.writeFileSync(`${out}/report.json`, JSON.stringify(reports, null, 2));
