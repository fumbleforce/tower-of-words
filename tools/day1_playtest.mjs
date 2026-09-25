// Headless playtest of day 1: plays scripted routes through every branch that matters, logs what a player sees
// (speaker, Japanese as rendered, narration, choices and picks), and takes screenshots on desktop and phone.
// Needs a static server on the repo root: python3 -m http.server 8765 --bind 127.0.0.1
// Usage: [SIZES=phone,desktop] [OPENING_ONLY=1] node tools/day1_playtest.mjs [route names...]
// Output: game/notes/transcripts/day1-played.md, a screenshot of every screen in $SHOTS.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(`${process.env.HOME}/ai/opening/`);
const { chromium, devices } = require('playwright');

const URL = process.env.GAME_URL || 'http://127.0.0.1:8765/game/';
const SHOTS = process.env.SHOTS || '/tmp/day1-shots';
fs.mkdirSync(SHOTS, { recursive: true });

// A route is a set of decisions. Choices are matched by prompt, by the line they answer, or by option text.
// `open`: the train opening. cup 0 catch / 1 warn; first 0 うん / 1 nod; extra 0 そっちは / 1 continue; island 0 全部 /
// 1 すごい / 2 keep looking; dorm, boss 0 うん / 1 nod; reply 0 もうすぐ / 1 緊張; ask 0 question / 1 let her work;
// name 0 よろしく / 1 smile. `taps`: words to tap when a line appears ([surface, times]); `meaning`: lines to use Meaning on.
const OPEN = {
  A: { cup: 0, first: 0, extra: 0, island: 0, dorm: 0, reply: 0, boss: 0, ask: 0, name: 0 },
  B: { cup: 1, first: 1, extra: 1, island: 1, dorm: 1, reply: 1, boss: 1, ask: 1, name: 1 },
  // Needs help on several lines: the supported versions kick in.
  C: { cup: 1, first: 0, extra: 0, island: 1, dorm: 0, reply: 1, boss: 0, ask: 0, name: 0,
    taps: { 'ありがとう。': [['ありがとう', 1]], '初日？': [['初日', 2]], 'どうぞ。': [['どうぞ', 1]], '全部、会社。': [['会社', 1]] }, meaning: ['寮？'] },
  // One reading request (会社): it stays on the word's next appearance.
  D: { cup: 0, first: 1, extra: 1, island: 2, dorm: 1, reply: 0, boss: 1, ask: 1, name: 1, taps: { '全部、会社。': [['会社', 1]] } },
};
const ROUTES = {
  clean: { open: OPEN.A, gate: [0], gateReply: 0, mio: 0, emi: 1, copier: 0,
    jam: ['して'], count: '10', copy: 'magic', speed: ['いで'], sort: 'magic', sortCasts: ['んで'], steps: 0,
    sales: ['magic'], rei: [[0, 'して']], secret: 1, evening: 0, dorm: 0 },
  loud: { open: OPEN.B, gate: [1, 2, 0], gateReply: 1, mio: 1, emi: 2, copier: 2,
    jam: ['す', 'した', 'せ'], count: '100', copy: 'magic', speed: ['げ'], sort: 'magic', sortCasts: ['べ'], steps: 0, copyReply: 1,
    sales: ['ask', 'late', 'magic', 'magic'], rei: [[1, 'て'], [0, 'せ']], secret: 2, evening: 1, dorm: 3 },
  hands: { open: OPEN.C, wrong: { 0: [2, 5] }, gate: [0], gateReply: 2, mio: 2, emi: 0, copier: 1, missGate: 2,
    jam: ['いで', 'った', 'して'], count: '20', copy: 'wait', sort: 'hand', steps: 1,
    sales: ['wait', 'magic', 'magic', 'leave'], rei: [[1, 'る'], [0, 'す']], evening: 1, dorm: 3 },
  stop: { open: OPEN.D, gate: [0], gateReply: 0, mio: 0, emi: 1, copier: 0,
    jam: ['す', 'した'], jamStop: true, count: '11', copy: 'magic', speed: ['ぐ'], speedStop: true, sort: 'magic', sortCasts: ['んだ'], sortStop: true, steps: 1,
    sales: ['leave'], evening: 0, dorm: 1 },
  mute: { open: OPEN.A, gate: [0], gateReply: 0, mio: 0, emi: 1, copier: 0,
    jam: ['す', 'した', 'す', 'した', 'して'], count: '10', copy: 'magic', sort: 'magic', steps: 0,
    sales: ['ask', 'late', 'magic', 'leave'], evening: 0, dorm: 2 },
  typed: { open: OPEN.B, gate: [0], gateReply: 0, mio: 0, emi: 1, copier: 0,
    jam: ['@dete', '@dashite'], count: '10', copy: 'magic', speed: ['@isoide'], sort: 'hand', steps: 1,
    sales: ['magic', 'magic'], rei: [[1, 'ろ'], [0, 'せ']], secret: 0, evening: 0, dorm: 0 },
};
// Every route runs at phone size (390x844) and desktop size (1366x860). OPENING_ONLY=1 stops at the gate.
const SIZES = (process.env.SIZES || 'phone,desktop').split(',');
const OPENING_ONLY = !!process.env.OPENING_ONLY;

const log = [];
async function play(browser, name, R, phone) {
  const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 860 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('crash', () => console.log('PAGE CRASH', name));
  page.on('close', () => console.log('PAGE CLOSED', name));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.clear(); } catch {} });
  await page.goto(URL);
  const tag = `${name}-${phone ? 'phone' : 'desktop'}`;
  const out = [`## ${tag}`, ''];
  let shot = 0, lastSig = '', ride = 0, stuck = 0, talks = 0, gateMisses = R.missGate || 0;
  const O = R.open || OPEN.A;
  const casts = { jam: [...(R.jam || [])], speed: [...(R.speed || [])], sort: [...(R.sortCasts || [])], rei: [...(R.rei || [])] };
  const sales = [...(R.sales || [])], gate = [...(R.gate || [0])];
  const tapped = new Set();
  const snap = async kind => { await page.waitForTimeout(650); await page.screenshot({ path: `${SHOTS}/${tag}-${String(++shot).padStart(3, '0')}-${kind}.png` }); };
  const tap = async sel => { await page.locator(sel).first().click({ timeout: 3000 }); };
  // Taps a route asks for on a line, then Meaning if listed. Logged as the player would see them.
  const helpOn = async line => {
    if (!line || tapped.has(line)) return; tapped.add(line);
    if (O.taps?.[line] || (O.meaning || []).includes(line)) await snap('before-help');
    for (const [surf, n] of O.taps?.[line] || []) for (let k = 0; k < n; k++) {
      const loc = page.locator(`.w[data-surf="${surf}"]`).last();
      if (!(await loc.count())) { out.push(`  !! no word ${surf} to tap`); break; }
      await loc.click(); await page.waitForTimeout(250);
      const st = await loc.evaluate(w => `${w.classList.contains('rd') ? 'reading ' + (w.querySelector('rt')?.textContent || '') : ''}${w.querySelector('.mean') ? ' meaning: ' + w.querySelector('.mean').innerText.replace(/\s+/g, ' ') : ''}`);
      out.push(`  (taps ${surf}: ${st.trim()})`);
      await snap(`tap-${surf}`);
    }
    if ((O.meaning || []).includes(line)) { const b = page.locator('.tool-btn', { hasText: 'Meaning' }).first(); if (await b.count()) { await b.click(); out.push('  (Meaning)'); await snap('meaning'); } }
  };
  let currentSpell = null;
  for (let i = 0; i < 3000; i++) {
    await page.waitForTimeout(120);
    const s = await page.evaluate(() => {
      const q = x => document.querySelector(x), qa = x => [...document.querySelectorAll(x)];
      const txt = el => (el ? el.innerText.replace(/\s+/g, ' ').trim() : '');
      // Text as the player sees it: readings that are showing in [brackets] after the word, meanings in {braces}.
      const seen = el => { if (!el) return ''; const c = el.cloneNode(true); c.querySelectorAll('.w:not(.rd) rt').forEach(r => r.remove()); c.querySelectorAll('rt').forEach(r => r.replaceWith(`[${r.textContent}]`)); c.querySelectorAll('.mean').forEach(m => m.replaceWith(`{${m.firstChild.textContent}}`)); c.querySelectorAll('.en,.opt-en,.hint,kbd,.tools,.adv,.cap').forEach(e => e.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); };
      const opts = qa('.opts > *').map(o => ({ kind: o.classList.contains('act') ? 'act' : 'spk', t: o.classList.contains('act') ? txt(o.querySelector('.act-label')) + (o.querySelector('.says') ? ` (${txt(o.querySelector('.says'))})` : '') : seen(o.querySelector('.opt-jp')), dis: !!o.querySelector('button:disabled') || o.disabled }));
      return {
        bg: q('#stage').dataset.bg,
        title: !!q('.summary.title'),
        summary: q('.summary:not(.title) .again') ? txt(q('.summary .card')) : null,
        spell: q('.spell .ring .row') ? { goal: txt(q('.spell .goal')), meta: txt(q('.spell .meta')), hint: txt(q('.spell .hint')), verbs: qa('.spell .rune:not(.small)').map(seen), tiles: qa('.spell .rune.small').map(e => e.firstChild.textContent), marked: txt(q('.rune.marked')), built: seen(q('.built')) } : null,
        learn: !!q('.spell .cast-still'),
        hotspot: !!q('.hotspot'), play: !!q('.play-btn.pulse'), keep: !!q('.keep-btn'),
        hand: q('.handset') ? txt(q('.handset .hs-head')) : null,
        insert: q('.insert') ? [...q('.insert').classList].find(c => c.startsWith('ins-')) : null,
        choices2: q('.choices2') ? { prompt: txt(q('.choices2 .prompt')), who: txt(q('.choices2 .ctx .who')), ctx: seen(q('.choices2 .ctx .line')), cap: txt(q('.choices2 .cap')), line: q('.choices2 .ctx .line')?.dataset.line, opts } : null,
        choices: q('.choices .choice') && !q('.summary.title') ? { prompt: seen(q('.choices .prompt')), opts: qa('.choices .choice').map(b => ({ t: seen(b), dis: b.disabled })) } : null,
        panel: q('.panel') ? qa('.panel .floor .fl-label').map(seen) : null,
        talk: !!q('.talk input'),
        subs: q('.subs') ? { who: txt(q('.subs .who')), line: seen(q('.subs .line')), raw: q('.subs .line')?.dataset.line, narr: txt(q('.subs .narr')), cap: txt(q('.subs .cap')), paper: seen(q('.subs .paper')), adv: !!q('.subs .adv') } : null,
        chars: qa('#chars .ch').filter(c => getComputedStyle(c).opacity !== '0' && getComputedStyle(c).display !== 'none').map(c => c.querySelector('img').getAttribute('src')),
        task: txt(q('.task')),
      };
    });
    const sig = JSON.stringify([s.spell, s.choices, s.choices2, s.panel, s.talk, s.subs, s.summary, s.hotspot, s.play, s.keep, s.learn]);
    if (sig === lastSig) { if (++stuck > 600) { out.push(`!! STUCK at ${sig.slice(0, 300)}`); break; } }
    else stuck = 0;
    const fresh = sig !== lastSig; lastSig = sig;
    if (process.env.TRACE && fresh) console.log('TRACE', sig.slice(0, 160));
    // Two sprites on screen at once is the playtest-3 bug. Measure after the 0.35 s fades have settled.
    if (fresh && s.chars.length > 1) {
      await page.waitForTimeout(500);
      // Phone: one sprite at a time. Desktop: side by side is fine as long as the drawn figures don't overlap much.
      const vis = await page.evaluate(() => [...document.querySelectorAll('#chars .ch')].filter(c => +getComputedStyle(c).opacity > 0.05 && getComputedStyle(c).display !== 'none').map(c => { const r = c.querySelector('img').getBoundingClientRect(); return { src: c.querySelector('img').getAttribute('src'), l: r.left + r.width * .2, r: r.right - r.width * .2 }; }));
      const overlap = vis.length > 1 && vis.some((a, i) => vis.some((b, j) => j > i && Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0));
      if (vis.length > 1 && (phone || overlap)) out.push(`!! ${vis.length} sprites ${phone ? 'visible on a phone' : 'overlapping'}: ${vis.map(v => v.src).join(', ')}`);
    }
    if (s.title) { await tap('.choices .choice >> nth=-1'); continue; }
    if (s.summary) { out.push(`[summary] ${s.summary.slice(0, 600)}`); await snap('summary'); break; }
    if (OPENING_ONLY && s.bg === 'gate' && s.subs?.narr?.startsWith('The same gates')) { await snap('gate'); out.push('[stopped at the gate]'); break; }
    if (s.hotspot) {
      if (fresh) { out.push(`[${s.bg}] (${s.subs?.narr}) [Emi's photo shown; tap the entrance]`); await snap('find-entrance'); }
      if (gateMisses > 0) { gateMisses--; await page.mouse.click(phone ? 60 : 200, phone ? 700 : 700); out.push('  (taps the wrong place)'); await snap('gate-miss'); continue; }
      await tap('.hotspot'); out.push('  (taps the entrance)'); continue;
    }
    if (s.play) { out.push(`[phone: ${s.hand}] voice message, Play`); await snap('voicemail'); await tap('.play-btn.pulse'); continue; }
    if (s.keep) { const t = await page.evaluate(() => document.querySelector('.bub.photo .hs-text')?.innerText.replace(/\s+/g, ' ')); out.push(`[phone: ${s.hand}] photo + ${t}  → Keep this photo`); await snap('photo'); await tap('.keep-btn'); continue; }
    if (s.learn) { await snap('learn'); await page.mouse.click(phone ? 195 : 683, phone ? 120 : 100); continue; }
    if (s.spell) {
      await snap(`spell-${s.bg}`);
      const kind = /stuck page/.test(s.spell.goal) ? 'jam' : /faster/.test(s.spell.goal) ? 'speed' : /order/.test(s.spell.goal) ? 'sort' : 'rei';
      currentSpell = kind;
      const plan = casts[kind];
      if (s.spell.verbs.length > 1 && !s.spell.tiles.length) { const v = plan[0]?.[0] ?? 0; out.push(`SPELL ${s.spell.goal} (${s.spell.meta}) verb: ${s.spell.verbs[v]}`); await page.locator('.spell .rune:not(.small)').nth(v).click(); continue; }
      if (s.spell.tiles.length) {
        let want = plan.shift();
        if (Array.isArray(want)) want = want[1];
        if (want == null) want = s.spell.tiles[0];
        if (want.startsWith('@')) {
          out.push(`SPELL ${s.spell.goal} [${s.spell.hint}] typed: ${want.slice(1)}`);
          if (phone) { await page.locator('.spell .rune.small').first().click(); continue; }
          await page.fill('.spell-type', want.slice(1)); await page.press('.spell-type', 'Enter'); continue;
        }
        const idx = Math.max(0, s.spell.tiles.indexOf(want));
        out.push(`SPELL ${s.spell.goal} [${s.spell.hint}]${s.spell.marked ? ` (marked tile: ${s.spell.marked})` : ''} tiles ${s.spell.tiles.join('/')} → ${s.spell.built.replace('＿＿', '')}${s.spell.tiles[idx]}`);
        await page.locator('.spell .rune.small').nth(idx).click(); continue;
      }
      continue;
    }
    if (s.choices2) {
      const c = s.choices2, P = c.prompt, X = c.line || '', Ot = c.opts.map(o => o.t), has = t => Ot.some(o => o.includes(t));
      if (fresh) { await helpOn(X); await snap(`choice-${s.bg}`); }
      let idx = 0;
      if (/cup is tipping/.test(P)) idx = O.cup;
      else if (X === '初日？') idx = O.first;
      else if (/Ask her something/.test(P)) idx = O.extra;
      else if (/island is getting close/.test(P)) idx = O.island;
      else if (X === '寮？') idx = O.dorm;
      else if (X === 'もうすぐ？') idx = O.reply;
      else if (X === '上司、エミ？') idx = O.boss;
      else if (/let her work/.test(P)) idx = O.ask;
      else if (X === 'レイ。営業。') idx = O.name;
      else if (/What do you do/.test(P)) idx = Math.min(gate.shift() ?? 0, Ot.length - 1);
      else if (/Try again/.test(P)) idx = (casts[currentSpell]?.length && !R[`${currentSpell}Stop`]) ? 0 : 1;
      else if (/The copier\./.test(P)) idx = R.copier;
      else if (/slow/.test(P)) idx = R.copy === 'magic' ? 1 : 0;
      else if (/Sorting/.test(P)) idx = R.sort === 'magic' ? 1 : 0;
      else if (/coming/.test(P)) idx = R.steps;
      else if (/won't look up/.test(P)) {
        const a = sales.shift() || 'leave';
        const find = f => Ot.findIndex(f);
        const clean = o => o.replace(/\[.*?\]/g, '');
        idx = a === 'ask' ? find(o => /(今|いま)\S*、ほしい/.test(clean(o))) : a === 'late' ? find(o => /(前|まえ)\S*に、ほしい/.test(clean(o))) : a === 'leave' ? find(o => /わかった/.test(o))
          : a === 'wait' ? find(o => /^（(待|ま)/.test(clean(o))) : find(o => /(言霊|ことだま)/.test(o));
        if (idx < 0 || c.opts[idx].dis) { out.push(`  (option for ${a} not available: ${Ot.join(' | ')})`); idx = find(o => /わかった/.test(o)); }
      } else if (/secret/.test(P)) idx = R.secret ?? 0;
      else if (/Reply to Emi/.test(P) && Ot.length === 4) idx = R.dorm;
      else if (/free typing/.test(P)) idx = 1;
      else if (/Your reply/.test(P)) {
        if (has('いつも')) idx = R.gateReply;
        else if (has('新人') || has('しんじん')) idx = R.mio;
        else if (has('いちおう')) idx = R.emi;
        else if (has('たたいた')) idx = R.copyReply ?? 0;
        else if (has('203')) idx = R.evening;
      }
      if (idx < 0 || idx >= Ot.length) idx = 0;
      if (c.opts[idx]?.dis) idx = c.opts.findIndex(o => !o.dis);
      out.push(`CHOICE ${c.cap ? `(${c.cap}) ` : ''}${c.who ? `${c.who}: ${c.ctx} ` : ''}${P ? `[${P}]` : ''}: ${Ot.map((o, k) => `${k === idx ? '▶' : ''}${c.opts[k].kind === 'spk' ? `「${o}」` : o}${c.opts[k].dis ? ' (disabled)' : ''}`).join(' | ')}`);
      const opt = page.locator('.opts > *').nth(idx);
      if (c.opts[idx].kind === 'spk') await opt.locator('.say-btn').click(); else await opt.click();
      continue;
    }
    if (s.choices) {
      await snap(`keypad-${s.bg}`);
      const O2 = s.choices.opts.map(o => o.t);
      let idx = O2.findIndex(o => o.startsWith(R.count));
      if (idx < 0) idx = 0;
      out.push(`CHOICE ${s.choices.prompt}: ${O2.map((o, k) => `${k === idx ? '▶' : ''}${o}`).join(' | ')}`);
      await page.locator('.choices .choice').nth(idx).click();
      continue;
    }
    if (s.panel) {
      await snap('lift');
      const target = [6, 5, 6, 2][ride];
      const wrong = R.wrong?.[ride] || [];
      const tried = (R._tried ||= {})[ride] ||= [];
      const next = wrong.find(w => !tried.includes(w));
      const pickIdx = next ?? target;
      if (next != null) tried.push(next); else ride++;
      out.push(`LIFT → ${s.panel[pickIdx]}`);
      await page.locator('.panel .floor').nth(pickIdx).locator('.btn').click(); await page.waitForTimeout(400); continue;
    }
    if (s.talk) { out.push('!! free talk input shown (LLM up?)'); const said = ['heya ha semai. kabe ga chikai.', 'kuroda san ha kowakatta.'][talks++ % 2]; await page.fill('.talk input', said); await page.press('.talk input', 'Enter'); out.push(`  typed: ${said}`); await page.waitForTimeout(1000); continue; }
    if (s.subs) {
      if (fresh) {
        const pre = `[${s.bg}]${s.insert ? `[${s.insert}]` : ''}${s.hand ? `[phone: ${s.hand}]` : ''}`;
        if (s.subs.paper) out.push(`${pre} SIGN ${s.subs.paper}`);
        else if (s.subs.narr) out.push(`${pre} (${s.subs.narr})`);
        else out.push(`${pre} ${s.subs.cap ? `(${s.subs.cap}) ` : ''}${s.subs.who}: ${s.subs.line}`);
        if (s.subs.raw) await helpOn(s.subs.raw);
        if (s.subs.adv || s.subs.narr || /^You/.test(s.subs.who)) await snap(`subs-${s.bg}`);
      }
      if (s.subs.adv) await page.locator('.subs .adv').first().click({ timeout: 2000, force: true }).catch(e => out.push('  !! advance failed: ' + e.message.slice(0, 80)));
      continue;
    }
  }
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('amakawa.save.v2') || '{}'));
  const words = await page.evaluate(() => JSON.parse(localStorage.getItem('amakawa.words.v1') || '{}'));
  out.push('', `flags: ${Object.keys(state.flags || {}).filter(k => state.flags[k]).join(', ')}`, `help lines: ${Object.keys(state.help?.lines || {}).join(' / ') || 'none'}`,
    `taps recorded: ${(words.taps || []).map(t => `${t.s} ${t.kind}${t.tut ? ' (tutorial)' : ''}`).join(', ') || 'none'}`,
    `suspicion: ${JSON.stringify(state.sus)} noise: ${state.noise} casts: ${state.casts} time at end: ${state.time}`);
  if (errors.length) out.push(`ERRORS: ${errors.join(' || ')}`);
  out.push('');
  log.push(...out);
  console.log(tag, 'lines', out.length, 'shots', shot, errors.length ? `errors ${errors.length}` : '');
  await ctx.close();
}

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const only = process.argv.slice(2);
for (const [name, R] of Object.entries(ROUTES)) {
  if (only.length && !only.includes(name)) continue;
  for (const size of SIZES) await play(browser, name, JSON.parse(JSON.stringify(R)), size === 'phone');
}
await browser.close();
fs.writeFileSync(process.env.OUT || 'game/notes/transcripts/day1-played.md', ['# Day 1, played routes', '', 'Generated by tools/day1_playtest.mjs at 390x844 (phone) and 1366x860 (desktop). Japanese is as the player sees it: readings showing above kanji in [brackets], word meanings the player opened in {braces}. Lines marked !! are problems.', '', ...log].join('\n'));
