// Drink round: the B2 team swaps drinks at the kitchenette table and the player says, or shows,
// who gave what to whom. A wrong verb is acted out literally, the way kotodama takes words.

import { shell, say, ask, fill, pips, stamp, end, expectLink } from '../common/ui.js';
import { pick, arrow, arrowLayer, fly } from '../common/drag.js';
import { PEOPLE, portrait } from '../common/cast.js';
import { jp } from '../common/jp.js';
import { ITEMS, VERBS, SCRIPT, sentence, line, verbFor, remix } from './rounds.js';

const SEATS = { mori: [50, 17], mio: [17, 50], kenji: [83, 50], eric: [50, 83] };

// What someone says when the sentence claims they got, or gave, something they didn't.
const NOT_GOT = {
  mio: ['mio', "Hm? I didn't get anything.", { face: 'deadpan' }],
  mori: ['mori', '{え|e|huh}？', { jp: true, en: 'Hm?', face: 'flustered' }],
  kenji: ['kenji', 'For Kenji? ...No? Sad.', { face: 'sheepish' }],
  eric: ['eric', "I didn't get anything, though.", { face: 'tired', side: 'right' }],
};
const NOT_GAVE = {
  mio: ['mio', "I didn't give anybody anything.", { face: 'deadpan' }],
  mori: ['mori', '{え|e|huh}？', { jp: true, en: 'Hm?', face: 'flustered' }],
  kenji: ['kenji', 'Kenji no give! Kenji get!', { face: 'sheepish' }],
  eric: ['eric', "I didn't give anyone anything.", { face: 'tired', side: 'right' }],
};
const RULE = {
  ageru: "It's あげる. The one before は gives it, and に is the one who gets it.",
  kureru: "It's くれる, so it came in to whoever is talking. Who gave it?",
  morau: 'With もらう the one in front is the one who gets it. に or から is who gave it.',
};

const stage = shell({ title: 'Drink round', place: 'B2 kitchenette, lunch' });
const room = document.createElement('div');
room.className = 'room scene';
room.innerHTML = '<div class="table"></div><div class="pot"></div>';
stage.append(room);
const svg = arrowLayer(room);
const seats = {};
for (const [id, [x, y]] of Object.entries(SEATS)) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'seat';
  b.dataset.id = id;
  b.style.left = `${x}%`;
  b.style.top = `${y}%`;
  b.innerHTML = `<span class="face" style="background-image:url(${portrait(id)})"></span>
    <span class="nm">${jp(PEOPLE[id].jp)}</span><span class="me">わたし</span><span class="got"></span>`;
  room.append(b);
  seats[id] = b;
}
const seatSel = id => `.seat[data-id="${id}"]`;

function item(kind) {
  const el = document.createElement('span');
  el.className = 'item';
  el.dataset.kind = kind;
  el.innerHTML = `<i></i><span class="lbl">${jp(ITEMS[kind].jp)}</span>`;
  return el;
}

function setSpeaker(id) {
  for (const [k, s] of Object.entries(seats)) s.classList.toggle('speaker', k === id);
}

const speak = ([who, text, o = {}]) => say(who, text, { side: who === 'eric' ? 'right' : '', ...o });
async function lines(list) {
  for (const l of list || []) await speak(l);
}

// Moves the drink from one seat to another and leaves it in front of whoever got it.
async function hand(kind, from, to, cls = '') {
  const a = arrow(svg, seats[from], seats[to], cls);
  const ghost = await fly(item(kind), seats[from], seats[to], room);
  ghost.remove();
  if (!cls) {
    seats[to].querySelector('.got').append(item(kind));
    // Only the latest hand-over keeps its arrow, faded; the drinks in front of people keep the record.
    svg.querySelectorAll('path.past').forEach(p => p.remove());
    a.setAttribute('class', 'arrow past');
  }
  return a;
}

// A sentence that says something else happened: show what it says, then let people react.
async function literal(kind, from, to, react) {
  const a = await hand(kind, from, to, 'wrong');
  await lines([react]);
  a.remove();
}

async function act(round, s, first) {
  const { parts, en } = sentence(round);
  const pot = room.querySelector('.pot');
  pot.replaceChildren(item(round.item));
  let firstTry = true;
  for (;;) {
    const task = ask(s, parts.join(''), { jp: true, en, showEn: round.showEn, side: s === 'eric' ? 'right' : '' });
    task.innerHTML = `<p class="hint">${first ? 'Drag from the one who gives to the one who gets (or tap one, then the other).' : 'Show who gave it to whom.'}</p>`;
    expectLink(seatSel(round.g), seatSel(round.r), seatSel(Object.keys(SEATS).find(id => id !== round.g && id !== round.r)));
    const all = Object.values(seats);
    const { from, to } = await pick({ sources: all, targets: all, host: room, svg, mode: 'arrow' });
    pot.replaceChildren();
    if (from.dataset.id === round.g && to.dataset.id === round.r) {
      stamp(true);
      await hand(round.item, round.g, round.r);
      return firstTry;
    }
    firstTry = false;
    stamp(false);
    const wrongGetter = to.dataset.id !== round.r;
    await literal(round.item, from.dataset.id, to.dataset.id, wrongGetter ? NOT_GOT[to.dataset.id] : NOT_GAVE[from.dataset.id]);
    await lines([['mio', RULE[verbFor(round)]]]);
    pot.replaceChildren(item(round.item));
  }
}

const BANK = {
  verb: id => ({ id, html: VERBS[id].jp.replace(/\|[^}]*\}/, '}').replace(/^\{(.*)\}$/, '$1') }),
  particle: () => [{ id: 'ni', html: 'に' }, { id: 'kara', html: 'から' }, { id: 'o', html: 'を' }],
};

async function watch(round, s) {
  const verb = verbFor(round);
  const gaps = round.gaps;
  await hand(round.item, round.g, round.r);
  const { parts, en } = sentence(round, gaps);
  const bank = [], answer = [];
  for (const g of gaps) {
    if (g === 'verb') {
      bank.push(...(round.choices || ['ageru', 'kureru', 'morau']).map(BANK.verb));
      answer.push(verb);
    } else if (g === 'particle') {
      bank.push(...BANK.particle());
      answer.push(round.particle === 'kara' ? 'kara' : 'ni');
    } else if (g === 'getter') {
      bank.push(...['eric', 'mio', 'mori', 'kenji'].filter(id => id !== round.g).map(id => ({ id, html: id === s ? 'わたし' : PEOPLE[id].jp })));
      answer.push(round.r);
    }
  }
  let firstTry = true;
  for (;;) {
    ask(s, s === 'eric' ? 'Say what happened.' : `Finish what ${PEOPLE[s].en} says.`, { en, side: s === 'eric' ? 'right' : '' });
    const got = await fill(parts, bank, answer);
    const by = Object.fromEntries(gaps.map((g, i) => [g, got[i]]));
    const ok = (!by.verb || by.verb === verb) && (!by.particle || by.particle !== 'o') && (!by.getter || by.getter === round.r);
    if (ok) {
      stamp(true);
      const said = { ...round, particle: by.particle || round.particle };
      await say(s, line(said), { jp: true, en, showEn: true, side: s === 'eric' ? 'right' : '' });
      return firstTry;
    }
    firstTry = false;
    stamp(false);
    await mistake(round, s, by, verb);
  }
}

// Acts out what the wrong sentence would mean, then Mio says the rule once.
async function mistake(round, s, by, verb) {
  const { g, r, item: kind } = round;
  if (by.getter && by.getter !== r) {
    await literal(kind, g, by.getter, NOT_GOT[by.getter]);
    return lines([['mio', 'No, look where it went.']]);
  }
  if (by.particle === 'o') return lines([['mio', 'を is for the thing. The one who gave it gets に or から.']]);
  if (verb === 'morau') {
    // "r gave it": it would have gone the other way.
    await literal(kind, r, g, NOT_GAVE[r]);
    return lines([['mio', RULE.morau]]);
  }
  if (by.verb === 'morau') {
    // "g got it from r": the same.
    await literal(kind, r, g, NOT_GAVE[r]);
    return lines([['mio', 'もらう is get. But here the one in front gave it.']]);
  }
  if (by.verb === 'kureru') {
    if (g !== s) await literal(kind, g, s, NOT_GOT[s]);
    return lines([['mio', 'くれる is only when it comes in to whoever is talking. This went somewhere else, so あげる.']]);
  }
  return lines([['mio', 'あげる goes away from whoever is talking. This one came in, so くれる.']]);
}

async function run(script, again) {
  const results = [];
  const rounds = script.filter(r => r.kind);
  pips(rounds.length, results);
  let speaker = 'eric', firstAct = true;
  for (const entry of script) {
    if (!entry.kind) {
      if (entry.speaker) speaker = entry.speaker;
      setSpeaker(speaker);
      await lines(entry.intro || []);
      if (entry.outro) await lines(entry.outro);
      continue;
    }
    const s = entry.speaker || speaker;
    setSpeaker(s);
    await lines(entry.before);
    const won = entry.kind === 'act' ? await act(entry, s, firstAct && !again) : await watch(entry, s);
    if (entry.kind === 'act') firstAct = false;
    results.push(won);
    pips(rounds.length, results);
    await lines(entry.after);
  }
  const right = results.filter(Boolean).length;
  end({
    title: "Mr. Mori's notebook",
    sub: `${right} of ${rounds.length} right the first time. Everyone he has to thank tomorrow:`,
    rows: rounds.map(r => ({ jp: line(r), en: sentence(r).en })),
    again: () => {
      document.querySelector('.endcard').remove();
      for (const s of Object.values(seats)) s.querySelector('.got').replaceChildren();
      svg.querySelectorAll('path.arrow').forEach(p => p.remove());
      run(SCRIPT.map(remix), true);
    },
  });
}

run(SCRIPT, false);
