// The run: requests, patience, resolving a command, scoring and shifts. No DOM here, so it can be
// played and tested in Node. Random numbers come from a seed (the daily run uses the date).

import { THINGS, SHIFTS, HEARTS } from './data.js';

/** mulberry32: small, fast, seedable. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const daySeed = (d = new Date()) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

export function newRun(seed) {
  return {
    seed, rand: rng(seed), shift: -1, turn: 0, hearts: HEARTS, score: 0, streak: 0,
    tickets: {}, rested: new Set(), powers: new Set(), charges: {}, last: null, moReady: false,
    best: null, served: 0, mistakes: 0, said: [], over: false,
  };
}

export const shiftOf = s => SHIFTS[s.shift];
export const people = s => shiftOf(s).people;
const available = s => shiftOf(s).machines.flatMap(m => THINGS[m].makes);
const pick = (s, xs) => xs[Math.floor(s.rand() * xs.length)];

/** Starts the next shift. Returns the requests that arrive. */
export function startShift(s) {
  s.shift++;
  s.turn = 0;
  s.tickets = {};
  s.last = null;
  s.rested.clear();
  s.moReady = false;
  s.charges = { minna: s.powers.has('minna') ? 1 : 0, matte: s.powers.has('matte') ? 1 : 0 };
  return spawn(s);
}

function addTicket(s, who, item) {
  const p = shiftOf(s).patience;
  s.tickets[who] = { item, patience: p, max: p };
  return { who, item };
}

/** New requests at the start of a command: the shift's script first, then chance. */
function spawn(s) {
  const sh = shiftOf(s);
  const out = [];
  const scripted = sh.script[s.turn];
  if (scripted) return scripted.filter(([w]) => !s.tickets[w]).map(([w, i]) => addTicket(s, w, i));
  const avail = available(s);
  const free = sh.people.filter(w => !s.tickets[w] && !s.rested.has(w));
  for (const w of free) {
    if (s.rand() > sh.rate) continue;
    const likes = THINGS[w].likes.filter(i => avail.includes(i));
    const open = Object.values(s.tickets).map(t => t.item).filter(i => likes.includes(i));
    const item = open.length && s.rand() < sh.dup ? pick(s, open) : pick(s, likes);
    out.push(addTicket(s, w, item));
  }
  if (!Object.keys(s.tickets).length && free.length) {
    const w = pick(s, free);
    out.push(addTicket(s, w, pick(s, THINGS[w].likes.filter(i => avail.includes(i)))));
  }
  return out;
}

/** Everyone a command's words point at, with みんな spread out to the people in the room. */
const expand = (s, ids) => ids.flatMap(id => (id === 'minna' ? people(s) : [id]));

/**
 * Plays a parsed command. polite: the command ended in ください. Returns what happened, for the
 * stage to act out: deliveries [{ what, to, kind }] where kind is serve, spare, launch, tray, into,
 * none or dodge; the points and multipliers; whether the turn passed; and the turn's aftermath.
 */
export function resolve(s, cmd, polite = false) {
  const deliveries = [];
  const wanted = Object.fromEntries(Object.entries(s.tickets).map(([w, t]) => [w, t.item]));
  const targets = expand(s, cmd.to);
  const whats = expand(s, cmd.what);
  for (const w of whats) {
    const t = THINGS[w];
    if (t.kind === 'cat') deliveries.push({ what: w, to: null, kind: 'dodge' });
    else if (t.kind === 'person') deliveries.push({ what: w, to: targets.find(x => x !== w) || null, kind: 'launch' });
    else if (t.kind === 'machine' || t.from !== cmd.machine) deliveries.push({ what: w, to: null, kind: 'none' });
    else if (!targets.length) deliveries.push({ what: w, to: null, kind: 'tray' });
    else {
      for (const to of targets) {
        const tk = THINGS[to].kind;
        if (tk === 'machine' || tk === 'item') deliveries.push({ what: w, to, kind: 'into' });
        else if (s.tickets[to] && s.tickets[to].item === w && !deliveries.some(d => d.to === to && d.kind === 'serve'))
          deliveries.push({ what: w, to, kind: 'serve' });
        else deliveries.push({ what: w, to, kind: 'spare' });
      }
    }
  }
  const served = deliveries.filter(d => d.kind === 'serve');
  for (const d of served) {
    delete s.tickets[d.to];
    s.rested.add(d.to);
  }
  const clean = served.length > 0 && deliveries.every(d => d.kind === 'serve');
  const base = cmd.mo && s.last ? s.last.n : 0;
  const n = base + served.length;
  const streakMult = 1 + Math.min(s.streak, 3);
  const politeMult = polite ? 2 : 1;
  const combo = n * n - base * base;
  const points = 10 * combo * streakMult * politeMult;
  s.score += points;
  s.served += served.length;
  if (clean) {
    if (!cmd.mo) s.streak++;
  } else {
    s.streak = 0;
    s.mistakes++;
  }
  if (cmd.what.includes('minna') || cmd.to.includes('minna')) s.charges.minna = 0;
  if (!s.best || n > s.best.n || (n === s.best.n && points > s.best.points)) s.best = { n, points, i: s.said.length };
  const free = cmd.mo;
  s.last = { machine: cmd.machine, what: cmd.what, n };
  s.moReady = !cmd.mo && s.powers.has('mo');
  const res = { deliveries, served: served.length, n, combo: n, streakMult, politeMult, points, clean, free, wanted };
  s.said.push({ cmd: { ...cmd }, polite, points, clean });
  if (!free) res.after = endTurn(s);
  return res;
}

/** みんな、まって: everyone's patience goes up by two. Free, once a shift. */
export function wait(s) {
  s.charges.matte = 0;
  for (const t of Object.values(s.tickets)) {
    t.patience += 2;
    t.max = Math.max(t.max, t.patience);
  }
}

/** After a command: patience drops, requests run out, the next ones arrive, or the shift ends. */
export function endTurn(s) {
  const expired = [];
  for (const [w, t] of Object.entries(s.tickets)) {
    t.patience--;
    if (t.patience <= 0) {
      expired.push({ who: w, item: t.item });
      delete s.tickets[w];
      s.hearts--;
      s.streak = 0;
    }
  }
  s.turn++;
  s.moReady = s.moReady && s.powers.has('mo');
  const shiftOver = s.turn >= shiftOf(s).turns || s.hearts <= 0;
  if (s.hearts <= 0 || (shiftOver && s.shift === SHIFTS.length - 1)) s.over = true;
  const arrived = shiftOver ? [] : spawn(s);
  s.rested.clear();
  return { expired, arrived, shiftOver };
}

/** The best command right now, for the test hook: the item the most people wait for. */
export function plan(s) {
  const by = {};
  for (const [w, t] of Object.entries(s.tickets)) (by[t.item] ||= []).push(w);
  let best = null;
  for (const [item, who] of Object.entries(by)) {
    const urgency = Math.min(...who.map(w => s.tickets[w].patience));
    if (!best || who.length > best.who.length || (who.length === best.who.length && urgency < best.urgency)) best = { item, who, urgency };
  }
  return best && { machine: THINGS[best.item].from, item: best.item, who: best.who };
}
