// Public-only native entrance checks; movement uses the real navigator, never assigned positions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { blockedSource } from '../../tools/bible/check-scope.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const base = process.env.BASE || 'game3d';
const out = process.env.OUT || new URL('../shots/office-south-route/', import.meta.url).pathname;
const width = +(process.argv[2] || 1366),
  height = +(process.argv[3] || 860),
  phone = width < 700;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  'office-south-route',
  async (browser) => {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: phone,
      hasTouch: phone,
    });
    const errors = [],
      checks = [];
    await context.addInitScript(() =>
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({ v: 99, privateMode: false, voiceOn: false }),
      ),
    );
    await context.route('**/*', (r) => {
      if (blockedSource(r.request().url(), true)) {
        errors.push('protected source requested');
        return r.abort();
      }
      return r.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    const check = (name, ok) => {
      assert.ok(ok, name);
      checks.push(name);
    };
    const capture = (n) => page.screenshot({ path: `${out}/${width}-${n}.png` });
    const settled = () =>
      page.waitForFunction(() => !globalThis.__game.busy && !globalThis.__game.walker.path, null, { timeout: 45000 });
    const arrive = (place) =>
      page.waitForFunction((p) => globalThis.__game.place.name === p && !globalThis.__game.busy, place, {
        timeout: 45000,
      });
    async function use(id) {
      await settled();
      await page.waitForTimeout(350);
      const p = await page.evaluate((id) => {
        const el = globalThis.__game.markers.list.find((m) => m.id === id)?.el;
        if (!el) throw Error('missing marker ' + id);
        const r = el.querySelector('.pin').getBoundingClientRect(),
          x = r.x + r.width / 2,
          y = r.y + r.height / 2;
        if (
          !(x > 0 && x < globalThis.innerWidth && y > 0 && y < globalThis.innerHeight) ||
          globalThis.document.elementFromPoint(x, y)?.closest('.mark') !== el
        )
          throw Error('invisible marker ' + id);
        return { x, y };
      }, id);
      if (phone) await page.touchscreen.tap(p.x, p.y);
      else await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(250);
      const menu = page.locator('#actMenu:not([hidden]) .use');
      if (await menu.isVisible()) {
        if (phone) await menu.tap();
        else await menu.click();
      }
    }
    async function approach(id) {
      await page.evaluate(async (id) => {
        const g = globalThis.__game;
        await g.walkTo(...g.place.things[id].spot());
      }, id);
      await settled();
    }
    try {
      await waitForGame(
        page,
        90000,
        () => page.goto(`http://127.0.0.1:8771/${base}/index.html?place=forecourt&q=1`),
        'play',
      );
      await approach('shop_lane');
      await capture('south-approach');
      await use('shop_lane');
      await arrive('shotengai');
      check('native south marker enters shopping street', true);
      await page.waitForTimeout(800);
      await capture('shops-arrival');
      check(
        'arrival stands on free floor outside return zone',
        await page.evaluate(() => {
          const g = globalThis.__game,
            p = g.player.root.position;
          return g.place.nav.free(p.x, p.z) && !g.place.zones.office_exit(p.x, p.z);
        }),
      );
      // Continue must not replay the crossing or immediately bounce back through the return zone.
      if (phone) await page.locator('#qsaveBtn').tap();
      else await page.keyboard.press('F5');
      await page.waitForFunction(() =>
        /Quick saved/.test(globalThis.document.querySelector('#toast')?.textContent || ''),
      );
      await waitForGame(page, 90000, () => page.goto(`http://127.0.0.1:8771/${base}/index.html?q=1`), 'title');
      await page.locator('#title .mcont').click();
      await waitForGame(page, 90000, () => page.locator('.slot[data-id="quick"]').click(), 'play');
      await arrive('shotengai');
      await page.waitForTimeout(1200);
      check(
        'Continue stays on shopping street',
        await page.evaluate(() => globalThis.__game.place.name === 'shotengai'),
      );
      await capture('continued');
      await approach('office_lane');
      await use('office_lane');
      await arrive('forecourt');
      check('native north marker returns to bike aisle', true);
      await capture('north-arrival');
      // Cross each exit through normal walking, without invoking the travel node or marker.
      await page.evaluate(() => {
        const g = globalThis.__game;
        void g.walkTo(...g.place.things.shop_lane.face());
      });
      await arrive('shotengai');
      check('south walking zone triggers travel', true);
      await page.evaluate(() => {
        const g = globalThis.__game;
        void g.walkTo(...g.place.things.office_lane.face());
      });
      await arrive('forecourt');
      check('north walking zone triggers travel', true);
      await page.waitForTimeout(1000);
      check(
        'no crossing loop after return',
        await page.evaluate(() => globalThis.__game.place.name === 'forecourt' && !globalThis.__game.busy),
      );
      check('no runtime or protected-source errors', errors.length === 0);
      const report = await page.evaluate(() => {
        const g = globalThis.__game,
          gl = g.renderer.getContext(),
          e = gl.getExtension('WEBGL_debug_renderer_info');
        return {
          renderer: e && gl.getParameter(e.UNMASKED_RENDERER_WEBGL),
          calls: g.renderer.info.render.calls,
          privateMode: globalThis.__settings.privateMode,
        };
      });
      fs.writeFileSync(`${out}/${width}-report.json`, JSON.stringify({ checks, errors, ...report }, null, 2) + '\n');
      console.log('PASS', width, checks);
    } catch (e) {
      await capture('failure');
      console.error(errors);
      throw e;
    } finally {
      await context.close();
    }
  },
  { timeoutMs: 300000 },
);
