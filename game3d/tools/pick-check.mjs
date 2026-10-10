// Clicking the whole body or object, not just its pin (Jørgen, 2026-10-10: "things that have interaction should be
// clickable, not just the marker, the whole object/person"). In the security lobby on day 1 it clicks (or taps) the
// middle of the guard's body, Kuroda's body while the gate is jammed, an office worker's past the gate, and the middle of the station exit's doorway once
// the gate is open, and checks that the click picked that target and opened Interact (the action menu, a scene or the
// Say menu). The click point must be on the canvas, not on a pin. Hovering must add no mesh to the scene (the pick
// volumes are maths and never draw).
// Usage: node game3d/tools/pick-check.mjs [width]  (390 is the phone; BASE=<worktree>/game3d for a worktree)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';
import { openGame } from '../test/support/open-game.mjs';

const width = +(process.argv[2] || 1366),
  phone = width < 700;
const base = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}`;
const out = new URL('../shots/pick-check/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
// door: the middle of the doorway, at half its height under the pin
const CASES = [
  { name: 'kuroda', flags: { jammed: true }, who: 'kuroda' },
  { name: 'guard-jam', flags: { jammed: true }, who: 'guard' },
  { name: 'guard', flags: { greeted_guard: true, gate_through_way: true, gateOpen: true, gate_through: true }, who: 'guard' },
  { name: 'worker', flags: { greeted_guard: true, gate_through_way: true, gateOpen: true, gate_through: true }, who: 'worker_a' },
  { name: 'exit', flags: { greeted_guard: true, gate_through_way: true, gateOpen: true, gate_through: true }, who: 'lift', door: true },
];
const results = [];
await withBrowserJob('pick-check', async (browser) => {
  for (const c of CASES) {
    const saved = {
      v: 1, day: 1, mc: phone ? 'carina' : 'eric', place: 'gate', period: 'morning', known: ['ohayo'], met: ['mio'],
      flags: { day: 1, place: 'gate', period: 'morning', period_morning: true, ...c.flags },
      seen: [], inv: ['card'], yen: 3000, ui: { goal: '' },
    };
    const opened = await openGame(browser, {
      mode: 'title', viewport: { width, height: phone ? 844 : 860 }, touch: phone, url: `${base}/index.html${process.env.Q ? '?q=' + process.env.Q : ''}`,
      beforeNavigate: async (page) => {
        await page.addInitScript((saved) => {
          if (globalThis.sessionStorage.getItem('seeded')) return;
          globalThis.localStorage.setItem('amakawa-day1-save', JSON.stringify(saved));
          globalThis.sessionStorage.setItem('seeded', '1');
          globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ v: 2, textSpeed: 'instant', voiceOn: false, privateMode: false }));
          globalThis.localStorage.setItem('amakawa-onboard', JSON.stringify({ moved: true, talked: true, uses: 8, sayUsed: true }));
        }, saved);
      },
    });
    const { page } = opened;
    try {
      await page.locator('#title .mcont').click();
      await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
      await opened.waitForSettled();
      // stand a few metres back so the whole target is on screen
      await page.evaluate((who) => {
        const g = globalThis.__game, item = g.markers.list.find((m) => m.id === who);
        if (!item?.enabled()) throw new Error('Unavailable: ' + who);
        const [x, z] = item.spot(), p = g.player.root.position, d = Math.hypot(p.x - x, p.z - z);
        if (d > 3.2) {
          const k = 2.4 / d;
          g.walker.goTo(x + (p.x - x) * k, z + (p.z - z) * k);
        }
      }, c.who);
      await page.waitForFunction(() => !globalThis.__game.walker.path && !globalThis.__game.busy, null, { timeout: 20000 });
      await page.waitForTimeout(700); // the camera settles
      const at = await page.evaluate(async ({ who, door }) => {
        const THREE = await import('three');
        const g = globalThis.__game, P = g.place, item = g.markers.list.find((m) => m.id === who);
        let mid;
        if (door) {
          // the doorway's middle: under the pin, halfway from the floor
          const a = item.anchor(new THREE.Vector3()), floor = P.space.localToWorld(new THREE.Vector3(0, P.floorY || 0, 0)).y;
          mid = a.setY(floor + (a.y - floor) * 0.5);
        } else {
          const box = new THREE.Box3();
          for (const root of g.objsOf(item)) {
            root.updateMatrixWorld(true);
            root.traverseVisible((o) => {
              if (o.isMesh && !o.userData.noOutline) box.expandByObject(o);
            });
          }
          mid = box.getCenter(new THREE.Vector3());
        }
        const v = mid.clone().project(P.camera), r = g.canvas?.getBoundingClientRect?.() || globalThis.document.querySelector('canvas').getBoundingClientRect();
        const x = r.left + ((v.x + 1) / 2) * r.width, y = r.top + ((1 - v.y) / 2) * r.height;
        const el = globalThis.document.elementFromPoint(x, y);
        g.lastPick = null;
        return { x, y, onCanvas: el?.tagName === 'CANVAS', el: el?.id || el?.className || el?.tagName };
      }, c);
      // the volumes are maths, never meshes: picking adds nothing to the scene that could draw
      const meshes = () => page.evaluate(() => {
        let n = 0;
        globalThis.__game.place.space.traverse((o) => (n += o.isMesh ? 1 : 0));
        return n;
      });
      const before = await meshes();
      await page.mouse.move(at.x, at.y);
      assert.equal(await meshes(), before, 'hovering added meshes to the scene');
      if (c.door) {
        // the floor in front of the doorway still walks: 1.5 m into the room from where the door is used
        const floor = await page.evaluate(async (who) => {
          const THREE = await import('three');
          const g = globalThis.__game, P = g.place, item = g.markers.list.find((m) => m.id === who);
          const [sx, sz] = item.spot(), a = P.space.worldToLocal(item.anchor(new THREE.Vector3()));
          const k = 1.5 / Math.hypot(sx - a.x, sz - a.z);
          const v = P.space.localToWorld(new THREE.Vector3(sx + (sx - a.x) * k, P.floorY || 0, sz + (sz - a.z) * k)).project(P.camera);
          const r = globalThis.document.querySelector('canvas').getBoundingClientRect();
          g.lastPick = null;
          return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
        }, c.who);
        if (phone) await page.touchscreen.tap(floor.x, floor.y);
        else await page.mouse.click(floor.x, floor.y);
        const fp = await page.evaluate(() => globalThis.__game.lastPick);
        assert.equal(fp?.by, 'floor', `${c.name}: the floor in front of the door picked ${JSON.stringify(fp)}`);
        await page.waitForFunction(() => !globalThis.__game.walker.path, null, { timeout: 15000 });
        await page.waitForTimeout(500);
      }
      assert.ok(at.onCanvas, `${c.name}: the click point is on ${at.el}, not the canvas`);
      if (phone) await page.touchscreen.tap(at.x, at.y);
      else await page.mouse.click(at.x, at.y);
      const pick = await page.evaluate(() => globalThis.__game.lastPick);
      assert.equal(pick?.id, c.who, `${c.name}: the click picked ${JSON.stringify(pick)}`);
      await page.waitForFunction(
        () =>
          !globalThis.document.querySelector('#actMenu')?.hidden ||
          globalThis.__game.busy ||
          !globalThis.document.querySelector('#sayMenu')?.hidden ||
          globalThis.__game.place?.name !== 'gate',
        null,
        { timeout: 10000 },
      );
      const opens = await page.evaluate(() => ({
        acts: !globalThis.document.querySelector('#actMenu')?.hidden,
        scene: !!globalThis.__game.busy,
        say: !globalThis.document.querySelector('#sayMenu')?.hidden,
      }));
      await page.screenshot({ path: `${out}${width}-${c.name}.png` });
      assert.deepEqual(opened.errors, []);
      results.push({ case: c.name, width, at: [Math.round(at.x), Math.round(at.y)], pick: pick.by, opens, pass: true });
    } catch (e) {
      await page.screenshot({ path: `${out}${width}-${c.name}-fail.png` }).catch(() => {});
      results.push({ case: c.name, width, pass: false, error: e.message.split('\n')[0] });
    } finally {
      await opened.close();
    }
  }
}, gpuWaitOptions(900, 285000));
for (const r of results) console.log(r.pass ? 'PASS' : 'FAIL', JSON.stringify(r));
const ok = results.every((r) => r.pass);
console.log(ok ? 'PASS pick-check' : 'FAIL pick-check', width);
process.exit(ok ? 0 : 1);
