// Native opening input and real Continue, with all requests limited to public content.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { openGame } from '../test/support/open-game.mjs';
const base = process.env.BASE || 'http://127.0.0.1:8771/game3d/';
const out = process.env.OUT || new URL('../shots/opening-controls/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const report = [];
await withBrowserJob(
  'opening-controls',
  async (browser) => {
    for (const [width, height] of [
      [2560, 1440],
      [390, 844],
    ]) {
      let closing = false;
      const failures = [];
      const { page, context, errors } = await openGame(browser, {
        mode: 'play',
        viewport: { width, height },
        touch: width < 700,
        url: base + 'index.html?q=0',
        beforeNavigate: async (p, c) => {
          await c.route(
            '**/*',
            scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (e) => failures.push(e) }),
          );
          await p.addInitScript(() =>
            globalThis.localStorage.setItem(
              'amakawa-settings',
              JSON.stringify({ privateMode: false, textSpeed: 'instant', voiceOn: false }),
            ),
          );
        },
      });
      const press = async (x, y) => (width < 700 ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
      const finishConversation = async () => {
        for (let i = 0; i < 16; i++) {
          const state = await page.evaluate(() => ({
            busy: globalThis.__game.busy,
            talk: !globalThis.document.querySelector('#talk').hidden,
            goal: globalThis.__game.ui.goalText,
          }));
          if (!state.busy && state.goal) return;
          if (state.talk) {
            const box = await page.locator('#talk').boundingBox();
            await press(box.x + box.width / 2, box.y + box.height / 2);
          }
          await page.waitForTimeout(700);
        }
      };
      const capture = async (name) => {
        await page.waitForFunction(
          () => Number(globalThis.getComputedStyle(globalThis.document.querySelector('#ui')).opacity) >= 0.99,
        );
        await page.waitForTimeout(250);
        const data = await page.evaluate(async (base) => {
          const visible = (e) =>
            e &&
            e.getBoundingClientRect().width > 0 &&
            globalThis.getComputedStyle(e).display !== 'none' &&
            globalThis.getComputedStyle(e).visibility !== 'hidden';
          const g = globalThis.__game;
          const tip = globalThis.document.querySelector('#pinTip');
          let tooltip = null;
          if (visible(tip) && !tip.hidden) {
            const { thingBox, elBox } = await import(base + 'js/ui/screen-box.js');
            const target = g.markers.tip.for;
            const playerBox = g.ericBox?.() || null;
            const targetBox = target ? thingBox(g, target) : null;
            const bodies = [playerBox, targetBox].filter(Boolean);
            const r = tip.getBoundingClientRect();
            tooltip = {
              text: tip.innerText,
              rect: r.toJSON(),
              geometry: {
                pin: target ? elBox(target.el.querySelector('.pin')) : null,
                player: playerBox,
                target: targetBox,
                key: target ? elBox(target.el.querySelector('.key')) : null,
                goal: elBox(globalThis.document.querySelector('#goal')),
                hud: elBox(globalThis.document.querySelector('#hud')),
                viewport: elBox(g.markers.layer),
                candidate: { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom },
                size: { width: tip.offsetWidth, height: tip.offsetHeight },
              },
              overlapsBodies: bodies.some((b) => r.left < b.x1 && r.right > b.x0 && r.top < b.y1 && r.bottom > b.y0),
            };
          }
          const goalText = globalThis.document.querySelector('#goal .gl .t');
          const goal = globalThis.document.querySelector('#goal');
          const goalRect = visible(goal) ? goal.getBoundingClientRect() : null;
          const overlapsGoal = (e) => {
            if (!goalRect || !visible(e)) return false;
            const r = e.getBoundingClientRect();
            return (
              r.left < goalRect.right && r.right > goalRect.left && r.top < goalRect.bottom && r.bottom > goalRect.top
            );
          };
          const markerOverlaps = g.markers.list
            .filter(
              (m) =>
                !m.el.classList.contains('crowded') &&
                (overlapsGoal(m.el.querySelector('.pin')) || overlapsGoal(m.el.querySelector('.key'))),
            )
            .map((m) => m.id);
          return {
            viewport: { width: globalThis.innerWidth, height: globalThis.innerHeight },
            goalLayout: visible(goalText)
              ? {
                  rect: goalText.getBoundingClientRect().toJSON(),
                  clipped:
                    goalText.scrollWidth > goalText.clientWidth + 1 ||
                    goalText.scrollHeight > goalText.clientHeight + 1,
                }
              : null,
            markerOverlaps,
            tooltip,
            classes: globalThis.document.body.className,
            goal: g.ui.goalText,
            held: globalThis.__onboard.holdGoal,
            controls: visible(globalThis.document.querySelector('#ctrlLine')),
            busy: g.busy,
            near: g.near?.id,
            pins: g.markers.list
              .filter((m) => visible(m.el.querySelector('.pin')) && !m.el.classList.contains('crowded'))
              .map((m) => ({ id: m.id, goal: m.el.classList.contains('goal') })),
            hud: [...globalThis.document.querySelectorAll('#hud button')]
              .filter(visible)
              .map((e) => ({ id: e.id, text: e.innerText, rect: e.getBoundingClientRect().toJSON() })),
            talk: globalThis.document.querySelector('#talk').innerText,
          };
        }, base);
        report.push({ width, name, ...data });
        await page.screenshot({ path: `${out}/${width}-${name}.png` });
        fs.writeFileSync(out + '/report.json', JSON.stringify(report, null, 2));
        console.log(width, name, JSON.stringify(data));
        for (const button of data.hud) {
          assert(
            button.rect.left >= 0 && button.rect.right <= data.viewport.width,
            `${name}: ${button.id} fits horizontally`,
          );
          assert(
            button.rect.top >= 0 && button.rect.bottom <= data.viewport.height,
            `${name}: ${button.id} fits vertically`,
          );
          if (width < 700) assert(button.rect.height >= 44, `${name}: ${button.id} has a 44px touch target`);
        }
        if (data.goalLayout) assert(!data.goalLayout.clipped, `${name}: the goal text is fully readable`);
        assert.deepEqual(data.markerOverlaps, [], `${name}: goal panel keeps clear of pins and E prompts`);
        if (data.tooltip) {
          assert(!data.tooltip.overlapsBodies, `${name}: tooltip clears Eric and its target`);
          assert(
            data.tooltip.rect.left >= 0 && data.tooltip.rect.right <= data.viewport.width,
            `${name}: tooltip fits horizontally`,
          );
          assert(
            data.tooltip.rect.top >= 0 && data.tooltip.rect.bottom <= data.viewport.height,
            `${name}: tooltip fits vertically`,
          );
        }
        return data;
      };
      try {
        await page.waitForFunction(() => globalThis.document.body.classList.contains('ob-walking'));
        const first = await capture('arrival');
        assert(first.pins.length >= 4, 'opening retains usable passenger pins');
        assert(first.pins.every((p) => !p.goal));
        assert.deepEqual(
          first.hud.map((h) => h.id),
          ['pauseBtn'],
        );
        // Native floor movement in the aisle, away from the free seat.
        for (const x of [-1.35, -0.15]) {
          const pt = await page.evaluate((x) => {
            const g = globalThis.__game,
              v = g.player.root.position.clone().set(x, 0, 0.1);
            g.place.space.localToWorld(v);
            v.project(g.place.camera);
            return [((v.x + 1) / 2) * globalThis.innerWidth, ((1 - v.y) / 2) * globalThis.innerHeight];
          }, x);
          await press(...pt);
          await page.waitForTimeout(2200);
        }
        await page.waitForFunction(() => !globalThis.document.body.classList.contains('ob-walking'), null, {
          timeout: 10000,
        });
        const walked = await capture('walked');
        const utilities = (data) =>
          data.hud.filter((h) => ['qsaveBtn', 'feedbackBtn', 'pauseBtn'].includes(h.id)).map((h) => h.id);
        assert.deepEqual(
          utilities(walked),
          width < 700 ? ['qsaveBtn', 'feedbackBtn', 'pauseBtn'] : ['feedbackBtn', 'pauseBtn'],
        );
        const pt = await page.evaluate(() => {
          const e = globalThis.__game.markers.list.find((m) => m.id === 'music').el.querySelector('.pin'),
            r = e.getBoundingClientRect();
          return [r.x + r.width / 2, r.y + r.height / 2];
        });
        await press(...pt);
        await page.waitForTimeout(1800);
        const menu = page.locator('#actMenu:not([hidden]) button').first();
        if (await menu.isVisible()) await menu.click();
        await finishConversation();
        await page.waitForFunction(() => !globalThis.__game.busy && !!globalThis.__game.ui.goalText, null, {
          timeout: 15000,
        });
        const hoverPoint = await page.evaluate(() => {
          const r = globalThis.__game.markers.list
            .find((m) => m.id === 'music')
            .el.querySelector('.pin')
            .getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        });
        if (width < 700) {
          const touch = await context.newCDPSession(page);
          await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [hoverPoint] });
          await page.waitForTimeout(550);
          await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await touch.detach();
        } else await page.mouse.move(hoverPoint.x, hoverPoint.y);
        const goal = await capture('seat-goal');
        assert(goal.tooltip, 'hover or long press keeps its target tooltip visible');
        assert(!goal.busy, 'long press previews without starting another conversation');
        assert.deepEqual(
          goal.pins.filter((p) => p.goal).map((p) => p.id),
          ['goal_at'],
        );
        if (width < 700) await page.locator('#qsaveBtn').tap();
        else await page.keyboard.press('F5');
        await page.waitForFunction(() => !!globalThis.localStorage.getItem('amakawa-slot-quick'));
        await page.reload();
        await page.locator('#title .mcont').waitFor({ state: 'visible', timeout: 60000 });
        await page.locator('#title .mcont').click();
        await page.locator('#saves .slot[data-id="quick"]').click();
        await page.waitForFunction(
          () =>
            globalThis.__game?.place &&
            !globalThis.document.body.classList.contains('at-title') &&
            !globalThis.__game.busy,
        );
        await page.waitForTimeout(600);
        const restored = await capture('continued');
        assert(!restored.classes.includes('ob-walking'));
        assert.equal(restored.goal, goal.goal);
        assert.deepEqual(utilities(restored), utilities(walked), 'Continue retains utility order');
        assert.deepEqual(
          restored.pins.filter((p) => p.goal).map((p) => p.id),
          ['goal_at'],
        );
        await page.evaluate(() => globalThis.localStorage.removeItem('amakawa-onboard'));
        await page.goto(base + 'index.html?day=2&place=train&q=0');
        await page.waitForFunction(() => globalThis.__game?.place?.name === 'train' && globalThis.__game?.player);
        await finishConversation();
        await page.waitForFunction(
          () =>
            globalThis.__game?.place?.name === 'train' && !globalThis.__game.busy && !!globalThis.__game.ui.goalText,
          null,
          { timeout: 60000 },
        );
        const laterTrain = await capture('later-train');
        assert(!laterTrain.classes.includes('ob-walking') && !laterTrain.classes.includes('ob-active'));
        assert(
          laterTrain.pins.some((p) => p.goal),
          'later train retains authored goal highlight',
        );
        // Later-day startup uses the normal HUD even with the train's saved onboarding state.
        await page.goto(base + 'index.html?day=2&place=office&q=0');
        await page.waitForFunction(() => globalThis.__game?.place?.name === 'office' && globalThis.__game?.player);
        await finishConversation();
        await page.waitForFunction(
          () =>
            globalThis.__game?.place?.name === 'office' && !globalThis.__game.busy && !!globalThis.__game.ui.goalText,
          null,
          { timeout: 60000 },
        );
        const office = await capture('later-day');
        assert(!office.classes.includes('ob-walking') && !office.classes.includes('ob-active'));
        // Layout fixture: all existing HUD chips populated, including controls learned later.
        await page.evaluate(async (base) => {
          for (const e of globalThis.document.querySelectorAll('#hud button')) e.hidden = false;
          (await import(base + 'js/settings.js')).setSetting('uiSize', 1.4);
        }, base);
        await capture('full-hud-large-ui');
        if (width === 2560) {
          await page.setViewportSize({ width: 1366, height: 768 });
          await capture('full-hud-large-ui-1366');
        }
        assert.deepEqual(errors, []);
        assert.deepEqual(failures, []);
      } catch (e) {
        fs.writeFileSync(out + '/failure.json', JSON.stringify({ width, message: e.stack, errors, failures }, null, 2));
        await page.screenshot({ path: `${out}/${width}-failure.png` }).catch(() => {});
        throw e;
      } finally {
        closing = true;
        await context.close();
      }
    }
  },
  gpuWaitOptions(900, 285000),
);
