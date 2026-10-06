// Native entrance, dinner choices, seated Continue and exit through the authored day-2 story.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366),
  height = width < 700 ? 844 : 860,
  mc = process.argv[3] || 'eric',
  phone = width < 700,
  cameraOnly = process.env.CAMERA_ONLY === '1';
const out = new URL('../shots/codex-izakaya/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  'izakaya-native',
  async (browser) => {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: phone, hasTouch: phone }),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() =>
      localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({ textSpeed: 'instant', voiceOn: false, skipChecks: true, privateMode: false }),
      ),
    );
    const capture = (name) => page.screenshot({ path: `${out}/${width}-${mc}-native-${name}.png` });
    const ready = () => page.waitForFunction(() => !window.__game.busy && !window.__game.walker.path);
    async function use(id) {
      await ready();
      await page.evaluate(async (id) => {
        const g = window.__game;
        if (g.player.seated && id === 'party_seat') return;
        if (g.player.seated) await g.hooks.stand({ who: 'eric' });
        await g.walkTo(...g.place.things[id].spot());
      }, id);
      await page.waitForTimeout(250);
      const point = await page.evaluate((id) => {
        const el = window.__game.markers.list.find((m) => m.id === id)?.el;
        const r = el?.querySelector('.pin')?.getBoundingClientRect();
        if (!r) throw new Error('No native marker ' + id);
        const x = r.x + r.width / 2,
          y = r.y + r.height / 2;
        if (document.elementFromPoint(x, y)?.closest('.mark') !== el) throw new Error('Marker covered ' + id);
        return { x, y };
      }, id);
      if (phone) await page.touchscreen.tap(point.x, point.y);
      else await page.mouse.click(point.x, point.y);
      await page.waitForTimeout(150);
      const action = page.locator('#actMenu:not([hidden]) .use');
      if (await action.isVisible()) await action.click();
    }
    let mealShot = false,
      codaShot = false;
    async function finish(prefer = []) {
      for (let n = 0; n < 220; n++) {
        await page.waitForTimeout(100);
        const status = await page.evaluate(() => ({
          busy: window.__game.busy,
          choices: [...document.querySelectorAll('#talk:not([hidden]) .chips button')].map((b) => b.textContent),
          more: !!document.querySelector('#talk:not([hidden]) .more:not([hidden])'),
          prompt: !!document.querySelector('#prompt:not([hidden])'),
        }));
        if (!status.busy) return;
        const speaker = await page.evaluate(() => window.__game.talkingTo);
        if (speaker === 'emi' && !mealShot) {
          await page.waitForTimeout(650);
          await capture('meal-conversation');
          mealShot = true;
        }
        if (
          speaker === 'emi' &&
          (await page.evaluate(() => window.__game.place.dinner?.snapshot().packed)) &&
          !codaShot
        ) {
          await page.waitForTimeout(650);
          await capture('coda-conversation');
          codaShot = true;
        }
        if (status.choices.length) {
          const wanted = prefer.find((t) => status.choices.some((s) => s.includes(t)));
          const i = wanted ? status.choices.findIndex((s) => s.includes(wanted)) : 0;
          await page.locator('#talk .chips button').nth(i).click();
        } else if (status.more) await page.locator('#talkHit').click();
        else if (status.prompt) throw new Error('Unexpected typing prompt despite skipped checks');
      }
      throw new Error('Dinner did not settle');
    }
    try {
      console.log('boot');
      await waitForGame(
        page,
        60000,
        () =>
          page.goto(
            `http://127.0.0.1:8793/game3d/index.html?day=2&place=${cameraOnly ? 'izakaya' : 'shotengai'}&mc=${mc}`,
          ),
        'play',
      );
      await ready();
      await page.waitForFunction(() => !document.querySelector('#boot:not(.gone)'));
      await page.evaluate(async () => {
        const g = window.__game,
          { flags } = await import('./js/narrative/state.js'),
          { setPeriod } = await import('./js/sim.js');
        Object.assign(flags, {
          d2_shift_done: true,
          d2_met_kenji: true,
          d2_checked: true,
          d2_ticket_done: true,
          d2_brief_done: true,
        });
        setPeriod('evening', g);
        await g.place.hooks.partySetup();
      });
      if (!cameraOnly) {
        console.log('native door');
        await use('izakaya');
        console.log(
          await page.evaluate(() => ({
            place: window.__game.place.name,
            busy: window.__game.busy,
            talk: document.querySelector('#talk')?.textContent,
          })),
        );
        await page.waitForFunction(() => window.__game.place.name === 'izakaya' && !window.__game.busy);
      }
      await capture('arrival');
      const all = await page.evaluate(() =>
        Object.entries(window.__game.place.people)
          .filter(([, r]) => r.root.visible && r.seated)
          .map(([id]) => id)
          .sort(),
      );
      assert.deepEqual(all, ['emi', 'kenji', 'mio', 'mori']);
      console.log('native seat');
      await use('party_seat');
      await finish(['Raise your glass', 'chicken skewer', 'Eat and listen for a while.']);
      await ready();
      await capture('food');
      const food = await page.evaluate(() => ({ ...window.__game.place.dinner.food.state }));
      assert.equal(food.took, 'yakitori');
      assert.equal(food.toast, 1);
      if (phone) await page.locator('#qsaveBtn').tap();
      else await page.keyboard.press('F5');
      await page.waitForFunction(() => /Quick saved/.test(document.querySelector('#toast')?.textContent || ''));
      await waitForGame(page, 60000, () => page.goto(`http://127.0.0.1:8793/game3d/index.html?mc=${mc}`), 'title');
      await page.locator('#title .mcont').click();
      await waitForGame(page, 60000, () => page.locator('.slot[data-id="quick"]').click(), 'play');
      await ready();
      await page.waitForFunction(
        () => !document.querySelector('#boot:not(.gone)') && !document.body.classList.contains('loading'),
      );
      await page.waitForTimeout(650);
      assert.deepEqual(await page.evaluate(() => ({ ...window.__game.place.dinner.food.state })), food);
      assert.ok(await page.evaluate(() => window.__game.player.seated));
      await capture('continued');
      await use('party_seat');
      await finish(['Head home', 'Thank everyone']);
      await ready();
      assert.deepEqual(
        await page.evaluate(() =>
          Object.entries(window.__game.place.people)
            .filter(([, r]) => r.root.visible)
            .map(([id]) => id)
            .sort(),
        ),
        ['emi', 'mori'],
      );
      await use('mori');
      await finish(['look forward to seeing the photos']);
      await ready();
      assert.ok(await page.evaluate(() => window.__game.place.dinner.food.state.packed));
      await capture('coda');
      if (!cameraOnly) {
        await use('izakaya_exit');
        await page.waitForFunction(() => window.__game.place.name === 'shotengai' && !window.__game.busy);
        assert.ok(
          await page.evaluate(() => {
            const g = window.__game,
              p = g.player.root.position,
              s = g.place.things.izakaya.spot();
            return Math.hypot(p.x - s[0], p.z - s[1]) < 0.2;
          }),
        );
        await capture('return');
      }
      assert.deepEqual(errors, []);
      fs.writeFileSync(
        `${out}/${width}-${mc}-${cameraOnly ? 'camera' : 'native'}.json`,
        JSON.stringify(
          {
            passed: true,
            scope: cameraOnly ? 'conversation/Continue/coda' : 'native entrance/meal/Continue/coda/exit',
            food,
            errors,
          },
          null,
          2,
        ),
      );
      console.log('PASS native izakaya ' + width + ' ' + mc);
    } catch (error) {
      console.log(
        await page.evaluate(() => ({
          place: window.__game.place.name,
          busy: window.__game.busy,
          talk: document.querySelector('#talk')?.textContent,
          act: document.querySelector('#actMenu')?.textContent,
          position: window.__game.player.root.position.toArray(),
        })),
      );
      console.log(errors);
      await capture('failure');
      throw error;
    } finally {
      await page.close();
    }
  },
  { timeoutMs: 240000 },
);
