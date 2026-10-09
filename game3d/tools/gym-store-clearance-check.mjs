// Walk the production store approach, then inspect the avatar beside the actual sliding-panel mesh.
// The close view changes only the camera. Native overview captures remain separate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';

const base = process.env.BASE || 'game3d';
const out = process.env.OUT || new URL('../shots/gym-store-clearance/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('gym-store-clearance', async browser => {
  for (const [width, height] of [[1366, 860], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700 });
    const page = await context.newPage(), errors = [], report = { width, height, errors };
    let closing = false;
    await context.route('**/*', scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: e => errors.push(e) }));
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false, voiceOn: false })));
    try {
      await waitForGame(page, 60000, () => page.goto(`http://127.0.0.1:8771/${base}/index.html?place=gym&q=1`), 'play');
      await page.waitForFunction(() => !globalThis.__game.busy);
      await page.evaluate(async () => {
        const g = globalThis.__game;
        await g.walkTo(...g.place.spots.gym_store);
        g.walker.faceTo(g.player.root.position.x, -12);
      });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${out}/${width}-native.png` });
      report.clearance = await page.evaluate(async () => {
        const g = globalThis.__game, THREE = await import('three');
        const panel = g.place.space.children.find(o => o.userData.surf === 'door' && o.material?.color.getHexString() === '8e949e');
        if (!panel) throw new Error('Store sliding panel mesh not found');
        g.place.space.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(panel), avatar = new THREE.Box3().setFromObject(g.player.root, true);
        const p = g.player.root.position, target = g.place.spots.gym_store;
        return {
          target, arrived: [p.x, p.z], distance: Math.hypot(p.x - target[0], p.z - target[1]),
          panel: { min: bounds.min.toArray(), max: bounds.max.toArray() },
          avatar: { min: avatar.min.toArray(), max: avatar.max.toArray() },
          clearWest: bounds.min.x - avatar.max.x,
          overlap: bounds.intersectsBox(avatar),
        };
      });
      await page.evaluate(() => {
        const g = globalThis.__game, cam = g.place.cam;
        cam.closeOn(g.place.spots.gym_store, 3.8, 0.35);
        cam.snap(g.player.root.position);
      });
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${out}/${width}-close.png` });
      assert(report.clearance.distance < 0.1, 'Player must reach the production gym_store spot');
      assert(!report.clearance.overlap, 'Avatar bounds must clear the actual store sliding panel');
      assert(report.clearance.clearWest > 0.04, 'Avatar must have visible clearance west of the sliding panel');
      assert.deepEqual(errors, []);
      console.log(`PASS ${width} gym_store: ${report.clearance.clearWest.toFixed(3)} m west clearance`);
    } catch (error) {
      report.failure = error.stack;
      throw error;
    } finally {
      fs.writeFileSync(`${out}/${width}-report.json`, JSON.stringify(report, null, 2));
      closing = true;
      await context.close();
    }
  }
}, { timeoutMs: 240000 });
