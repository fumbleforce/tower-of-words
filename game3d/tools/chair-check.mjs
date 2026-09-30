// The machine-room chair scene on B2, checked on its own (Jørgen, 2026-09-30: "when getting my chair, both the cat,
// mio and the chair have interaction windows but no actions. The chair should have a relevant action to it, so it
// doesnt just happen magically"; and "Mio was spinning around 20 times in place before she continued the
// conversation").
//   node game3d/tools/chair-check.mjs [w] [h]
// Plays the day in fast test mode up to the machine room, then holds the driver and:
//  - stands Eric by the cat, Mio and the chair in turn and saves the action menu each one opens (a menu with no
//    action row, or with only a name, fails),
//  - uses the chair through its menu row and checks the push starts from that (and not before),
//  - samples Mio's heading every frame from the push to her line and fails if she turns more than 1.5 full turns,
//  - checks chair_back and got_ticket are set after the scene.
// Output: game3d/shots/chair/<w>x<h>/ (JPEGs, log.json). BASE=<path to game3d> tests a worktree's copy.
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { openGame } from '../test/support/open-game.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [W = '1366', H = '860'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(G, 'shots/chair', `${W}x${H}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const fails = [];
const log = {};

await withBrowserJob('chair-check', async (browser) => {
  const url = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html?test=fast&q=0`;
  const game = await openGame(browser, { viewport: { width: +W, height: +H }, mode: 'fast', url, touch: phone });
  const { page, errors } = game;
  let n = 0;
  const shot = (name) => page.screenshot({ path: path.join(out, `${String(++n).padStart(2, '0')}-${name}.jpg`), type: 'jpeg', quality: 82 });
  // hold the test driver once Eric is in the machine room with the chair found
  await page.evaluate(() => {
    const g = window.__game;
    const keep = { use: g.use, sayWord: g.sayWord };
    window.__keep = keep;
    const held = () => {
      const h = !window.__released && g.place?.name === 'office' && !!(g.flagsRef || {}).found_chair;
      if (h) window.__ended = true; // parks the fast-test driver (testmode.js)
      return h;
    };
    g.use = (...a) => (held() ? undefined : keep.use.apply(g, a));
    g.sayWord = (...a) => (held() ? Promise.resolve() : keep.sayWord.apply(g, a));
    window.__held = held;
  });
  const flagsExpr = '(window.__game.flagsRef || {})';
  await page.waitForFunction(`window.__held() && !window.__game.busy`, null, { timeout: 200000 });
  await page.waitForFunction(`!window.__game.busy && !window.__game.walker.path && !window.__game.saying`, null, { timeout: 30000 });
  await page.evaluate(() => {
    // a player who has used a few things: the verb-dropping stage of the menu (controls-and-ui.md)
    const ob = window.__onboard;
    window.__ended = true; // parks the fast-test driver (testmode.js) while the menus are read
    if (ob) ob.active = false;
    if (ob) for (const [k, v] of Object.entries({ moved: true, uses: 6, sayUsed: true })) Object.defineProperty(ob, k, { get: () => v, configurable: true });
    window.__game.ui.auto = false;
  });
  // stand Eric at each target's spot, pick it as the target, and read the menu
  for (const id of ['tama', 'mio', 'my_chair']) {
    const info = await page.evaluate(async (id) => {
      const g = window.__game;
      const m = g.markers.list.find((x) => x.id === id);
      if (!m) return { id, missing: true };
      const where = { eric: [g.player.root.position.x, g.player.root.position.z].map((v) => +v.toFixed(2)), spot: m.spot().map((v) => +v.toFixed(2)), flags: Object.keys(g.flagsRef).filter((k) => /chair|machine|mio/.test(k)) };
      const enabled = m.enabled();
      const s = m.spot();
      g.walker.stop?.();
      g.walker.keys?.clear?.();
      g.player.root.position.x = s[0];
      g.player.root.position.z = s[1];
      g.walker.sync?.();
      await new Promise((r) => setTimeout(r, 700));
      // several in reach: Tab/Next until it's this one
      for (let i = 0; i < 6 && g.near !== m; i++) {
        g.ui.cycleInfo?.next?.();
        await new Promise((r) => setTimeout(r, 200));
      }
      const act = document.querySelector('#actMenu');
      const rows = [...act.querySelectorAll('.act')].map((b) => ({ cls: b.className, text: b.querySelector('.lb')?.textContent || '' }));
      return { id, enabled, where, near: g.near?.id, hidden: act.hidden, head: act.querySelector('.hd')?.textContent || '', rows };
    }, id);
    log[id] = info;
    await shot('menu-' + id);
    if (info.missing) { fails.push(`${id}: no marker`); continue; }
    if (!info.enabled && info.near !== id) continue; // not selectable here: no menu to judge
    if (info.near !== id) fails.push(`${id}: could not make it the target (near ${info.near})`);
    if (info.hidden) fails.push(`${id}: no menu`);
    const actions = info.rows.filter((r) => !/next/.test(r.cls));
    const named = actions.filter((r) => /named/.test(r.cls) || r.text === info.head);
    if (!actions.length) fails.push(`${id}: menu with no action rows`);
    else if (named.length === actions.length) fails.push(`${id}: menu rows show only the name (${actions.map((r) => r.text).join(', ')})`);
  }
  if (log.my_chair && !log.my_chair.rows?.some((r) => /push/i.test(r.text)))
    fails.push(`my_chair: no push action in its menu (${(log.my_chair.rows || []).map((r) => r.text).join(', ')})`);
  // nothing has moved the chair yet
  const before = await page.evaluate(`${flagsExpr}.chair_back`);
  if (before) fails.push('chair_back set before the chair was used');
  // track Mio's heading every frame from the push until her first line
  await page.evaluate(() => {
    const g = window.__game;
    // the most Mio turns within any 3 s of game time (walking round the desks turns her too, but never in circles)
    const T = (window.__spin = { win: [], sum: 0, total: 0, pos: [], line: false });
    let last = null;
    const tick = () => {
      const mio = g.mioNpc?.root;
      if (mio && mio.visible) {
        const y = mio.rotation.y;
        if (last !== null) {
          let d = y - last;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          T.win.push([g.t, Math.abs(d)]);
          T.sum += Math.abs(d);
          while (T.win.length && T.win[0][0] < g.t - 3) T.sum -= T.win.shift()[1];
          T.total = Math.max(T.total, T.sum);
        }
        last = y;
        T.pos.push([+mio.position.x.toFixed(2), +mio.position.z.toFixed(2), +y.toFixed(2)]);
      }
      const t = document.querySelector('#talk');
      if (t && !t.hidden && /your chair/i.test(t.textContent || '')) T.line = true;
      if (!T.line) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  // use the chair from its menu row, like a player
  await page.evaluate(() => {
    const g = window.__game;
    window.__released = true; // the driver stays parked (window.__ended) until the push has started
    g.ui.auto = true;
    g.use = window.__keep.use;
    g.sayWord = window.__keep.sayWord;
  });
  await page.evaluate(() => { const r = window.__game.runner, t = r.trigger.bind(r); window.__trig = []; r.trigger = (k, o) => { const v = t(k, o); window.__trig.push(k + '=' + v); return v; }; });
  const clicked = await page.evaluate(() => {
    const b = document.querySelector('#actMenu:not([hidden]) .act.use');
    if (!b) return false;
    const g = window.__game, u = g.use;
    let called = null;
    g.use = (it) => { called = it?.id; return u(it); };
    b.click();
    g.use = u;
    return { called, busy: g.busy, saying: g.saying, seated: g.player.seated };
  });
  if (!clicked) fails.push('my_chair: no use row to click');
  console.log('click', JSON.stringify(clicked));
  await page.waitForTimeout(1200);
  await shot('push-rolling');
  await page.waitForFunction(`${flagsExpr}.chair_back`, null, { timeout: 20000 }).catch(() => {});
  await page.evaluate(() => { window.__ended = false; });
  await page.waitForTimeout(300);
  log.afterClick = await page.evaluate(() => { const g = window.__game; return { busy: g.busy, saying: g.saying, hold: g.hold, near: g.near?.id, path: !!g.walker.path, trig: window.__trig, node: g.runner.node || g.runner.current || null }; });
  console.log('after click', JSON.stringify(log.afterClick));
  await shot('push-done');
  await page.waitForFunction(() => window.__spin.line, null, { timeout: 60000 }).catch(() => fails.push('Mio never said her chair line'));
  await shot('mio-line');
  const spin = await page.evaluate(() => ({ total: window.__spin.total, n: window.__spin.pos.length, tail: window.__spin.pos.slice(-40) }));
  log.spin = spin;
  const turns = spin.total / (2 * Math.PI);
  console.log(`Mio turned at most ${turns.toFixed(2)} full turns within 3 s, from the push to her line (${spin.n} frames)`);
  if (turns > 1.5) fails.push(`Mio spun: ${turns.toFixed(1)} full turns within 3 s between the push and her line`);
  await page.waitForFunction(`${flagsExpr}.got_ticket`, null, { timeout: 60000 }).catch(() => fails.push('got_ticket never set'));
  await shot('ticket');
  const fl = await page.evaluate(`({ chair_back: !!${flagsExpr}.chair_back, got_ticket: !!${flagsExpr}.got_ticket })`);
  log.flags = fl;
  if (!fl.chair_back) fails.push('chair_back not set');
  if (errors.length) fails.push('page errors: ' + errors.join(' | '));
  await game.close();
});
fs.writeFileSync(path.join(out, 'log.json'), JSON.stringify(log, null, 1));
console.log(JSON.stringify({ tama: log.tama, mio: log.mio, my_chair: log.my_chair }, null, 0));
console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS', '(' + out + ')');
process.exit(fails.length ? 1 : 0);
