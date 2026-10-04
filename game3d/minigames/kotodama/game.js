// Kotodama: the flow of a run (title, three shifts, a power word between them, the end card), input
// (taps, keys) and the test hook window.mg that tools/play.mjs drives.

import { THINGS, SHIFTS, COACH, POWERS, PARTICLES, VERBS, TUTORIAL, TO_STEP, GOAL } from './data.js';
import { parse, english, afterword, draft } from './grammar.js';
import { newRun, startShift, resolve, wait, plan, daySeed, shiftOf } from './sim.js';
import { initStage, setShift, setTickets, setRoles, act, expire, waited, face, shake, roomEl, burst, centre, thingEl, floater } from './stage.js';
import { skeleton, $, hud, lastPoints, countScore, line, talk, says, rail, pad, banner, overlay, powerCard, stars, pointAt, goal } from './ui.js';
import { sfx, unlock, muted, setMuted } from './audio.js';
import { word } from '../common/sound.js';
import { sleep } from './fx.js';
import { jp } from '../common/jp.js';

const opts = { en: true, polite: false };
let run, tokens = [], explicit = null, busy = false, lines = [], guide = null, daily = true, seed = 0;
const seen = new Set();
// What this device has been taught already, so a second run starts without the walkthrough.
const taught = k => localStorage.getItem(`kd-taught-${k}`) === '1';
const learn = k => localStorage.setItem(`kd-taught-${k}`, '1');
const mg = (window.mg = { expect: null, steps: 0, done: false });
const expect = e => {
  mg.expect = e;
  mg.steps++;
};

const machineOf = () => {
  if (explicit) return explicit;
  const first = tokens.find(t => t.t === 'n' && THINGS[t.id].kind === 'item');
  return first ? THINGS[first.id].from : null;
};
const status = () => parse(tokens, machineOf(), { last: run.last, moReady: run.moReady });

/** Each noun's particle, with と-joined nouns taking their group's particle. */
function roles() {
  const out = {};
  let group = [];
  for (const t of tokens) {
    if (t.t === 'n') group.push(t.id);
    else if (t.p !== 'to') {
      for (const id of group) out[id] = t.p;
      group = [];
    }
  }
  // A group still open: と on the nouns already joined, a grey ? on the one waiting for its particle.
  const last = tokens[tokens.length - 1];
  for (const id of group) out[id] = out[id] || (last.t === 'n' && last.id === id ? 'open' : 'to');
  return out;
}

/** The command as markup, for the end card and the light rising off the machine. */
function markup(machine) {
  const v = VERBS[THINGS[machine].verb];
  const words = tokens.map(t => (t.t === 'n' ? `{${THINGS[t.id].jp}|${THINGS[t.id].r}|${THINGS[t.id].en}}` : PARTICLES[t.p].jp + (t.p === 'to' ? '' : ' ')));
  return `{${THINGS[machine].jp}|${THINGS[machine].r}|${THINGS[machine].en}}、${words.join('')}{${v.jp}${opts.polite ? 'ください' : ''}|${v.r}${opts.polite ? ' kudasai' : ''}|${v.en}}`;
}
const plainText = m => m.replace(/\{([^|}]+)[^}]*\}/g, '$1');

function setTalk(ls) {
  lines = ls.filter(Boolean);
  talk(lines, opts.en);
}

function render(bump = false) {
  const m = machineOf();
  const st = status();
  rail(tokens, m, st, { ...opts, bump, draft: guide ? draft(tokens, m) || '' : null });
  pad(run, m, st, opts);
  setRoles(roles(), m, shiftOf(run).english === 'full');
  hud(run, shiftOf(run), opts);
  $('.kd').classList.toggle('en-on', opts.en);
  goal(run, shiftOf(run));
  document.querySelectorAll('.hint-glow').forEach(e => e.classList.remove('hint-glow'));
  const e = guideEl();
  if (e) e.classList.add('hint-glow');
}

/* ---------- the walkthrough: one step at a time, a hand on the next tap, other taps wait ---------- */

const selOf = ([k, id]) => (k === 'p' ? `.pad [data-p="${id}"]` : k === 'fire' ? '.fire' : `${THINGS[id].kind === 'item' ? '.item' : '.person'}[data-thing="${id}"]`);
const guideEl = () => (guide && !busy ? document.querySelector(selOf(guide.taps[guide.n])) : null);

/** steps: [{ taps, text }]; rest: the lines shown under the step card. */
function startGuide(steps, rest, badge) {
  guide = { taps: [], step: [], texts: steps.map(s => s.text), n: 0, rest, badge };
  steps.forEach((s, i) => s.taps.forEach(t => (guide.taps.push(t), guide.step.push(i))));
  guideTalk();
  requestAnimationFrame(handLoop);
}

function guideTalk() {
  const i = guide.step[guide.n];
  const n = guide.texts.length;
  const card = { ...line(null, null, guide.texts[i], 'step'), badge: guide.badge || (n > 1 ? `${i + 1}/${n}` : '') };
  setTalk([card, ...guide.rest]);
}

/** The hand follows its target every frame, so it stays put while the room animates or resizes. */
function handLoop() {
  pointAt($('.overlay').hidden ? guideEl() : null);
  if (guide) requestAnimationFrame(handLoop);
}

/** Lets a tap through if it is the one the hand points at, and moves the walkthrough on. */
function guideOk(tap) {
  if (!guide) return true;
  const want = guide.taps[guide.n];
  if (want[0] !== tap[0] || want[1] !== tap[1]) {
    blocked('Tap where the hand points.');
    const e = guideEl();
    if (e) e.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 300 });
    return false;
  }
  const step = guide.step[guide.n];
  guide.n++;
  if (guide.n >= guide.taps.length) guide = null;
  else if (guide.step[guide.n] !== step) queueMicrotask(guideTalk);
  return true;
}

function blocked(msg) {
  sfx.blocked();
  const h = $('.hint');
  if (msg) h.textContent = msg;
  h.classList.remove('ok');
  h.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 220 });
}

const dismiss = () => ($('.banner').hidden = true);

function tapThing(id) {
  if (busy || !run) return;
  dismiss();
  const t = THINGS[id];
  if (!guideOk(['thing', id])) return;
  if (t.kind === 'machine') {
    explicit = id;
    sfx.tap('machine');
    return render(true);
  }
  const last = tokens[tokens.length - 1];
  if (last && last.t === 'n') return blocked(`Give ${THINGS[last.id].jp} a particle first.`);
  if (t.kind === 'item' && explicit && t.from !== explicit) explicit = null;
  tokens.push({ t: 'n', id });
  sfx.tap(t.kind);
  render(true);
}

function tapParticle(p) {
  if (busy || !run) return;
  dismiss();
  const last = tokens[tokens.length - 1];
  if (!guideOk(['p', p])) return;
  if (!last) return blocked('Tap a person or a drink first, then its particle.');
  if (last.t === 'p') last.p = p;
  else tokens.push({ t: 'p', p });
  sfx.particle(p);
  render(true);
}

function undo() {
  if (busy || !run) return;
  if (guide) return guideOk(['undo']);
  dismiss();
  if (tokens.length) tokens.pop();
  else explicit = null;
  sfx.undo();
  render();
}

function matte() {
  if (busy || !run || !run.charges.matte || guide) return;
  wait(run);
  sfx.wait();
  word('matte');
  waited();
  setTickets(run.tickets);
  setTalk([line(null, '{みなさん|minasan|everyone}、{ちょっと|chotto|a moment} {まってください|matte kudasai|please wait}！', 'Everyone, please wait a moment! (Every request gets two more dots.)', 'note'), ...lines]);
  render();
}

async function fire() {
  if (busy || !run) return;
  const st = status();
  if (!st.ok) return blocked(st.need);
  if (!guideOk(['fire'])) return;
  busy = true;
  mg.expect = null;
  const m = markup(st.machine);
  const prev = run.score;
  const firstCmd = run.shift === 0 && run.turn === 0;
  if (firstCmd) learn('first');
  if (run.shift === 1 && run.turn === 0) learn('to');
  for (const id of shiftOf(run).people) face(id);
  const order = roles();
  const toFirst = tokens.findIndex(t => t.t === 'p' && t.p === 'ni') < tokens.findIndex(t => t.t === 'p' && t.p === 'o');
  setTalk([]);
  $('.hint').innerHTML = `<span class="said">${english(st, opts.polite)}</span>`;
  $('.fire').disabled = true;
  const res = resolve(run, st, opts.polite);
  Object.assign(run.said[run.said.length - 1], { markup: m, en: english(st, opts.polite) });
  await act(st, res, plainText(m));
  lastPoints(res);
  const L = [];
  const note = afterword(st, res);
  if (note) L.push(line(null, null, note, 'note'));
  if (res.points && res.n < 2) {
    const w = res.deliveries.find(d => d.kind === 'serve');
    const c = centre(thingEl(w.to), 0.2);
    floater(c.x, c.y, `+${res.points}`);
    countScore(prev, run.score);
  } else if (res.points) {
    banner(res);
    if (res.n >= 2) sfx.combo(res.n);
    shake(roomEl(), Math.min(1, 0.15 + res.n * 0.18 + (res.streakMult - 1) * 0.08));
    const b = centre($('.banner'));
    if (res.n >= 2) burst(b.x, b.y, ['#ffd36b', '#5fe0cf', '#ffffff'], 16 + res.n * 8, 1.3);
    countScore(prev, run.score);
  } else if (!note) sfx.wrong();
  const who = [...new Set(res.deliveries.filter(d => d.kind === 'serve').map(d => d.to))];
  for (const w of who.slice(0, 2)) L.push(says('served', w));
  for (const d of res.deliveries.filter(x => x.kind === 'launch').slice(0, 1)) L.push({ ...says('launched', d.what), face: 'surprised' });
  for (const d of res.deliveries.filter(x => x.kind === 'spare').slice(0, 1)) L.push(says('spare', d.to));
  if (firstCmd && res.clean && !seen.has('second')) {
    seen.add('second');
    L.push(line('mio', COACH.second[0], COACH.second[1], 'coach'));
  }
  if (run.shift === 1 && !seen.has('pot')) {
    seen.add('pot');
    L.push(line('mio', COACH.pot[0], COACH.pot[1], 'coach'));
  }
  if (!toFirst && order && Object.values(order).includes('ni') && res.clean && !seen.has('order')) {
    seen.add('order');
    L.push(line('mio', COACH.order[0], COACH.order[1], 'coach'));
  }
  tokens = [];
  explicit = null;
  const after = res.after;
  if (after) {
    for (const x of after.expired) {
      await expire(x.who);
      L.unshift(says('expired', x.who));
      if (!seen.has('expired')) {
        seen.add('expired');
        L.unshift(line(null, null, COACH.expired[1], 'note'));
      }
      hud(run, shiftOf(run), opts);
      $('.hearts').animate([{ transform: 'scale(1.4)' }, { transform: 'none' }], { duration: 300 });
    }
    if (!after.shiftOver) {
      if (after.arrived.length) await sleep(300);
      setTickets(run.tickets, after.arrived.map(a => a.who));
      if (after.arrived.length) sfx.ask();
      for (const a of after.arrived.slice(0, 1)) L.push(says('ask', a.who, a.item));
    }
  }
  setTalk(L);
  busy = false;
  render();
  if (after && after.shiftOver) {
    await sleep(900);
    return shiftEnd();
  }
  nextExpect();
}

function nextExpect() {
  if (guide) return expect({ kind: 'fill', seq: guide.taps.map(selOf), wrong: null });
  const p = plan(run);
  if (!p) return expect({ kind: 'tap', sel: '.pad [data-act="undo"]' });
  const seq = [];
  p.who.forEach((w, i) => seq.push(`.person[data-thing="${w}"]`, `.pad [data-p="${i < p.who.length - 1 ? 'to' : 'ni'}"]`));
  seq.push(`.item[data-thing="${p.item}"]`, '.pad [data-p="o"]', '.fire');
  const wrong = [`.item[data-thing="${p.item}"]`, '.pad [data-p="ni"]', `.person[data-thing="${p.who[0]}"]`, '.pad [data-p="o"]', '.fire'];
  expect({ kind: 'fill', seq, wrong });
}

function beginShift() {
  const arrived = startShift(run);
  const sh = shiftOf(run);
  setShift(run.shift);
  opts.en = sh.english === 'full';
  tokens = [];
  explicit = null;
  setTickets(run.tickets, arrived.map(a => a.who));
  sfx.shift();
  guide = null;
  if (run.shift === 0) {
    const ask = says('ask', 'kenji', 'cola');
    if (!taught('first')) startGuide(TUTORIAL, [ask]);
    else setTalk([line('mio', COACH.first[0], COACH.first[1], 'coach'), ask]);
  } else if (run.shift === 1) {
    const coach = line('mio', COACH.shift2[0], COACH.shift2[1], 'coach');
    const p = plan(run);
    if (!taught('to') && p && p.who.length === 2) {
      const taps = [['thing', p.who[0]], ['p', 'to'], ['thing', p.who[1]], ['p', 'ni'], ['thing', p.item], ['p', 'o'], ['fire']];
      startGuide([{ taps, text: TO_STEP }], [coach], 'と');
    } else setTalk([line('mio', COACH.shift2how[0], COACH.shift2how[1], 'coach')]);
  } else setTalk([line('mio', COACH.shift3[0], COACH.shift3[1], 'coach')]);
  render();
  nextExpect();
}

function shiftEnd() {
  if (run.over) return end();
  const next = SHIFTS[run.shift + 1];
  const pool = Object.keys(POWERS).filter(p => !run.powers.has(p));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(run.rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const offers = pool.slice(0, 3);
  sfx.shift();
  overlay(`<div class="sheet shift-card">
    <p class="k-time">${next.time}</p>
    <h2>Shift ${run.shift + 1} done</h2>
    <p class="sub">${run.score} points · ${run.hearts} ${run.hearts === 1 ? 'heart' : 'hearts'} left. Next: ${next.people.length} people, ${next.machines.length} machines. Pick one word to take into it.</p>
    <div class="cards">${offers.map(powerCard).join('')}</div></div>`, 'between');
  for (const b of document.querySelectorAll('.overlay .card'))
    b.onclick = () => {
      run.powers.add(b.dataset.power);
      if (b.dataset.power === 'kudasai') opts.polite = true;
      sfx.pick();
      overlay('');
      beginShift();
    };
  expect({ kind: 'tap', sel: `.overlay .card[data-power="${offers[0]}"]` });
}

function end() {
  mg.done = true;
  const key = daily ? `kd-best-${seed}` : 'kd-best-free';
  const was = Number(localStorage.getItem(key) || 0);
  const best = Math.max(was, run.score);
  localStorage.setItem(key, String(best));
  const top = run.best && run.said[run.best.i];
  const list = [...run.said].filter(s => s.markup).sort((a, b) => b.points - a.points).slice(0, 5);
  const out = run.hearts <= 0;
  sfx.shift();
  overlay(`<div class="sheet end-card">
    <p class="k-time">${out ? 'Out of hearts' : '20:00 · B2 closes'}</p>
    <div class="e-score"><b>${run.score}</b><span class="e-stars">${stars(run.score)}</span></div>
    <p class="sub">${run.served} requests served${run.score >= was && was ? ' · new best' : ''}${daily ? ` · today’s best ${best}` : ''}</p>
    ${top ? `<div class="e-best"><small>Biggest command · ${top.points} points</small><div class="jp">${jp(top.markup)}</div><div class="gl">${top.en}</div></div>` : ''}
    <details class="e-said"><summary>Your best commands</summary><ul>${list.map(s => `<li><span class="jp">${jp(s.markup)}</span><span class="gl">${s.en} · ${s.points}</span></li>`).join('')}</ul></details>
    <div class="e-btns">${daily ? '<button class="ghost share">Copy result</button>' : ''}<button class="primary again">Play again</button></div></div>`, 'end');
  const share = $('.overlay .share');
  if (share)
    share.onclick = () => {
      const text = `ことだま kotodama ${seed} · ${run.score} ${STAR_TEXT(run.score)} · biggest command ×${run.best ? run.best.n : 0}`;
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => (share.textContent = 'Copied'), () => (share.textContent = text));
    };
  $('.overlay .again').onclick = () => start(false);
  expect({ kind: 'end' });
}

const STAR_TEXT = s => stars(s).replace(/<i class="on">★<\/i>/g, '★').replace(/<i class="">★<\/i>/g, '☆');

function start(isDaily) {
  unlock();
  daily = isDaily;
  seed = isDaily ? daySeed() : Math.floor(Math.random() * 1e9);
  run = newRun(seed);
  opts.polite = false;
  seen.clear();
  overlay('');
  $('.score').textContent = '0';
  lastPoints(null);
  beginShift();
}

function title() {
  const s = daySeed();
  const best = Number(localStorage.getItem(`kd-best-${s}`) || 0);
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  overlay(`<div class="sheet title-card">
    <div class="logo"><span class="l-jp">ことだま</span><span class="l-r">kotodama</span></div>
    <p class="tag">B2 after six. The old machines do exactly what you say.</p>
    <p class="how">${GOAL.replace('dots', '<span class="mini-pips"><i></i><i></i><i></i></span>')}.</p>
    <button class="primary go-daily">Today’s run <small>${date}${best ? ` · best ${best}` : ''}</small></button>
    <button class="ghost go-free">Free play</button></div>`, 'title');
  $('.overlay .go-daily').onclick = () => start(true);
  $('.overlay .go-free').onclick = () => start(false);
  expect({ kind: 'tap', sel: '.overlay .go-daily' });
}

function boot() {
  skeleton();
  const fit = () => document.body.classList.toggle('phone', innerWidth < 640 || innerWidth / innerHeight < 0.8);
  addEventListener('resize', fit);
  fit();
  initStage($('.room'));
  run = newRun(daySeed());
  run.shift = 0;
  setShift(0);
  run.shift = -1;
  $('.snd').setAttribute('aria-pressed', String(!muted()));
  document.addEventListener('click', e => {
    unlock();
    const b = e.target.closest('[data-thing], [data-p], [data-act], .fire, .en, .snd');
    if (!b || e.target.closest('.overlay') || !run || run.shift < 0) {
      if (b && b.classList.contains('snd')) toggleSound(b);
      return;
    }
    if (b.classList.contains('en')) {
      opts.en = !opts.en;
      talk(lines, opts.en);
      return render();
    }
    if (b.classList.contains('snd')) return toggleSound(b);
    if (b.classList.contains('fire')) return fire();
    if (b.dataset.p) return tapParticle(b.dataset.p);
    if (b.dataset.act === 'undo') return undo();
    if (b.dataset.act === 'matte') return matte();
    if (b.dataset.thing) return tapThing(b.dataset.thing);
  });
  document.addEventListener('keydown', e => {
    if (!run || run.shift < 0 || !$('.overlay').hidden) return;
    const k = e.key.toLowerCase();
    const p = Object.keys(PARTICLES).find(x => PARTICLES[x].key === k);
    if (p && (p !== 'nimo' || run.powers.has('mo'))) tapParticle(p);
    else if (k === 'backspace') undo();
    else if (k === 'enter') fire();
    else if (k === 'e') $('.en').click();
    else if (/^[1-9]$/.test(k)) {
      const list = [...document.querySelectorAll('.room .item, .room .person')];
      const t = list[Number(k) - 1];
      if (t) tapThing(t.dataset.thing);
    } else return;
    e.preventDefault();
  });
  title();
}

function toggleSound(b) {
  setMuted(!muted());
  b.setAttribute('aria-pressed', String(!muted()));
}

boot();
