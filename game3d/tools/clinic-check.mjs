// The clinic in the running game (places/clinic.js, story/clinic.js): in from the plaza by its door, the nurse's
// first talk, sitting on the examination bed, out again; then two falls (places/clinic-fall.js sendToClinic): the
// fade, waking on the bed with the nurse beside it, the wake-up's lines and choice, and the second time's shorter one.
//   node game3d/tools/clinic-check.mjs [width]     screenshots in game3d/shots/clinic/<width>-*.png
// Q='&...' adds to the URL.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366),
  height = width < 700 ? 844 : 860,
  phone = width < 700;
const base = process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT || 8771}/game3d`;
const out = new URL('../shots/clinic/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(
  'clinic-check-' + width,
  async (browser) => {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: phone, hasTouch: phone });
    await page.route('**/api/plugins', (route) => route.fulfill({ json: [] }));
    await page.route('**/island/private/**', (route) => route.abort());
    const errors = [],
      lines = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() =>
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({ textSpeed: 'instant', voiceOn: false, skipChecks: true, privateMode: false }),
      ),
    );
    const shot = (name) => page.screenshot({ path: `${out}${width}-${name}.png` });
    const ready = () =>
      page.waitForFunction(() => !globalThis.__game.busy && !globalThis.__game.walker.path, null, { timeout: 240000 });
    const flags = () =>
      page.evaluate(async () => {
        const { flags } = await import('./js/narrative/state.js');
        return { fell_from: flags.fell_from, falls: flags.falls, clinic_met: flags.clinic_met };
      });
    async function use(id) {
      await ready();
      if (id !== 'clinic_nurse')
        await page.evaluate(async (id) => {
          const g = globalThis.__game;
          g.standUp?.();
          await g.walkTo(...g.place.things[id].spot());
        }, id);
      await page.waitForTimeout(400);
      const point = await page.evaluate((id) => {
        const m = globalThis.__game.markers.list.find((m) => m.id === id),
          r = m?.el.querySelector('.pin')?.getBoundingClientRect();
        if (!r || !r.width) throw Error('Missing pin ' + id);
        return [r.x + r.width / 2, r.y + r.height / 2];
      }, id);
      if (phone) await page.touchscreen.tap(...point);
      else await page.mouse.click(...point);
      // the action menu, if one opens (it can take a few frames with software GL)
      const menu = page.locator('#actMenu:not([hidden]) .use');
      if (
        await menu.waitFor({ state: 'visible', timeout: 8000 }).then(
          () => true,
          () => false,
        )
      )
        await menu.click();
    }
    // click through lines, choosing the first option that matches; a screenshot of the first line of each speaker
    async function talk(prefer = [], name = '') {
      const seen = new Set();
      // the scene has begun: the game is busy, or a line is up
      await page.waitForFunction(
        () => globalThis.__game.busy || globalThis.document.querySelector('#talk:not([hidden]) .line')?.textContent,
        null,
        { timeout: 120000 },
      );
      for (let i = 0; i < 600; i++) {
        await page.waitForTimeout(150);
        const s = await page.evaluate(() => ({
          busy: globalThis.__game.busy,
          who: globalThis.document.querySelector('#talk:not([hidden]) .who')?.textContent || '',
          line: globalThis.document.querySelector('#talk:not([hidden]) .line')?.textContent || '',
          choice: [...globalThis.document.querySelectorAll('#talk:not([hidden]) .chips button')].map(
            (b) => b.textContent,
          ),
          more: !!globalThis.document.querySelector('#talk:not([hidden]) .more:not([hidden])'),
        }));
        if (!s.busy && !s.line) return;
        if (s.line && !seen.has(s.line)) {
          seen.add(s.line);
          lines.push(`${name} ${s.who}: ${s.line}`);
          if (name === 'nurse' && seen.size === 1) {
            const visitor = await page.evaluate(() => globalThis.__game.player.root.position.toArray());
            console.log('nurse visitor position:', JSON.stringify(visitor));
            assert.ok(visitor[2] > -4.35, 'the visitor stays in front of the reception counter');
          }
          if (seen.size <= 2 && name) await shot(`${name}-${seen.size}`);
        }
        if (s.choice.length) {
          const key = prefer.find((x) => s.choice.some((v) => v.includes(x)));
          if (!key) throw Error('Unexpected choices ' + JSON.stringify(s.choice));
          lines.push(`${name} > ${key}`);
          await page
            .locator('#talk .chips button')
            .nth(s.choice.findIndex((v) => v.includes(key)))
            .click();
        } else if (s.more) await page.locator('#talkHit').click();
        else if (!s.busy) return;
      }
      throw Error('The talk did not end');
    }
    const t0 = Date.now(),
      log = (m) => console.log(`${((Date.now() - t0) / 1000).toFixed(0)}s ${m}`);
    const arrived = (name) =>
      page.waitForFunction((name) => globalThis.__game.place?.name === name && !globalThis.__game.transition, name, {
        timeout: 600000,
      });
    // PLAZA=1: start on the plaza and go in by the clinic's door (slow with software GL); else start inside
    const start = process.env.PLAZA ? 'plaza' : 'clinic';
    await waitForGame(
      page,
      600000,
      () => page.goto(`${base}/index.html?place=${start}&q=0${process.env.Q || ''}`),
      'play',
    );
    log('started in ' + start);
    if (start === 'plaza') {
      await ready();
      await shot('plaza');
      await use('clinic_door');
      await arrived('clinic');
    }
    await ready();
    await page.waitForTimeout(600);
    await shot('room');
    log('in the clinic');
    await use('clinic_nurse');
    await talk([], 'nurse');
    assert.equal((await flags()).clinic_met, true);
    log('talked to the nurse');
    if (process.env.NURSE_ONLY) return;
    await use('exam_bed');
    await ready();
    assert.ok(await page.evaluate(() => globalThis.__game.player.seated));
    await shot('bed');
    log('sat on the bed');
    for (const [n, prefer] of [
      [1, ['Touch the back of your head']],
      [2, []],
    ]) {
      await ready();
      if (n === 1) {
        await page.evaluate(async () => {
          const g = globalThis.__game;
          g.standUp?.();
          await g.travel('dorms', { fast: true, via: 'dorm_court' });
        });
        await arrived('dorms');
        await ready();
        await page.evaluate(() => {
          const g = globalThis.__game,
            edge = g.place.falls[0],
            root = g.player.root;
          root.position.set((edge.a[0] + edge.b[0]) / 2, 0, edge.a[1] - 0.15);
          root.rotation.y = 0;
          g.walker.sync();
          g.place.cam.snap(root.position);
        });
        await shot('parapet');
        if (phone) await page.locator('#jumpBtn').tap();
        else await page.keyboard.press('Space');
        await page.waitForFunction(() => globalThis.__game.falling, null, { timeout: 10000 });
        await shot('falling');
      } else {
        await page.evaluate(async () => {
          const { sendToClinic } = await import('./js/places/clinic-fall.js');
          globalThis.__fall = sendToClinic(globalThis.__game, 'dorms');
        });
      }
      await page.waitForFunction(() => {
        const fade = globalThis.document.querySelector('#fade.on');
        return fade && +globalThis.getComputedStyle(fade).opacity > 0.98;
      }, null, { timeout: 10000 });
      await shot(`fall${n}-black`);
      log(`fall ${n}: black`);
      await arrived('clinic');
      await page.waitForFunction(
        () => globalThis.document.querySelector('#talk:not([hidden]) .line')?.textContent,
        null,
        { timeout: 30000 },
      );
      await talk(prefer, `wake${n}`);
      await ready();
      const f = await flags();
      assert.ok(!f.fell_from, 'fell_from is cleared');
      assert.equal(f.falls, n);
      assert.ok(await page.evaluate(() => !globalThis.document.querySelector('#fade.on')), 'the screen is back');
      if (n === 2) assert.equal(await page.evaluate(() => globalThis.__fall), true);
      assert.equal(await page.evaluate(() => globalThis.__game.place.name), 'clinic');
      // the nurse goes back to her counter
      await page.waitForFunction(
        () => {
          const p = globalThis.__game.place.people.clinic_nurse.root.position;
          return Math.hypot(p.x - 2.55, p.z + 5.2) < 0.3;
        },
        null,
        { timeout: 300000 },
      );
      await shot(`wake${n}-end`);
      log(`fall ${n}: woke up`);
    }
    if (process.env.PLAZA) {
      await use('clinic_exit');
      await arrived('plaza');
      await shot('out');
    }
    fs.writeFileSync(`${out}${width}-lines.txt`, lines.join('\n') + '\n');
    console.log(lines.join('\n'));
    assert.deepEqual(errors, []);
    console.log('PASS clinic', width);
  },
  gpuWaitOptions(900, 295000),
);
