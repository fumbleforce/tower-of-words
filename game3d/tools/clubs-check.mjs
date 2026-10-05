// The clubs and the notice board on day 3 (docs/game/systems.md, Clubs and Notice board; #228), at phone and desktop
// size, with stills of each state. Per size, from ?day=3&place=plaza (the day-3 test skeleton, story/day3/):
//   the board: reading it shows the four club posters (募集, 日時 with 土曜日 beside Saturday, 場所, a slip) and the
//              teaching line, all on screen, nothing cut off
//   joining:   tapping the swimming club's slip stamps it Joined, sets club_swimming and shows the toast; People lists
//              the club with its next meeting
//   quiet:     the pool deck in the morning runs no session
//   the clock: room 203's chair, "Rest until evening", moves the period to the evening
//   a session: arriving at the pool deck in the evening runs the club's next session node (the placeholder line),
//              counts progress and the day; arriving again that evening runs nothing
//   node game3d/tools/clubs-check.mjs [outdir]    SIZES=390x844,1366x860 (default); BASE=<worktree>/game3d
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || 'game3d/shots/clubs';
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'game3d';
const url = (q) => `http://127.0.0.1:8771/${base}/index.html?${q}`;
const sizes = (process.env.SIZES || '390x844,1366x860').split(',').map((s) => s.split('x').map(Number));
const fails = [],
  errors = [];
const ok = (cond, msg) => {
  if (!cond) fails.push(msg);
  return cond;
};

const idle = (page, ms = 30000) =>
  page.waitForFunction(() => !globalThis.__game.busy && !globalThis.__game.transition, null, { timeout: ms });
const flagsOf = (page) =>
  page.evaluate(async () => {
    const { flags } = await import('./js/narrative/state.js');
    return Object.fromEntries(Object.entries(flags).filter(([k]) => /^club|^period$|^day$/.test(k)));
  });
// Eric is put at the thing's spot first, so the walk there (slow under software GL) is not what is tested
const use = (page, id) =>
  page.evaluate((id) => {
    const g = globalThis.__game,
      m = g.markers.list.find((x) => x.id === id),
      t = g.place.things[id];
    if (!m || !m.enabled()) return false;
    const at = t?.spot?.();
    if (at) {
      g.player.root.position.x = at[0];
      g.player.root.position.z = at[1];
      g.walker.sync?.();
    }
    g.use(m);
    return true;
  }, id);
const travel = async (page, to) => {
  await page.evaluate((to) => globalThis.__game.travel(to), to);
  await page.waitForFunction((to) => globalThis.__game.place?.name === to && !globalThis.__game.transition, to, {
    timeout: 60000,
  });
  await page.waitForTimeout(600);
};
const talkText = (page) => page.evaluate(() => globalThis.document.querySelector('#talk:not([hidden]) .line')?.textContent || '');

await withBrowserJob('clubs-check', async (browser) => {
  for (const [W, H] of sizes) {
    const tag = `${W}x${H}`,
      phone = W < 700;
    const shot = (page, name) => page.screenshot({ path: path.join(out, `${name}-${tag}.png`) });
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
    await page.goto(url('day=3&place=plaza'), { timeout: 60000 });
    await page.waitForFunction(() => globalThis.__done, null, { timeout: 120000 });
    await idle(page);
    let f = await flagsOf(page);
    ok(f.day === 3, `${tag} not day 3: ${JSON.stringify(f)}`);

    // ---- the board
    ok(await use(page, 'noticeboard'), `${tag} notice board not usable on day 3`);
    await page.waitForSelector('#boardView:not([hidden])', { timeout: 90000 });
    await page.waitForTimeout(500);
    await shot(page, '1-board');
    const board = await page.evaluate(() => {
      const d = globalThis.document,
        cork = d.querySelector('#boardView .cork'),
        r = cork.getBoundingClientRect();
      const posters = [...d.querySelectorAll('#boardView .poster')];
      return {
        posters: posters.map((p) => p.textContent),
        slips: d.querySelectorAll('#boardView button.slip').length,
        note: d.querySelector('#boardView .tapx').textContent,
        onScreen: r.top >= 0 && r.bottom <= globalThis.innerHeight + 1 && r.left >= 0 && r.right <= globalThis.innerWidth + 1,
        wide: posters.filter((p) => p.scrollWidth > p.clientWidth + 1).length,
      };
    });
    ok(board.posters.length === 4 && board.slips === 4, `${tag} expected 4 club posters with slips: ${JSON.stringify(board)}`);
    const swim = board.posters.find((t) => /Swimming club/.test(t)) || '';
    for (const s of ['水泳部', '募集', '日時', '土曜日', 'Saturday 3 Oct, evening', '場所', 'Outdoor pool', '入会'])
      ok(swim.includes(s), `${tag} the swimming poster lacks "${s}": ${swim}`);
    ok(/Take a slip to join/.test(board.note), `${tag} the board doesn't teach the slip: ${board.note}`);
    ok(board.onScreen && !board.wide, `${tag} the board doesn't fit: ${JSON.stringify(board)}`);

    // ---- joining
    await page.click('#boardView .poster:has-text("Swimming club") button.slip');
    await page.waitForTimeout(400);
    await shot(page, '2-joined');
    f = await flagsOf(page);
    ok(f.club_swimming === true && f.clubs_joined === 1, `${tag} taking the slip didn't join: ${JSON.stringify(f)}`);
    const after = await page.evaluate(() => ({
      open: !globalThis.document.querySelector('#boardView').hidden,
      stamp: globalThis.document.querySelector('#boardView .poster .slip.joined')?.textContent,
      toast: globalThis.document.querySelector('#toast:not([hidden])')?.textContent || '',
    }));
    ok(after.open && after.stamp === 'Joined', `${tag} the slip isn't stamped Joined: ${JSON.stringify(after)}`);
    ok(/Joined the Swimming club/.test(after.toast), `${tag} no toast on joining: ${JSON.stringify(after)}`);
    await page.click('#boardView .tapx');
    await page.waitForTimeout(300);
    ok(await page.evaluate(() => globalThis.document.querySelector('#boardView').hidden), `${tag} the board didn't close`);
    await idle(page);
    // People: the club and its next meeting
    await page.click('#peopleBtn');
    await page.waitForSelector('#peoplePanel:not([hidden])');
    await page.waitForTimeout(300);
    await shot(page, '3-people');
    const club = await page.evaluate(() => globalThis.document.querySelector('#peoplePanel li.clubs')?.textContent || '');
    ok(/Swimming club/.test(club) && /Next: Saturday 3 Oct, evening · Outdoor pool/.test(club), `${tag} People: ${club}`);
    await page.click('#peoplePanel .close');

    // ---- outside meeting time the pool is quiet
    await travel(page, 'pool');
    await idle(page);
    f = await flagsOf(page);
    ok(!f.clubprog_swimming, `${tag} a session ran in the morning: ${JSON.stringify(f)}`);

    // ---- the clock: room 203's chair, rest until evening
    await travel(page, 'dorms');
    await idle(page);
    ok(await use(page, 'computer'), `${tag} the desk isn't usable`);
    await page.waitForSelector('#talk .chips .chip', { timeout: 20000 });
    await page.waitForTimeout(1000);
    await shot(page, '4-chair');
    await page.click('#talk .chips .chip:has-text("Rest until evening")');
    await idle(page);
    f = await flagsOf(page);
    ok(f.period === 'evening', `${tag} resting didn't move to the evening: ${JSON.stringify(f)}`);

    // ---- the session
    await travel(page, 'pool');
    await page.waitForFunction(() => /swimming club/.test(globalThis.document.querySelector('#talk .line')?.textContent || ''), null, {
      timeout: 30000,
    });
    await page.waitForTimeout(400);
    await shot(page, '5-session');
    ok(/Placeholder: the swimming club's first session/.test(await talkText(page)), `${tag} the session line: ${await talkText(page)}`);
    f = await flagsOf(page);
    ok(f.clubprog_swimming === 1 && f.clubday_swimming === 3, `${tag} the session didn't count: ${JSON.stringify(f)}`);
    for (let i = 0; i < 5 && (await page.evaluate(() => globalThis.__game.busy)); i++) {
      await page.mouse.click(W / 2, H / 2);
      await page.waitForTimeout(500);
    }
    await idle(page);
    await travel(page, 'sports');
    await idle(page);
    await travel(page, 'pool');
    await idle(page);
    f = await flagsOf(page);
    ok(f.clubprog_swimming === 1, `${tag} the session ran twice in one evening: ${JSON.stringify(f)}`);
    await ctx.close();
  }
});

for (const e of errors) console.log('PAGE ERROR', e);
for (const f of fails) console.log('FAIL', f);
console.log(fails.length || errors.length ? 'FAIL clubs-check' : 'PASS clubs-check');
process.exitCode = fails.length || errors.length ? 1 : 0;
