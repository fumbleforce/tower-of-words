// Actual title and pause Load paths, including the reload used by manual slots.
import assert from 'node:assert/strict';
import { withBrowserJob } from '../lib/browser-job.mjs';
import { openGame } from '../../game3d/test/support/open-game.mjs';
import fixture from '../../game3d/test/fixtures/save-v1.json' with { type: 'json' };

const selection = process.argv[2];
if (selection && !['auto', 'slot', 'pause', 'arrival', 'departed', 'phone', 'roundtrip', 'moving'].includes(selection)) throw new Error('Unknown Continue scenario: ' + selection);
const failures = [];
try {
  await withBrowserJob('continue-saves', async browser => {
    for (const [place, period, mode] of [['gate', 'early', 'auto'], ['office', 'lunch', 'auto'],
      ['office', 'afternoon', 'slot'], ['gate', 'morning', 'pause'], ['train', 'early', 'auto'], ['train', 'early', 'arrival'], ['train', 'early', 'departed'], ['office', 'lunch', 'phone'], ['train', 'early', 'roundtrip'], ['office', 'morning', 'roundtrip'], ['gate', 'early', 'roundtrip'], ['office', 'morning', 'moving']]) {
      if (selection && mode !== selection) continue;
      const saved = { ...structuredClone(fixture), place, period, yen: 0 };
      saved.flags = { ...saved.flags, place, period, continueSentinel: place,
        ...(place === 'gate' ? { gateOpen: true, cardOk: true } : place === 'office'
          ? { machineOpen: true, chairHome: true, copier_done: true } : { arrived: true, sat: true }) };
      if (place === 'train' && ['arrival', 'departed', 'roundtrip'].includes(mode)) saved.flags.alighted = true;
      if (place === 'train' && ['departed', 'roundtrip'].includes(mode)) Object.assign(saved.flags, { held_doors: true, on_platform: true, phone_buzz: true });
      saved.ui = { goal: 'Continue the saved task.', sideGoal: '' };
      saved.runner = { onceDone: ['zone:completed>finished'] };
      const seeded = { async newContext(options) {
        const context = await browser.newContext(options);
        await context.addInitScript(data => {
          if (!sessionStorage.getItem('continue-test-seeded')) {
            localStorage.setItem('amakawa-day1-save', JSON.stringify(data));
            localStorage.setItem('amakawa-slot-1', JSON.stringify({ data, place: data.place, period: data.period, at: 1 }));
            localStorage.setItem('amakawa-settings', JSON.stringify({ v: 2, privateMode: false, textSpeed: 'instant', voiceOn: false, reduceMotion: true }));
            sessionStorage.setItem('continue-test-seeded', '1');
          }
        }, saved);
        return context;
      } };
      let opened;
      try {
        opened = await openGame(seeded, { mode: 'title', ...(mode === 'phone' ? { viewport: { width: 390, height: 844 }, touch: true } : {}) });
        const { page } = opened;
        const atTitle = await page.evaluate(() => JSON.parse(localStorage.getItem('amakawa-day1-save')));
        assert.deepEqual(atTitle, saved, `${place}: boot changed saved data before Continue`);
        await page.locator('#title .mcont').click();
        await page.locator('#saves button.slot').filter({ hasText: mode === 'slot' ? 'Slot 1' : 'Autosave' }).click();
        const waitForResume = () => page.waitForFunction(expected => {
          const g = window.__game;
          return g?.place?.name === expected && g.saveEnabled && !g.busy && !g.player.scripted &&
            document.querySelector('#title')?.hidden && !document.body.classList.contains('title-leaving');
        }, place, { timeout: 45000 });
        await waitForResume();
        if (mode === 'pause' || mode === 'phone') {
          await page.locator('#pauseBtn').click();
          await page.locator('#pause .load').click();
          await Promise.all([
            page.waitForEvent('domcontentloaded', { timeout: 15000 }),
            (async () => {
              await page.locator('#saves button.slot').filter({ hasText: 'Slot 1' }).click();
              await page.locator('#ask .yes').click();
            })(),
          ]);
          await waitForResume();
        }
        let capturedWorld;
        if (mode === 'moving') {
          const pending = await page.evaluate(async () => {
            const g = window.__game, S = await import('/game3d/js/sim.js');
            await g.hooks.walk({ who: 'mori', to: 'chief_desk', wait: false });
            g.paused = true;
            S.save(g);
            return S.loadSave();
          });
          assert.deepEqual(pending.world.people.mori.walk.to, [2.3, -2.55]);
          assert.equal(pending.world.people.mori.seated, false);
          await page.reload();
          await page.locator('#title .mcont').click();
          await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
          await waitForResume();
          await page.evaluate(() => { window.__walkSpeed = setInterval(() => window.__game.setHurry(true), 30); });
          await page.waitForFunction(() => {
            const mori = window.__game.place.people.mori;
            return mori.seated && !mori.savedWalk;
          }, null, { timeout: 60000 });
          const arrived = await page.evaluate(() => JSON.parse(localStorage.getItem('amakawa-day1-save')).world.people.mori);
          assert.equal(arrived.walk, undefined);
          assert.equal(arrived.seated, true);
          assert.deepEqual([arrived.position[0], arrived.position[2]], [2.16, -3.36]);
          const contact = await page.evaluate(async () => {
            const g = window.__game, { seatContact } = await import('/game3d/test/support/seat-contact.mjs');
            const busy = g.busy, cam = g.place.cam;
            g.busy = true;
            try {
              cam.closeOn([2.16, -3.36], cam.fitDist / 1.8, 0.6);
              cam.close.conversationShot = { yaw: 0, elev: 0.35, fov: 55, minDistance: 1.8, halfWidth: 0.7 };
              cam.snap(g.player.root.position);
              await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
              return seatContact(g.place, g.place.people.mori, [...Object.values(g.place.people), g.player, g.mioNpc]);
            } finally { g.busy = busy; cam.release(); }
          });
          assert.ok(contact.vertices > 0, 'Mori contact uses rendered body vertices');
          assert.ok(contact.gap >= -0.012 && contact.gap <= 0.001, 'Mori body touches the actual cushion: ' + contact.gap);
        }
        if (mode === 'roundtrip') {
          if (place === 'office') await page.evaluate(async () => {
            const g = window.__game, S = await import('/game3d/js/sim.js');
            g.setHurry(true);
            await g.place.walkPerson('mori', g.posOf('chief_desk'));
            g.setHurry(false);
            S.save(g);
          });
          capturedWorld = await page.evaluate(() => JSON.parse(localStorage.getItem('amakawa-day1-save')).world);
          await page.reload();
          await page.locator('#title .mcont').click();
          await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
          await waitForResume();
        }
        const state = await page.evaluate(async () => {
          const g = window.__game;
          const S = await import('/game3d/js/sim.js');
          S.save(g);
          return { data: S.loadSave(), bodyPlace: document.body.dataset.place, runnerPlace: g.runner.place === g.place,
            playerPosition: g.player.root.position.toArray(),
            floorX: g.place.space.getObjectByName('floor')?.getWorldPosition(g.player.root.position.clone()).x,
            trace: g.runner.trace || [], blocked: g.place.nav.rects.map(r => r.tag), continueFlag: sessionStorage.getItem('amakawa-continue') };
        });
        const { world, ...data } = state.data;
        assert.deepEqual(data, {
          ...saved, pendingStart: null, runner: { ...saved.runner, execution: null },
          // Office restoration initializes its lunch availability; day 1 has no offer.
          flags: { ...saved.flags, ...(place === 'office' ? { mio_lunch_offer: 0 } : {}) },
          mc: 'eric',
          cast: { set: 'default', roles: {
            programmer: 'mio', team_lead: 'emi', section_chief: 'mori', engineer: 'kenji',
            receptionist: 'kuro', new_hire: 'aoi', sales: 'rei', gate_guard: 'guard',
          } },
          visited: { train: ['train'], gate: ['train', 'gate'], office: ['train', 'gate', 'forecourt', 'office'] }[place],
          log: { v: 2, day: 1, items: [], memories: { v: 1, records: [] } },
        }, `${place}/${mode}: restored progression or legacy-save migration changed`);
        assert.equal(state.bodyPlace, place);
        assert.equal(state.runnerPlace, true);
        assert.deepEqual(state.trace, [], 'idle Continue must not replay an opening');
        assert.equal(state.continueFlag, null);
        if (place === 'gate') { assert.equal(world.gateOpen, true); assert.equal(world.cardOk, true); assert.ok(!state.blocked.includes('gate')); }
        if (place === 'office') { assert.equal(world.machineOpen, true); assert.equal(world.chairHome, true); assert.equal(world.copier, 'idle'); assert.ok(!state.blocked.includes('mdoor')); assert.ok(!state.blocked.includes('chair')); }
        if (place === 'train') { assert.equal(world.arrived, true); assert.equal(world.door, 1); assert.ok(!state.blocked.includes('doors')); }
        if (place === 'train' && ['arrival', 'departed', 'roundtrip'].includes(mode)) {
          assert.equal(world.people.aoi.visible, false);
          assert.equal(world.people.mio.seated, false);
          assert.ok(world.people.mio.position[2] > 2);
        }
        if (place === 'train' && ['departed', 'roundtrip'].includes(mode)) {
          assert.equal(world.departed, true); assert.ok(state.playerPosition[2] > 2, JSON.stringify(state.playerPosition));
          assert.ok(state.floorX < -20, `departed carriage floor still at ${state.floorX}`);
        }
        if (capturedWorld) {
          // Head gestures and breathing keep animating; compare root, seat and shadow transforms.
          const stable = people => Object.fromEntries(Object.entries(people).map(([id, { pose, ...person }]) => [id, person]));
          assert.deepEqual(stable(world.people), stable(capturedWorld.people), 'captured passenger transforms and local shadows survive reload');
        }
        if (capturedWorld && place === 'office') {
          assert.equal(world.people.mori.seated, true);
          assert.ok(Math.abs(world.people.mori.position[0] - 2.16) < 0.01);
          assert.ok(Math.abs(world.people.mori.position[2] + 3.36) < 0.01);
          await page.evaluate(() => window.__game.place.cam.closeOn([2.16, -3.36], 3));
          await page.waitForTimeout(800);
          await page.screenshot({ path: '/tmp/codex-continue-mori.png' });
        }
        assert.deepEqual(opened.errors, []);
        console.log(`PASS Continue ${place}/${period}/${mode}`);
      } catch (error) { failures.push(error.message); console.error(`FAIL Continue ${place}/${mode}: ${error.message}`); }
      finally { if (opened) await opened.close(); }
    }
  }, { timeoutMs: 240000 });
  process.exitCode = failures.length ? 1 : 0;
} catch (error) {
  console.error(`${error.code === 'LOAD_DEFERRED' ? 'DEFERRED' : 'FAIL'} Continue: ${error.message}`);
  process.exitCode = error.code === 'LOAD_DEFERRED' ? 75 : 1;
}
