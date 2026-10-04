// The room: B2's back wall with the machines against it, the desks in front with the people, their
// requests, and everything that flies between them when a command is said.

import { THINGS, SHIFTS } from './data.js';
import { MACHINE_ART, ITEMS, cat, clock } from './art.js';
import { portrait } from '../common/cast.js';
import { jp } from '../common/jp.js';
import { initFx, centre, burst, puff, motes, shake, floater, fly, sleep, ms } from './fx.js';
import { sfx } from './audio.js';

const ROLE = { o: '#ff8f6b', ni: '#5fe0cf', nimo: '#ffd36b', to: '#b9a2ff', open: '#93a4b5' };
const HAPPY = { kenji: 'grin', mio: 'smile', mori: 'smile' };
const ODD = { kenji: 'sheepish', mio: 'deadpan', mori: 'flustered' };
const SHOCK = { kenji: 'sheepish', mio: 'surprised', mori: 'flustered' };
const SAD = { kenji: 'sheepish', mio: 'tired', mori: 'neutral' };

let room, els = {};

const el = (tag, cls, html = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

export const item = id => `<span class="ico">${ITEMS[id]()}</span>`;

/** Builds the room once. */
export function initStage(host) {
  room = host;
  room.innerHTML = `
    <div class="wall"><i class="tube a"></i><i class="tube b"></i><div class="plate">B2</div><div class="clockwrap"></div><div class="rack">${'<i></i>'.repeat(6)}</div></div>
    <div class="floor"></div>
    <div class="machines"></div>
    <div class="people"></div>
    <svg class="arrows" aria-hidden="true"></svg>
    <div class="dimmer"></div>`;
  initFx(room);
  new ResizeObserver(floorLine).observe(room);
}

/** The wall ends where the machines stand: at the foot of their drawings. */
function floorLine() {
  const bodies = room.querySelectorAll('.m-body');
  if (!bodies.length) return;
  const top = room.getBoundingClientRect().top;
  const y = Math.max(...[...bodies].map(b => b.getBoundingClientRect().bottom - top));
  room.style.setProperty('--floor-y', `${Math.round(y)}px`);
}

/** Lays out one shift: its machines and people, the clock at its hour. */
export function setShift(ix) {
  const sh = SHIFTS[ix];
  room.querySelector('.clockwrap').innerHTML = clock(Number(sh.time.slice(0, 2)));
  const machines = room.querySelector('.machines');
  const people = room.querySelector('.people');
  machines.innerHTML = '';
  people.innerHTML = '';
  els = {};
  for (const id of sh.machines) {
    const t = THINGS[id];
    const m = el('div', `machine m-${id}`);
    m.dataset.thing = id;
    m.innerHTML = `<button class="m-body" data-thing="${id}" aria-label="${t.en}">${MACHINE_ART[id]()}</button>
      <div class="m-label">${jp(`{${t.jp}|${t.r}|${t.en}}`)}<small class="gl">${t.en}</small></div>
      <div class="m-items">${t.makes.map(i => `<button class="item" data-thing="${i}">${item(i)}<span class="lbl">${jp(THINGS[i].jp)}<small class="gl">${THINGS[i].en}</small></span></button>`).join('')}</div>`;
    machines.append(m);
    els[id] = m.querySelector('.m-body');
    for (const b of m.querySelectorAll('.item')) els[b.dataset.thing] = b;
  }
  for (const id of sh.people) {
    const t = THINGS[id];
    const p = el('button', `person p-${id}${t.kind === 'cat' ? ' is-cat' : ''}`);
    p.dataset.thing = id;
    p.setAttribute('aria-label', t.en);
    const face = t.kind === 'cat' ? `<div class="por cat">${cat()}</div>` : `<div class="por"><img alt="" src="${portrait(id)}"></div>`;
    p.innerHTML = `<div class="ask" hidden></div>${face}<div class="desk"><div class="spares"></div></div><div class="name">${jp(t.jp)}<small class="gl">${t.en}</small></div>`;
    people.append(p);
    els[id] = p;
  }
  floorLine();
  // Show the new machine and people arriving.
  [...machines.children, ...people.children].forEach((e, i) =>
    e.animate([{ opacity: 0, transform: 'translateY(24px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: ms(420), delay: ms(i * 70), easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'backwards' }),
  );
}

export const thingEl = id => els[id];

export function face(id, f) {
  const img = els[id] && els[id].querySelector('.por img');
  if (img) img.src = portrait(id, f || 'neutral');
}

/** Draws every request bubble from the run's tickets. */
export function setTickets(tickets, fresh = []) {
  for (const [id, p] of Object.entries(els)) {
    if (!p.classList.contains('person')) continue;
    const ask = p.querySelector('.ask');
    const t = tickets[id];
    if (!t) {
      ask.hidden = true;
      p.classList.remove('waiting', 'urgent');
      continue;
    }
    if (ask.hidden || fresh.includes(id)) ask.getAnimations().forEach(a => a.cancel());
    ask.hidden = false;
    ask.innerHTML = `${item(t.item)}<span class="pips">${Array.from({ length: t.max }, (_, i) => `<i class="${i < t.patience ? 'on' : ''}"></i>`).join('')}</span>`;
    p.classList.add('waiting');
    p.classList.toggle('urgent', t.patience <= 1);
    if (fresh.includes(id)) ask.animate([{ transform: 'scale(0) translateY(20px)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: ms(380), easing: 'ease-out' });
  }
}

/** Marks each thing in the command being built with its particle's colour; arrows in shift 1. */
export function setRoles(roles, machine, arrows) {
  for (const [id, e] of Object.entries(els)) {
    const r = roles[id];
    e.classList.toggle('role', !!r);
    e.style.setProperty('--role', r ? ROLE[r] : 'transparent');
    e.dataset.role = r || '';
  }
  room.querySelectorAll('.machine').forEach(m => m.classList.toggle('addressed', m.dataset.thing === machine));
  const svg = room.querySelector('.arrows');
  svg.innerHTML = '';
  if (!arrows) return;
  const whats = Object.keys(roles).filter(id => roles[id] === 'o');
  const tos = Object.keys(roles).filter(id => roles[id] === 'ni' || roles[id] === 'nimo');
  for (const w of whats)
    for (const t of tos) {
      if (!els[w] || !els[t]) continue;
      // From the thing to the person's desk, bowing out to the side so it never hides behind a bubble.
      const a = centre(els[w], 0.5);
      const b = els[t].querySelector('.desk') ? centre(els[t].querySelector('.desk'), 0) : centre(els[t]);
      const side = b.x >= a.x ? 1 : -1;
      const c1 = `${a.x + side * 70} ${a.y + 10}`;
      const c2 = `${b.x + side * 70} ${b.y - 10}`;
      svg.insertAdjacentHTML('beforeend', `<path class="arrow" d="M${a.x} ${a.y} C${c1} ${c2} ${b.x} ${b.y}"/><circle class="arrow-end" cx="${b.x}" cy="${b.y}" r="6"/>`);
    }
}

/** Where things come out of a machine. */
const mouth = id => centre(els[id], id === 'vend' ? 0.85 : id === 'pot' ? 0.45 : 0.55);
const deskTop = id => centre(els[id].querySelector('.desk'), 0.1);

function flyer(html, cls = '') {
  const f = el('div', `flyer ${cls}`, html);
  room.append(f);
  return f;
}

/** The kotodama effect on the machine spoken to: lights dip, light rises off it with the words. */
async function kotodama(machine, text) {
  room.classList.add('dim');
  const m = els[machine].closest('.machine');
  m.classList.add('shimmer');
  const r = els[machine].getBoundingClientRect();
  const c = centre(els[machine]);
  motes(c.x, c.y, r.width, r.height, text);
  sfx.fire();
  await sleep(650);
  room.classList.remove('dim');
  setTimeout(() => m.classList.remove('shimmer'), ms(500));
}

/** Acts out a resolved command. Resolves when everything has landed. */
export async function act(cmd, res, text) {
  setRoles({}, null, false);
  await kotodama(cmd.machine, text);
  sfx.dispense(cmd.machine);
  let served = 0;
  const jobs = res.deliveries.map(async (d, i) => {
    await sleep(i * 150);
    const from = mouth(cmd.machine);
    if (d.kind === 'none') {
      els[cmd.machine].animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-3deg)' }, { transform: 'rotate(3deg)' }, { transform: 'rotate(0)' }], { duration: ms(300), iterations: 2 });
      floater(from.x, from.y - 40, '✕', 'bad');
      sfx.wrong();
      return;
    }
    if (d.kind === 'dodge') {
      const p = els[d.what].querySelector('.por');
      sfx.boing();
      await p.animate([{ transform: 'none' }, { transform: 'translateY(-46px) rotate(-12deg)' }, { transform: 'translateX(10px)' }, { transform: 'none' }], { duration: ms(700), easing: 'ease-out' }).finished;
      return;
    }
    if (d.kind === 'launch') return launch(d, cmd, from);
    const f = flyer(item(d.what));
    const to = d.kind === 'tray' ? { x: from.x + 6, y: from.y + 18 } : d.kind === 'into' ? centre(els[d.to]) : deskTop(d.to);
    sfx.whoosh();
    await fly(f, from, to, { height: d.kind === 'tray' ? 10 : 90 + Math.random() * 60, duration: d.kind === 'tray' ? 300 : 640 + i * 30, spin: 360 * (Math.random() < 0.5 ? -1 : 1) });
    sfx.land();
    if (d.kind === 'serve') {
      burst(to.x, to.y, ['#5fe0cf', '#ffd36b', '#ff8f6b', '#ffffff'], 22, 1);
      sfx.serve(served++);
      face(d.to, HAPPY[d.to]);
      const ask = els[d.to].querySelector('.ask');
      ask.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.5)', opacity: 0 }], { duration: ms(260) }).onfinish = () => {
        if (!els[d.to].classList.contains('waiting')) ask.hidden = true;
      };
      els[d.to].classList.remove('waiting', 'urgent');
      f.remove();
      els[d.to].querySelector('.por').animate([{ transform: 'none' }, { transform: 'translateY(-10px) scale(1.04)' }, { transform: 'none' }], { duration: ms(420), easing: 'ease-out' });
    } else if (d.kind === 'spare') {
      puff(to.x, to.y);
      sfx.spare();
      face(d.to, ODD[d.to]);
      f.remove();
      els[d.to].querySelector('.spares').insertAdjacentHTML('beforeend', `<span class="spare">${item(d.what)}</span>`);
    } else {
      puff(to.x, to.y);
      sfx.spare();
      await f.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(500), delay: ms(300), fill: 'forwards' }).finished;
      f.remove();
    }
  });
  await Promise.all(jobs);
}

/** A person put out of a machine: in they go, out they come, they land, they walk back. */
async function launch(d, cmd, from) {
  const p = els[d.what];
  const img = p.querySelector('.por');
  const start = centre(img);
  const f = flyer(img.innerHTML, 'body');
  img.style.visibility = 'hidden';
  sfx.whoosh();
  await fly(f, start, from, { height: 60, duration: 420, spin: 0, scaleTo: 0.3 });
  els[cmd.machine].animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08, .94)' }, { transform: 'scale(1)' }], { duration: ms(260) });
  const to = d.to ? (THINGS[d.to].kind === 'machine' || THINGS[d.to].kind === 'item' ? centre(els[d.to]) : deskTop(d.to)) : { x: from.x + 30, y: from.y + 10 };
  sfx.boing();
  await fly(f, from, to, { height: 140, duration: 700, spin: 540, scaleTo: 0.8 });
  sfx.land();
  shake(room, 0.5);
  puff(to.x, to.y);
  face(d.what, SHOCK[d.what]);
  if (d.to && els[d.to].classList.contains('person')) face(d.to, SHOCK[d.to]);
  await sleep(350);
  await fly(f, to, start, { height: 40, duration: 520, spin: -20, scaleTo: 1 });
  f.remove();
  img.style.visibility = '';
}

/** A request that ran out of patience: the bubble cracks and the person gives up. */
export async function expire(who) {
  const ask = els[who].querySelector('.ask');
  const c = centre(ask);
  puff(c.x, c.y);
  sfx.heart();
  face(who, SAD[who]);
  els[who].classList.remove('waiting', 'urgent');
  await ask.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(16px) rotate(14deg)', opacity: 0 }], { duration: ms(450) }).finished;
  ask.hidden = true;
  shake(room, 0.35);
}

/** Every request bubble pulses for みんな、まって. */
export function waited() {
  for (const p of room.querySelectorAll('.person .ask:not([hidden])')) p.animate([{ transform: 'none' }, { transform: 'scale(1.3)' }, { transform: 'none' }], { duration: ms(500) });
}

export { shake, floater, burst, centre };
export const roomEl = () => room;
