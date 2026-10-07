// Normal movement and native door/seat input, in isolated browser storage. No player-position assignment.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const output = new URL('../shots/canteen-interior/', import.meta.url).pathname;
const base = process.env.BASE || 'game3d';
const width = +(process.argv[2] || 1366), height = +(process.argv[3] || 860), phone = width < height;
const size = `${width}x${height}`;
fs.mkdirSync(output, { recursive: true });
await withBrowserJob('canteen-player-check', async browser => {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: phone, hasTouch: phone });
  const page = await context.newPage(), errors = [], checks = [];
  page.on('pageerror', e => errors.push(e.message));
  const check = (name, value) => { assert.ok(value, name); checks.push(name); };
  const capture = name => page.screenshot({ path: path.join(output, `${size}-${name}.png`) });
  const settled = () => page.waitForFunction(() => !window.__game.busy && !window.__game.walker.path, null, {timeout: 30000});
  // The approach uses the game's normal navigator, with real animation. Interactions below use native pointer input.
  const approach = id => page.evaluate(async id => {
    const g = window.__game; await g.walkTo(...g.place.things[id].spot());
  }, id);
  async function use(id) {
    await settled(); await page.waitForTimeout(350);
    const point = await page.evaluate(id => {
      const el = window.__game.markers.list.find(m => m.id === id).el;
      const r = el.querySelector('.pin').getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
      if (!(x > 0 && x < innerWidth && y > 0 && y < innerHeight) || document.elementFromPoint(x, y)?.closest('.mark') !== el)
        throw new Error(`Unreachable native target ${id}: ${x},${y}`);
      return {x,y};
    }, id);
    if (phone) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(250);
    const action = page.locator('#actMenu:not([hidden]) .use');
    if (await action.isVisible()) { if (phone) await action.tap(); else await action.click(); }
  }
  try {
    await waitForGame(page, 60000, () => page.goto(`http://127.0.0.1:8771/${base}/index.html?place=plaza&q=0`), 'play');
    await settled();
    await approach('canteen_door'); await capture('plaza-door');
    await use('canteen_door');
    await page.waitForFunction(() => window.__game.place.name === 'canteen' && !window.__game.busy, null, {timeout: 30000});
    check('native facade-door entry', await page.evaluate(() => Math.abs(window.__game.player.root.position.z + 0.8) < 0.12));
    await page.waitForTimeout(750); await capture('day');
    for (const id of ['canteen_seat_w', 'canteen_seat_e']) {
      await approach(id); await use(id);
      await page.waitForFunction(() => window.__game.player.seated && !window.__game.busy);
      check(`native sit ${id}`, await page.evaluate(id => {
        const g = window.__game, s = g.place.seats[id], p = g.player.root.position;
        return Math.hypot(p.x - s.x, p.z - s.z) < 0.03 && g.player.state === 'sit';
      }, id));
      await capture(id);
      if (phone) await page.locator('#qsaveBtn').tap(); else await page.keyboard.press('F5');
      await page.waitForFunction(() => /Quick saved/.test(document.querySelector('#toast')?.textContent || ''));
      await waitForGame(page, 60000, () => page.goto(`http://127.0.0.1:8771/${base}/index.html?q=0`), 'title');
      if (phone) await page.locator('#title .mcont').tap(); else await page.locator('#title .mcont').click();
      const quickSlot = page.locator('.slot[data-id="quick"]');
      await waitForGame(page, 60000, async () => {
        if (phone) await quickSlot.tap(); else await quickSlot.click();
      }, 'play');
      await page.waitForFunction(() => window.__game?.place?.name === 'canteen' && !window.__game.busy);
      check('saved sitter resumes on chair ' + id, await page.evaluate(id => {
        const g=window.__game,s=g.place.seats[id],p=g.player.root.position;
        return g.player.seated && g.player.state==='sit' && Math.hypot(p.x-s.x,p.z-s.z)<0.03 && JSON.stringify(g.player.seatOut)===JSON.stringify(s.out);
      },id));
      await page.waitForFunction(() => !document.querySelector('#boot:not(.gone)') && !document.body.classList.contains('loading'));
      await page.waitForTimeout(700);
      await capture(id+'-continued');
      const point = await page.evaluate(async () => {
        const g=window.__game, {Vector3}=await import('./vendor/three/three.module.js');
        const p=g.place.space.localToWorld(new Vector3(g.place.start[0], 0, -3.3));
        p.project(g.place.camera); return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};
      });
      if (phone) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
      await page.waitForFunction(() => !window.__game.player.seated && !window.__game.walker.path);
      check('stand onto free floor ' + id, await page.evaluate(() => { const g=window.__game,p=g.player.root.position;return g.place.nav.free(p.x,p.z); }));
    }
    check('service approaches reachable in final room', await page.evaluate(() => {
      const g=window.__game,w=g.place,p=g.player.root.position;
      return Object.values(w.spots).every(s=>w.nav.free(...s) && w.nav.path(p.x,p.z,...s)?.length);
    }));
    await page.evaluate(async () => {const g=window.__game; await g.walkTo(...g.place.spots.meal_counter);});
    await capture('service');
    await page.evaluate(async () => { const {setPeriod}=await import('./js/sim.js'); setPeriod('evening',window.__game); });
    await page.waitForTimeout(700); await capture('evening');
    check('evening light active', await page.evaluate(() => window.__game.place.sun.intensity === 0.65));
    await approach('canteen_exit'); await use('canteen_exit');
    await page.waitForFunction(() => window.__game.place.name === 'plaza' && !window.__game.busy, null, {timeout:30000});
    check('return outside actual facade door', await page.evaluate(() => {const g=window.__game,p=g.player.root.position,s=g.place.things.canteen_door.spot();return Math.hypot(p.x-s[0],p.z-s[1])<0.12;}));
    await capture('return');
    await use('canteen_door');
    await page.waitForFunction(() => window.__game.place.name === 'canteen' && !window.__game.busy);
    await page.evaluate(async () => { const {setPeriod}=await import('./js/sim.js'); setPeriod('morning',window.__game); });
    await page.waitForFunction(() => window.__game.place.sun.intensity === 1.1);
    check('reused room restores daylight', await page.evaluate(() => window.__game.place.sun.intensity===1.1));
    check('no runtime errors', !errors.length);
    const renderer = await page.evaluate(() => {const g=window.__game,gl=g.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);});
    fs.writeFileSync(path.join(output, `${size}-report.json`), JSON.stringify({checks,errors,renderer},null,2)+'\n');
    console.log('PASS', size, checks, renderer);
  } catch(error) {
    await capture('failure'); console.error(errors); throw error;
  } finally { await context.close(); }
}, {timeoutMs: 260000});
