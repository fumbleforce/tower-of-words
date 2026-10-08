// The opening as a player plays it: the real title, Start (and, after a reload, Continue), natural waits, and real
// mouse clicks on the dialogue, the floor and Mio. No ?test= shortcut and no teleport, which is how a dialogue box
// opened behind the title and hung on its waiting dots went unnoticed (fixed in 96520db).
//   node tools/check/opening-browser.mjs [w h]      both sizes by default; BASE=<server url of a checkout>
// Fails if #talk sits in its waiting state for more than 5 s while no scene is running (nothing will ever close it),
// or if clicking Mio does not start one of her talk:mio scenes.
import { withBrowserJob } from '../lib/browser-job.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:8771/';
const sizes = process.argv.length > 3 ? [[+process.argv[2], +process.argv[3]]] : [[1366, 860], [390, 844]];
const STUCK_MS = 5000;
const res = [];
const ok = (test, pass, detail = '') => res.push({ test, pass, detail });

// what the player sees and whether anything is still coming: a waiting box with no scene running is stuck
const probe = (p) => p.evaluate(() => {
  const g = window.__game, t = document.getElementById('talk'), r = g?.runner;
  return {
    waiting: !!t && !t.hidden && t.classList.contains('waiting'),
    talkOpen: !!t && !t.hidden,
    scene: !!(g?.busy || r?.frames?.length),
    triggers: (r?.frames || []).map((f) => f.trigger || ''),
    seat: (r?.frames || []).some(f => f.trigger === 'zone:free_seat' && f.node === 'seat'),
    title: document.body.classList.contains('at-title') || document.body.classList.contains('title-leaving'),
  };
});
const screenOf = (p, what) => p.evaluate((what) => {
  const G = window.__game, P = G.place, v = new G.player.root.position.constructor();
  if (what === 'mio') (G.mioNpc?.root?.visible ? G.mioNpc.root : P.people.mio.root).getWorldPosition(v).setY(0.9);
  else v.set(what[0], 0, what[1]); // a point on the aisle floor, clear of seats, people and the pole
  v.project(P.camera);
  return [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight];
}, what);
const boxCenter = async (p, sel) => {
  const b = await (await p.$(sel))?.boundingBox(); // no auto-wait: a box that isn't there is "not shown"
  return b && b.width ? [b.x + b.width / 2, b.y + b.height / 2] : null;
};
// play for `ms`, clicking at the given times, and record the longest stretch the box waited with nothing coming
async function watch(p, ms, clicks, log) {
  const start = Date.now();
  let since = null, worst = 0, todo = [...clicks];
  while (Date.now() - start < ms) {
    const s = await probe(p);
    const stuck = s.waiting && !s.scene && !s.title;
    if (stuck) { since ??= Date.now(); worst = Math.max(worst, Date.now() - since); } else since = null;
    if (todo.length && Date.now() - start >= todo[0].at) {
      const c = todo.shift();
      const pt = c.what === 'dialogue' ? await boxCenter(p, '#talk:not([hidden])') : await screenOf(p, c.floor);
      log.push(`${((Date.now() - start) / 1000).toFixed(1)}s ${c.what} ${pt ? pt.map(Math.round).join(',') : 'not shown'} ${JSON.stringify(s)}`);
      if (pt) await p.mouse.click(pt[0], pt[1]);
    }
    await p.waitForTimeout(200);
  }
  return worst;
}
async function talkToMio(p, log) {
  // Use the visible pin: the old fixed world height could project into a seat as character models changed.
  const pt = await p.evaluate(() => {
    const marker = window.__game.markers.list.find(m => m.id === 'mio')?.el;
    const rect = marker?.querySelector('.pin')?.getBoundingClientRect();
    if (!rect?.width) throw new Error('Mio interaction pin is not visible');
    const point = [rect.x + rect.width / 2, rect.y + rect.height / 2];
    if (document.elementFromPoint(...point)?.closest('.mark') !== marker) throw new Error('Mio interaction pin is covered');
    return point;
  });
  log.push(`mio at ${pt.map(Math.round).join(',')}`);
  await p.mouse.click(pt[0], pt[1]);
  const until = Date.now() + 15000;
  while (Date.now() < until) {
    const s = await probe(p);
    // Walking to Mio can cross her free-seat zone first, opening the same authored seating conversation.
    if (s.triggers.includes('talk:mio') || (s.seat && s.talkOpen)) return true;
    await p.waitForTimeout(200);
  }
  return false;
}
// the Wi-Fi line comes about 1 s after the title goes; train aisle floor points are world x, z
const CLICKS = [{ at: 3000, what: 'dialogue' }, { at: 5000, what: 'floor', floor: [-1, 0.1] },
  { at: 8000, what: 'dialogue' }, { at: 10000, what: 'floor', floor: [-0.3, 0.2] }];

await withBrowserJob('opening-browser', async (b) => {
  for (const [W, H] of sizes) {
    const phone = W < 700, tag = `${W}x${H}`;
    const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone });
    const p = await ctx.newPage();
    const errs = [], log = [];
    p.on('pageerror', (e) => errs.push(String(e)));
    try {
      await p.goto(BASE + 'game3d/index.html?q=0');
      await p.waitForSelector('#title .go', { state: 'visible', timeout: 60000 });
      await p.waitForTimeout(1500); // a player reads the title
      const go = await boxCenter(p, '#title .go');
      await p.mouse.click(go[0], go[1]);
      const t0 = Date.now();
      await p.waitForFunction(() => !document.body.classList.contains('at-title') && !document.body.classList.contains('title-leaving'), null, { timeout: 20000 });
      log.push(`title gone after ${Date.now() - t0} ms`);
      const worstNew = await watch(p, 14000, CLICKS, log);
      ok(`${tag} Start: no waiting box without a scene for more than 5 s`, worstNew <= STUCK_MS, `stuck ${worstNew} ms\n  ${log.join('\n  ')}`);
      // the autosave from before her scene: the player below reloads before talking to her
      const before = await p.evaluate(() => localStorage.getItem('amakawa-day1-save'));
      ok(`${tag} Start: clicking Mio starts her scene`, await talkToMio(p, log), log.slice(-3).join('\n  '));

      // a player who comes back: reload, Continue, the autosave
      log.length = 0;
      await ctx.addInitScript((s) => {
        if (s && !sessionStorage.getItem('opening-check-restored')) localStorage.setItem('amakawa-day1-save', s);
        sessionStorage.setItem('opening-check-restored', '1');
      }, before);
      await p.reload();
      await p.waitForSelector('#title .mcont', { state: 'visible', timeout: 60000 });
      await p.waitForTimeout(1500);
      const mc = await boxCenter(p, '#title .mcont');
      await p.mouse.click(mc[0], mc[1]);
      await p.waitForSelector('#saves button.slot', { state: 'visible', timeout: 10000 });
      const slot = await boxCenter(p, '#saves button.slot:has-text("Autosave")');
      await p.mouse.click(slot[0], slot[1]);
      const worstCont = await watch(p, 14000, CLICKS, log);
      ok(`${tag} Continue: no waiting box without a scene for more than 5 s`, worstCont <= STUCK_MS, `stuck ${worstCont} ms\n  ${log.join('\n  ')}`);
      ok(`${tag} Continue: clicking Mio starts her scene`, await talkToMio(p, log), log.slice(-3).join('\n  '));
    } catch (e) {
      ok(`${tag} ran to the end`, false, `${e.message.split('\n')[0]}\n  ${log.join('\n  ')}`);
    }
    ok(`${tag} page errors`, errs.length === 0, errs.slice(0, 3).join(' | '));
    await ctx.close();
  }
}, { timeoutMs: 150000 });
for (const r of res) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.test}${r.detail && (!r.pass || process.env.VERBOSE) ? '\n  ' + r.detail : ''}`);
console.log(res.every((r) => r.pass) ? 'ALL PASS opening' : 'FAIL opening');
process.exit(res.every((r) => r.pass) ? 0 : 1);
