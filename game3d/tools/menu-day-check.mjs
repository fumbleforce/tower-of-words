// Plays the fast day (?test=fast) and, at every moment no scene runs, checks that each selectable thing's menu has an
// action that does something right now and that no E row does nothing (issue #128; the rule and the faults are in
// test/support/menu-effects.mjs). Prints each fault once with the goal it was first seen under, then PASS or FAIL.
//   node game3d/tools/menu-day-check.mjs [W H]      (BASE=.claude/worktrees/<name>/game3d; LIST=1 prints every thing;
//   DAY=2 plays day 2 from a plain finished day 1, as fast.mjs does)
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { openGame } from '../test/support/open-game.mjs';
import { menuEffects, sampleMenuEffects } from '../test/support/menu-effects.mjs';

const [W = '1366', H = '860'] = process.argv.slice(2);
const phone = +W < 700;
let log = null;
const errors = [];
await withBrowserJob(
  'menu-day-check',
  async (browser) => {
    const url = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html?test=fast&q=0${+process.env.DAY > 1 ? '&day=' + +process.env.DAY : ''}`;
    const game = await openGame(browser, {
      viewport: { width: +W, height: +H },
      touch: phone,
      mode: 'fast',
      url,
      beforeNavigate: (page) => page.addInitScript(`(${sampleMenuEffects})(${JSON.stringify(String(menuEffects))})`),
    });
    try {
      await game.page.waitForFunction(() => globalThis.__test?.done, null, { timeout: 240000 });
    } catch (e) {
      errors.push('day did not finish: ' + e.message.split('\n')[0]);
    }
    log = await game.page.evaluate(() => globalThis.__menuFx);
    errors.push(...game.errors);
    await game.close();
  },
  { timeoutMs: 295000 },
);
const faults = Object.entries(log?.faults || {});
if (process.env.LIST)
  for (const [place, things] of Object.entries(log?.selectable || {})) {
    console.log(`\n${place}`);
    for (const [id, fx] of Object.entries(things)) console.log(`  ${id.padEnd(18)} ${fx}`);
  }
for (const [k, where] of faults) console.log(`BAD ${k} (first under ${where})`);
for (const e of errors) console.log('ERROR', e);
const n = Object.values(log?.selectable || {}).reduce((a, t) => a + Object.keys(t).length, 0);
console.log(
  `${faults.length || errors.length || !log?.samples ? 'FAIL' : 'PASS'} ${W}x${H}: ${log?.samples || 0} moments, ${n} selectable things seen, ${faults.length} faults`,
);
process.exit(faults.length || errors.length || !log?.samples ? 1 : 0);
