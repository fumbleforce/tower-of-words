// Focused check of the ticket app (js/ui/tickets-view.js) on day 2, in room 203, at phone and desktop size:
//   Eric sits at his desk, the app opens on the computer, both tickets list; the first-use tip shows; opening a
//   ticket shows it (on the phone, alone, with 戻る Back); tapping a Japanese label teaches its word; 担当する Take
//   moves it to in progress and sets its flag; 閉じる Close closes it, the camera lets go and Eric stands up. Stills
//   of each state go to the out dir. BLUR=1 blurs the ticket subjects and texts in the stills (for the Showcase).
// The story steps are the ones FORMAT.md gives for the room PC, run as a node of their own, so this works before the
// day-2 story calls them.
//   node game3d/tools/tickets-check.mjs [outdir]    SIZES=390x844,1366x860 (default); BASE=<worktree>/game3d
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || 'game3d/shots/tickets';
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'game3d';
const sizes = (process.env.SIZES || '390x844,1366x860').split(',').map((s) => s.split('x').map(Number));
const fails = [],
  errors = [];
const ok = (cond, msg) => {
  if (!cond) fails.push(msg);
};
const STEPS = [
  { do: 'sit', who: 'eric', at: 'desk_chair' },
  { do: 'cam', on: 'computer', zoom: 1.2 },
  { do: 'ticket', add: 'T-0001' },
  { do: 'ticket', add: 'T-0002' },
  { do: 'tickets' },
  { do: 'cam', back: true },
  { do: 'stand', who: 'eric' },
];

await withBrowserJob('tickets-check', async (browser) => {
  for (const [W, H] of sizes) {
    const tag = `${W}x${H}`;
    const phone = W < 700;
    const shot = (page, name) => page.screenshot({ path: path.join(out, `${name}-${tag}.png`) });
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
    if (process.env.BLUR)
      await page.addInitScript(() =>
        document.addEventListener('DOMContentLoaded', () => {
          const st = document.createElement('style');
          st.textContent = '#ticketsApp .tk-rows .c-sub, #ticketsApp .d-title, #ticketsApp .d-text, #toast { filter: blur(5px); }';
          document.head.appendChild(st);
        }),
      );
    await page.goto(`http://127.0.0.1:8771/${base}/index.html?day=2&q=1`, { timeout: 60000 });
    await page.waitForFunction(() => globalThis.__done && globalThis.__game?.place?.name === 'dorms', null, {
      timeout: 120000,
    });
    // the morning's texts play by themselves; then the room is quiet
    for (let i = 0; i < 40 && (await page.evaluate(() => globalThis.__game.busy)); i++) {
      if (await page.evaluate(() => globalThis.__game.ui.talking)) await page.click('#talk');
      await page.waitForTimeout(400);
    }
    await page.evaluate((steps) => {
      const g = globalThis.__game;
      g.runner.story.nodes.__tickets_check = steps;
      g.beat(() => g.runner.run('__tickets_check'));
    }, STEPS);
    const opened = await page
      .waitForSelector('#ticketsApp:not([hidden])', { timeout: 20000 })
      .then(() => true, () => false);
    ok(opened, `${tag}: the app didn't open`);
    if (!opened) {
      await shot(page, 'fail');
      await ctx.close();
      continue;
    }
    await page.waitForTimeout(500);
    ok(await page.evaluate(() => globalThis.__game.player.seated), `${tag}: Eric isn't sitting at the desk`);
    const rows = await page.$$eval('#ticketsApp .tk-rows .tk-row', (r) => r.map((x) => x.dataset.id));
    ok(rows.join() === 'T-0001,T-0002', `${tag}: the list shows ${rows.join() || 'nothing'}`);
    ok(await page.isVisible('#ticketsApp .list-tip'), `${tag}: no first-use tip over the list`);
    await shot(page, '1-list');
    // tap targets on the phone: every row and button at least 44 px tall
    if (phone) {
      const small = await page.$$eval('#ticketsApp .tk-row:not(.hdr), #ticketsApp .tk-btn, #ticketsApp .tkw[data-w]', (els) =>
        els.filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.className),
      );
      ok(!small.length, `${tag}: tap targets under 44 px: ${small.join(', ')}`);
    }
    await page.click('#ticketsApp .tk-rows .tk-row[data-id="T-0002"]');
    await page.waitForTimeout(250);
    ok(await page.isVisible('#ticketsApp .tk-detail .d-head'), `${tag}: the ticket didn't show`);
    if (phone) ok(!(await page.isVisible('#ticketsApp .tk-list')), `${tag}: the phone shows the list and the ticket at once`);
    ok(!(await page.isVisible('#ticketsApp .list-tip')), `${tag}: the list tip stays after a ticket was opened`);
    ok(await page.isVisible('#ticketsApp .take-tip'), `${tag}: no tip by Take ticket`);
    await shot(page, '2-detail');
    // a Japanese label teaches its word: into the known words, with a line on the page saying so
    await page.click('#ticketsApp .tk-form .tkw[data-w="kenmei"]');
    await page.waitForTimeout(150);
    ok(
      await page.evaluate(async () => (await import('./js/lang.js')).known.has('kenmei')),
      `${tag}: tapping 件名 didn't teach it`,
    );
    ok(/件名/.test(await page.textContent('#ticketsApp .tk-learn')), `${tag}: no line saying 件名 was learned`);
    await shot(page, '2b-learned');
    await page.click('#ticketsApp .d-act .take');
    await page.waitForTimeout(250);
    const status = await page.evaluate(async () => (await import('./js/narrative/state.js')).flags.ticket_T0002);
    ok(status === 'progress', `${tag}: Take ticket left it ${status}`);
    await shot(page, '3-taken');
    if (phone) {
      await page.click('#ticketsApp .tk-back');
      await page.waitForTimeout(200);
      ok(await page.isVisible('#ticketsApp .tk-list'), `${tag}: Back didn't return to the list`);
      await shot(page, '4-back');
    }
    // 閉じる Close closes the app
    await page.click('#ticketsApp .tk-close');
    await page.waitForFunction(() => document.getElementById('ticketsApp').hidden, null, { timeout: 5000 }).catch(() => {});
    await page.waitForFunction(() => !globalThis.__game.busy, null, { timeout: 20000 }).catch(() => {});
    ok(await page.evaluate(() => !globalThis.__game.player.seated), `${tag}: Eric still sits after the app closed`);
    await page.waitForTimeout(600);
    await shot(page, '6-closed');
    // the story closes the ticket: Eric is paid its amount once, with a notice; the app shows Paid
    const yen0 = await page.evaluate(() => globalThis.__game.sim.yen);
    await page.evaluate(() => {
      const g = globalThis.__game;
      g.runner.story.nodes.__tickets_paid = [
        { do: 'ticket', close: 'T-0002' },
        { do: 'ticket', close: 'T-0002' },
      ];
      g.beat(() => g.runner.run('__tickets_paid'));
    });
    await page.waitForFunction(() => !globalThis.__game.busy, null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(400);
    const yen1 = await page.evaluate(() => globalThis.__game.sim.yen);
    ok(yen1 - yen0 === 5000, `${tag}: closing T-0002 paid ${yen1 - yen0}, not 5000 once`);
    ok(/Paid/.test(await page.textContent('#toast')), `${tag}: no notice of the payment`);
    await shot(page, '7-paid-notice');
    await page.evaluate(() => {
      const g = globalThis.__game;
      g.runner.story.nodes.__tickets_show = [{ do: 'tickets', show: 'T-0002' }];
      g.beat(() => g.runner.run('__tickets_show'));
    });
    await page.waitForSelector('#ticketsApp:not([hidden])', { timeout: 10000 });
    await page.waitForTimeout(400);
    ok(/Paid/.test(await page.textContent('#ticketsApp .d-meta')), `${tag}: the closed ticket doesn't say Paid`);
    ok(/¥5,000/.test(await page.textContent('#ticketsApp .tk-info')), `${tag}: the status bar doesn't show ¥5,000 paid`);
    await shot(page, '8-paid-app');
    await page.click('#ticketsApp .tk-close');
    await ctx.close();
  }
});

for (const e of errors) console.log('PAGE ERROR', e);
for (const f of fails) console.log('FAIL', f);
console.log(fails.length || errors.length ? 'tickets-check: FAIL' : 'tickets-check: PASS', '->', out);
process.exitCode = fails.length || errors.length ? 1 : 0;
