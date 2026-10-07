import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366),
  mc = process.argv[3] || 'eric',
  height = width < 700 ? 844 : 860;
const base = `http://127.0.0.1:${process.env.PORT || 8794}/game3d`,
  out = `game3d/shots/codex-bakery/${process.env.ROUND || 'extra'}`;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  'bakery-extra',
  async (browser) => {
    const page = await browser.newPage({
      viewport: { width, height },
      isMobile: width < 700,
      hasTouch: width < 700,
    });
    const errors = [],
      report = {};
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({
          textSpeed: 'instant',
          voiceOn: false,
          privateMode: false,
          skipChecks: true,
        }),
      );
      globalThis.__bakeryVoices = [];
      const play = globalThis.HTMLMediaElement.prototype.play;
      globalThis.HTMLMediaElement.prototype.play = function (...args) {
        if (this.src.includes('/audio/bakery-')) {
          const entry = {
            src: this.src,
            playing: false,
            ended: false,
            duration: 0,
            volume: this.volume,
          };
          globalThis.__bakeryVoices.push(entry);
          globalThis.__bakeryMedia = this;
          this.addEventListener(
            'playing',
            () => {
              entry.playing = true;
              entry.duration = this.duration;
            },
            { once: true },
          );
          this.addEventListener(
            'ended',
            () => {
              entry.ended = true;
            },
            { once: true },
          );
        }
        return play.apply(this, args);
      };
    });
    const ready = () => page.waitForFunction(() => !globalThis.__game.busy && !globalThis.__game.walker.path);
    const shot = (name) => page.screenshot({ path: `${out}/${width}-${mc}-${name}.png` });
    async function use(id) {
      await ready();
      await page.evaluate(async (id) => {
        const g = globalThis.__game;
        g.standUp?.();
        await g.walkTo(...g.place.things[id].spot());
      }, id);
      await page.waitForTimeout(300);
      const p = await page.evaluate((id) => {
        const r = globalThis.__game.markers.list
          .find((m) => m.id === id)
          .el.querySelector('.pin')
          .getBoundingClientRect();
        return [r.x + r.width / 2, r.y + r.height / 2];
      }, id);
      if (width < 700) await page.touchscreen.tap(...p);
      else await page.mouse.click(...p);
      await page.waitForTimeout(100);
      const action = page.locator('#actMenu:not([hidden]) .use');
      if (await action.isVisible()) await action.click();
    }
    async function settle(prefer) {
      for (let i = 0; i < 500; i++) {
        await page.waitForTimeout(100);
        const s = await page.evaluate(() => ({
          busy: globalThis.__game.busy,
          options: [...globalThis.document.querySelectorAll('#talk:not([hidden]) .chips button')].map(
            (b) => b.textContent,
          ),
          more: !!globalThis.document.querySelector('#talk:not([hidden]) .more:not([hidden])'),
        }));
        if (!s.busy) return;
        if (s.options.length) {
          const k = prefer.find((v) => s.options.some((x) => x.includes(v)));
          assert.ok(k, JSON.stringify(s));
          await page
            .locator('#talk .chips button')
            .nth(s.options.findIndex((x) => x.includes(k)))
            .click();
        } else if (s.more) await page.locator('#talkHit').click();
      }
      throw Error('Unsettled bakery action');
    }
    try {
      await waitForGame(page, 60000, () => page.goto(`${base}/index.html?day=4&place=shotengai&mc=${mc}`), 'play');
      await ready();
      await page.waitForFunction(() => !globalThis.document.querySelector('#boot:not(.gone)'));
      await page.waitForTimeout(800);
      await use('bakery_door');
      await page.waitForFunction(() => globalThis.__game.place.name === 'bakery' && !globalThis.__game.busy);
      await page.evaluate(() => {
        globalThis.__game.sim.yen = 100;
      });
      await use('bread_rack');
      await settle(['butter roll', 'Pay']);
      await ready();
      report.insufficient = await page.evaluate(async () => ({
        yen: globalThis.__game.sim.yen,
        inv: [...globalThis.__game.sim.inv],
        phase: (await import('./js/narrative/state.js')).flags.bakery_phase,
      }));
      assert.deepEqual(report.insufficient, {
        yen: 100,
        inv: [],
        phase: 'cancelled',
      });
      await shot('returned-unpaid');
      // Actual runtime voice(), observing the browser media playing and completion events.
      await page.evaluate(async () => {
        const { setSetting } = await import('./js/settings.js');
        setSetting('voiceOn', true);
      });
      await page.locator('body').click({ position: { x: 3, y: 100 } });
      report.audio = await page.evaluate(async () => {
        const audio = await import('./js/audio/core.js');
        for (const key of ['welcome', 'curry', 'roll', 'thanks', 'seat']) {
          await audio.voice('bakery-' + key, { muffle: true });
          const media = globalThis.__bakeryMedia;
          if (!media?.ended)
            await Promise.race([
              new Promise((r) => media?.addEventListener('ended', r, { once: true })),
              new Promise((r) => setTimeout(r, 10000)),
            ]);
        }
        (await import('./js/settings.js')).setSetting('voiceOn', false);
        return globalThis.__bakeryVoices;
      });
      assert.equal(report.audio.length, 5);
      for (const a of report.audio)
        assert.ok(a.playing && a.ended && a.duration > 0.2 && a.volume > 0, JSON.stringify(a));
      await page.evaluate(async () => {
        const g = globalThis.__game;
        await g.prepare('shotengai');
        globalThis.__bakeryActions = [];
        const hook = g.place.hooks.bakeryShop;
        g.place.hooks.bakeryShop = async (a) => {
          globalThis.__bakeryActions.push({ state: a.state, phase: 'start', time: performance.now() });
          if (a.state === 'select')
            setTimeout(() => {
              globalThis.__bakeryCancelTrip = g.travel('shotengai', { fast: true, via: 'bakery' });
            }, 100);
          const result = await hook(a);
          globalThis.__bakeryActions.push({
            state: a.state,
            phase: 'end',
            time: performance.now(),
            complete: (await import('./js/narrative/state.js')).flags.bakery_action_complete,
          });
          return result;
        };
      });
      await use('bread_rack');
      await page.waitForTimeout(1000); // Wait for the actual touch/keyboard choice arming interval.
      await page.locator('#talk:not([hidden]) .chips button').filter({ hasText: 'curry bread' }).click();
      await page.waitForFunction(() => !!globalThis.__bakeryCancelTrip);
      await page.evaluate(() => globalThis.__bakeryCancelTrip);
      await ready();
      await page.waitForTimeout(1000);
      report.cancel = await page.evaluate(async () => {
        const g = globalThis.__game,
          f = (await import('./js/narrative/state.js')).flags;
        return {
          place: g.place.name,
          yen: g.sim.yen,
          inv: [...g.sim.inv],
          complete: f.bakery_action_complete,
          phase: f.bakery_phase,
          recovery: g.runner.recoveryError || null,
          frames: g.runner.frames.map((f) => f.node),
        };
      });
      report.actionTrace = await page.evaluate(() => globalThis.__bakeryActions);
      assert.deepEqual(report.cancel, {
        place: 'shotengai',
        yen: 100,
        inv: [],
        complete: false,
        phase: 'cancelled',
        recovery: null,
        frames: [],
      });
      await shot('cancelled-on-street');
      await use('bakery_door');
      await page.waitForFunction(() => globalThis.__game.place.name === 'bakery' && !globalThis.__game.busy);
      await page.evaluate(async () => {
        const g = globalThis.__game;
        await g.walkTo(0.3, -1.8);
        g.walker.facing = Math.PI;
        g.player.root.rotation.y = Math.PI;
        (await import('./js/settings.js')).setSetting('cameraMode', 'follow');
      });
      await page.waitForTimeout(700);
      if (width >= 700) {
        await page.waitForFunction(() => globalThis.__game.followCamera.active);
        await page.locator('#cameraLook').click();
        await page.waitForFunction(() => globalThis.__game.followCamera.captured);
        await shot('follow-counter');
        await page.mouse.move(width * 0.5 + 180, height * 0.5, { steps: 12 });
        await page.waitForTimeout(350);
        await shot('follow-side');
        report.follow = await page.evaluate(() => {
          const g = globalThis.__game,
            closures = [];
          g.place.space.traverse((o) => {
            if (o.userData.followEnclosure) closures.push(o.visible);
          });
          return {
            active: g.followCamera.active,
            closures,
            cost: g.followCamera.collisionMs,
            calls: g.renderer.info.render.calls,
          };
        });
        assert.ok(report.follow.active && report.follow.closures.every(Boolean));
        await page.keyboard.press('Escape');
      } else assert.equal(await page.evaluate(() => globalThis.__game.followCamera.active), false);
      await page.evaluate(async () => (await import('./js/settings.js')).setSetting('cameraMode', 'overview'));
      await page.waitForTimeout(500);
      await shot('overview-restored');
      assert.equal(
        await page.evaluate(() => {
          let visible = false;
          globalThis.__game.place.space.traverse((o) => {
            if (o.userData.followEnclosure && o.visible) visible = true;
          });
          return visible;
        }),
        false,
      );
      assert.deepEqual(errors, []);
      console.log('PASS insufficient money, five runtime clips, active Runner travel cancellation and camera closure');
    } catch (e) {
      await shot('failure');
      throw e;
    } finally {
      fs.writeFileSync(`${out}/${width}-${mc}-report.json`, JSON.stringify({ report, errors }, null, 2));
      await page.close();
    }
  },
  { timeoutMs: 280000 },
);
