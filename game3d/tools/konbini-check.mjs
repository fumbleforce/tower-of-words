// Real marker clicks, public title Continue and the existing shop-street doorway. No synthetic transaction result.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366), height = width < 700 ? 844 : 860, mc = process.argv[3] || 'eric';
const base = `http://127.0.0.1:${process.env.PORT || 8794}/game3d`;
const out = `game3d/shots/codex-konbini/${process.env.ROUND || 'acceptance'}`;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('konbini-native', async browser => {
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
      seated: g.player.seated, position: g.player.root.position.toArray(), flags: Object.fromEntries(Object.entries(flags).filter(([k]) => k.startsWith('konbini_'))),
      conditionPlace: flags.place, lastStep: g.runner.lastStep, trace: g.runner.trace, contacts: g.place.konbini?.contacts || [] };
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
      const s = await page.evaluate(() => ({ bite: globalThis.__game.place.konbini?.contacts.at(-1)?.action === 'konbini-openRice-place', motion: globalThis.__konbiniAction && { ...globalThis.__konbiniAction, elapsed: performance.now() - globalThis.__konbiniAction.at }, busy: globalThis.__game.busy, choice: [...globalThis.document.querySelectorAll('#talk:not([hidden]) .chips button')].map(b => b.textContent), more: !!globalThis.document.querySelector('#talk:not([hidden]) .more:not([hidden])') }));
      if (s.motion && ['add','bag','take','consume'].includes(s.motion.name) && (s.motion.name === 'consume' ? s.bite : s.motion.elapsed > 550) && !captured.has(s.motion.name)) { captured.add(s.motion.name); await shot('motion-' + s.motion.name); }
      if (!s.busy) return;
      if (s.choice.length) {
        if (stop && s.choice.some(v => v.includes(stop))) return;
        const key = prefer.find(x => s.choice.some(v => v.includes(x)));
        if (!key) throw Error('Unexpected choices ' + JSON.stringify(s.choice));
        await page.locator('#talk .chips button').nth(s.choice.findIndex(v => v.includes(key))).click();
      } else if (s.more) { await shot('clerk'); await page.locator('#talkHit').click(); }
    }
    throw Error('Konbini did not settle');
  }
  async function observe() {
    await page.evaluate(() => { const g = globalThis.__game, act = g.place.hooks.konbiniShop; g.place.hooks.konbiniShop = async function(a) { globalThis.__konbiniAction = { name: a.state, at: performance.now() }; try { return await act(a); } finally { globalThis.__konbiniAction = null; } }; });
  }
  async function reload() {
    await page.evaluate(() => globalThis.__game.hooks.save());
    await page.goto(`${base}/index.html?mc=${mc}`);
    await page.locator('#title .mcont').click();
    await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
    await page.waitForFunction(() => globalThis.__game?.place?.name === 'konbini', null, { timeout: 45000 });
    await page.waitForTimeout(700); await observe();
  }
  const pick = async text => { await page.waitForTimeout(1000); await page.locator('#talk .chips button').filter({hasText:text}).first().click(); };
  async function add(name) { await pick(name); await finish([], 'Put it in the basket.'); await pick('Put it in the basket.'); await finish([], 'Check out.'); }
  try {
    await waitForGame(page,60000,()=>page.goto(`${base}/index.html?day=${process.env.DAY||3}&place=shotengai&mc=${mc}`),'play');
    await ready();await page.waitForFunction(()=>!globalThis.document.querySelector('#boot:not(.gone)'));await page.waitForTimeout(700);
    await use('store_door');await page.waitForFunction(()=>globalThis.__game.place.name==='konbini'&&!globalThis.__game.busy);
    await shot('arrival');await observe();const before=await state();
    assert.equal(before.day,+(process.env.DAY||3));
    assert.equal(await page.evaluate(()=>globalThis.__game.place.people.konbini_clerk.root.visible),true);
    await use('fridge');await finish([], 'Milk carton.');await add('Milk carton.');await add('Salted rice ball.');
    const basket=await state();assert.equal(basket.yen,before.yen);assert.deepEqual(basket.inv,before.inv);assert.equal(basket.flags.konbini_count,2);
    await reload();await finish([], 'Check out.');assert.equal((await state()).flags.konbini_count,2);await shot('basket-continue');
    await pick('Check out.');await finish(['Pay the total'], 'Take the bag.');const paid=await state();
    assert.equal(paid.yen,before.yen-280);assert.deepEqual(paid.inv,[...before.inv,'milk','riceball']);await page.waitForTimeout(1100);await shot('paid');report.push({case:'paid',state:paid});
    await reload();await finish([], 'Take the bag.');assert.deepEqual((await state()).inv,paid.inv);assert.equal((await state()).yen,paid.yen);
    await pick('Take the bag.');await finish();await ready();
    await use('konbini_seat');await finish([], 'Eat a rice ball.');const seated=await state();assert.ok(seated.seated);
    await reload();await finish([], 'Eat a rice ball.');assert.ok((await state()).seated);await shot('seat-continue');
    await pick('Eat a rice ball.');
    if (process.env.INTERRUPT) {
      await page.waitForFunction(()=>globalThis.__konbiniAction?.name==='consume');
      const interrupted=await state();assert.deepEqual(interrupted.inv,paid.inv);
      await reload();await finish();report.push({case:'Continue during consume preserves food until visible bite',interrupted,state:await state()});
    } else await finish();await ready();const eaten=await state();assert.deepEqual(eaten.inv,[...before.inv,'milk']);assert.equal(eaten.yen,paid.yen);await shot('eaten');
    await reload();await ready();assert.deepEqual((await state()).inv,eaten.inv);report.push({case:'eat',state:await state()});
    await use('konbini_exit');await page.waitForFunction(()=>globalThis.__game.place.name==='shotengai'&&!globalThis.__game.busy);await shot('street-return');assert.equal((await state()).period,before.period);
    await use('store_door');await page.waitForFunction(()=>globalThis.__game.place.name==='konbini'&&!globalThis.__game.busy);await observe();
    await use('fridge');await finish([], 'Coffee.');await add('Coffee.');await pick('Coffee.');await finish([], 'Put it back.');await pick('Put it back.');await finish([], 'Coffee.');assert.equal((await state()).flags.konbini_count,0);
    await pick('Keep looking.');await finish();await ready();report.push({case:'return unpaid item',state:await state()});
    assert.deepEqual(errors,[]);console.log('PASS',width,mc);
  } finally {fs.writeFileSync(`${out}/${width}-${mc}.json`,JSON.stringify({report,errors,missing},null,2));await page.close();}
},{timeoutMs:280000,gpuWaitMs:180000});
