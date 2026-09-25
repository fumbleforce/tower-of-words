// Headless playtest of day 1: plays scripted routes through every branch that matters, logs what a player sees
// (speaker, Japanese as rendered, narration, choices and picks), and takes screenshots on desktop and phone.
// Needs a static server on the repo root: python3 -m http.server 8765 --bind 127.0.0.1
// Usage: node tools/day1_playtest.mjs [route names...]   Output: game/notes/transcripts/day1-played.md, screenshots in $SHOTS.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(`${process.env.HOME}/ai/opening/`);
const { chromium, devices } = require('playwright');

const URL = process.env.GAME_URL || 'http://127.0.0.1:8765/game/';
const SHOTS = process.env.SHOTS || '/tmp/day1-shots';
fs.mkdirSync(SHOTS, { recursive: true });

// A route is a set of decisions. Choices are matched by prompt (and option text where prompts repeat).
const ROUTES = {
  clean: { onboard: 'check', check: 'good', doors: 0, gate: [0], gateReply: 0, mio: 0, emi: 1, copier: 0,
    jam: ['して'], count: '10', copy: 'magic', speed: ['いで'], sort: 'magic', sortCasts: ['んで'], steps: 0,
    sales: ['magic'], rei: [[0, 'して']], secret: 1, evening: 0, dorm: 0 },
  loud: { onboard: 'some', doors: 1, gate: [1, 2, 0], gateReply: 1, mio: 1, emi: 2, copier: 2,
    jam: ['す', 'した', 'せ'], count: '100', copy: 'magic', speed: ['げ'], sort: 'magic', sortCasts: ['べ'], steps: 0, copyReply: 1,
    sales: ['ask', 'late', 'magic', 'magic'], rei: [[1, 'て'], [0, 'せ']], secret: 2, evening: 1, dorm: 3 },
  hands: { onboard: 'new', doors: 0, wrong: { 0: [2, 5] }, gate: [0], gateReply: 2, mio: 2, emi: 0, copier: 1,
    jam: ['いで', 'った', 'して'], count: '20', copy: 'wait', sort: 'hand', steps: 1,
    sales: ['wait', 'magic', 'magic', 'leave'], rei: [[1, 'る'], [0, 'す']], evening: 1, dorm: 3 },
  stop: { onboard: 'n4', doors: 0, gate: [0], gateReply: 0, mio: 0, emi: 1, copier: 0,
    jam: ['す', 'した'], jamStop: true, count: '11', copy: 'magic', speed: ['ぐ'], speedStop: true, sort: 'magic', sortCasts: ['んだ'], sortStop: true, steps: 1,
    sales: ['leave'], evening: 0, dorm: 1 },
  mute: { onboard: 'some', doors: 0, gate: [0], gateReply: 0, mio: 0, emi: 1, copier: 0,
    jam: ['す', 'した', 'す', 'した', 'して'], count: '10', copy: 'magic', sort: 'magic', steps: 0,
    sales: ['ask', 'late', 'magic', 'leave'], evening: 0, dorm: 2 },
  typed: { onboard: 'some', doors: 0, gate: [0], gateReply: 0, mio: 0, emi: 1, copier: 0,
    jam: ['@dete', '@dashite'], count: '10', copy: 'magic', speed: ['@isoide'], sort: 'hand', steps: 1,
    sales: ['magic', 'magic'], rei: [[1, 'ろ'], [0, 'せ']], secret: 0, evening: 0, dorm: 0 },
};
const PHONE_ROUTES = ['clean', 'hands'];

const log = [];
async function play(browser, name, R, phone) {
  const ctx = await browser.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.clear(); } catch {} });
  await page.goto(URL);
  const tag = `${name}${phone ? '-phone' : ''}`;
  const out = [`## ${tag}`, ''];
  let shot = 0, lastSig = '', ride = 0, stuck = 0, talks = 0;
  const seenKinds = new Set();
  const casts = { jam: [...(R.jam || [])], speed: [...(R.speed || [])], sort: [...(R.sortCasts || [])], rei: [...(R.rei || [])] };
  const sales = [...(R.sales || [])], gate = [...(R.gate || [0])];
  const snap = async kind => { if (seenKinds.has(kind)) return; seenKinds.add(kind); await page.waitForTimeout(750); await page.screenshot({ path: `${SHOTS}/${tag}-${String(++shot).padStart(2, '0')}-${kind}.png` }); };
  const tap = async sel => { await page.locator(sel).first().click({ timeout: 3000 }); };
  let currentSpell = null;
  for (let i = 0; i < 1500; i++) {
    await page.waitForTimeout(120);
    const s = await page.evaluate(() => {
      const q = x => document.querySelector(x), qa = x => [...document.querySelectorAll(x)];
      const txt = el => (el ? el.innerText.replace(/\s+/g, ' ').trim() : '');
      // Text as the player sees it: ruby readings in [brackets] after the word.
      const seen = el => { if (!el) return ''; const c = el.cloneNode(true); c.querySelectorAll('rt').forEach(r => r.replaceWith(`[${r.textContent}]`)); c.querySelectorAll('.en,.hint,kbd,button.en-btn').forEach(e => e.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); };
      const ph = q('#phone');
      return {
        bg: q('#stage').dataset.bg,
        clock: txt(q('.phone-btn')),
        app: ph && !ph.hidden && ph.classList.contains('app') ? { body: seen(q('.app-body')), next: !!q('.ph-next'), opts: qa('.check-opt').map(seen), ktiles: qa('.ktile').length, q: seen(q('.q-big')) } : null,
        title: !!q('.summary.title'),
        summary: q('.summary:not(.title) .again') ? txt(q('.summary .card')) : null,
        spell: q('.spell') ? { goal: txt(q('.spell .goal')), meta: txt(q('.spell .meta')), hint: txt(q('.spell .hint')), verbs: qa('.spell .rune:not(.small)').map(seen), tiles: qa('.spell .rune.small').map(e => e.firstChild.textContent), marked: txt(q('.rune.marked')), built: seen(q('.built')) } : null,
        choices: q('.choices') ? { prompt: seen(q('.choices .prompt')), opts: qa('.choices .choice').map(b => ({ t: seen(b), dis: b.disabled })) } : null,
        panel: q('.panel') ? qa('.panel .floor').map(seen) : null,
        talk: !!q('.talk input'),
        subs: q('.subs') ? { who: txt(q('.subs .who')), line: seen(q('.subs .line')), narr: txt(q('.subs .narr')), paper: seen(q('.subs .paper')) } : null,
        chars: qa('#chars .ch img').map(i => i.getAttribute('src')),
      };
    });
    const sig = JSON.stringify([s.app, s.spell, s.choices, s.panel, s.talk, s.subs, s.summary]);
    if (sig === lastSig) { if (++stuck > 2500) { out.push(`!! STUCK at ${sig.slice(0, 300)}`); break; } }
    else stuck = 0;
    const fresh = sig !== lastSig; lastSig = sig;
    if (s.title) { await tap('.choices .choice >> nth=-1'); continue; }
    if (s.summary) { out.push(`[summary] ${s.summary.slice(0, 600)}`); await snap('summary'); break; }
    if (s.app) {
      if (fresh) out.push(`[app] ${s.app.body.slice(0, 220)}`);
      await snap(`app-${s.app.ktiles ? 'kanji' : s.app.opts.length ? 'q' : 'info'}${shot}`);
      if (s.app.ktiles) { if (R.check === 'good') for (const k of [0, 1, 2, 3, 4, 5, 6]) await page.locator('.ktile').nth(k).click(); await tap('.ph-next'); continue; }
      if (s.app.opts.length) {
        let idx = 0;
        const joined = s.app.opts.join('|');
        if (/はじめて/.test(joined)) idx = { check: 0, new: 1, some: 2, n4: 3 }[R.onboard];
        else if (/そのまま/.test(joined)) idx = 0;
        else if (R.check === 'good') {
          // Pick the right answer where we know it.
          const right = { 'えき': 'eki', 'みぎ': 'migi', 'でぐち': 'deguchi', 'しゃいん': 'shain', 'カード': 'kaado', 'コピー': 'kopii', 'ゲーム': 'geemu', 'エレベーター': 'erebeetaa', '人': 'ひと', '右': 'みぎ', '出口': 'でぐち', '今日': 'きょう', '会社': 'かいしゃ', '地下': 'ちか', '三階': 'さんがい' }[s.app.q];
          const gram = { 'て': 'Come', 'ま': 'Stop', 'しかけないで': "Don't talk", 'こう': "Let's" };
          const g = Object.entries(gram).find(([k]) => s.app.q.includes(k));
          idx = Math.max(0, s.app.opts.findIndex(o => (right && o.includes(right)) || (g && o.includes(g[1]))));
        }
        if (fresh) out.push(`  → ${s.app.opts[idx]}`);
        await page.locator('.check-opt').nth(idx).locator('kbd').click(); continue;
      }
      if (s.app.next) { if (await page.locator('#appName').count()) await page.fill('#appName', 'Test Tester'); await tap('.ph-next'); continue; }
      continue;
    }
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
    if (s.choices) {
      await snap(`choice-${s.bg}`);
      const P = s.choices.prompt, O = s.choices.opts.map(o => o.t), has = t => O.some(o => o.includes(t));
      let idx = 0;
      if (/Which doors/.test(P)) idx = R.doors;
      else if (/What do you do/.test(P)) idx = Math.min(gate.shift() ?? 0, O.length - 1);
      else if (/Try again/.test(P)) idx = (casts[currentSpell]?.length && !R[`${currentSpell}Stop`]) ? 0 : 1;
      else if (/The copier\./.test(P)) idx = R.copier;
      else if (/部数|ぶすう|bu/.test(P) || O.every(o => /^\d/.test(o))) idx = O.findIndex(o => o.startsWith(R.count));
      else if (/slow/.test(P)) idx = R.copy === 'magic' ? 1 : 0;
      else if (/Sorting/.test(P)) idx = R.sort === 'magic' ? 1 : 0;
      else if (/coming/.test(P)) idx = R.steps;
      else if (/won't look up/.test(P)) {
        const a = sales.shift() || 'leave';
        const find = f => O.findIndex(f);
        idx = a === 'ask' ? find(o => /(今|いま)\S*、ほしい/.test(o.replace(/\[.*?\]/g, ''))) : a === 'late' ? find(o => /(前|まえ)\S*に、ほしい/.test(o.replace(/\[.*?\]/g, ''))) : a === 'leave' ? find(o => /わかった/.test(o))
          : a === 'wait' ? find(o => /^（(待|ま)/.test(o.replace(/\[.*?\]/g, ''))) : find(o => /(言霊|ことだま)/.test(o));
        if (idx < 0 || s.choices.opts[idx].dis) { out.push(`  (option for ${a} not available: ${O.join(' | ')})`); idx = find(o => /わかった/.test(o)); }
      } else if (/secret/.test(P)) idx = R.secret ?? 0;
      else if (/Reply to Emi/.test(P) && O.length === 4) idx = R.dorm;
      else if (/free typing/.test(P)) idx = 1;
      else if (/Your reply/.test(P)) {
        if (has('いつも')) idx = R.gateReply;
        else if (has('しんじん') || has('新人')) idx = R.mio;
        else if (has('いちおう')) idx = R.emi;
        else if (has('たたいた')) idx = R.copyReply ?? 0;
        else if (has('アプリ')) idx = R.evening;
      }
      if (idx < 0) idx = 0;
      if (s.choices.opts[idx]?.dis) idx = s.choices.opts.findIndex(o => !o.dis);
      out.push(`CHOICE ${P}: ${O.map((o, k) => `${k === idx ? '▶' : ''}${o}${s.choices.opts[k].dis ? ' (disabled)' : ''}`).join(' | ')}`);
      // Click the number badge: tapping a word inside an option only looks it up.
      await page.locator('.choices .choice').nth(idx).locator('kbd').click();
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
        if (s.subs.paper) out.push(`[${s.bg}] SIGN ${s.subs.paper}`);
        else if (s.subs.narr) out.push(`[${s.bg}] (${s.subs.narr})`);
        else out.push(`[${s.bg}] ${s.subs.who}: ${s.subs.line}`);
        await snap(`subs-${s.bg}`);
        if (s.chars.length > 1) await snap(`two-${s.bg}`);
      }
      await page.mouse.click(phone ? 195 : 800, phone ? 200 : 150);
      continue;
    }
  }
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('amakawa.save.v2') || '{}'));
  out.push('', `flags: ${Object.keys(state.flags || {}).filter(k => state.flags[k]).join(', ')}`, `suspicion: ${JSON.stringify(state.sus)} noise: ${state.noise} casts: ${state.casts} time at end: ${state.time}`);
  if (errors.length) out.push(`ERRORS: ${errors.join(' || ')}`);
  out.push('');
  log.push(...out);
  console.log(tag, 'lines', out.length, errors.length ? `errors ${errors.length}` : '');
  await ctx.close();
}

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const only = process.argv.slice(2);
for (const [name, R] of Object.entries(ROUTES)) {
  if (only.length && !only.includes(name)) continue;
  await play(browser, name, JSON.parse(JSON.stringify(R)), false);
  if (PHONE_ROUTES.includes(name)) await play(browser, name, JSON.parse(JSON.stringify(R)), true);
}
await browser.close();
fs.writeFileSync(process.env.OUT || 'game/notes/transcripts/day1-played.md', ['# Day 1, played routes', '', 'Generated by tools/day1_playtest.mjs. Japanese is as the player sees it; readings shown above kanji are in [brackets].', '', ...log].join('\n'));
