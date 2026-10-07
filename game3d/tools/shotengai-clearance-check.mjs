import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366),
  phone = width < 600,
  height = phone ? 844 : 860;
const round = process.env.ROUND || 'baseline2',
  duration = +(process.env.HOLD_SECONDS || 120);
const base = process.env.BASE || 'game3d';
const out = `game3d/shots/shotengai-clearance/${round}`;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  `shotengai-hold-${width}`,
  async (browser) => {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: phone, hasTouch: phone }),
      page = await context.newPage(),
      errors = [];
    let closing = false;
    await context.route(
      '**/*',
      scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (m) => errors.push(m) }),
    );
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() =>
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({ privateMode: false, voiceOn: false, textSpeed: 'instant' }),
      ),
    );
    try {
      await waitForGame(
        page,
        60000,
        () =>
          page.goto(
            `http://127.0.0.1:8771/${base}/index.html?day=2&place=shotengai&mc=${phone ? 'carina' : 'eric'}&q=2`,
          ),
        'play',
      );
      await page.waitForFunction(() => !globalThis.__game.busy);
      await page.evaluate(async () => {
        const g = globalThis.__game,
          { flags } = await import('./js/narrative/state.js');
        flags.d2_shift_done = true;
        await g.hooks.period({ to: 'evening' });
        await g.place.hooks.partySetup();
        await g.walkTo(...g.place.things.kenji.spot());
      });
      await page.waitForTimeout(600);
      const at = await page.evaluate(() => {
        const m = globalThis.__game.markers.list.find((m) => m.id === 'kenji'),
          r = m.el.querySelector('.pin').getBoundingClientRect();
        return [r.x + r.width / 2, r.y + r.height / 2];
      });
      if (phone) await page.touchscreen.tap(...at);
      else await page.mouse.click(...at);
      await page.waitForTimeout(200);
      const use = page.locator('#actMenu:not([hidden]) .use');
      if (await use.isVisible()) phone ? await use.tap() : await use.click();
      await page.waitForFunction(
        () =>
          globalThis.__game.busy && globalThis.document.querySelector('#talk .line')?.textContent.includes('This way'),
      );
      await page.waitForTimeout(1000);
      await page.evaluate(async () => {
        const g = globalThis.__game,
          { startMoveCheck } = await import('./js/movement/checks.js');
        startMoveCheck(g);
        const p = g.player.root.position,
          k = g.place.people.kenji.root.position;
        const state = (globalThis.__hold = {
          player: p.toArray(),
          kenji: k.toArray(),
          crossings: [0, 0],
          maxNear: 0,
          maxDrift: 0,
          samples: [],
          previous: {},
          start: g.t,
        });
        state.timer = globalThis.setInterval(() => {
          const g = globalThis.__game,
            near = [];
          for (const r of g.place.crowd || []) {
            if (!r.root.visible) continue;
            const p = r.root.position,
              old = state.previous[r.root.uuid];
            const zone = p.z > state.player[2] + 2 ? 1 : p.z < state.player[2] - 2 ? -1 : 0;
            let side = old?.[2] || zone;
            if (old && Math.hypot(p.x - old[0], p.z - old[1]) < 1 && Math.abs(p.x - state.player[0]) < 4) {
              if (zone && side && zone !== side) {
                state.crossings[zone > 0 ? 0 : 1]++;
                side = zone;
              }
            } else side = zone;
            state.previous[r.root.uuid] = [p.x, p.z, side];
            if (Math.hypot(p.x - state.player[0], p.z - state.player[2]) < 3) near.push([p.x, p.z]);
          }
          state.maxDrift = Math.max(
            state.maxDrift,
            Math.hypot(g.player.root.position.x - state.player[0], g.player.root.position.z - state.player[2]),
            Math.hypot(
              g.place.people.kenji.root.position.x - state.kenji[0],
              g.place.people.kenji.root.position.z - state.kenji[2],
            ),
          );
          state.maxNear = Math.max(state.maxNear, near.length);
          state.samples.push({ t: g.t - state.start, near: near.length, crossings: [...state.crossings] });
        }, 200);
      });
      await page.screenshot({ path: `${out}/${width}-start.png` });
      for (let n = 1; n <= 4; n++) {
        await page.waitForTimeout(duration * 250);
        await page.screenshot({ path: `${out}/${width}-${n}.png` });
      }
      const result = await page.evaluate(() => {
        const g = globalThis.__game,
          s = globalThis.__hold;
        globalThis.clearInterval(s.timer);
        delete s.timer;
        delete s.previous;
        return {
          ...s,
          playerEnd: g.player.root.position.toArray(),
          kenjiEnd: g.place.people.kenji.root.position.toArray(),
          pool: g.place.ambient.pool
            .filter((b) => b.state === 'walk')
            .map((b) => ({
              id: g.place.crowd.indexOf(b.r),
              p: b.r.root.position.toArray(),
              i: b.i,
              line: b.line,
              moved: b.moved,
              held: b.held,
              wait: b.wait,
            })),
          move: globalThis.__moveCheck,
          gait: globalThis.__gaitCheck,
        };
      });
      fs.writeFileSync(`${out}/${width}-report.json`, JSON.stringify({ result, errors }, null, 2));
      assert.ok(result.maxDrift < 0.02, 'normal settling stays below 2cm; no actor relocated');
      assert.deepEqual(errors, []);
      if (!process.env.BASELINE) {
        assert.ok(
          result.crossings.every((n) => n >= 3),
          'both directions complete repeated passages during the held scene',
        );
        assert.deepEqual(result.move.overlaps, []);
        assert.deepEqual(result.move.spins, []);
        assert.deepEqual(result.gait.episodes, []);
      }
      console.log(
        'HOLD',
        JSON.stringify({
          crossings: result.crossings,
          maxNear: result.maxNear,
          movement: result.move.overlaps,
          spins: result.move.spins,
          gait: result.gait.episodes,
        }),
      );
    } finally {
      closing = true;
      await context.close();
    }
  },
  { timeoutMs: 280000 },
);
