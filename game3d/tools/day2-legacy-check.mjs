// Old shipping saves pass through the actual title Continue, then save/reload once more.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { openGame } from '../test/support/open-game.mjs';
const width = +(process.argv[2] || 1366), mc = width < 700 ? 'carina' : 'eric';
const base = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}`;
const out = new URL('../shots/day2-legacy/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const cases = [
  { id: 'meal', place: 'shotengai', node: 'd2_take_food', ate: true, target: 'izakaya' },
  { id: 'coda', place: 'shotengai', node: 'd2_mori_rest', ate: true, done: true, target: 'izakaya' },
  { id: 'report', place: 'train', node: 'd2_submit', target: 'train' },
];
await withBrowserJob('day2-old-saves', async browser => {
  const results = [];
  for (const scenario of cases) {
    const saved = { v: 1, day: 2, mc, place: scenario.place, period: 'evening', yen: 3240,
      known: ['matte', 'ugoite', 'tabetai'], seen: [], inv: ['card'], met: ['mio', 'mori', 'kenji', 'emi'],
      flags: { day: 2, place: scenario.place, period: 'evening', d2_started: true, d2_ticket_taken: true,
        d2_station_seen: true, d2_checked: true, d2_ticket_done: true, ticket_T0002: 'done', d2_brief_done: true, d2_shift_done: true,
        d2_met_kenji: true, d2_ate: !!scenario.ate, d2_party_done: !!scenario.done },
      runner: { onceDone: [], execution: { v: 3, place: scenario.place,
        frames: [{ node: scenario.node, fingerprint: 'obsolete-shipping-story', cursors: [{ path: [], index: 2 }] }] } },
      ui: { hold: 'mio', goal: 'Old saved scene' } };
    const game = await openGame(browser, { mode: 'title', viewport: { width, height: width < 700 ? 844 : 860 },
      url: `${base}/index.html?q=0`, beforeNavigate: async page => {
        await page.addInitScript(save => {
          if (!globalThis.sessionStorage.getItem('legacy-seeded')) {
            localStorage.setItem('amakawa-day1-save', JSON.stringify(save));
            localStorage.setItem('amakawa-settings', JSON.stringify({ textSpeed: 'instant', voiceOn: false, privateMode: false }));
            globalThis.sessionStorage.setItem('legacy-seeded', '1');
          }
        }, saved);
      } });
    try {
      for (let visit = 0; visit < 2; visit++) {
        console.log('case', scenario.id, 'visit', visit);
        if (visit) await game.page.reload();
        await game.page.locator('#title .mcont').click();
        await game.page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
        await game.page.waitForFunction(target => window.__game?.place?.name === target && !window.__game.busy &&
          !document.body.classList.contains('at-title'), scenario.target, { timeout: 45000 }).catch(async error => {
          console.log(await game.page.evaluate(() => ({ place: window.__game?.place?.name, busy: window.__game?.busy, recovery: window.__game?.runner?.recoveryError, node: window.__game?.runner?.currentNode, talk: document.querySelector('#talk')?.textContent, title: document.body.className })));
          console.log('page errors', game.errors);
          await game.page.screenshot({path: `${out}/${width}-${scenario.id}-failure.png`});
          throw error;
        });
        const actual = await game.page.evaluate(async () => {
          const g = window.__game, { save } = await import('./js/sim.js');
          save(g);
          return { saved: JSON.parse(localStorage.getItem('amakawa-day1-save')), recovery: g.runner.recoveryError,
            people: Object.entries(g.place.people).filter(([,r]) => r.root.visible).map(([id]) => id) };
        });
        assert.equal(actual.recovery, null);
        assert.equal(actual.saved.flags.d2_content_revision, 2);
        assert.equal(actual.saved.flags.ticket_T0002, 'done');
        assert.equal(actual.saved.yen, saved.yen);
        assert.deepEqual(actual.saved.inv, saved.inv);
        assert.deepEqual(actual.saved.known, saved.known);
        assert.equal(actual.saved.ui.hold ?? null, null);
        if (scenario.target === 'izakaya') assert.ok(actual.people.includes('mori'));
        await game.page.screenshot({ path: `${out}/${width}-${scenario.id}-${visit}.png` });
      }
      assert.deepEqual(game.errors, []);
      results.push({ scenario: scenario.id, pass: true });
    } finally { await game.close(); }
  }
  fs.writeFileSync(`${out}/${width}-result.json`, JSON.stringify(results, null, 2));
  console.log('PASS legacy day2 saves', width, results.length);
}, { timeoutMs: 180000 });
