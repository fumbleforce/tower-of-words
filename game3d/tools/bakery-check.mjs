// Real marker clicks, public title Continue and the existing shop-street doorway. No synthetic transaction result.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366), height = width < 700 ? 844 : 860, mc = process.argv[3] || 'eric';
const base = `http://127.0.0.1:${process.env.PORT || 8794}/game3d`;
const out = `game3d/shots/codex-bakery/${process.env.ROUND || 'acceptance'}`;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('bakery-native', async browser => {
  const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700 });
  const errors = [], missing = [], report = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) missing.push(r.url()); });
  await page.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ textSpeed: 'instant', voiceOn: false, skipChecks: true, privateMode: false })));
  const ready = () => page.waitForFunction(() => !globalThis.__game.busy && !globalThis.__game.walker.path);
  const shot = name => page.screenshot({ path: `${out}/${width}-${mc}-${name}.png` });
  const state = () => page.evaluate(async () => {
    const g = globalThis.__game, { flags } = await import('./js/narrative/state.js');
    return { yen: g.sim.yen, inv: [...g.sim.inv], day: g.sim.day, period: g.sim.period, place: g.place.name,
      seated: g.player.seated, position: g.player.root.position.toArray(), flags: Object.fromEntries(Object.entries(flags).filter(([k]) => k.startsWith('bakery_'))),
      conditionPlace: flags.place, lastStep: g.runner.lastStep, trace: g.runner.trace, contacts: g.place.bakery?.contacts || [] };
  });
  async function use(id) {
    await ready();
    await page.evaluate(async id => { const g = globalThis.__game; g.standUp?.(); await g.walkTo(...g.place.things[id].spot()); }, id);
    await page.waitForTimeout(350);
    const point = await page.evaluate(id => {
      const m = globalThis.__game.markers.list.find(m => m.id === id), r = m?.el.querySelector('.pin')?.getBoundingClientRect();
      if (!r || !r.width || !r.height) throw Error('Missing pin ' + id);
      return [r.x + r.width / 2, r.y + r.height / 2];
    }, id);
    if (width < 700) await page.touchscreen.tap(...point); else await page.mouse.click(...point);
    await page.waitForTimeout(100);
    const menu = page.locator('#actMenu:not([hidden]) .use'); if (await menu.isVisible()) await menu.click();
  }
  const captured = new Set();
  async function finish(prefer = [], stop = '') {
    for (let i = 0; i < 500; i++) {
      await page.waitForTimeout(100);
      const s = await page.evaluate(() => ({ motion: globalThis.__bakeryAction && { ...globalThis.__bakeryAction, elapsed: performance.now() - globalThis.__bakeryAction.at }, busy: globalThis.__game.busy, choice: [...globalThis.document.querySelectorAll('#talk:not([hidden]) .chips button')].map(b => b.textContent), more: !!globalThis.document.querySelector('#talk:not([hidden]) .more:not([hidden])') }));
      if (s.motion && ['select','pay','take','eat'].includes(s.motion.name) && s.motion.elapsed > (s.motion.name === 'select' ? 1800 : s.motion.name === 'eat' ? 1200 : 550) && !captured.has(s.motion.name)) { captured.add(s.motion.name); await shot('motion-' + s.motion.name); }
      if (!s.busy) return;
      if (s.choice.length) {
        if (stop && s.choice.some(v => v.includes(stop))) return;
        const key = prefer.find(x => s.choice.some(v => v.includes(x)));
        if (!key) throw Error('Unexpected choices ' + JSON.stringify(s.choice));
        await page.locator('#talk .chips button').nth(s.choice.findIndex(v => v.includes(key))).click();
      } else if (s.more) { await shot('clerk'); await page.locator('#talkHit').click(); }
    }
    throw Error('Bakery did not settle');
  }
  async function observe() {
    await page.evaluate(() => { const g = globalThis.__game, act = g.place.hooks.bakeryShop; g.place.hooks.bakeryShop = async function(a) { globalThis.__bakeryAction = { name: a.state, at: performance.now() }; try { return await act(a); } finally { globalThis.__bakeryAction = null; } }; });
  }
  async function reload() {
    await page.evaluate(() => globalThis.__game.hooks.save());
    await page.goto(`${base}/index.html?mc=${mc}`);
    await page.locator('#title .mcont').click();
    await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
    await page.waitForFunction(() => globalThis.__game?.place?.name === 'bakery', null, { timeout: 45000 });
    await page.waitForTimeout(700); await observe();
  }
  try {
    await waitForGame(page, 60000, () => page.goto(`${base}/index.html?day=${process.env.DAY || 3}&place=shotengai&mc=${mc}`), 'play');
    await ready(); await page.waitForFunction(() => !globalThis.document.querySelector('#boot:not(.gone)')); await page.waitForTimeout(900);
    await shot('street-before'); await use('bakery_door');
    await page.waitForFunction(() => globalThis.__game.place.name === 'bakery' && !globalThis.__game.busy);
    await page.waitForTimeout(600); await shot('arrival'); const before = await state();
    await observe();
    await use('bread_rack'); await finish(['curry bread', 'Pay'], 'Take the bag');
    const paid = await state(); assert.equal(paid.yen, before.yen - 180); assert.deepEqual(paid.inv, [...before.inv, 'curry_bread']);
    await shot('paid');
    // Preserve native action contacts before the old place is disposed by Continue.
    report.push({ case: 'paid', state: paid });
    await reload(); await finish([], 'Take the bag');
    const resumed = await state(); assert.equal(resumed.yen, paid.yen); assert.deepEqual(resumed.inv, paid.inv);
    await shot('paid-continue'); await finish(['Take the bag']); await ready();
    const taken = await state(); assert.equal(taken.yen, paid.yen); assert.deepEqual(taken.inv, paid.inv);
    await shot('purchased'); report.push({ case: 'take', state: taken });
    await use('bakery_seat'); await finish([], 'Eat a curry bread');
    const seated = await state(); assert.ok(seated.seated); await reload(); await finish([], 'Eat a curry bread');
    const seatResume = await state(); assert.ok(seatResume.seated); assert.deepEqual(seatResume.position, seated.position);
    await shot('perch-continue'); await finish(['Eat a curry bread']); await ready();
    const eaten = await state(); assert.equal(eaten.inv.includes('curry_bread'), false); assert.equal(eaten.yen, paid.yen);
    await shot('perch'); await reload(); await ready(); assert.deepEqual((await state()).inv, eaten.inv);
    report.push({ case: 'eat and Continue', state: eaten });
    await use('bakery_exit'); await page.waitForFunction(() => globalThis.__game.place.name === 'shotengai' && !globalThis.__game.busy);
    await shot('street-return'); const street = await state(); assert.equal(street.day, before.day); assert.equal(street.period, before.period);
    await use('bakery_door'); await page.waitForFunction(() => globalThis.__game.place.name === 'bakery' && !globalThis.__game.busy);
    assert.deepEqual((await state()).inv, eaten.inv); await shot('street-entry');
    await use('bread_rack'); await finish(['butter roll', 'Put the bread back']); await ready();
    const cancelled = await state(); assert.equal(cancelled.yen, paid.yen); assert.deepEqual(cancelled.inv, eaten.inv);
    report.push({ case: 'native return, entry, cancellation', state: cancelled });
    assert.deepEqual(errors, []);
    const unexpected = missing.filter(url => !url.endsWith('/api/feedback') && !/\/story\/day[345]\/transitions\.js$/.test(url) && !/characters\/carina\/(point|shrug|nod|wave|bow|phone)\.json/.test(url));
    assert.deepEqual(unexpected, [], 'no unclassified missing resource');
    console.log(JSON.stringify({ report, missing }));
    console.log('PASS bakery native purchase/paid Continue/perch Continue/consumption/door both ways/cancel');
  } catch (e) { await shot('failure'); console.log(JSON.stringify(await state())); throw e; }
  finally { fs.writeFileSync(`${out}/${width}-${mc}-report.json`, JSON.stringify({ report, errors, missing }, null, 2)); await page.close(); }
}, { timeoutMs: 280000 });
