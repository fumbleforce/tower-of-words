// Interact, the one E action (gameplay/interact-menu.js), played in the real game from saved moments, at a size:
//   copier  day 1, the copier fixed: Mio has the story beat and a topic, E opens the menu with the story row
//           highlighted and focused, E again runs the beat (Jørgen's report: "neither has the E key")
//   kenji   day 1, Kenji not met yet: the story beat alone runs straight away, no menu
//   mori    day 2 afternoon: Mori has topics only, E goes straight into them
//   mori-gift  day 1 morning with a hot corn soup in the bag: E on Mori opens a menu with Give last before Leave (no
//           brown Give button), Give lists the bag, and the soup goes to Mori (gift_mori_cornsoup runs)
//   mori-day2-gift  day 2 afternoon with the soup: the topic and Give, the same menu (day 2 has no gift lines yet)
//   guard   day 1 at the gate, not greeted yet, from Continue: the goal says Japanese, the how-to hint is up, the guard
//           has no Chat, and E (or the menu's Interact) opens the Say menu (#394)
// Usage: node game3d/tools/interact-menu-check.mjs [width] [scenarios,...]  (BASE=<worktree>/game3d for a worktree)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { openGame } from '../test/support/open-game.mjs';

const width = +(process.argv[2] || 1366),
  phone = width < 700,
  mc = phone ? 'carina' : 'eric';
const base = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}`;
const out = new URL('../shots/interact-menu/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const DAY1 = { greeted_mori: true, lead_done: true, kenji_intro: true, knocked: true, machine_open: true, found_chair: true, chair_back: true };
const SCENES = {
  copier: { day: 1, period: 'morning', met: ['mio', 'mori', 'kenji'], flags: { ...DAY1, got_ticket: true, copier_done: true }, who: 'mio', goal: 'Tell Mio the copier is fixed.' },
  kenji: { day: 1, period: 'morning', met: ['mio', 'mori'], flags: { greeted_mori: true, lead_done: true }, who: 'kenji' },
  guard: { day: 1, period: 'morning', place: 'gate', met: ['mio'], flags: {}, who: 'guard', goal: 'Say good morning to the guard in Japanese.' },
  mori: {
    day: 2,
    period: 'afternoon',
    met: ['mio', 'mori', 'kenji', 'emi'],
    flags: { d2_content_revision: 2, d2_started: true, d2_ticket_done: true, d2_brief_done: true, greeted_mori: true },
    who: 'mori',
  },
};
// the bag holds his gift for the gift scenarios: Mori's favourite is the hot corn soup (cast.md, What they like). Day 1's
// office has his gift lines (gift_mori_cornsoup); day 2's office has none yet, so only the menu is checked there
SCENES['mori-gift'] = {
  day: 1,
  period: 'morning',
  met: ['mio', 'mori', 'kenji'],
  flags: { ...DAY1, got_ticket: true, copier_done: true },
  who: 'mori',
  inv: ['cornsoup'],
};
SCENES['mori-day2-gift'] = { ...SCENES.mori, inv: ['cornsoup'] };
const results = [];
await withBrowserJob('interact-menu-check', async (browser) => {
  for (const name of process.argv[3]?.split(',') || Object.keys(SCENES)) {
    const s = SCENES[name];
    const saved = {
      v: 1, day: s.day, mc, place: s.place || 'office', period: s.period, known: ['ohayo'], met: s.met,
      flags: { day: s.day, place: s.place || 'office', period: s.period, ['period_' + s.period]: true, ...s.flags },
      seen: [], inv: s.inv || ['card'], yen: 3000, ui: { goal: s.goal || '' },
    };
    const opened = await openGame(browser, {
      mode: 'title', viewport: { width, height: phone ? 844 : 860 }, touch: phone, url: `${base}/index.html?q=0`,
      beforeNavigate: async (page) => {
        await page.addInitScript((saved) => {
          if (sessionStorage.getItem('seeded')) return;
          localStorage.setItem('amakawa-day1-save', JSON.stringify(saved));
          sessionStorage.setItem('seeded', '1');
          localStorage.setItem('amakawa-settings', JSON.stringify({ v: 2, textSpeed: 'instant', voiceOn: false, privateMode: false }));
          localStorage.setItem('amakawa-onboard', JSON.stringify({ moved: true, talked: true, uses: 8, sayUsed: true }));
        }, saved);
      },
    });
    const { page } = opened;
    try {
      await page.locator('#title .mcont').click();
      await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
      await opened.waitForSettled();
      // walk up to them and make them the target in reach
      await page.evaluate((who) => {
        const g = window.__game, item = g.markers.list.find((m) => m.id === who);
        if (!item?.enabled()) throw new Error('Unavailable: ' + who);
        g.walker.goTo(...item.spot());
      }, s.who);
      await page.waitForFunction(() => !window.__game.walker.path);
      // no separate Give button is left on the HUD (the gift is a row in the person's menu)
      assert.equal(await page.evaluate(() => document.querySelectorAll('#giveBtn').length), 0, 'no brown Give button');
      await page.screenshot({ path: `${out}${width}-${name}-hud.png` });
      const plan = await page.evaluate(async (who) => {
        const g = window.__game, item = g.markers.list.find((m) => m.id === who);
        g.targetLock = item; g.near = item;
        const { planInteract } = await import('./js/gameplay/interact-menu.js');
        const p = planInteract(g, item, { person: true });
        return { story: p.story, topics: p.topics.map((t) => t.label), plain: p.plain, gift: !!p.gift };
      }, s.who);
      // the action menu a click or tap opens: Interact with its E, Say with its Q
      await page.evaluate((who) => window.__game.ui.openActs(window.__game.markers.list.find((m) => m.id === who)), s.who);
      await page.waitForTimeout(300);
      const acts = await page.evaluate(() => [...document.querySelectorAll('#actMenu .act')].map((b) => b.textContent.trim()));
      await page.screenshot({ path: `${out}${width}-${name}-actmenu.png` });
      if (name === 'guard') {
        const hud = await page.evaluate(() => ({
          goal: window.__game.ui.goalText,
          hint: document.querySelector('#hint:not([hidden]) .hx')?.textContent || '',
        }));
        assert.match(hud.goal, /in Japanese/);
        assert.match(hud.hint, phone ? /Say a word/ : /press Q/);
        assert.deepEqual(plan.topics, [], 'no Chat with the guard before the greeting');
        assert.ok(acts.some((a) => a.includes('Interact')) && acts.some((a) => a.includes('Say a word')));
        // the menu's Interact row (a click or tap) opens Say
        if (phone) await page.locator('#actMenu .act.use').tap();
        else await page.locator('#actMenu .act.use').click();
        await page.waitForFunction(() => !document.querySelector('#sayMenu').hidden, null, { timeout: 8000 });
        await page.screenshot({ path: `${out}${width}-${name}-say.png` });
        await page.locator('#sayMenu .cancel').click();
        await page.waitForFunction(() => document.querySelector('#sayMenu').hidden);
      }
      await page.evaluate(() => window.__game.ui.closeActs());
      await page.waitForTimeout(150);
      // Interact: E on desktop, the Interact row on the phone
      if (phone) await page.evaluate((who) => window.__game.use(window.__game.markers.list.find((m) => m.id === who), { direct: true }), s.who);
      else await page.keyboard.press('KeyE');
      await page.waitForFunction(
        () =>
          document.querySelector('#talk .chip:not([disabled])') ||
          window.__game.runner.frames?.length ||
          !document.querySelector('#sayMenu').hidden,
        null,
        { timeout: 15000 },
      );
      await page.waitForTimeout(900);
      const menu = await page.evaluate(() => ({
        rows: [...document.querySelectorAll('#talk .chips.menu .chip')].map((b) => ({ cls: b.className, text: b.textContent })),
        focused: document.activeElement?.classList.contains('story') || false,
        trace: window.__game.runner.trace?.slice(-3) || [],
      }));
      await page.screenshot({ path: `${out}${width}-${name}-interact.png` });
      const row = { name, width, plan, acts, menu };
      if (name === 'copier') {
        assert.equal(plan.story?.label, 'Tell Mio the copier is fixed.');
        assert.deepEqual(plan.topics, ['Chat with Mio']);
        assert.ok(acts[0].includes('Interact') && (phone || acts[0].startsWith('E')), 'Interact carries E: ' + acts[0]);
        assert.deepEqual(menu.rows.map((r) => r.cls.split(' ').find((c) => ['story', 'topic', 'leave'].includes(c))), ['story', 'topic', 'leave']);
        assert.ok(/glow/.test(menu.rows[0].cls), 'the story row is highlighted');
        if (!phone) assert.ok(menu.focused, 'the story row has the focus');
        // E again picks the focused story row (the phone taps it)
        if (phone) await page.locator('#talk .chip.story').tap();
        else await page.keyboard.press('KeyE');
        await page.waitForFunction(() => window.__game.runner.trace?.includes('ticket_done'), null, { timeout: 15000 });
      } else if (name === 'kenji') {
        assert.ok(plan.story && !plan.topics.length);
        assert.equal(menu.rows.length, 0, 'no menu for a story beat alone');
        await page.waitForFunction(() => window.__game.runner.trace?.includes('kenji_first'), null, { timeout: 15000 });
      } else if (name === 'guard') {
        assert.equal(menu.rows.length, 0);
        assert.ok(await page.evaluate(() => !document.querySelector('#sayMenu').hidden), 'E opens Say');
      } else if (name === 'mori') {
        assert.ok(!plan.story && plan.topics.length && !plan.gift, 'nothing to give in the bag');
        assert.equal(menu.rows.length, 0, 'topics alone go straight in');
        assert.ok(await page.evaluate(() => !document.querySelector('#talk').hidden && window.__game.busy), 'his topic is running');
      } else if (name === 'mori-day2-gift') {
        assert.ok(!plan.story && plan.topics.length && plan.gift, 'the topic and Give');
        assert.deepEqual(
          menu.rows.map((r) => r.cls.split(' ').find((c) => ['topic', 'gift', 'leave'].includes(c))),
          ['topic', 'gift', 'leave'],
        );
        assert.match(menu.rows[1].text, /Give/);
      } else if (name === 'mori-gift') {
        // Give is the row before Leave, after whatever else Mori offers
        const kinds = menu.rows.map((r) => r.cls.split(' ').find((c) => ['story', 'topic', 'plain', 'gift', 'leave'].includes(c)));
        assert.ok(plan.gift && kinds.at(-1) === 'leave' && kinds.at(-2) === 'gift', 'Give before Leave: ' + kinds.join(','));
        assert.match(menu.rows.at(-2).text, /Give/);
        // Give opens the bag's list; the soup goes to him and his gift line runs
        if (phone) await page.locator('#talk .chip.gift').tap();
        else await page.locator('#talk .chip.gift').click();
        await page.waitForFunction(() => !document.querySelector('#sayMenu').hidden, null, { timeout: 8000 });
        assert.match(await page.locator('#sayMenu .head').textContent(), /Give to/);
        await page.screenshot({ path: `${out}${width}-${name}-list.png` });
        if (phone) await page.locator('#sayMenu .list button').filter({ hasText: 'Hot corn soup' }).tap();
        else await page.locator('#sayMenu .list button').filter({ hasText: 'Hot corn soup' }).click();
        await page.waitForFunction(() => window.__game.runner.trace?.includes('gift_mori_cornsoup'), null, { timeout: 15000 });
        assert.equal(await page.evaluate(() => window.__game.sim.inv.length), 0, 'the soup left the bag');
        await page.screenshot({ path: `${out}${width}-${name}-gave.png` });
      }
      assert.deepEqual(opened.errors, []);
      results.push({ ...row, pass: true });
    } catch (e) {
      await page.screenshot({ path: `${out}${width}-${name}-fail.png` }).catch(() => {});
      results.push({ name, width, pass: false, error: e.message });
    } finally {
      await opened.close();
    }
  }
}, { gpuWaitMs: +(process.env.GPU_WAIT || 900) * 1000 });
console.log(JSON.stringify(results, null, 1));
if (results.some((r) => !r.pass)) process.exitCode = 1;
