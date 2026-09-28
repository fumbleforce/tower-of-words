// Social-sim layer, data-driven so it can grow into the open world: the day clock and its periods, NPC
// schedules, ambient NPC-to-NPC talk, bonds with threshold scenes, a small inventory with gifts, and
// save/load. Day one uses it lightly. Data comes from the story files (see story/FORMAT.md, "Sim data").
import { flags, cond } from './runner.js';
import { known, seen, WORDS, COMMANDS } from './lang.js';
import { ui, sfx } from './ui.js';

export const PERIODS = ['commute', 'morning', 'lunch', 'afternoon', 'evening'];
export const PERIOD_NAMES = { commute: 'Morning commute', morning: 'Morning at work', lunch: 'Lunch', afternoon: 'Afternoon', evening: 'After work' };
export const ITEMS = {
  coffee: { name: 'Canned coffee', price: 120 },
  tea: { name: 'Royal milk tea', price: 130 },
  melon: { name: 'Melon soda', price: 130 },
  cornsoup: { name: 'Hot corn soup', price: 130 },
};

export const sim = {
  day: 1, date: 'Thu 1 Oct', period: 'commute', bonds: {}, inv: [], taught: {}, met: new Set(), yen: 1000,
  people: {},       // id -> { name, about, color } merged from the story files
  thresholds: {},   // id -> [{ at, node }]
  firedBonds: new Set(),
};

// ---------- clock ----------
export function setPeriod(p, game) {
  if (!PERIODS.includes(p)) return;
  sim.period = p; flags.period = p;
  ui.clock(sim.date, PERIOD_NAMES[p]);
  applySchedule(game);
  save(game);
}

// ---------- schedules: story `schedule: { who: { period: { at, sit, face, hide } } }` ----------
export function applySchedule(game, { instant = false } = {}) {
  const sch = game.story && game.story.schedule; if (!sch) return;
  for (const [who, per] of Object.entries(sch)) {
    const e = per[sim.period] || per['*']; if (!e) continue;
    if (e.if && !cond(e.if)) continue;
    const r = game.place.people[who]; if (!r) continue;
    if (e.hide) { game.hooks.hide({ id: who }); continue; }
    if (!r.root.visible && (instant || !e.keepHidden)) { if (instant) game.hooks.show({ id: who }); else continue; }
    if (e.sit) { if (instant) game.place.placeSeated?.(who, e.sit); else game.hooks.sit({ who, at: e.sit }); continue; }
    if (e.at) {
      const p = game.posOf(e.at); if (!p) continue;
      if (instant) { r.root.position.x = p[0]; r.root.position.z = p[1]; } else game.hooks.walk({ who, to: e.at, wait: false });
      if (e.face) setTimeout(() => game.hooks.face({ who, to: e.face }), instant ? 0 : 2500);
    }
  }
}

// ---------- ambient talk: story `ambient: [{ id, who: [a, b], near, if, period, lines, once }]` ----------
const ambientDone = new Set();
let ambientBusy = false;
export function stepAmbient(game) {
  const list = game.story && game.story.ambient; if (!list || ambientBusy || game.busy) return;
  const mp = game.player.root.position;
  for (const a of list) {
    if (a.once !== false && ambientDone.has(a.id)) continue;
    if (a.period && a.period !== sim.period) continue;
    if (a.if && !cond(a.if)) continue;
    const anchor = game.posOf(a.near || a.who[0]); if (!anchor) continue;
    if (Math.hypot(mp.x - anchor[0], mp.z - anchor[1]) > (a.radius || 2.4)) continue;
    ambientDone.add(a.id); ambientBusy = true;
    for (const w of a.who || []) for (const o of a.who) if (o !== w && game.place.people[w]) game.hooks.look({ who: w, at: o });
    game.runner.ambient(a.lines, a.gap || 2200).then(() => { ambientBusy = false; if (a.set) flags[a.set] = true; });
    break;
  }
}

// ---------- bonds ----------
export function bond(game, who, add = 1) {
  const before = sim.bonds[who] || 0;
  const now = Math.max(0, before + add);
  sim.bonds[who] = now; flags['bond_' + who] = now;
  if (add > 0) sfx('word');
  for (const t of sim.thresholds[who] || []) {
    const key = who + '@' + t.at;
    if (before < t.at && now >= t.at && !sim.firedBonds.has(key)) { sim.firedBonds.add(key); if (t.node) game.queue.push(() => game.runner.run(t.node)); }
  }
  save(game);
}
export function meet(game, who) {
  if (sim.met.has(who) || !sim.people[who]) return;
  sim.met.add(who); flags['met_' + who] = true;
}
export function noteTeacher(who, cmd) { if (who && !sim.taught[cmd]) sim.taught[cmd] = who; }

// merge a story file's sim data
export function absorb(story) {
  for (const [id, p] of Object.entries(story.people || {})) sim.people[id] = { ...(sim.people[id] || {}), ...p };
  for (const [id, list] of Object.entries(story.bonds || {})) sim.thresholds[id] = list;
}

// ---------- inventory and gifts ----------
export function buy(game, item) {
  const it = ITEMS[item]; if (!it) return false;
  if (sim.yen < it.price) return false;
  sim.yen -= it.price; sim.inv.push(item); sfx('tap'); ui.refreshBag(sim);
  ui.toast(`Got: ${it.name}`, 1800);
  save(game); return true;
}
export function take(item) { const i = sim.inv.indexOf(item); if (i >= 0) sim.inv.splice(i, 1); ui.refreshBag(sim); }

// ---------- the people panel ----------
export function peopleHTML() {
  const ids = [...sim.met];
  if (!ids.length) return '<p class="none">Nobody yet.</p>';
  return ids.map((id) => {
    const p = sim.people[id] || {}; const b = sim.bonds[id] || 0;
    const cmds = COMMANDS.filter((c) => sim.taught[c] === id && known.has(c)).map((c) => `<span class="jp">${WORDS[c].ja}</span> <span class="gl">${WORDS[c].en}</span>`).join(' ');
    const init = (p.name || id)[0];
    return `<li><span class="pic" style="--c:${p.color || '#8a93a3'}">${init}</span><span class="nm">${p.name || id}</span><span class="ab">${p.about || ''}</span><span class="bd" title="bond">${'<i></i>'.repeat(Math.min(5, b))}${'<b></b>'.repeat(Math.max(0, 5 - b))}</span>${cmds ? `<span class="cm">Taught you: ${cmds}</span>` : ''}</li>`;
  }).join('');
}

// ---------- save and load ----------
const KEY = 'amakawa-day1-save';
export function save(game) {
  try {
    const data = { v: 1, day: sim.day, period: sim.period, bonds: sim.bonds, inv: sim.inv, taught: sim.taught, met: [...sim.met], yen: sim.yen, flags: { ...flags }, known: [...known], seen: [...seen], found: [...game.found], place: game.place && game.place.name };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch { /* storage may be off */ }
}
export function loadSave() {
  try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); return d && d.v === 1 ? d : null; } catch { return null; }
}
export function restore(game, d) {
  Object.assign(sim, { day: d.day, period: d.period, bonds: d.bonds || {}, inv: d.inv || [], taught: d.taught || {}, yen: d.yen ?? 1000 });
  sim.met = new Set(d.met || []);
  Object.assign(flags, d.flags || {});
  for (const k of d.known || []) known.add(k);
  for (const k of d.seen || []) seen.add(k);
  for (const f of d.found || []) game.found.add(f);
}
export function clearSave() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
