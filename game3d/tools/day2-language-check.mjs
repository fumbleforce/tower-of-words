// #292: native title Days jump, isolated sample/own history, then the actual authored dinner scene/UI.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { blockedSource } from '../../tools/bible/check-scope.mjs';
import { sampleDayOneEnd } from '../js/days.js';

const width = +(process.argv[2] || 1366), height = width < 600 ? 844 : 860;
const out = process.argv[3] || 'game3d/shots/day2-language';
const base = process.env.BASE || 'game3d';
fs.mkdirSync(out, { recursive: true });
const errors = [], reports = [];
await withBrowserJob('day2-language', async browser => {
  for (const own of [false, true]) {
    const prior = own ? { ...sampleDayOneEnd('mori'), known: ['otsukare', 'sumimasen'], yen: 3720 } : null;
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 600, hasTouch: width < 600 });
    await context.route('**/*', route => {
      if (blockedSource(route.request().url(), true)) {
        errors.push('protected source requested');
        return route.abort();
      }
      return route.continue();
    });
    await context.addInitScript(prior => {
      globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ v: 2, privateMode: false, voiceOn: false }));
      if (!globalThis.sessionStorage.getItem('language-fixture')) {
        if (prior) globalThis.localStorage.setItem('amakawa-day1-save', JSON.stringify(prior));
        globalThis.sessionStorage.setItem('language-fixture', '1');
      }
    }, prior);
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    const label = `${width}-${own ? 'own' : 'sample'}`;
    const press = async locator => width < 600 ? locator.tap() : locator.click();
    await page.goto(`http://127.0.0.1:8771/${base}/index.html?q=0`);
    await press(page.locator('#title .mday2'));
    await press(page.locator('.daypick [data-day="2"]'));
    await page.waitForFunction(() => globalThis.__game?.sim?.day === 2 && globalThis.__game?.place?.name === 'dorms', null, { timeout: 65000 });
    const initialKnown = await page.evaluate(async () => [...(await import('./js/lang.js')).known]);
    assert.deepEqual(initialKnown, prior?.known || sampleDayOneEnd().known);
    // Finish the real morning messages and decline the request. Closing Tickets legitimately teaches its Close word.
    for (let i = 0; i < 60; i++) {
      const done = await page.evaluate(() => !globalThis.__game.busy && globalThis.document.querySelector('#talk').hidden);
      if (done) break;
      const later = page.getByRole('button', { name: /Get ready before accepting it/ });
      if (await page.getByRole('button', { name: /閉じる.*Close/ }).isVisible()) await press(page.getByRole('button', { name: /閉じる.*Close/ }));
      else if (await later.isVisible()) await press(later);
      else if (await page.locator('#talk .more').isVisible()) await press(page.locator('#talk .more'));
      await page.waitForTimeout(180);
    }
    await page.waitForFunction(() => !globalThis.__game.busy, null, { timeout: 12000 });
    const opening = await page.evaluate(async () => {
      const { known } = await import('./js/lang.js'), { flags } = await import('./js/narrative/state.js');
      return { known: [...known], lunchMori: !!flags.lunch_mori, lunchMio: !!flags.lunch_mio, yen: globalThis.__game.sim.yen };
    });
    assert.ok(initialKnown.every(id => opening.known.includes(id)));
    assert.equal(opening.known.includes('otsukare'), own);
    assert.equal(opening.lunchMori, own);
    assert.equal(opening.lunchMio, !own);
    // Advance the scene fixture to dinner, retaining the exact knowledge restored by the native Day 2 jump.
    // This is not a full-day route test: navigation and the intervening work are covered separately.
    await page.evaluate(async () => {
      const g = globalThis.__game, { flags } = await import('./js/narrative/state.js');
      flags.d2_shift_done = true;
      await g.hooks.period({ to: 'evening' });
      await g.travel('izakaya', { fast: true, via: 'shotengai' });
    });
    await page.waitForFunction(() => globalThis.__game.place.name === 'izakaya' && !globalThis.__game.busy, null, { timeout: 40000 });
    await page.evaluate(() => {
      const g = globalThis.__game;
      void g.beat(() => g.runner.run('d2_supper'));
    });
    await page.waitForFunction(() => {
      const talk = globalThis.document.querySelector('#talk');
      return !talk.hidden && talk.classList.contains('heard') && talk.querySelector('.line .gx');
    }, null, { timeout: 30000 });
    await page.waitForTimeout(650); // dialogue entrance opacity and portrait transition settle
    const shown = await page.evaluate(async () => {
      const { known } = await import('./js/lang.js');
      const talk = globalThis.document.querySelector('#talk'), line = talk.querySelector('.line');
      const hidden = [...line.querySelectorAll('.gx')];
      return { known: [...known], heard: talk.classList.contains('heard'), html: line.innerHTML,
        speaker: talk.querySelector('.who').textContent,
        sharp: [...line.querySelectorAll('.jp.clear')].map(el => el.textContent),
        unknown: hidden.map(el => el.dataset.c).join(''),
        softened: hidden.every(el => globalThis.getComputedStyle(el).filter !== 'none' || +globalThis.getComputedStyle(el).opacity < 1),
        subtitle: !!talk.querySelector('.subtag'), privateMode: globalThis.__settings.privateMode };
    });
    assert.equal(shown.privateMode, false);
    assert.equal(shown.heard, true);
    assert.equal(shown.subtitle, false);
    assert.ok(shown.softened && shown.unknown.length > 0);
    assert.deepEqual(shown.known, opening.known);
    assert.equal(shown.sharp.includes('お疲れさまです'), own);
    assert.equal(shown.unknown.includes('お疲れさまです'), !own);
    await page.screenshot({ path: `${out}/${label}-dinner.png` });
    reports.push({ label, initialKnown, opening, shown });
    await context.close();
  }
}, { timeoutMs: 280000 });
fs.writeFileSync(`${out}/${width}-report.json`, JSON.stringify({ errors, reports }, null, 2));
assert.deepEqual(errors, []);
console.log(`PASS ${width}: native sample/own Day 2 jumps; unknown language softened, learned phrase preserved`);
