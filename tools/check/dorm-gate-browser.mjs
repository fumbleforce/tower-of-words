// Day 2 out of the dorm court on foot, from a loaded save: Jørgen's report 2026-10-10_000156 (an invisible wall at
// the gate after Continue). The save stands Eric where he stood, just inside the gate; holding the key toward the
// lane must walk him through the gate and on to the east lane. Day 1's court still ends at the gate.
// BASE=.claude/worktrees/<name>/game3d tests a worktree; WIDTH/HEIGHT pick the size (phone: 390 844).
import assert from 'node:assert/strict';
import { withBrowserJob } from '../lib/browser-job.mjs';

const base = `http://127.0.0.1:${process.env.PORT || 8771}/${process.env.BASE || 'game3d'}/index.html`;
const viewport = { width: +(process.env.WIDTH || 1366), height: +(process.env.HEIGHT || 860) };
const phone = viewport.width < viewport.height;
const settled = (place) => (page) =>
  page.waitForFunction(
    (place) => {
      const g = window.__game;
      return g?.place?.name === place && g.saveEnabled && !g.busy && !g.player.scripted &&
        !document.body.classList.contains('at-title') && !document.body.classList.contains('title-leaving');
    },
    place,
    { timeout: 60000 },
  );

try {
  await withBrowserJob('dorm-gate', async (browser) => {
    const context = await browser.newContext({ viewport, isMobile: phone, hasTouch: phone });
    await context.addInitScript(() => {
      if (sessionStorage.getItem('dorm-gate-seeded')) return;
      localStorage.clear();
      localStorage.setItem('amakawa-settings', JSON.stringify({ v: 2, privateMode: false, textSpeed: 'instant', voiceOn: false, reduceMotion: true }));
      sessionStorage.setItem('dorm-gate-seeded', '1');
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      // day 1: the court ends at the gate
      await page.goto(`${base}?q=0&place=dorm_court`);
      await settled('dorm_court')(page);
      const day1 = await page.evaluate(() => window.__game.place.nav.free(0.5, 3.2));
      assert.equal(day1, false, 'day 1: the gate onto the lane stays shut');

      // day 2 morning in the court, Eric where Jørgen stood, saved as the autosave
      await page.goto(`${base}?q=0&day=2&place=dorm_court`);
      await settled('dorm_court')(page);
      await page.evaluate(async () => {
        const g = window.__game, S = await import(new URL('js/sim.js', location.href).href);
        g.player.root.position.set(0.11, 0, 2.21);
        g.player.root.rotation.y = 0.67;
        g.walker.sync();
        S.save(g);
      });
      // a fresh page: the title, Continue, the autosave
      await page.goto(`${base}?q=0`);
      await page.waitForFunction(() => document.body.classList.contains('at-title'), null, { timeout: 60000 });
      await page.locator('#title .mcont').click();
      await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
      await settled('dorm_court')(page);
      const at = await page.evaluate(() => [window.__game.player.root.position.x, window.__game.player.root.position.z]);
      assert.ok(Math.hypot(at[0] - 0.11, at[1] - 2.21) < 0.05, 'restored where saved: ' + at);

      // hold the key toward the lane (the court's camera looks north, so down is south, out of the gate)
      await page.keyboard.down('ArrowDown');
      let furthest = at[1];
      const t0 = Date.now();
      let place = 'dorm_court', shot = null;
      while (Date.now() - t0 < 15000 && place === 'dorm_court') {
        await page.waitForTimeout(200);
        const s = await page.evaluate(() => ({ place: window.__game.place?.name, z: window.__game.player.root.position.z }));
        place = s.place;
        if (place === 'dorm_court') furthest = Math.max(furthest, s.z);
        // SHOTS=<dir>: a picture of him in the gate, to look at
        if (process.env.SHOTS && place === 'dorm_court' && s.z > 2.9 && !shot) {
          shot = `${process.env.SHOTS}/dorm-gate-${viewport.width}x${viewport.height}.png`;
          await page.screenshot({ path: shot });
        }
      }
      await page.keyboard.up('ArrowDown');
      assert.equal(place, 'east_lane', `day 2: still in the court, stopped at z ${furthest.toFixed(2)} (the gate is at 2.7)`);
      assert.deepEqual(errors, []);
      console.log(`PASS dorm gate ${viewport.width}x${viewport.height}: day 1 shut; day 2 from a loaded save walks out to the east lane`);
    } finally {
      await context.close();
    }
  }, { timeoutMs: Number(process.env.GPU_WAIT_MS || 0) + 280000, loadWaitMs: 180000, gpuWaitMs: Number(process.env.GPU_WAIT_MS || 240000) });
} catch (error) {
  console.error(`${error.code === 'LOAD_DEFERRED' ? 'DEFERRED' : 'FAIL'} dorm gate: ${error.message}`);
  process.exitCode = error.code === 'LOAD_DEFERRED' ? 75 : 1;
}
