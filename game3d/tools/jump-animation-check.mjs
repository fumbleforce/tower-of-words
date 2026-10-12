// Real keyboard/phone presses, stepped through the game's capture clock for reproducible motion frames.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366),
  height = width < 700 ? 844 : 860;
const mc = process.argv[3] || 'eric',
  phone = width < 700;
const roof = process.env.ROOF === '1';
const base = process.env.BASE_URL || 'http://127.0.0.1:8771/game3d';
const out = new URL(`../shots/jump-animation/${mc}-${width}-${roof ? 'roof' : 'final'}/`, import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  `jump-animation-${mc}-${width}`,
  async (browser) => {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: phone, hasTouch: phone });
    await page.route('**/api/plugins', (route) => route.fulfill({ json: [] }));
    await page.route('**/island/private/**', (route) => route.abort());
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() =>
      globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false, voiceOn: false })),
    );
    await waitForGame(
      page,
      60000,
      () => page.goto(`${base}/index.html?place=${roof ? 'clinic' : 'plaza'}&q=0&cap&mc=${mc}`),
      'play',
    );
    await page.locator('#boot').waitFor({ state: 'hidden', timeout: 60000 });
    await page.evaluate((roof) => {
      const g = globalThis.__game;
      g.walker.stop();
      g.jump.reset();
      const [x, z] = roof ? [0, -5] : g.place.spots.fountain_edge;
      g.player.root.position.set(x, 0, z + 2);
      g.walker.sync();
      g.player.root.rotation.y = -0.35;
      g.walker.facing = -0.35;
      g.followCamera.holdView();
      g.followCamera.beforeStep();
      g.followCamera.refresh = g.followCamera.beforeStep = g.followCamera.afterStep = () => {};
      g.place.cam.update = () => {};
      const at = g.player.root.getWorldPosition(g.player.root.position.clone());
      g.place.camera.position.copy(at).add({ x: 2.5, y: 2.25, z: 4 });
      g.place.camera.lookAt(at.x, at.y + 0.9, at.z);
      g.place.camera.fov = 38;
      g.place.camera.updateProjectionMatrix();
    }, roof);
    const advance = (t) => page.evaluate((t) => globalThis.__advance(t), t);
    const sample = () =>
      page.evaluate(() => {
        const g = globalThis.__game,
          p = g.jump.hop.getObjectByName('jump-somersault');
        return {
          air: g.jump.air,
          height: g.jump.height,
          angle: p?.rotation.x,
          busy: g.busy,
          count: g.jump.count,
          salto: g.jump.salto,
        };
      });
    const frames = [];
    const shot = async (name) => {
      frames.push({ name, ...(await sample()) });
      await page.screenshot({ path: out + name + '.png' });
    };
    const press = async () => {
      if (phone) {
        const rect = await page.locator('#jumpBtn').boundingBox();
        assert(rect);
        await page.touchscreen.tap(rect.x + rect.width / 2, rect.y + rect.height / 2);
      } else {
        await page.keyboard.down('KeyW');
        await page.keyboard.down('Space');
        await page.keyboard.up('KeyW');
      }
    };
    const release = () => (phone ? Promise.resolve() : page.keyboard.up('Space'));
    await advance(0.05);
    await shot('00-ground');
    for (let n = 1; n <= 3; n++) {
      if (roof && n === 3) {
        await page.evaluate(() => {
          const g = globalThis.__game;
          g.player.root.position.set(0, 0, 0);
          g.walker.sync();
          const at = g.player.root.getWorldPosition(g.player.root.position.clone());
          g.place.camera.position.copy(at).add({ x: 2.5, y: 2.25, z: 4 });
          g.place.camera.lookAt(at.x, at.y + 0.9, at.z);
        });
      }
      await press();
      if (n === 3) await release(); // Even a quick third press must complete the visible salto.
      await advance(phone && n < 3 ? 0.025 : 0.08);
      if (!(roof && n === 3)) assert.equal((await sample()).air, true, JSON.stringify({ n, state: await sample() }));
      await shot(`${n}-takeoff`);
      if (roof && n === 3) {
        const blocked = await sample();
        assert.equal(blocked.count, 3);
        assert.equal(blocked.salto, false);
        assert.equal(blocked.angle, 0);
        await shot('3-roof-safe');
      } else if (n === 3) {
        await advance(0.175);
        const middle = await sample();
        assert(middle.angle > 3 && middle.angle < 3.5);
        await shot('3-inverted');
        await advance(0.225);
        const end = await sample();
        assert(end.air, 'third quick tap keeps its full arc');
        assert(Math.abs(end.angle - Math.PI * 2) < 0.001);
        await shot('3-unfold');
      } else {
        assert.equal((await sample()).angle, 0);
        await advance(phone ? 0.03 : 0.19);
        await shot(`${n}-air`);
        await release();
      }
      let landed = false;
      for (let f = 0; f < 60; f++) {
        await advance(1 / 60);
        const state = await sample();
        if (!state.air) {
          assert.equal(state.angle, 0);
          landed = true;
          break;
        }
      }
      assert(landed, 'jump lands within one second');
      await shot(`${n}-landing`);
      await advance(0.15);
    }
    // Pausing the chain returns to an ordinary jump, and an interrupted flip is immediately upright.
    await advance(0.6);
    await press();
    await advance(0.255);
    assert.equal((await sample()).angle, 0);
    await release();
    await page.evaluate(() => globalThis.__game.jump.reset());
    assert.equal((await sample()).angle, 0);
    await shot('4-restored');
    assert.deepEqual(errors, []);
    fs.writeFileSync(out + 'result.json', JSON.stringify({ pass: true, mc, width, frames, errors }, null, 2));
    console.log('PASS jump animation', mc, width, out);
    await page.close();
  },
  gpuWaitOptions(900, 150000),
);
