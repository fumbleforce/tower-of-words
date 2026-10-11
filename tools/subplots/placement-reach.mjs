// Does a public scene play where and when the editor placed it, in a normal run? The game starts from the save it
// makes for that day (days.js: a plain finished day before, then the next day's opening save), with the clock at the
// way in's time of day and the player at its place, and is continued from the title like a player would. Then the
// player walks up to the thing or person of the scene's `talk:` way in and taps its marker. PASS when the scene's
// first step runs. A way in with no time of day is tried at each time until its person or thing is there. With --not <period>, the same run at another time of day must not start it.
//
//   node tools/subplots/placement-reach.mjs <scene id> [--not <period>] [--phone]     PORT=8797 BASE=game3d (the server
//   and the game folder to load; a worktree's own server, or BASE=.claude/worktrees/<name>/game3d on 8771)
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBrowserJob } from '../lib/browser-job.mjs';
import { openGame } from '../../game3d/test/support/open-game.mjs';
import { readRestrictions, periodsOf } from './web/restrictions.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const id = args.find(a => a.startsWith('public:'));
const not = args.includes('--not') ? args[args.indexOf('--not') + 1] : null;
const phone = args.includes('--phone');
if (!id) { console.log('usage: placement-reach.mjs <public scene id> [--not <period>] [--phone]'); process.exit(2); }
const ORIGIN = `http://127.0.0.1:${process.env.PORT || 8771}`;
const BASE = process.env.BASE || 'game3d';

const map = JSON.parse(execFileSync('node', [path.join(HERE, 'storymap.mjs')], { encoding: 'utf8', env: { ...process.env, SUBPLOTS_ROOT: path.resolve(HERE, '../..') } }));
const scene = map.scenes.find(s => s.id === id);
if (!scene) { console.log(`FAIL ${id}: not on the story map`); process.exit(1); }
const way = scene.entries.find(e => e.event.startsWith('talk:'));
if (!way || typeof scene.day !== 'number' || scene.day < 2 || !scene.place) {
  console.log(`FAIL ${id}: this check needs a scene of days 2 to 5 with a talk way in (day ${scene.day}, ${scene.entries.map(e => e.event).join(', ') || 'no way in'})`);
  process.exit(1);
}
const thing = way.event.slice(5);
// the way in's times of day; with none set, every time of day in turn until its person or thing is there
const placed = periodsOf(readRestrictions(way.condition, { once: way.once }));
const tries = placed.length ? placed.slice(0, 1) : ['morning', 'lunch', 'afternoon', 'evening'];
const viewport = phone ? { width: 390, height: 844 } : { width: 1366, height: 860 };

async function run(browser, period) {
  const opened = await openGame(browser, {
    mode: 'title', viewport, touch: phone, url: `${ORIGIN}/${BASE}/index.html?q=0`, timeoutMs: 60000,
    beforeNavigate: page => page.addInitScript(() => {
      globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false, voiceOn: false, textSpeed: 'instant' }));
      globalThis.localStorage.setItem('amakawa-onboard', JSON.stringify({ moved: true, talked: true, uses: 9, sayUsed: true }));
    }),
  });
  const { page } = opened;
  try {
    // the save the game makes when the day begins, with the clock and the player moved on to the way in's time and place
    await page.evaluate(async ({ day, period, place }) => {
      const { nextDaySave, sampleDayEnd } = await import('./js/days.js');
      const save = nextDaySave(sampleDayEnd(day));
      Object.assign(save, { period, place, pendingStart: null, world: {} });
      save.flags = { ...save.flags, period, place };
      globalThis.localStorage.setItem('amakawa-day1-save', JSON.stringify(save));
    }, { day: scene.day, period, place: scene.place });
    await page.reload();
    await page.locator('#title .mcont').click();
    const slot = page.locator('#saves button.slot').filter({ hasText: 'Autosave' });
    if (await slot.isVisible({ timeout: 3000 }).catch(() => false)) await slot.click();
    const keep = page.getByRole('button', { name: 'Keep playing' });
    if (await keep.isVisible({ timeout: 1500 }).catch(() => false)) await keep.click();
    for (let i = 0; i < 3 && (await page.locator('#saves [data-close]').isVisible().catch(() => false)); i++) await page.locator('#saves [data-close]').click().catch(() => {});
    await page.waitForFunction(place => globalThis.__game?.place?.name === place && !globalThis.__game.busy, scene.place, { timeout: 60000 });
    // walk up to it as a player does, then tap its marker
    const probe = await page.evaluate(({ thing, node }) => {
      const g = globalThis.__game;
      const resolved = g.runner.resolve('talk:' + thing, { peek: true });
      const target = g.place.things[thing];
      if (resolved === node) g.runner.story.nodes[node].unshift({ set: '__reach_hit' });
      if (target) {
        const s = target.spot?.() || [g.player.root.position.x, g.player.root.position.z];
        g.walker.stop(); g.player.root.position.set(s[0], g.place.floorY || 0, s[1]); g.walker.sync?.(); g.place.cam?.snap?.(g.player.root.position);
      }
      return { resolved, there: !!target, day: g.flagsRef.day, period: g.flagsRef.period };
    }, { thing, node: scene.node });
    await page.waitForTimeout(1200);
    const pinAt = () => page.evaluate(thing => {
      const m = globalThis.__game.markers.list.find(x => x.id === thing);
      if (!m || m.el.style.display === 'none') return null;
      const r = m.el.querySelector('.pin').getBoundingClientRect();
      return r.width ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
    }, thing);
    let pin = await pinAt();
    if (!pin) {
      // some things only take a tap from outside their spot (a door, from outside the hall): tap it from where the
      // player arrives in the place, and he walks up to it
      await page.evaluate(() => {
        const g = globalThis.__game, [x, z] = g.place.start;
        g.walker.stop(); g.player.root.position.set(x, g.place.floorY || 0, z); g.walker.sync?.(); g.place.cam?.snap?.(g.player.root.position);
      });
      await page.waitForTimeout(1200);
      pin = await pinAt();
    }
    if (pin) { if (phone) await page.touchscreen.tap(pin.x, pin.y); else await page.mouse.click(pin.x, pin.y); }
    // a person with more to talk about opens the Talk menu first: pick its story row, as a player does
    const story = page.locator('#talk .chips button:not([disabled])', { hasText: 'Story' }).first();
    if (pin && await story.waitFor({ state: 'visible', timeout: 4000 }).then(() => true, () => false)) {
      await page.waitForTimeout(900); // the rows take clicks only after a moment
      if (phone) await story.tap(); else await story.click();
    }
    const hit = await page.waitForFunction(() => globalThis.__game.flagsRef.__reach_hit === true, null, { timeout: 25000 }).then(() => true, () => false);
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT }); // SHOT=<file>: the screen after the tap
    return { ...probe, pin: !!pin, hit, errors: opened.errors.filter(e => !/favicon/.test(e)).slice(0, 3) };
  } finally {
    await opened.close();
  }
}

let failed = false;
await withBrowserJob('placement-reach', async browser => {
  let r;
  for (const period of tries) {
    r = await run(browser, period);
    if (r.pin) break;
  }
  const ok = r.hit && r.resolved === scene.node && r.pin;
  failed ||= !ok;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${scene.node} at ${scene.place}, day ${r.day}, ${r.period}: tapping ${thing} ${r.hit ? 'starts it' : `does not start it (the way in picks ${r.resolved || 'nothing'}${r.there ? '' : `, no ${thing} in the place`}${r.pin ? '' : ', no marker to tap'})`}${r.errors.length ? ' · page errors: ' + r.errors.join(' | ') : ''}`);
  if (not) {
    const n = await run(browser, not);
    const okNot = !n.hit && n.resolved !== scene.node;
    failed ||= !okNot;
    console.log(`${okNot ? 'PASS' : 'FAIL'} ${scene.node} at ${scene.place}, day ${n.day}, ${n.period}: ${okNot ? `not started (tapping ${thing} picks ${n.resolved || 'nothing'})` : 'started outside its time'}`);
  }
});
process.exitCode = failed ? 1 : 0;
