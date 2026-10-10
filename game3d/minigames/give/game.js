// Friday drinks: everybody at B2's table gave one drink and got one. The player reads what people
// say and draws who gave what; then everyone thanks whoever the drawing says, and a wrong arrow
// means a thank-you lands on the wrong person (README.md, Friday drinks).

import { shell, say, ask, fill, pips, stamp, end, expectLink, tapOne } from '../common/ui.js';
import { pick, arrow, arrowLayer, fly } from '../common/drag.js';
import { PEOPLE, portrait, nameFor } from '../common/cast.js';
import { jp } from '../common/jp.js';
import { sfx } from '../common/sound.js';
import { ITEMS, VERBS, EN, ROUNDS, NOT_ME, clueLine, record, why, giverOf, remix } from './tables.js';

const SEATS = { mori: [50, 15], mio: [16, 50], kenji: [84, 50], eric: [50, 85] };
const THANKS = {
  mio: '{ありがとう|arigatō|thanks}',
  kenji: '{ありがとう|arigatō|thanks}！',
  mori: '{ありがとうございます|arigatō gozaimasu|thank you very much}',
  eric: '{ありがとう|arigatō|thanks}',
};
// When Eric's own sentence says he gave something to someone who gave it to him.
const NOT_GOT = {
  mio: ['deadpan', "Hm? You didn't give me anything."],
  kenji: ['sheepish', 'For Kenji? ...No? Sad.'],
  mori: ['flustered', '{え|e|huh}？'],
};
const wait = ms => new Promise(r => setTimeout(r, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms));
const side = who => (who === 'eric' ? 'right' : '');
const line = ([who, text, o = {}]) => say(who, text, { side: side(who), ...o });
async function lines(list) {
  for (const l of list || []) await line(l);
}

// ---------- the table ----------
const stage = shell({ title: 'Friday drinks', place: 'B2, three o’clock' });
const streakChip = document.createElement('span');
streakChip.className = 'streak';
streakChip.hidden = true;
const bar = document.querySelector('.bar');
bar.insertBefore(streakChip, bar.querySelector('.en-btn'));

const room = document.createElement('div');
room.className = 'room scene';
room.innerHTML = '<div class="table"></div><div class="machine" aria-hidden="true"></div>';
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
    <span class="nm">${jp(PEOPLE[id].jp)}</span><span class="me">わたし</span><span class="mark"></span>
    <span class="hold"></span><span class="bubble" hidden></span>`;
  room.append(b);
  seats[id] = b;
}
const seatSel = id => `.seat[data-id="${id}"]`;

function can(kind, label = true) {
  const el = document.createElement('span');
  el.className = 'item';
  el.dataset.kind = kind;
  el.innerHTML = `<i></i>${label ? `<span class="lbl">${jp(ITEMS[kind].jp)}</span>` : ''}`;
  return el;
}

function setSpeaker(id) {
  for (const [k, s] of Object.entries(seats)) s.classList.toggle('speaker', k === id);
}

// ---------- score ----------
const score = { right: 0, total: 0, run: 0, best: 0, perfect: [] };
function tally(ok) {
  score.total++;
  if (ok) {
    score.right++;
    score.run++;
    score.best = Math.max(score.best, score.run);
  } else score.run = 0;
  streakChip.hidden = score.run < 2;
  streakChip.textContent = `${score.run} in a row`;
  streakChip.classList.remove('bump');
  void streakChip.offsetWidth;
  if (ok) streakChip.classList.add('bump');
}

// ---------- arrows the player draws: giver -> getter ----------
let drawn = {}, paths = {};
function clearArrows() {
  svg.querySelectorAll('path.arrow').forEach(p => p.remove());
  drawn = {};
  paths = {};
}
function draw(g, r, cls = '') {
  if (paths[g]) paths[g].remove();
  for (const [x, to] of Object.entries(drawn)) {
    if (to === r && x !== g) {
      paths[x].remove();
      delete paths[x];
      delete drawn[x];
    }
  }
  drawn[g] = r;
  paths[g] = arrow(svg, seats[g], seats[r], cls);
}
addEventListener('resize', () => {
  for (const [g, r] of Object.entries(drawn)) paths[g] = arrow(svg, seats[g], seats[r], paths[g].getAttribute('class').replace('arrow', '').trim(), paths[g]);
});

// ---------- one round ----------
async function setTable(round) {
  clearArrows();
  for (const [id, s] of Object.entries(seats)) {
    s.classList.toggle('out', !round.who.includes(id));
    s.classList.remove('credited', 'ok', 'bad');
    s.querySelector('.hold').replaceChildren();
    s.querySelector('.bubble').hidden = true;
  }
  sfx('vending', 0.4);
  const machine = room.querySelector('.machine');
  await Promise.all(round.who.map(async (r, i) => {
    await wait(i * 140);
    const kind = round.gifts[giverOf(round, r)][1];
    const ghost = await fly(can(kind, false), machine, seats[r].querySelector('.hold'), room, 520);
    ghost.remove();
    seats[r].querySelector('.hold').append(can(kind));
  }));
}

function clueList(round) {
  const ol = document.createElement('ol');
  ol.className = 'clues';
  round.clues.forEach((c, i) => {
    const { jp: text, en } = clueLine(round, c);
    const li = document.createElement('li');
    li.className = `clue${c.say === 'silent' ? ' silent' : ''}`;
    li.dataset.by = c.by;
    const said = shown => {
      li.innerHTML = `<span class="pic" style="background-image:url(${portrait(c.by)})" role="img" aria-label="${PEOPLE[c.by].en}"></span>
        <div class="said"><span class="by">${PEOPLE[c.by].en}</span><span class="jp">${jp(text)}${shown ? '' : '<button class="chip reveal" type="button">English</button>'}</span>${shown ? `<span class="gloss en-line">${en}</span>` : ''}</div>`;
    };
    said(c.say === 'silent' || round.showEn);
    li.onclick = e => {
      if (e.target.closest('.reveal')) said(true);
      ol.querySelectorAll('.clue').forEach(x => x.classList.toggle('on', x === li));
      setSpeaker(c.by);
    };
    if (i === 0) li.classList.add('on');
    ol.append(li);
  });
  setSpeaker(round.clues[0].by);
  return ol;
}

// What the test driver should draw next: the first giver without an arrow, to whoever they gave to
// (or, for the last one, to whoever is left, the way a player would close the ring).
function expectNext(round) {
  const g = round.who.find(id => !(id in drawn));
  const taken = new Set(Object.values(drawn));
  const free = round.who.filter(id => id !== g && !taken.has(id));
  const r = free.length === 1 ? free[0] : round.gifts[g][0];
  const wrong = free.find(id => id !== r);
  expectLink(seatSel(g), seatSel(r), wrong ? seatSel(wrong) : null);
}

async function drawAll(round, first) {
  const task = ask(null, 'Who gave what?');
  const foot = document.createElement('div');
  foot.className = 'foot';
  foot.innerHTML = `<p class="hint">${first ? 'Drag from the one who gave to the one who got it (or tap one, then the other).' : 'Tap a line to see who is わたし.'} Everyone gave one and got one.</p>
    <button class="primary thank" type="button" disabled>Thank them</button>`;
  task.append(clueList(round), foot);
  const talk = document.querySelector('.talk');
  talk.classList.add('clueing');
  const btn = foot.querySelector('.thank');
  const all = round.who.map(id => seats[id]);
  for (;;) {
    const full = Object.keys(drawn).length === round.who.length;
    btn.disabled = !full;
    btn.onclick = null;
    const ac = new AbortController();
    const picking = pick({ sources: all, targets: all, host: room, svg, mode: 'arrow', signal: ac.signal });
    let got;
    if (!full) {
      expectNext(round);
      got = await picking;
    } else {
      const res = await Promise.race([picking.then(x => ({ x })), tapOne([btn], '.thank', null).then(() => ({ thank: true }))]);
      if (res.thank) {
        ac.abort();
        talk.classList.remove('clueing');
        return;
      }
      got = res.x;
    }
    if (!got) continue;
    sfx('tap', 0.3);
    draw(got.from.dataset.id, got.to.dataset.id);
  }
}

// Everyone thanks whoever the drawing says gave them theirs.
async function thankRound(round) {
  ask(null, 'Everyone says thank you.');
  setSpeaker(null);
  const wrong = [];
  for (const r of round.who) {
    const said = Object.keys(drawn).find(g => drawn[g] === r), real = giverOf(round, r);
    const ok = said === real;
    const b = seats[r].querySelector('.bubble');
    b.innerHTML = jp(THANKS[r]);
    b.hidden = false;
    paths[said].setAttribute('class', `arrow ${ok ? 'good' : 'wrong'}`);
    const credited = seats[said];
    credited.classList.add('credited', ok ? 'ok' : 'bad');
    credited.querySelector('.mark').textContent = ok ? '✓' : '✗';
    sfx(ok ? 'ok' : 'no', 0.45);
    tally(ok);
    if (!ok) wrong.push({ r, said });
    await wait(700);
  }
  const perfect = !wrong.length;
  if (perfect) sfx('chime', 0.4);
  stamp(perfect);
  // The first two mix-ups are played out; the rest are just put right.
  for (const { r, said } of wrong.slice(0, 2)) {
    const [face, text] = NOT_ME[said];
    await line([said, text, { face, jp: said === 'mori', en: said === 'mori' ? 'Huh? Me?' : undefined, showEn: true }]);
    await line(['mio', why(round, r)]);
  }
  for (const { r } of wrong) draw(giverOf(round, r), r, 'fixed');
  return perfect;
}

// Eric says one hand-over himself: the one that came to him.
async function sayIt(round) {
  const { g, frame } = round.fill;
  const kind = round.gifts[g][1];
  const N = nameFor(g, 'eric'), I = `{${ITEMS[kind].jp}||${ITEMS[kind].en.replace(/^(a|some) /, '')}}`;
  const verbs = ['ageru', 'kureru', 'morau'].map(id => ({ id, html: VERBS[id].replace(/\|[^}]*\}/, '}').replace(/^\{(.*)\}$/, '$1') }));
  const parts = frame === 'kureru'
    ? [`${N}が {わたし|watashi|me}に ${I}を `, { slot: true }, '。']
    : [`{わたし|watashi|I}は ${N}`, { slot: true }, ` ${I}を `, { slot: true }, '。'];
  const bank = frame === 'kureru' ? verbs : [{ id: 'ni', html: 'に' }, { id: 'kara', html: 'から' }, { id: 'o', html: 'を' }, ...verbs];
  const answer = frame === 'kureru' ? ['kureru'] : ['ni', 'morau'];
  const en = frame === 'kureru' ? `${EN[g]} gave me ${ITEMS[kind].en}.` : `I got ${ITEMS[kind].en} from ${EN[g]}.`;
  setSpeaker('eric');
  let first = true;
  for (;;) {
    ask(g, '{エリックさん||Eric}は？', { jp: true, en: 'And you, Eric?', showEn: true, face: 'smile' });
    const got = await fill(parts, bank, answer);
    const verb = got[got.length - 1], particle = frame === 'morau' ? got[0] : null;
    const ok = verb === (frame === 'kureru' ? 'kureru' : 'morau') && (!particle || particle !== 'o');
    if (ok) {
      stamp(true);
      const said = frame === 'kureru' ? `${N}が {わたし|watashi|me}に ${I}を *${VERBS.kureru}*。` : `{わたし|watashi|I}は ${N}{${particle === 'kara' ? 'から|kara|from' : 'に|ni|from (with もらう)'}} ${I}を *${VERBS.morau}*。`;
      await say('eric', said, { jp: true, en, showEn: true, side: 'right' });
      return first;
    }
    first = false;
    stamp(false);
    if (particle === 'o') {
      await line(['mio', 'を is for the thing. The one who gave it gets に or から.']);
      continue;
    }
    const gaveIt = (frame === 'kureru' && verb !== 'kureru') || (frame === 'morau' && verb === 'ageru');
    if (gaveIt) {
      // The sentence says Eric gave it to them, so that's what happens.
      const ghost = await fly(can(kind), seats.eric, seats[g], room);
      const [face, text] = NOT_GOT[g];
      await line([g, text, { face, jp: g === 'mori', en: g === 'mori' ? 'Huh?' : undefined, showEn: true }]);
      ghost.remove();
    }
    await line(['mio', frame === 'kureru'
      ? `That would be you giving it to ${EN[g]}. It came to you, so くれました.`
      : `With わたし first, you're the one who got it. So it's もらいました.`]);
  }
}

async function run(rounds, again) {
  const results = [];
  pips(rounds.length, results);
  for (const [i, round] of rounds.entries()) {
    setSpeaker(null);
    await setTable(round);
    await lines(round.intro);
    await drawAll(round, i === 0 && !again);
    const perfect = await thankRound(round);
    await lines(round.after);
    if (round.fill) await sayIt(round);
    results.push(perfect);
    pips(rounds.length, results);
  }
  const good = score.total - score.right <= 2;
  await lines(good
    ? [
      ['mori', '{みなさん|minasan|everyone}、{ありがとうございます|arigatō gozaimasu|thank you very much}。', { jp: true, en: 'Thank you, everyone.', face: 'smile' }],
      ['mio', "Now he writes everyone a card. You too, sorry."],
    ]
    : [
      ['kenji', 'So many thank-yous for Kenji today! Kenji is... very generous!', { face: 'grin' }],
      ['mio', again ? 'You gave one drink, Kenji.' : 'You gave one melon soda.', { face: 'deadpan' }],
    ]);
  end({
    title: 'Friday drinks',
    sub: `${score.right} of ${score.total} thank-yous went to the right person. Longest run: ${score.best}. Who gave what:`,
    rows: rounds.flatMap(r => Object.keys(r.gifts).map(g => record(r, g))),
    again: () => {
      document.querySelector('.endcard').remove();
      Object.assign(score, { right: 0, total: 0, run: 0, best: 0 });
      streakChip.hidden = true;
      run(remix(ROUNDS), true);
    },
  });
}

run(ROUNDS, false);
