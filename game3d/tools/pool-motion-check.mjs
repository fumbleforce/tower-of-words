// Real rigs through the existing pool choreography, at normal speed during the length.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { blockedSource } from '../../tools/bible/check-scope.mjs';
const base = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/`;
const out = process.env.OUT || 'game3d/shots/pool-motion';
fs.mkdirSync(out, { recursive: true });
const reports = [];
await withBrowserJob('pool-motion', async browser => {
  for (const [width, height, mc] of [[1366, 860, 'eric'], [390, 844, 'carina']]) {
    const context = await browser.newContext({ viewport: { width, height } }), errors = [];
    await context.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false, voiceOn: false })));
    await context.route('**/*', route => {
      if (blockedSource(route.request().url(), true)) { errors.push('Protected request'); return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}?day=3&place=pool&q=1&mc=${mc}`);
    await page.waitForFunction(() => globalThis.__game?.place?.name === 'pool' && !globalThis.__game.busy, null, { timeout: 90000 });
    await page.evaluate(async () => {
      const g = globalThis.__game, { setPeriod } = await import('./js/sim.js');
      g.flagsRef.club_swimming = true; g.flagsRef.d3_player_swims = true;
      setPeriod('evening', g); await g.place.day3({});
      const { startMoveCheck } = await import('./js/movement/checks.js'); startMoveCheck(g);
      g.setHurry(true);
      await g.place.hooks.poolSession({ state: 'enter' });
      await g.place.hooks.poolSession({ state: 'emiEnter' });
      g.setHurry(false);
      globalThis.__length = g.place.hooks.poolSession({ state: 'length' });
    });
    const frames = [];
    await page.waitForTimeout(2000);
    for (let n = 0; n < 4; n++) {
      await page.waitForTimeout(400);
      frames.push(await page.evaluate(() => {
        const g = globalThis.__game;
        return [g.player, g.place.people.emi, g.place.people.kuro].map(r => {
          const bones = {};
          r.model.traverse(o => { if (o.isBone && /Arm$|ForeArm$|Head$/.test(o.name)) bones[o.name] = o.quaternion.toArray(); });
          return { position: r.root.position.toArray(), swimming: r.swimming, bones };
        });
      }));
      await page.screenshot({ path: `${out}/${width}-${mc}-length-${n}.png` });
    }
    for (let who = 0; who < 3; who++) {
      assert.ok(frames.every(f => f[who].swimming));
      assert.ok(Math.abs(frames.at(-1)[who].position[2] - frames[0][who].position[2]) > .4);
      assert.ok(new Set(frames.map(f => JSON.stringify(f[who].bones))).size >= 3, 'arms actually animate during travel');
    }
    await page.evaluate(async () => { const g = globalThis.__game; await globalThis.__length; g.setHurry(true); await g.place.hooks.poolSession({state:'sit'}); g.setHurry(false); });
    const movement = await page.evaluate(() => ({ overlaps:globalThis.__moveCheck.overlaps, spins:globalThis.__moveCheck.spins, gait:globalThis.__gaitCheck.reports(4) }));
    assert.deepEqual(movement, {overlaps:[],spins:[],gait:[]}, JSON.stringify(movement));
    const released = await page.evaluate(() => {
      const g = globalThis.__game, actors = [g.player, g.place.people.emi, g.place.people.kuro];
      g.place.leave();
      return actors.map(r => ({ swimming: r.swimming, noAvoid: !!r._noAvoid }));
    });
    assert.ok(released.every(r => !r.swimming && !r.noAvoid));
    assert.deepEqual(errors, []);
    reports.push({ width, mc, frames, released, movement, errors });
    await context.close();
  }
}, { timeoutMs: 180000 });
fs.writeFileSync(`${out}/report.json`, JSON.stringify(reports, null, 2));
console.log('PASS actual three-swimmer travel, arm motion, and cleared water state; Eric desktop and Carina phone');
