import { flagKeys } from './narrative/engine-flags.js';
const ENGINE_KEYS = flagKeys('game3d/js/sim.js');
import { ITEMS } from './gameplay/items.js';
export { ITEMS } from './gameplay/items.js';
// Social-sim layer, data-driven so it can grow into the open world: the day clock and its periods, NPC
// schedules, ambient NPC-to-NPC moments, bonds (steps 0-5, points with caps, steps 3-5 gated on a scene),
// what people remember of Eric, gifts, and save/load. Day one uses it lightly. Data comes from the story files
// (story/FORMAT.md, "Sim data"), js/bonds/cast.js (tastes, registers, relations) and js/bonds/day1.js (day 1's
// moments, recorded by node name so the story's lines stay as they are). The maths is js/bonds/model.js.
import { flags, cond } from './runner.js';
import { known, seen, WORDS, COMMANDS } from './lang.js';
import { ui, sfx } from './ui.js';
import { Bonds, STEPS, dateOf, safeKey } from './bonds/model.js';
import { CAST, WORD_REGISTER } from './bonds/cast.js';
import { MOMENTS, REASONS, EXPECT } from './bonds/day1.js';

export const PERIODS = ['early', 'morning', 'lunch', 'afternoon', 'evening'];
export const PERIOD_NAMES = { early: 'Early morning', morning: 'Morning at work', lunch: 'Lunch', afternoon: 'Afternoon', evening: 'After work' };

export { STEPS };

export const sim = {
  day: 1, date: 'Thu 1 Oct', period: 'early', bonds: {}, inv: [], taught: {}, met: new Set(), yen: 1000,
  people: {},       // id -> { name, about, color } merged from the story files
  thresholds: {},   // id -> [{ at: step, node, if }] from the story's `bondStep` / `bonds`
  firedBonds: new Set(),
  momentsDone: new Set(),
  steps: {},        // id -> last step seen, to notice changes
};
// the bond model; flags are the story's, so a scene sets a gate with a plain { set: 'bond3_mio' } too
export const bonds = new Bonds({ cast: CAST, flag: (k) => !!flags[k] });
const storyMoments = {}, storyReasons = {};
let G = null;   // the game, once installed

// ---------- install: hooks and the watchers (idempotent; applySchedule calls it too, until main.js does) ----------
const stack = [];
export function installSim(game) {
  if (G === game) return; G = game;
  const H = game.hooks;
  H.bond = (s) => { bond(game, s.who, s.add, s); };
  H.bondStep = ({ who, to }) => bondStep(game, who, to);
  H.remember = ({ who, id, text }) => remember(game, who, id, text);
  H.fact = ({ who, id, text, like }) => learnFact(game, who, id, text, like);
  H.relate = ({ a, b, kind }) => relate(a, b, kind);
  const r = game.runner;
  if (r && !r.__sim) {
    r.__sim = true;
    // which node is running (for the moments and the source of a `bond` step)
    const run = r.run.bind(r);
    r.run = async (node) => {
      stack.push(node);
      try { moment(game, node); return await run(node); } finally { const i = stack.lastIndexOf(node); if (i >= 0) stack.splice(i, 1); }
    };
    // the register of the last word said to someone, for lines that react to it
    const trig = r.trigger.bind(r);
    r.trigger = (key, o) => { observe(key); return trig(key, o); };
  }
  if (H.end && !H.end.__sim) { const end = H.end; H.end = (a) => { dayCheck(); return end(a); }; H.end.__sim = true; }
  syncAll();
}
const place = () => flags.place || (G && G.place && G.place.name) || '';
const curNode = () => stack[stack.length - 1] || (G && G.runner && G.runner.trace && G.runner.trace[G.runner.trace.length - 1]) || '';

// ---------- clock ----------
export function setPeriod(p, game) {
  if (!PERIODS.includes(p)) return;
  sim.period = p; flags[ENGINE_KEYS.period] = p;
  ui.clock(sim.date, PERIOD_NAMES[p]);
  applySchedule(game);
  save(game);
}
// a new day (later days): the date moves on, daily caps reset, the day starts early
export function newDay(game) {
  sim.day++; sim.date = dateOf(sim.day); flags[ENGINE_KEYS.day] = sim.day;
  bonds.setDay(sim.day);
  setPeriod('early', game);
}

// ---------- schedules: story `schedule: { who: { period: { at, sit, face, hide } } }` ----------
export function applySchedule(game, { instant = false } = {}) {
  installSim(game);
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

// ---------- ambient NPC-to-NPC moments ----------
// story `ambient: [{ id, who: [a, b], near, radius, pair, rel, if, period, once, lines, set }]`: plays as captions
// when Eric comes within `radius` of `near` (or the first person), both people are here and visible, within
// `pair` of each other (if given), the relation `rel` holds ('kenji likes mori'), `if` holds and the period
// matches. once: true (default, once ever), 'day', 'period' or false.
const ambientDone = new Set();
let ambientBusy = false;
export function stepAmbient(game) {
  installSim(game);
  checkSteps(game);
  const list = game.story && game.story.ambient; if (!list || ambientBusy || game.busy) return;
  const mp = game.player.root.position;
  for (const a of list) {
    const k = ambientKey(a);
    if (a.once !== false && ambientDone.has(k)) continue;
    if (a.period && ![].concat(a.period).includes(sim.period)) continue;
    if (a.if && !cond(a.if)) continue;
    if (a.rel && ![].concat(a.rel).every((x) => bonds.relHolds(x))) continue;
    const rigs = (a.who || []).map((w) => game.place.people[w]);
    if (rigs.some((r) => !r || !r.root || r.root.visible === false)) continue;
    if (a.pair && rigs.length > 1) { const [p, q] = [rigs[0].root.position, rigs[1].root.position]; if (Math.hypot(p.x - q.x, p.z - q.z) > a.pair) continue; }
    const anchor = game.posOf(a.near || a.who[0]); if (!anchor) continue;
    if (Math.hypot(mp.x - anchor[0], mp.z - anchor[1]) > (a.radius || 2.4)) continue;
    ambientDone.add(k); ambientBusy = true;
    for (const w of a.who || []) for (const o of a.who) if (o !== w && game.place.people[w]) game.hooks.look({ who: w, at: o });
    game.runner.ambient(a.lines, a.gap || 2200).then(() => { ambientBusy = false; if (a.set) flags[a.set] = true; });
    break;
  }
}
function ambientKey(a) { return a.once === 'day' ? `${a.id}@${sim.day}` : a.once === 'period' ? `${a.id}@${sim.day}.${sim.period}` : a.id; }

// ---------- bonds ----------
// bond(game, who, add, { source, why, key, item }): add points from a source (bonds/model.js SOURCES). With no
// `add`, the source's own amount (a gift: by how much they like it). With no source, day1.js REASONS or the
// story's `reasons` name it from the running node; otherwise it's a one-off scene, once per node.
export function bond(game, who, add, opts = {}) {
  let { source, why, key, item } = opts;
  const node = curNode();
  if (!source) {
    const R = { ...(REASONS[place()] || {}), ...(storyReasons[place()] || {}) };
    const r = R[`${node}:${who}`] || R[node];
    if (r) { source = r.source; why = why || r.why; }
  }
  if (!source) source = 'scene';
  if (source === 'scene' && !key) key = `${place()}/${node || 'x'}`;
  if (source === 'gift' && !item && G) item = lastGift[who];
  const res = bonds.award(who, { add, source, key, why: why || node, item });
  if (res.added > 0) sfx('word');
  sync(who); checkSteps(game);
  save(game);
  return res;
}
export function meet(game, who) {
  if (!sim.people[who]) return;
  if (!sim.met.has(who)) { sim.met.add(who); flags[ENGINE_KEYS.met + who] = true; }
  if (bonds.meet(who)) { sync(who); checkSteps(game); }
}
// the scene a step waits on has played: { do: 'bondStep', who, to: 3 } (same as setting its gate flag)
export function bondStep(game, who, to) {
  if (!who || !(to >= 3 && to <= 5)) { console.warn('bondStep needs who and to: 3, 4 or 5'); return; }
  flags[bonds.gate(who, to)] = true;
  sync(who); checkSteps(game); save(game);
}
export function noteTeacher(who, cmd) { if (who && !sim.taught[cmd]) sim.taught[cmd] = who; }

// flags the story can test: bond_<id> (points), step_<id>, bondready_<id> (the step waiting on its scene)
function sync(who) {
  const q = bonds.p[who]; if (!q) return;
  sim.bonds[who] = q.pts;
  flags[ENGINE_KEYS.bond + who] = q.pts; flags[ENGINE_KEYS.step + who] = bonds.step(who); flags[ENGINE_KEYS.bondready + who] = bonds.ready(who);
}
function syncAll() {
  for (const id of Object.keys(bonds.p)) sync(id);
  for (const [a, r] of Object.entries(bonds.rel)) for (const [b, kind] of Object.entries(r)) flags[`${ENGINE_KEYS.rel}${a}_${b}`] = kind;
}
// step changes: tell the shell (a bond-step moment), and run the story's scene for a step when it's due
function checkSteps(game) {
  for (const id of Object.keys(bonds.p)) {
    const st = bonds.step(id), was = sim.steps[id] ?? 0;
    if (st !== was) {
      sim.steps[id] = st; flags[ENGINE_KEYS.step + id] = st;
      const detail = { who: id, from: was, to: st, name: STEPS[st].name };
      try { window.dispatchEvent(new CustomEvent('amakawa:bondstep', { detail })); } catch { /* node */ }
      game && game.onBondStep && game.onBondStep(detail);
    }
    const ready = bonds.ready(id);
    for (const t of sim.thresholds[id] || []) {
      const key = id + '@' + t.at;
      if (sim.firedBonds.has(key)) continue;
      const due = STEPS[t.at] && STEPS[t.at].scene ? ready === t.at || st >= t.at : st >= t.at;
      if (!due || (t.if && !cond(t.if))) continue;
      if (!game || !game.story || !game.story.nodes || !game.story.nodes[t.node]) continue;   // runs where its node lives
      sim.firedBonds.add(key);
      const go = () => game.runner.run(t.node);
      if (game.busy) game.queue.push(go); else game.beat(go);
    }
  }
}

// ---------- rememberedBy, facts, relations ----------
// flags rem_<who>_<id>, e.g. { if: 'rem_mio_caught_bag', then: [...] }
export function remember(game, who, id, text) { if (bonds.remember(who, id, text)) flags[`${ENGINE_KEYS.rem}${who}_${safeKey(id)}`] = true; }
export function rememberedBy(who, id) { return bonds.remembers(who, id); }
// what Eric has learned about them (People panel); `like` also marks that taste as noticed
export function learnFact(game, who, id, text, like) {
  if (text && bonds.learnFact(who, id, text)) flags[`${ENGINE_KEYS.fact}${who}_${safeKey(id)}`] = true;
  if (like) bonds.notice(who, like);
}
export function relate(a, b, kind) { bonds.relate(a, b, kind); flags[`${ENGINE_KEYS.rel}${a}_${b}`] = kind && kind !== 'none' ? kind : ''; }
export function giftReaction(who, item) { return bonds.giftReaction(who, item); }

// a node's day-1 (or story) moment, once
function moment(game, node) {
  const pl = place(), key = `${pl}/${node}`;
  const m = (storyMoments[pl] && storyMoments[pl][node]) || (MOMENTS[pl] && MOMENTS[pl][node]);
  if (!m || sim.momentsDone.has(key)) return;
  if (m.if && !cond(m.if)) return;
  sim.momentsDone.add(key);
  for (const [who, id, text, c] of m.remember || []) if (cond(c)) remember(game, who, id, text);
  for (const [who, id, text, c] of m.fact || []) if (cond(c)) learnFact(game, who, id, text);
  for (const [who, item] of m.notice || []) bonds.notice(who, item);
  for (const [who, source, add, why] of m.bond || []) bond(game, who, add, { source, why, key: `${key}:${who}` });
}
// say:<word>:<person> -> register_<person> = 'right' | 'wrong', set before their answer runs
function observe(key) {
  const m = /^say:(\w+):(\w+)$/.exec(key); if (!m) return;
  const want = bonds.cast[m[2]] && bonds.cast[m[2]].register, have = WORD_REGISTER[m[1]];
  if (want && have) flags[ENGINE_KEYS.register + m[2]] = want === have ? 'right' : 'wrong';
}

// merge a story file's sim data
export function absorb(story) {
  for (const [id, p] of Object.entries(story.people || {})) sim.people[id] = { ...(sim.people[id] || {}), ...p };
  // bondStep: { mio: { 3: 'node' } } (or the older bonds: { mio: [{ at: 3, node }] })
  for (const [id, list] of Object.entries(story.bonds || {})) sim.thresholds[id] = [...(sim.thresholds[id] || []).filter((t) => !list.some((u) => u.at === t.at)), ...list];
  for (const [id, per] of Object.entries(story.bondStep || {})) for (const [at, v] of Object.entries(per)) {
    const t = typeof v === 'string' ? { at: +at, node: v } : { at: +at, ...v };
    sim.thresholds[id] = [...(sim.thresholds[id] || []).filter((u) => u.at !== t.at), t];
  }
  const cast = {};
  const put = (id, k, v) => { (cast[id] ||= {})[k] = v; };
  for (const k of ['likes', 'dislikes', 'needs', 'gates', 'register']) for (const [id, v] of Object.entries(story[k] || {})) put(id, k, v);
  for (const [a, r] of Object.entries(story.relations || {})) put(a, 'rel', r);
  bonds.merge(cast);
  for (const [a, r] of Object.entries(story.relations || {})) for (const [b, kind] of Object.entries(r)) flags[`${ENGINE_KEYS.rel}${a}_${b}`] = kind;
  const pl = place();
  if (story.moments) storyMoments[pl] = story.moments;
  if (story.reasons) storyReasons[pl] = story.reasons;
}

// ---------- inventory and gifts ----------
export function buy(game, item) {
  const it = ITEMS[item]; if (!it) return false;
  if (sim.yen < it.price) return false;
  sim.yen -= it.price; sim.inv.push(item); sfx('tap'); ui.refreshBag(sim);
  ui.toast(`Got: ${it.name}`, 1800);
  save(game); return true;
}
// main.js calls take() just before a give:<item>:<who> trigger runs: the reaction is known to the scene as
// flags gift_<who> and gift_reaction ('need' | 'like' | 'neutral' | 'dislike'), and a like or dislike is noticed
const lastGift = {};
export function take(item) {
  const i = sim.inv.indexOf(item); if (i >= 0) sim.inv.splice(i, 1); ui.refreshBag(sim);
  const who = G && G.sayTarget && G.sayTarget.id;
  if (who && G.place && G.place.people[who]) {
    const r = bonds.giftReaction(who, item);
    flags[ENGINE_KEYS.gift + who] = r; flags[ENGINE_KEYS.gift_reaction] = r; lastGift[who] = item;
    if (r === 'like' || r === 'dislike') bonds.notice(who, item);
  }
}

// ---------- the People panel ----------
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const itemName = (x) => (ITEMS[x] ? ITEMS[x].name : x);
// per person met: bond step, what you know about them, what they remember of you, the commands they taught
export function peopleData() {
  return [...sim.met].filter((id) => id !== 'eric').map((id) => {
    const p = sim.people[id] || {};
    const v = bonds.view(id, { itemName });
    const taught = COMMANDS.filter((c) => sim.taught[c] === id && known.has(c)).map((c) => ({ id: c, ja: WORDS[c].ja, ro: WORDS[c].ro, en: WORDS[c].en }));
    return { id, name: p.name || id, about: p.about || '', color: p.color || '#8a93a3', ...v, taught };
  });
}
export function peopleHTML() {
  const list = peopleData();
  if (!list.length) return '<p class="none">Nobody yet.</p>';
  return list.map((d) => {
    const pips = [1, 2, 3, 4, 5].map((n) => (n <= d.step ? '<i></i>' : '<b></b>')).join('');
    const cmds = d.taught.map((c) => `<span class="jp">${c.ja}</span> <span class="gl">${c.en}</span>`).join(' ');
    const known = d.known.slice(-4).map(esc).join('<br>');
    const rem = d.remembers.slice(0, 2).map(esc).join('<br>');
    return `<li data-id="${d.id}" data-step="${d.step}"><span class="pic" style="--c:${d.color}">${esc(d.name[0])}</span>`
      + `<span class="nm">${esc(d.name)} <small class="st">${d.stepName}</small></span>`
      + `<span class="bd" title="${d.stepName}" aria-label="Bond: ${d.stepName}">${pips}</span>`
      + `<span class="ab">${esc(d.about)}</span>`
      + (known ? `<span class="ab kn">${known}</span>` : '')
      + (rem ? `<span class="ab rm">They remember: ${rem}</span>` : '')
      + (cmds ? `<span class="cm">Taught you: ${cmds}</span>` : '') + '</li>';
  }).join('');
}

// ---------- QA ----------
// every bond at a glance (fast test, console): { id: { step, pts, met, ready, remembers, facts, log } }
export function bondSnapshot() {
  const out = {};
  for (const [id, q] of Object.entries(bonds.p)) out[id] = { step: bonds.step(id), pts: q.pts, met: q.met, ready: bonds.ready(id), remembers: q.seen.slice(), facts: q.facts.map((f) => f.key), log: q.log.map((l) => `${l.source}+${l.add}${l.note ? ` (${l.note})` : ''} ${l.why}`) };
  return out;
}
// ?test=fast: at the end of day 1, the bonds must match day1.js EXPECT for the route (the fast test fails otherwise)
function dayCheck() {
  const T = typeof window !== 'undefined' && window.__test; if (!T || sim.day !== 1) return;
  const snap = bondSnapshot(); T.bonds = snap;
  // the way the gate actually went (the driver can end up on either, whatever ?route asked for)
  const way = (flags.gate_magic ? 'magic' : 'social') + (flags.lunch_mori ? '+mori' : ''); T.bondRoute = way;
  const exp = EXPECT[way]; if (!exp) return;
  for (const [id, e] of Object.entries(exp)) {
    const s = snap[id] || { step: 0, pts: 0, remembers: [] };
    if (e.step !== undefined && s.step !== e.step) T.errors.push(`bonds (${way}): ${id} is at step ${s.step}, expected ${e.step}`);
    if (e.pts !== undefined && s.pts !== e.pts) T.errors.push(`bonds (${way}): ${id} has ${s.pts} points, expected ${e.pts} [${s.log ? s.log.join('; ') : ''}]`);
    for (const k of e.remembers || []) if (!s.remembers.includes(k)) T.errors.push(`bonds (${way}): ${id} doesn't remember ${k}`);
  }
}

// ---------- save and load ----------
const KEY = 'amakawa-day1-save';
export function save(game) {
  try {
    const data = { v: 1, day: sim.day, period: sim.period, bonds: sim.bonds, inv: sim.inv, taught: sim.taught, met: [...sim.met], yen: sim.yen, flags: { ...flags }, known: [...known], seen: [...seen], found: [...game.found], place: game.place && game.place.name,
      rel: { bonds: bonds.toJSON(), moments: [...sim.momentsDone], fired: [...sim.firedBonds], ambient: [...ambientDone] } };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch { /* storage may be off */ }
}
export function loadSave() {
  try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); return d && d.v === 1 ? d : null; } catch { return null; }
}
export function restore(game, d) {
  Object.assign(sim, { day: d.day, period: d.period === 'commute' ? 'early' : d.period, bonds: d.bonds || {}, inv: d.inv || [], taught: d.taught || {}, yen: d.yen ?? 1000 });
  sim.date = dateOf(sim.day || 1);
  sim.met = new Set(d.met || []);
  Object.assign(flags, d.flags || {});
  for (const k of d.known || []) known.add(k);
  for (const k of d.seen || []) seen.add(k);
  for (const f of d.found || []) game.found.add(f);
  const r = d.rel || {};
  if (!bonds.load(r.bonds)) {
    // a save from before the bond model: points and who was met are all it had
    bonds.p = {}; bonds.setDay(sim.day || 1);
    for (const [id, pts] of Object.entries(d.bonds || {})) bonds.person(id).pts = pts;
  }
  for (const id of sim.met) bonds.meet(id);
  sim.momentsDone = new Set(r.moments || []);
  sim.firedBonds = new Set(r.fired || []);
  ambientDone.clear(); for (const k of r.ambient || []) ambientDone.add(k);
  sim.steps = {}; for (const id of Object.keys(bonds.p)) sim.steps[id] = bonds.step(id);
  syncAll();
}
export function clearSave() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
