// Lunch run: the canteen counter, B2's trays, and comparisons about what is on the counter.

import { shell, say, ask, fill, pips, stamp, end, tapOne, expectLink } from '../common/ui.js';
import { pick, fly } from '../common/drag.js';
import { PEOPLE, portrait } from '../common/cast.js';
import { jp } from '../common/jp.js';
import { DISHES, ADJ, SCRIPT, best, dishMarkup as D } from './rounds.js';

const TRAYS = ['mio', 'mori', 'kenji', 'eric'];

// Someone handed what they didn't ask for.
const NOT_THAT = {
  mio: ['mio', "That's not what I said. Read it again.", { face: 'deadpan' }],
  mori: ['mori', '{あ|a|ah}…', { jp: true, en: 'Ah...', face: 'flustered' }],
  kenji: ['kenji', 'Eh? Kenji said... other one.', { face: 'sheepish' }],
  eric: ['eric', "That's not mine yet.", { face: 'tired', side: 'right' }],
};

const stage = shell({ title: 'Lunch run', place: 'Canteen counter, 12:10' });
const scene = document.createElement('div');
scene.className = 'canteen scene';
scene.innerHTML = `<div class="counter"><span class="sign">${jp('しょくどう')}</span><div class="dishes"></div></div>
  <div class="note" hidden></div><div class="trays"></div>`;
stage.append(scene);
const dishesEl = scene.querySelector('.dishes'), note = scene.querySelector('.note');
const trays = {};
for (const id of TRAYS) {
  const t = document.createElement('button');
  t.type = 'button';
  t.className = 'tray';
  t.dataset.id = id;
  t.innerHTML = `<span class="face" style="background-image:url(${portrait(id)})"></span><span class="nm">${PEOPLE[id].en}</span><span class="slot"></span>`;
  scene.querySelector('.trays').append(t);
  trays[id] = t;
}
const dishSel = id => `.dish[data-id="${id}"]`, traySel = id => `.tray[data-id="${id}"]`;

function dish(id, { lid = false, small = false } = {}) {
  const d = DISHES[id];
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `dish${lid ? ' lidded' : ''}${small ? ' small' : ''}`;
  el.dataset.id = id;
  el.style.setProperty('--s', 0.7 + d.size * 0.15);
  el.innerHTML = `<span class="bowl"><i class="food"></i><i class="lid"></i></span>
    <span class="nm">${jp(d.jp)}</span><span class="price">¥${d.price}</span>
    <span class="hot" aria-label="spicy ${d.hot} of 3">${'<i></i>'.repeat(d.hot)}${'<i class="off"></i>'.repeat(3 - d.hot)}</span>`;
  return el;
}

function counter(ids, opts) {
  dishesEl.replaceChildren(...ids.map(id => dish(id, opts)));
  return [...dishesEl.children];
}

const speak = ([who, text, o = {}]) => say(who, text, { side: who === 'eric' ? 'right' : '', ...o });
async function lines(list) {
  for (const l of list || []) await speak(l);
}
const said = [];

function serve(id, to) {
  trays[to].querySelector('.slot').replaceChildren(dish(id, { small: true }));
}

async function give(r) {
  const els = [...dishesEl.children];
  if (r.ask) await say(r.ask[0], r.ask[1], { jp: true, en: r.ask[2], showEn: r.showEn, ...r.ask[3] });
  let first = true;
  for (;;) {
    const task = r.prompt
      ? ask(r.prompt[0], r.prompt[1], r.prompt[2])
      : ask(r.who, r.line, { jp: true, en: r.en, showEn: r.showEn });
    task.innerHTML = '<p class="hint">Carry the dish to their tray (drag it, or tap the dish, then the tray).</p>';
    expectLink(dishSel(r.want), traySel(r.who), traySel(r.who === 'mori' ? 'kenji' : 'mori'));
    const { from, to } = await pick({ sources: els, targets: Object.values(trays), host: stage, mode: 'carry' });
    const got = from.dataset.id, whose = to.dataset.id;
    await fly(from, from, to, stage, 450).then(g => g.remove());
    if (got === r.want && whose === r.who) {
      stamp(true);
      serve(got, whose);
      if (r.line) said.push({ jp: r.line, en: r.en });
      return first;
    }
    first = false;
    stamp(false);
    serve(got, whose);
    await lines([NOT_THAT[whose]]);
    trays[whose].querySelector('.slot').replaceChildren();
    if (whose !== r.who) await lines([['mio', r.who === 'mio' ? "That one's mine." : `That one is for ${PEOPLE[r.who].en}.`, { face: 'phone' }]]);
    else if (r.line && r.line.includes('より')) await lines([['mio', 'The one before より is the one that loses.', { face: 'phone' }]]);
    else if (r.line) await lines([['mio', 'Look at the one with が. That is the one they want.', { face: 'phone' }]]);
  }
}

// What the counter shows about two dishes, said plainly, when the player's sentence gets it backwards.
function facts(a, b, adj) {
  const A = DISHES[a], B = DISHES[b];
  if (adj === 'yasui') return `${A.en} is ¥${A.price}, ${B.en} is ¥${B.price}.`;
  if (adj === 'ookii') return 'Look at the bowls.';
  return 'Read the note again.';
}

async function compare(r) {
  await say(r.ask[0], r.ask[1], { jp: true, en: r.ask[2] });
  const win = best(r.on, r.adj), lose = r.on.find(id => id !== win);
  let first = true;
  for (;;) {
    ask('eric', 'Answer him: the winner first.', { side: 'right' });
    const ids = await fill([{ slot: true }, 'は', { slot: true }, '{より|yori|than}', ADJ[r.adj].jp, 'です。'], r.on.map(id => ({ id, html: DISHES[id].jp })), [win, lose]);
    const line = `${D(ids[0])}は${D(ids[1])}*より*${ADJ[r.adj].jp}です。`;
    if (ids[0] === win) {
      stamp(true);
      await say('eric', line, { jp: true, side: 'right', en: `${cap(DISHES[win].en)} is ${more(r.adj)} than ${DISHES[lose].en}.`, showEn: true });
      said.push({ jp: line, en: `${cap(DISHES[win].en)} is ${more(r.adj)} than ${DISHES[lose].en}.` });
      return first;
    }
    first = false;
    stamp(false);
    await say(r.who, `${cap(DISHES[ids[0]].en)}? ${facts(ids[0], ids[1], r.adj)}`, { face: r.who === 'kenji' ? 'sheepish' : 'flustered' });
    await lines([['mio', 'The winner goes first, before は. The one after より is the loser.', { face: 'phone' }]]);
  }
}

const cap = s => s[0].toUpperCase() + s.slice(1);
const more = adj => ({ yasui: 'cheaper', ookii: 'bigger', karai: 'spicier' })[adj];
const most = adj => ({ yasui: 'cheapest', ookii: 'biggest', karai: 'spiciest' })[adj];

async function pickOne(r) {
  const els = [...dishesEl.children];
  const win = best(r.on, r.adj);
  let first = true;
  for (;;) {
    const task = ask(r.ask[0], r.ask[1], { jp: true, en: r.ask[2] });
    task.innerHTML = '<p class="hint">Tap the dish on the counter.</p>';
    const el = await tapOne(els, dishSel(win), dishSel(r.on.find(id => id !== win)));
    const id = el.dataset.id;
    if (id === win) {
      stamp(true);
      const line = `${D(win)}が*いちばん*${ADJ[r.adj].jp}です。`;
      await say('eric', line, { jp: true, side: 'right', en: `The ${DISHES[win].en} is the ${most(r.adj)}.`, showEn: true });
      said.push({ jp: line, en: `The ${DISHES[win].en} is the ${most(r.adj)}.` });
      return first;
    }
    first = false;
    stamp(false);
    await say(r.who, `${cap(DISHES[id].en)}? It's ¥${DISHES[id].price}...`, { face: 'sheepish' });
  }
}

async function rank(r) {
  const els = [...dishesEl.children];
  for (const [l, en] of r.clues) await say(r.by, l, { jp: true, en });
  note.hidden = false;
  note.innerHTML = r.clues.map(([l, en]) => `<p><span class="jp">${jp(l)}</span><span class="gloss">${en}</span></p>`).join('');
  const order = [...r.on].sort((a, b) => DISHES[b].hot - DISHES[a].hot);
  let first = true;
  for (;;) {
    ask(r.who, 'Put them in order, spiciest first.', { face: 'phone' });
    const ids = await fill(['spiciest', { slot: true }, { slot: true }, { slot: true }, 'mildest'], r.on.map(id => ({ id, html: DISHES[id].jp })), order);
    if (ids.join() === order.join()) {
      stamp(true);
      els.forEach(e => e.classList.remove('lidded'));
      scene.classList.add('show-hot');
      note.hidden = true;
      said.push(...r.clues.map(([jpLine, en]) => ({ jp: jpLine, en })));
      return first;
    }
    first = false;
    stamp(false);
    await lines([['mio', 'Read the note again. In AはBよりからい, A is the spicier one.', { face: 'phone' }]]);
  }
}

const OWN = {
  ramen: 'The big one. Okay.',
  curry: 'Same as me. Good.',
  udon: 'Like Mori-san. Very calm choice.',
  yakisoba: 'Like Kenji? You scared of spicy also?',
};
async function own(r) {
  const els = [...dishesEl.children];
  await say(r.ask[0], r.ask[1], { jp: true, en: r.ask[2], ...r.ask[3] });
  ask('eric', 'Say it. Any one is right.', { side: 'right' });
  const [id] = await fill([{ slot: true }, 'が{いちばん|ichiban|most}{すき|suki|like}です。'], r.on.map(x => ({ id: x, html: DISHES[x].jp })), [r.on[0]]);
  const line = `${D(id)}が*いちばん*すきです。`;
  stamp(true);
  await say('eric', line, { jp: true, side: 'right', en: `I like ${DISHES[id].en} best.`, showEn: true });
  said.push({ jp: line, en: `I like ${DISHES[id].en} best.` });
  const el = els.find(e => e.dataset.id === id);
  await fly(el, el, trays.eric, stage, 450).then(g => g.remove());
  serve(id, 'eric');
  await say('mio', OWN[id], { face: 'phone' });
  return true;
}

const RUN = { give, compare, pick: pickOne, rank, own };

async function run(script) {
  const rounds = script.filter(r => r.kind), results = [];
  said.length = 0;
  pips(rounds.length, results);
  for (const r of script) {
    if (!r.kind) {
      await lines(r.intro || r.outro);
      continue;
    }
    counter(r.on, { lid: r.kind === 'rank' });
    await lines(r.before);
    results.push(await RUN[r.kind](r));
    pips(rounds.length, results);
    await lines(r.after);
  }
  const total = TRAYS.reduce((sum, id) => sum + (DISHES[trays[id].querySelector('.dish')?.dataset.id]?.price || 0), 0);
  end({
    title: 'Lunch for B2',
    sub: `${results.filter(Boolean).length} of ${rounds.length} right the first time. Lunch came to ¥${total}. What got said:`,
    rows: said,
    again: () => location.reload(),
  });
}

run(SCRIPT);
