// Favours: hand each job to whoever will do it. When that is a machine, Eric says the command.

import { shell, say, ask, choose, pips, stamp, end, expectLink } from '../common/ui.js';
import { pick, fly } from '../common/drag.js';
import { PEOPLE, portrait } from '../common/cast.js';
import { jp } from '../common/jp.js';
import { word } from '../common/sound.js';
import { MACHINES, COMMANDS, SCRIPT } from './rounds.js';

const PEOPLE_IDS = ['mio', 'mori', 'kenji', 'eric'];

// Someone handed a job they weren't asked to do.
const NOT_ME = {
  mio: ['mio', "Me? I didn't ask for that.", { face: 'deadpan' }],
  mori: ['mori', '{わたし|watashi|me}…{ですか|desu ka|(question)}？', { jp: true, en: 'Me...?', face: 'flustered' }],
  kenji: ['kenji', 'Kenji? Eh... okay? No?', { face: 'sheepish' }],
  eric: ['eric', "Nobody asked me to.", { face: 'tired', side: 'right' }],
};

const stage = shell({ title: 'Favours', place: 'B2 office, afternoon' });
const office = document.createElement('div');
office.className = 'office scene';
office.innerHTML = '<div class="machines"></div><div class="desk"><div class="job"></div></div><div class="people"></div>';
stage.append(office);
const targets = {};
for (const [id, m] of Object.entries(MACHINES)) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'target machine';
  b.dataset.id = id;
  b.innerHTML = `<span class="shape"></span><span class="nm">${jp(m.jp)}</span>`;
  office.querySelector('.machines').append(b);
  targets[id] = b;
}
for (const id of PEOPLE_IDS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'target person';
  b.dataset.id = id;
  b.innerHTML = `<span class="face" style="background-image:url(${portrait(id)})"></span><span class="nm">${PEOPLE[id].en}</span>`;
  office.querySelector('.people').append(b);
  targets[id] = b;
}
const jobEl = office.querySelector('.job');
const sel = id => `.target[data-id="${id}"]`;

const speak = ([who, text, o = {}]) => say(who, text, { side: who === 'eric' ? 'right' : '', ...o });
async function lines(list) {
  for (const l of list || []) await speak(l);
}

function card(job, showEn) {
  const c = document.createElement('div');
  c.className = 'card';
  c.tabIndex = 0;
  c.innerHTML = `<span class="jp">${jp(job[0])}</span><span class="gloss">${showEn ? job[1] : ''}</span>`;
  jobEl.replaceChildren(c);
  return c;
}

// Eric says a command to a machine; a wrong word gets an honest nothing.
async function command(r) {
  const at = r.at || r.doer;
  const options = [r.command, ...Object.keys(COMMANDS).filter(k => k !== r.command).slice(0, 2)].sort();
  for (;;) {
    ask('eric', `Say it to the ${MACHINES[at].en.toLowerCase()}.`, { side: 'right' });
    const o = await choose(options.map(id => ({ html: COMMANDS[id].match(/\{([^|}]+)/)[1], value: id, right: id === r.command })));
    word(o.value);
    if (o.value === r.command) {
      targets[at].classList.add('kotodama');
      stamp(true);
      await say('eric', COMMANDS[o.value], { jp: true, side: 'right', en: COMMANDS[o.value].split('|')[2], showEn: true });
      targets[at].classList.remove('kotodama');
      return true;
    }
    stamp(false);
    await say(null, `The ${MACHINES[at].en.toLowerCase()} doesn't do anything. You said "${COMMANDS[o.value].split('|')[2]}".`);
  }
}

async function job(r) {
  let first = true;
  for (;;) {
    const c = card(r.job, r.showEn);
    const task = ask(r.who, r.line, { jp: true, en: r.en, showEn: r.showEn });
    task.innerHTML = '<p class="hint">Give the job to whoever will do it (drag the card, or tap it, then them).</p>';
    expectLink('.job .card', sel(r.doer), sel(r.doer === 'mori' ? 'kenji' : 'mori'));
    const { to } = await pick({ sources: [c], targets: Object.values(targets), host: stage, mode: 'carry' });
    await fly(c, c, to, stage, 450).then(g => g.remove());
    jobEl.replaceChildren();
    const who = to.dataset.id;
    if (who === r.doer) {
      stamp(true);
      to.classList.add('busy');
      if (r.command) first = (await command(r)) && first;
      to.classList.remove('busy');
      return first;
    }
    first = false;
    stamp(false);
    if (MACHINES[who]) await say(null, `The ${MACHINES[who].en.toLowerCase()} doesn't want anything.`);
    else await lines([NOT_ME[who]]);
    await lines([['mio', r.line.includes('ほしい') ? 'Look at に. That is who they want to do it.' : 'たい is the one talking. They want to do it themselves.']]);
  }
}

async function own(r) {
  ask(r.who, r.line, { jp: true, en: r.en });
  const o = await choose(r.options.map(([html, en]) => ({ html, value: [html, en], right: true })));
  stamp(true);
  await say('eric', o.value[0], { jp: true, en: o.value[1], showEn: true, side: 'right' });
  return true;
}

async function run(script) {
  const rounds = script.filter(r => r.who), results = [];
  pips(rounds.length, results);
  for (const r of script) {
    if (!r.who) {
      await lines(r.intro);
      continue;
    }
    await lines(r.before);
    results.push(await (r.own ? own(r) : job(r)));
    pips(rounds.length, results);
    await lines(r.after);
  }
  end({
    title: 'Everyone got what they wanted',
    sub: `${results.filter(Boolean).length} of ${rounds.length} right the first time. What they said:`,
    rows: rounds.filter(r => !r.own).map(r => ({ jp: r.line, en: r.en })),
    again: () => location.reload(),
  });
}

run(SCRIPT);
