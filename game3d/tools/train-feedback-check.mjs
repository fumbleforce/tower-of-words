// Real Continue, pointer/keyboard input and dialogue controls for feedback #573/#574.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { openGame } from '../test/support/open-game.mjs';
import { newFrame } from '../js/narrative/checkpoint.js';
import train from '../story/train.js';

const base = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/`;
const out = process.env.OUT || new URL(`../shots/train-feedback/${Date.now()}/`, import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const rows = [], captures = [];
const baseline = !!process.env.BASELINE;
const sizes = (process.env.SIZES || '2327x1196,390x844').split(',').map(s => s.split('x').map(Number));
await withBrowserJob('train-feedback-native', async browser => {
  for (const [width, height] of sizes) for (const scenario of (process.env.SCENARIOS || 'cat,doors').split(',')) {
    let closing = false;
    const blocked = [];
    const flags = { place: 'train', period: 'early', sat: true, chat1: true, lesson_on: true, mio_named: true,
      ...(scenario === 'doors' ? { cat_done: true, lesson_done: true } : {}) };
    const saved = { v: 1, mc: 'carina', day: 1, place: 'train', period: 'early', flags,
      known: scenario === 'doors' ? ['gaijin', 'ohayo', 'yoroshiku'] : ['gaijin'], seen: [], found: [], taught: {},
      met: ['mio'], inv: [], yen: 1000, bonds: {}, ui: { goal: scenario === 'doors' ? 'Wait by the doors.' : '', sideGoal: '' },
      runner: { onceDone: [], execution: scenario === 'cat'
        ? { v: 3, place: 'train', frames: [newFrame('lesson2', train.nodes.lesson2)] } : null }, pendingStart: null };
    const opened = await openGame(browser, { mode: 'title', viewport: { width, height }, touch: width < 700,
      initialOnboarding: { moved: true, talked: true, uses: 3, sayUsed: scenario === 'doors' },
      url: base + 'index.html?q=0&mc=carina', beforeNavigate: async (page, context) => {
        await context.route('**/*', scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: x => blocked.push(x) }));
        await page.addInitScript(saved => {
          if (globalThis.sessionStorage.getItem('train-feedback-seeded')) return;
          globalThis.sessionStorage.setItem('train-feedback-seeded', '1');
          globalThis.localStorage.setItem('amakawa-day1-save', JSON.stringify(saved));
          globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false, voiceOn: false, voiceInput: 'off', textSpeed: 'instant' }));
        }, saved);
      } });
    const { page, errors } = opened;
    const click = async (x, y) => width < 700 ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
    const settled = () => page.waitForFunction(() => {
      const d = globalThis.document, style = globalThis.getComputedStyle;
      const hidden = id => { const e = d.querySelector(id); return !e || e.hidden || style(e).display === 'none'; };
      const ui = d.querySelector('#ui'), talk = d.querySelector('#talk');
      return hidden('#title') && hidden('#xfade') && !d.querySelector('#boot:not(.gone)') &&
        !['at-title', 'title-leaving', 'trip', 'loading'].some(c => d.body.classList.contains(c)) &&
        Number(style(ui).opacity) >= .99 && (talk.hidden || Number(style(talk).opacity) >= .99);
    }, null, { timeout: 15000 });
    const shot = async name => {
      await settled();
      const file = `${width}-${scenario}-${name}.png`;
      const evidence = await page.evaluate(() => ({
        uiOpacity: globalThis.getComputedStyle(globalThis.document.querySelector('#ui')).opacity,
        talkOpacity: globalThis.getComputedStyle(globalThis.document.querySelector('#talk')).opacity,
        titleHidden: globalThis.document.querySelector('#title').hidden,
        crossfadeHidden: !globalThis.document.querySelector('#xfade') || globalThis.document.querySelector('#xfade').hidden,
      }));
      await page.screenshot({ path: `${out}/${file}` });
      captures.push({ file, ...evidence });
    };
    const state = () => page.evaluate(() => {
      const g = globalThis.__game;
      return { busy: g.busy, locked: g.walker.locked, node: g.runner.currentNode, flags: { ...g.flagsRef },
        close: g.place.cam.close, player: g.player.root.position.toArray(), mode: g.place._st.mode,
        aside: g.walker.aside, scripted: !!g.walker.path?.scripted,
        peopleWalking: Object.entries(g.place.people).filter(([, r]) => r._walk).map(([id]) => id),
        line: globalThis.document.querySelector('#talk .line')?.textContent, goal: g.ui.goalText,
        typing: globalThis.document.querySelector('.tp-in')?.getAttribute('aria-label') };
    });
    const advance = async () => {
      const input = page.locator('.tp-in');
      if (await input.isVisible()) {
        const label = await input.getAttribute('aria-label');
        await input.fill(label.replace(/^Type /, ''));
        await input.press('Enter');
      } else if (await page.locator('#talkHit.go').isVisible()) {
        const point = await page.evaluate(() => {
          const d = globalThis.document, hit = d.querySelector('#talkHit.go');
          for (const fy of [.3, .4, .5, .6, .7]) for (const fx of [.5, .3, .7]) {
            const x = globalThis.innerWidth * fx, y = globalThis.innerHeight * fy;
            if (d.elementFromPoint(x, y) === hit) return [x, y];
          }
          throw new Error('No unobstructed dialogue tap area');
        });
        await click(...point);
      }
      await page.waitForTimeout(450);
    };
    const target = async id => {
      const point = await page.evaluate(id => {
        const marker = globalThis.__game.markers.list.find(m => m.id === id);
        if (id === 'door_l' || id === 'door_r') {
          const g = globalThis.__game, v = g.player.root.position.clone();
          const [x, z] = marker.spot();
          v.set(x, 0, z); g.place.space.localToWorld(v); v.project(g.place.camera);
          return [(v.x + 1) * globalThis.innerWidth / 2, (1 - v.y) * globalThis.innerHeight / 2];
        }
        const r = marker?.el.querySelector('.pin').getBoundingClientRect();
        if (!r || !r.width) throw new Error('Invisible marker ' + id);
        return [r.x + r.width / 2, r.y + r.height / 2];
      }, id);
      await click(...point);
    };
    try {
      await page.locator('#title .mcont').click();
      await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
      await page.waitForFunction(() => globalThis.__game?.saveEnabled &&
        !['at-title', 'title-leaving', 'trip', 'loading'].some(c => globalThis.document.body.classList.contains(c)));
      await settled();
      if (scenario === 'cat') {
        for (let i = 0; i < 30; i++) {
          if (!(await state()).busy && (await state()).flags.cat_task) break;
          await advance();
        }
        assert.equal((await state()).flags.cat_task, true, 'native lesson reaches cat request');
        await shot('request');
        await target('tama');
        await page.waitForFunction(() => !globalThis.__game.walker.path && !globalThis.__game.busy);
        if (width < 700) {
          if (!(await page.locator('#actMenu .say').isVisible())) await target('tama');
          await page.locator('#actMenu .say').tap();
        } else await page.keyboard.press('KeyQ');
        await page.locator('#sayMenu button.cmd').filter({ hasText: 'ohay' }).click();
        for (let i = 0; i < 24; i++) {
          const s = await state();
          if (s.flags.cat_done && !s.busy) break;
          await advance();
        }
        const after = await state();
        await page.waitForTimeout(1600);
        await shot('finished');
        assert.equal(after.flags.cat_done, true, 'greeting finished through Say');
        rows.push({ width, scenario, after });
        assert.equal(!!after.close, baseline, 'camera returns to ordinary play after cat greeting');
      } else {
        await page.waitForFunction(() => !globalThis.__game.busy);
        // Walk down the aisle with real input. The train's near-door trigger
        // starts approach before a separate Interact press can be needed.
        const aisleKey = width < 700 ? 'KeyS' : 'KeyA';
        await page.keyboard.down(aisleKey);
        try {
          await page.waitForFunction(() => globalThis.__game.flagsRef.arriving, null, { timeout: 10000 });
        } finally {
          await page.keyboard.up(aisleKey);
        }
        await page.waitForFunction(() => globalThis.__game.place._st.mode === 'approach', null, { timeout: 30000 });
        const before = await state();
        await shot('approach');
        await page.keyboard.down('KeyD');
        await page.waitForTimeout(700);
        await page.keyboard.up('KeyD');
        const held = await state();
        const moved = Math.hypot(held.player[0] - before.player[0], held.player[2] - before.player[2]);
        rows.push({ width, scenario, before, held, moved });
        assert.equal(held.busy, !baseline, 'run-in retains scene ownership');
        assert.equal(moved > .2, baseline, 'walking keys cannot move to the other exit during run-in');
        if (!baseline) {
          await page.keyboard.press('F5');
          await page.waitForTimeout(300);
          const checkpoint = await page.evaluate(() => JSON.parse(globalThis.localStorage.getItem('amakawa-day1-save')));
          assert.equal(checkpoint.runner.execution.frames.at(-1).node, 'approach');
          await page.reload();
          await page.locator('#title .mcont').click();
          await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
          await page.waitForFunction(() => globalThis.__game.runner.currentNode === 'approach' &&
            globalThis.__game.place._st.mode === 'approach' && globalThis.__game.busy);
          assert.equal((await state()).locked, true, 'Continue retains the braking movement lock');
          rows.push({ width, scenario: 'Continue during approach', after: await state() });
          await shot('continued');
        }
        await page.waitForFunction(() => globalThis.__game.runner.currentNode === 'arrival', null, { timeout: 30000 });
        await page.waitForFunction(() => !!globalThis.__game.ui._advance);
        const passiveBefore = await state();
        await page.waitForTimeout(500);
        const passiveAfter = await state();
        rows.push({ width, scenario: 'arrival staging without input', passiveBefore, passiveAfter });
        await page.waitForFunction(() => {
          const g = globalThis.__game, p = g.player.root.position;
          const q = globalThis.__trainMotion || { x: p.x, z: p.z, still: 0 };
          const idle = !g.walker.path && !g.walker.aside && Object.values(g.place.people).every(r => !r._walk);
          q.still = idle && Math.hypot(p.x - q.x, p.z - q.z) < .0001 ? q.still + 1 : 0;
          q.x = p.x; q.z = p.z; globalThis.__trainMotion = q;
          return q.still >= 12;
        }, null, { timeout: 15000 });
        await shot('sumimasen');
        const framing = await page.evaluate(() => {
          const g = globalThis.__game, camera = g.place.camera;
          const project = (root, x, y, z) => {
            const v = g.player.root.position.clone().set(x, y, z);
            root.localToWorld(v); v.project(camera);
            return [(v.x + 1) * globalThis.innerWidth / 2, (1 - v.y) * globalThis.innerHeight / 2];
          };
          const bodies = Object.fromEntries([['player', g.player], ['aoi', g.place.people.aoi]].map(([id, rig]) =>
            [id, [-.32, .32].flatMap(x => [0, 1.4].map(y => project(rig.root, x, y, 0)))]));
          const doorway = [-3.1, -2.2].flatMap(x => [0, 1.22].map(y => project(g.place.space, x, y, 1.2)));
          const uiTop = Math.min(globalThis.document.querySelector('#talk').getBoundingClientRect().top,
            ...Array.from(globalThis.document.querySelectorAll('.por:not([hidden]):not(.aside)'))
              .map(e => e.getBoundingClientRect()).filter(r => r.width && r.height).map(r => r.top));
          return { bodies, doorway, uiTop };
        });
        rows.push({ width, scenario: 'lesson framing', framing });
        if (width < 700 && !baseline) for (const [id, points] of Object.entries({ ...framing.bodies, doorway: framing.doorway }))
          assert.ok(points.every(([x, y]) => x > 0 && x < width && y > 0 && y < framing.uiTop - 8),
            `${id} remains onscreen above the dialogue portraits`);
        const lesson = await state();
        assert.equal(lesson.busy, true);
        await target('door_r');
        await page.keyboard.down('KeyD');
        await page.waitForTimeout(500);
        await page.keyboard.up('KeyD');
        const attempted = await state();
        rows.push({ width, scenario: 'sumimasen input rejection', before: lesson, after: attempted });
        assert.ok(Math.hypot(attempted.player[0] - lesson.player[0], attempted.player[2] - lesson.player[2]) < .02,
          'other exit click and movement keys leave the player at the sumimasen scene');
        for (let i = 0; i < 100; i++) {
          if ((await state()).flags.alighted && !(await state()).busy) break;
          await advance();
        }
        assert.equal((await state()).flags.alighted, true, 'sumimasen scene completes');
        await shot('alighted');
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(blocked, []);
    } catch (error) {
      rows.push({ width, scenario, error: error.message, state: await state().catch(() => null) });
      await shot('failure').catch(() => {});
      throw error;
    } finally {
      fs.writeFileSync(`${out}/result.json`, JSON.stringify({ baseline, rows, captures }, null, 2));
      closing = true;
      await opened.close();
    }
  }
}, { timeoutMs: 290000, ...gpuWaitOptions(1800) });
console.log('PASS native train feedback', JSON.stringify({ baseline, rows }));
console.log('artifacts:', out);
