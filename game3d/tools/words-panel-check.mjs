// The Words panel (docs/game/controls-and-ui.md, Words) at one size, with a day-1 vocabulary on the train and a
// larger day-5 one in Eric's room. Opens it from the HUD's Words chip, checks that it stays inside the screen with
// the list scrolling inside it, that play holds while it is open, that it lists only words Eric knows, searches
// (romaji, kana, kanji, English), plays a word (the request for audio/word-<id>.mp3), steps through rows with the
// keys, and closes with Esc. Saves the panel at each state.
//   node game3d/tools/words-panel-check.mjs [w] [h]   (1366 860, 2560 1440 and 390 844 are the sizes we check)
//   writes game3d/shots/words-panel/<w>x<h>/, prints PASS or FAIL
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';

const [W = '1366', H = '860'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const repo = G.replace(/\/\.claude\/worktrees\/[^/]+\/game3d$/, '/game3d').replace(/\/game3d$/, '');
const base = `http://127.0.0.1:${process.env.PORT || 8771}/${path.relative(repo, G)}`;
const out = path.join(G, `shots/words-panel/${W}x${H}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
};

// what Eric knows, and when and where he learned it: day 1 as the day plays it, and a longer week up to day 5
const DAY1 = {
  gaijin: { day: 1, place: 'train', period: 'early' },
  ohayo: { day: 1, place: 'train', period: 'early' },
  yoroshiku: { day: 1, place: 'train', period: 'early' },
  sumimasen: { day: 1, place: 'train', period: 'early' },
  matte: { day: 1, place: 'train', period: 'early' },
  akete: { day: 1, place: 'gate', period: 'early' },
  ugoite: { day: 1, place: 'office', period: 'morning' },
  irete: { day: 1, place: 'office', period: 'lunch' },
};
const DAY5 = {
  ...DAY1,
  mouichido: { day: 2, place: 'forecourt', period: 'morning' },
  daijoubu: { day: 2, place: 'forecourt', period: 'morning' },
  yasumi: { day: 2, place: 'forecourt', period: 'morning' },
  watashi: { day: 2, place: 'forecourt', period: 'morning' },
  kenmei: { day: 2, place: 'office', period: 'morning' },
  jotai: { day: 2, place: 'office', period: 'morning' },
  tabetai: { day: 2, place: 'canteen', period: 'lunch' },
  kanpai: { day: 2, place: 'izakaya', period: 'evening' },
  anata: { day: 2, place: 'forecourt', period: 'evening' },
  koko: { day: 3, place: 'plaza', period: 'morning' },
  rokuji: { day: 3, place: 'plaza', period: 'morning' },
  gamen: { day: 3, place: 'gym', period: 'morning' },
  dashite: { day: 3, place: 'gym', period: 'morning' },
  futari: { day: 3, place: 'bakery', period: 'lunch' },
  oyogu: { day: 3, place: 'pool', period: 'afternoon' },
  yoyaku: { day: 4, place: 'sports', period: 'morning' },
  isshoni: { day: 4, place: 'east_coast', period: 'afternoon' },
  kanryo: { day: 5, place: 'office', period: 'morning' },
  mada: { day: 5, place: 'office', period: 'morning' },
};
const n = (rec) => Object.fromEntries(Object.entries(rec).map(([id, r], i) => [id, { ...r, n: i + 1 }]));

await withBrowserJob('words-panel-check', async (b) => {
  // each part in its own browser profile: a day-1 game in progress would make ?day=5 ask before replacing it
  let ctx, p;
  const errs = [],
    clips = [];
  const fresh = async () => {
    if (ctx) await ctx.close();
    ctx = await b.newContext({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
    await ctx.addInitScript(() => {
      localStorage.setItem('amakawa-settings', JSON.stringify({ textSpeed: 'instant', voiceOn: true, reduceMotion: true }));
      localStorage.setItem('amakawa-onboard', JSON.stringify({ moved: true, talked: true, uses: 6, sayUsed: true }));
    });
    p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('request', (r) => /\/audio\/word-[a-z]+\.mp3/.test(r.url()) && clips.push(r.url().replace(/.*\/audio\//, '').replace(/\?.*/, '')));
  };

  // the words Eric knows become exactly `rec`, then the HUD chip opens the panel
  const give = (rec) =>
    p.evaluate(async (rec) => {
      const L = await import(new URL('js/lang.js', location.href).href);
      L.known.clear();
      for (const k of Object.keys(L.learnedAt)) delete L.learnedAt[k];
      for (const [id, r] of Object.entries(rec)) {
        L.known.add(id);
        L.learnedAt[id] = r;
      }
      window.__game.ui.refreshWords();
    }, rec);
  const openPanel = async () => {
    await p.waitForSelector('#cmdsBtn:not([hidden])', { timeout: 10000 });
    if (phone) await p.locator('#cmdsBtn').tap();
    else await p.locator('#cmdsBtn').click();
    await p.waitForSelector('#words:not([hidden]) .wrow', { timeout: 10000 });
    await p.waitForTimeout(400);
  };
  const state = () =>
    p.evaluate(async () => {
      const L = await import(new URL('js/lang.js', location.href).href);
      const pane = document.querySelector('#words .pane').getBoundingClientRect();
      const list = document.querySelector('#words .wlist');
      const rows = [...document.querySelectorAll('#words .wrow')];
      return {
        pane: { l: pane.left, t: pane.top, r: pane.right, b: pane.bottom },
        vw: innerWidth,
        vh: innerHeight,
        scrolls: list.scrollHeight > list.clientHeight + 2,
        listOverflow: getComputedStyle(list).overflowY,
        rows: rows.map((r) => r.dataset.w),
        minRowH: Math.min(...rows.map((r) => r.getBoundingClientRect().height)),
        known: [...L.known],
        count: document.querySelector('#words .wn').textContent,
        groups: [...document.querySelectorAll('#words .wgrp h3')].map((h) => h.textContent),
        say: [...document.querySelectorAll('#words .wsay')].map((s) => s.closest('.wrow').dataset.w + ': ' + s.textContent),
        paused: !!window.__game.paused,
        focused: document.activeElement?.closest?.('.wrow')?.dataset.w || document.activeElement?.tagName || '',
        missing: rows.filter((r) => r.classList.contains('noclip')).map((r) => r.dataset.w),
      };
    });
  const inside = (s, tag) => {
    const ok = s.pane.l >= -0.5 && s.pane.t >= -0.5 && s.pane.r <= s.vw + 0.5 && s.pane.b <= s.vh + 0.5;
    check(ok, `${tag}: the panel stays inside the ${s.vw}x${s.vh} screen (${Math.round(s.pane.l)},${Math.round(s.pane.t)} to ${Math.round(s.pane.r)},${Math.round(s.pane.b)})`);
  };
  const shoot = async (name) => {
    await p.screenshot({ path: path.join(out, name + '.png') });
    await p.locator('#words .pane').screenshot({ path: path.join(out, name + '-panel.png') }).catch(() => {});
  };
  const search = async (q) => {
    await p.locator('#words input').fill(q);
    await p.waitForTimeout(150);
    return (await state()).rows;
  };

  // ---- 1. day 1 on the train, beside the cat ----
  await fresh();
  await p.goto(`${base}/index.html?q=0`);
  await p.waitForFunction(() => document.body.classList.contains('at-title') && window.__game?.place, null, { timeout: 120000 });
  await p.waitForTimeout(800);
  if (phone) await p.locator('#title .go').tap();
  else await p.locator('#title .go').click();
  await p.waitForFunction(() => window.__game?.player && !document.body.classList.contains('at-title') && !window.__game.busy, null, { timeout: 60000 });
  await give(n(DAY1));
  await p.evaluate(() => {
    const g = window.__game,
      m = g.markers.list.find((x) => x.id === 'tama');
    // Start resets the onboarding, which offers Say only at the goal until it is used: the cat is the goal here
    if (m) m.goal = () => true;
    if (!m) return;
    const s = m.spot();
    g.player.root.position.x = s[0];
    g.player.root.position.z = s[1];
  });
  await p.waitForTimeout(800);
  console.log('     in reach: ' + (await p.evaluate(() => { const g = window.__game, t = g.near; return t ? `${t.id} sayRow=${g.sayRow?.(t)} has=${g.runner.has('say:ohayo:' + t.id)}` : 'nothing'; })));
  await openPanel();
  let s = await state();
  console.log(`     day 1: ${s.count} words, groups ${JSON.stringify(s.groups)}, say ${JSON.stringify(s.say)}`);
  check(s.say.some((t) => /^ohayo: .*Say to Cat/.test(t)), 'day 1: beside the cat, ohayo is marked "Say to Cat"');
  inside(s, 'day 1');
  check(s.paused, 'day 1: play holds while the panel is open');
  check(s.rows.length === Object.keys(DAY1).length && s.rows.every((id) => s.known.includes(id)), 'day 1: lists every known word and nothing else');
  check(!s.rows.includes('kanpai'), 'day 1: a word Eric has not learned (kanpai) is not listed');
  check(s.listOverflow === 'auto', 'day 1: the list scrolls inside the panel');
  if (phone) check(s.minRowH >= 44, `phone: every row is a 44 px tap target (smallest ${Math.round(s.minRowH)})`);
  await shoot('1-day1');
  // keys: Down goes from the search box into the list; Enter plays the focused word
  if (!phone) {
    await p.locator('#words input').focus();
    await p.keyboard.press('ArrowDown');
    await p.keyboard.press('ArrowDown');
    s = await state();
    check(s.focused === s.rows[1], `keys: Down twice from the search box focuses the second word (${s.focused})`);
  }
  // play: a tap on ohayo asks for Mio's clip
  clips.length = 0;
  if (phone) await p.locator('#words .wrow[data-w="ohayo"]').tap();
  else await p.locator('#words .wrow[data-w="ohayo"]').click();
  await p.waitForTimeout(800);
  check(clips.includes('word-ohayo.mp3'), `play: tapping ohayo requests audio/word-ohayo.mp3 (${clips.join(', ') || 'no request'})`);
  // Esc closes it (desktop); the phone uses the close button
  if (phone) await p.locator('#words .x').tap();
  else await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  const closed = await p.evaluate(() => ({ hidden: document.querySelector('#words').hidden, paused: !!window.__game.paused }));
  check(closed.hidden && !closed.paused, `${phone ? 'the close button' : 'Esc'} closes the panel and play goes on`);

  // ---- 2. a day-5 save in Eric's room ----
  await fresh();
  await p.goto(`${base}/index.html?q=0&day=5`);
  await p.waitForFunction(() => window.__game?.place && document.querySelector('#title')?.hidden, null, { timeout: 120000 });
  // the day's opening lines may still be up: the Words chip works over them (controls-and-ui.md)
  await p.waitForFunction(() => !window.__game.busy, null, { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(1500);
  await give(n(DAY5));
  await openPanel();
  s = await state();
  console.log(`     day 5: ${s.count} words, groups ${JSON.stringify(s.groups)}`);
  inside(s, 'day 5');
  check(s.scrolls, 'day 5: the longer list scrolls inside the panel');
  check(s.rows.length === Object.keys(DAY5).length && s.rows.every((id) => s.known.includes(id)), 'day 5: lists every known word and nothing else');
  check(/^Day 5/.test(s.groups[0] || ''), 'day 5: by day, today comes first');
  await shoot('2-day5');
  await p.locator('#words .seg button[data-mode="kind"]').click();
  await p.waitForTimeout(200);
  s = await state();
  check(s.groups.length >= 3 && /^Phrases/.test(s.groups[0]), `by kind: phrases first, then the other kinds (${s.groups.length} groups)`);
  await shoot('3-day5-kind');
  await p.locator('#words .wlist').evaluate((l) => (l.scrollTop = l.scrollHeight));
  await p.waitForTimeout(200);
  await shoot('4-day5-kind-end');
  await p.locator('#words .seg button[data-mode="day"]').click();
  // search: romaji with or without the long mark, kana, kanji, English
  for (const [q, want] of [
    ['ohayo', 'ohayo'],
    ['ohayou', 'ohayo'],
    ['よろしく', 'yoroshiku'],
    ['待', 'matte'],
    ['swim', 'oyogu'],
    ['じょうたい', 'jotai'],
  ]) {
    const r = await search(q);
    check(r.includes(want), `search "${q}" finds ${want} (${r.join(', ')})`);
  }
  check((await search('kanpai')).includes('kanpai'), 'search finds kanpai once it is learned');
  check((await search('oishii')).length === 0, 'search never brings up a word Eric has not learned (oishii)');
  await search('to');
  s = await state();
  inside(s, 'search');
  await shoot('5-search');
  const all = await search('');
  console.log(`     no recording yet: ${(await state()).missing.join(', ') || 'none'}`);
  check(all.length === Object.keys(DAY5).length, 'clearing the search shows every word again');
  check(!errs.length, `no page errors${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
  await ctx.close();
}, gpuWaitOptions(60, 285000));
console.log(`${fails.length ? 'FAIL' : 'PASS'} words-panel-check ${W}x${H} (${out})`);
process.exit(fails.length ? 1 : 0);
