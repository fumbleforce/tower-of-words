// Native menus, typed vocabulary, old-line reinterpretation and actual title Continue.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { openGame } from '../test/support/open-game.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
const width = +(process.argv[2] || 1366), mc = width < 700 ? 'carina' : 'eric';
const base = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}`;
const out = new URL('../shots/conversations/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const results = [];
async function advance(page, target = 'settled') {
  const until = Date.now() + 30000;
  while (Date.now() < until) {
    const state = await page.evaluate(() => {
      const g = window.__game;
      return { settled: !g.busy && !g.walker.path && !g.saying, type: !!document.querySelector('#talk.typing .tp-in'),
        chips: [...document.querySelectorAll('#talk .chip:not([disabled])')].map(b => b.textContent),
        talk: !document.querySelector('#talk').hidden, line: document.querySelector('#talk .line')?.textContent };
    });
    if (target === 'settled' && state.settled) return;
    if (target === 'type' && state.type) return;
    if (target !== 'settled' && target !== 'type' && state.chips.some(text => text.includes(target))) return;
    if (state.chips.length || state.type) throw new Error('Unexpected input: ' + JSON.stringify(state));
    if (state.talk) await page.keyboard.press('Space');
    await page.waitForTimeout(120);
  }
  throw new Error('Dialogue did not reach ' + target);
}
async function choose(page, text) {
  await advance(page, text);
  await page.waitForTimeout(950);
  await page.locator('#talk .chip:not([disabled])').filter({ hasText: text }).click();
}
async function topic(page, who) {
  // Approach through the same production interaction as keyboard input, then open the actual nearby menu.
  await page.evaluate(who => {
    const g = window.__game, item = g.markers.list.find(m => m.id === who);
    if (!item?.enabled()) throw new Error('Unavailable speaker: ' + who);
    const spot = item.spot();
    g.walker.goTo(...spot);
  }, who);
  await page.waitForFunction(() => !window.__game.walker.path);
  await page.evaluate(who => {
    const g = window.__game, item = g.markers.list.find(m => m.id === who);
    g.targetLock = item; g.near = item; g.ui.openActs(item);
  }, who);
  await page.locator('#actMenu .topic').click();
}
await withBrowserJob('persistent-conversations', async browser => {
  for (const order of (process.argv[3]?.split(',') || ['heard-first', 'word-first', 'busy'])) {
    const blocked = []; let closing = false;
    const day = order === 'later' ? 5 : 2, place = order === 'elsewhere' ? 'izakaya' : 'office';
    const wordFirst = ['word-first', 'elsewhere'].includes(order);
    const period = order === 'busy' ? 'morning' : order === 'elsewhere' ? 'evening' : 'afternoon';
    const saved = { v: 1, day, mc, place, period,
      known: ['ohayo', ...(wordFirst ? ['ikitai'] : [])], met: ['mio', 'mori', 'kenji', 'emi'],
      flags: { day, place, period, period_morning: order === 'busy', period_afternoon: order !== 'busy', d2_content_revision: 2, d2_started: true, d2_ticket_done: true, d2_brief_done: true, greeted_mori: true, ...(order === 'elsewhere' ? { d2_shift_done: true, d2_met_kenji: true, d2_ate: true } : {}) },
      seen: [], inv: ['card'], yen: 3000, ui: { goal: '' } };
    const opened = await openGame(browser, { mode: 'title', viewport: { width, height: width < 700 ? 844 : 860 }, touch: width < 700,
      url: `${base}/index.html?q=0`, beforeNavigate: async (page, context) => {
        await context.route('**/*', scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: s => blocked.push(s) }));
        await page.addInitScript(saved => {
          if (!sessionStorage.getItem('seeded')) {
            localStorage.setItem('amakawa-day1-save', JSON.stringify(saved)); sessionStorage.setItem('seeded', '1');
            localStorage.setItem('amakawa-settings', JSON.stringify({ v: 2, textSpeed: 'instant', voiceOn: true, privateMode: false }));
            localStorage.setItem('amakawa-onboard', JSON.stringify({ moved: true, talked: true, uses: 8, sayUsed: true }));
          }
        }, saved);
      } });
    const { page } = opened;
    try {
      const resume = async () => {
        await page.locator('#title .mcont').click();
        await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
        await opened.waitForSettled();
      };
      await resume();
      assert.equal(await page.evaluate(async () => (await import('./js/narrative/state.js')).cond("place == 'office' && period_morning")), order === 'busy');
      if (order === 'interrupted') {
        await page.evaluate(() => {
          const g = window.__game, target = g.markers.list.find(m => m.id === 'kenji');
          g.use(target, { trigger: 'ask:kenji' });
          if (!g.walker.arrive?.use) throw new Error('Fixture did not start an approach');
          g.beat(() => g.ui.say(null, 'A brief interruption.'));
        });
        await choose(page, 'Let him get back to what he was doing.');
        await advance(page);
        assert(await page.evaluate(() => window.__game.runner.trace.includes('conversation_kenji')));
      } else {
      await topic(page, 'mori');
      await advance(page);
      if (order === 'busy') {
        await topic(page, 'kenji'); await advance(page);
        const state = await page.evaluate(async () => {
          const { flags } = await import('./js/narrative/state.js');
          const { conversationMemory } = await import('./js/conversations/state.js');
          return { records: conversationMemory.entries(), talked: !!flags.kenji_arcade_talked };
        });
        assert.deepEqual(state, { records: [], talked: false });
      } else {
        const before = await page.evaluate(async () => (await import('./js/conversations/state.js')).conversationMemory.entries());
        assert.equal(before.length, 1);
        assert.equal(before[0].understoodAtTime, wordFirst);
        if (!wordFirst) {
          await topic(page, 'kenji');
          await choose(page, 'Where do you go after work?');
          await choose(page, 'How do you say');
          await advance(page, 'type');
          await page.locator('.tp-in').fill('ikitai');
          await page.waitForFunction(() => !document.querySelector('#talk.typing')); 
          await advance(page);
        }
        await page.keyboard.press('PageUp');
        await page.locator('.vnlog .memories').click();
        await page.screenshot({ path: `${out}/${width}-${order}-remembered.png` });
        assert.equal(await page.locator('.vnlog .tx .jp.clear').filter({ hasText: '行きたい' }).count(), 1);
        assert.ok(await page.locator('.vnlog .tx .gx').count(), 'Unknown surrounding Japanese remains blurred');
        await page.keyboard.press('Escape');
        await topic(page, 'mori');
        await choose(page, 'Norway?');
        await choose(page, 'Try “mitai”');
        await advance(page, 'type');
        await page.screenshot({ path: `${out}/${width}-${order}-typing.png` });
        await page.locator('.tp-in').fill('mitai');
        await page.waitForFunction(() => !document.querySelector('#talk.typing'));
        await advance(page);
        const checkpoint = await page.evaluate(async () => {
          const { save } = await import('./js/sim.js'); save(window.__game);
          return JSON.parse(localStorage.getItem('amakawa-day1-save'));
        });
        assert(checkpoint.known.includes('ikitai') && checkpoint.known.includes('mitai'));
        assert(checkpoint.flags.mori_photos_requested);
        await page.reload(); await resume();
        const after = await page.evaluate(async () => (await import('./js/conversations/state.js')).conversationMemory.entries());
        assert.equal(after[0].understoodAtTime, before[0].understoodAtTime);
        assert.deepEqual(after[0].source, before[0].source);
        assert.equal(after[0].revisited, true);
        await topic(page, 'mori');
        await choose(page, 'Ask whether he found the photos.');
        await advance(page);
      }
      }
      assert.deepEqual(opened.errors, []); assert.deepEqual(blocked, []);
      await page.screenshot({ path: `${out}/${width}-${order}-end.png` });
      results.push({ order, mc, width, pass: true });
      fs.writeFileSync(`${out}/${width}-${process.argv[3] || 'all'}-result.json`, JSON.stringify(results, null, 2));
      console.log('PASS', order, width);
    } catch (error) {
      await page.screenshot({ path: `${out}/${width}-${order}-failure.png` });
      console.log(await page.evaluate(() => ({ node: window.__game.runner.currentNode, near: window.__game.near?.id, busy: window.__game.busy, talk: document.querySelector('#talk').textContent, menu: document.querySelector('#actMenu').textContent })));
      throw error;
    } finally { closing = true; await opened.close(); }
  }
}, { timeoutMs: 280000 });
