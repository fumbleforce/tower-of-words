// The People panel on day 2, before any place's story has been visited this session (issue #223): starts day 2
// fresh (?day=2), opens People, then reloads and comes back through the title's Continue (a load) and opens it
// again. Fails on a card whose name is a raw id ("mio", "guard") or that has no line about them (story/people.js),
// or when someone met on day 1 has no card.
//   node game3d/tools/people-check.mjs [w] [h]     writes game3d/shots/people-check/<w>x<h>/, prints PASS or FAIL
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const [W = '1366', H = '860'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const repo = G.replace(/\/\.claude\/worktrees\/[^/]+\/game3d$/, '/game3d').replace(/\/game3d$/, '');
const base = `http://127.0.0.1:8771/${path.relative(repo, G)}`;
const out = path.join(G, `shots/people-check/${W}x${H}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
};

await withBrowserJob('people-check', async (b) => {
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('people-check-seeded')) return;
    localStorage.clear();
    localStorage.setItem('amakawa-settings', JSON.stringify({ textSpeed: 'instant', voiceOn: false, reduceMotion: true }));
    sessionStorage.setItem('people-check-seeded', '1');
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));

  const people = async (tag) => {
    await p.waitForFunction(() => window.__game?.place && document.querySelector('#title')?.hidden, null, { timeout: 120000 });
    await p.waitForFunction(() => !document.querySelector('#peopleBtn')?.hidden, null, { timeout: 30000 }).catch(() => {});
    // the People chip works while a line is up (controls-and-ui.md), so no need to play anything first
    await p.evaluate(() => document.querySelector('#peopleBtn')?.click());
    await p.waitForSelector('#peoplePanel:not([hidden]) li', { timeout: 10000 }).catch(() => {});
    const r = await p.evaluate(async () => {
      const S = await import(new URL('js/sim.js', location.href).href);
      return {
        met: [...S.sim.met].filter((id) => id !== 'eric'),
        cards: [...document.querySelectorAll('#peoplePanel li')].map((li) => ({
          id: li.dataset.id,
          name: li.querySelector('.nm')?.firstChild?.textContent.trim() || '',
          about: li.querySelector('.ab')?.textContent.trim() || '',
        })),
      };
    });
    await p.screenshot({ path: path.join(out, tag + '.png') });
    console.log(`     ${tag}: met ${r.met.join(', ')}`);
    for (const c of r.cards) console.log(`     ${c.id}: "${c.name}" / "${c.about}"`);
    check(r.cards.length > 0, `${tag}: People lists someone`);
    for (const c of r.cards) {
      check(c.name && c.name !== c.id && !/^[a-z_]+$/.test(c.name), `${tag}: ${c.id} shows a name, not a raw id ("${c.name}")`);
      check(!!c.about, `${tag}: ${c.id} has a line about them`);
    }
    const shown = new Set(r.cards.map((c) => c.id));
    for (const id of ['mio', 'guard', 'kuroda', 'mori', 'kenji']) if (r.met.includes(id)) check(shown.has(id), `${tag}: ${id}, met on day 1, has a card`);
    await p.evaluate(() => document.querySelector('#peoplePanel .close')?.click());
  };

  // 1. day 2 fresh: only day 2's first place has loaded its story
  await p.goto(`${base}/index.html?day=2`);
  await people('1-day2-fresh');
  // 2. after a load: a new page, the title's Continue, and the newest save on the Load screen (the day-2 start)
  await p.waitForFunction(() => window.__game?.saveEnabled, null, { timeout: 60000 }).catch(() => {});
  await p.goto(`${base}/index.html`);
  await p.waitForSelector('#title:not([hidden]) .mcont:not([hidden])', { timeout: 120000 });
  await p.locator('#title .mcont').click();
  await p.waitForSelector('#saves:not([hidden]) .slot:not([disabled])', { timeout: 10000 });
  await p.locator('#saves .slot:not([disabled])').first().click();
  await p.waitForSelector('#ask:not([hidden]) .yes', { timeout: 3000 }).then(() => p.locator('#ask .yes').click()).catch(() => {});
  await people('2-day2-after-continue');
  check(!errs.length, `no page errors${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
  await ctx.close();
});
console.log(`${fails.length ? 'FAIL' : 'PASS'} people-check ${W}x${H} (${out})`);
process.exit(fails.length ? 1 : 0);
