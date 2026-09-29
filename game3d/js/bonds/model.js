// Bond model: the maths behind relationships, with no DOM and no engine, so node can test it
// (game3d/js/bonds/test.mjs). sim.js is the glue to the game. Rules from notes/RELATIONSHIPS.md:
//   steps 0 Stranger, 1 Known (met), 2 Friendly (6 points), 3 Trusted (14 + their turn scene),
//   4 Close (24 + their payoff scene), 5 Partner or friend (step 4 + the last scene).
//   At most 3 points per person per day. A liked gift counts once per person per week.
//   Points stop at the threshold of the first step whose scene hasn't played, so nobody can be ground past it.
//   Neglect never lowers a bond.

export const STEPS = [
  { n: 0, name: 'Stranger' },
  { n: 1, name: 'Known' },
  { n: 2, name: 'Friendly', pts: 6 },
  { n: 3, name: 'Trusted', pts: 14, scene: true },
  { n: 4, name: 'Close', pts: 24, scene: true },
  { n: 5, name: 'Partner or friend', pts: 24, scene: true },
];
export const DAY_CAP = 3;

// where points come from. pts: the default when the story doesn't give `add`.
// once: 'ever' (per person), 'day' (per person per day), 'key' (per key, e.g. a scene or a need).
export const SOURCES = {
  greet: { pts: 1, once: 'ever' },          // the first greeting; after that it's manners
  talk: { pts: 1, once: 'day' },            // talking at an open time, when they have something new
  gift: { pts: 'reaction', perWeek: 1 },    // a gift they like: one per person per week counts
  need: { pts: 3, once: 'key' },            // a gift or deed that answers a need they said out loud
  ticket: { pts: 2 },                       // a repair request for them, or on their machine
  help: { pts: 1, once: 'day' },            // a hand with something that isn't a ticket
  their_way: { pts: 1, once: 'day' },       // doing it the way they would
  register: { pts: 1, once: 'day' },        // their word, in the register they use
  scene: { pts: 1, once: 'key' },           // an authored moment; counts once
};
export const GIFT_PTS = { need: 3, like: 1, neutral: 0, dislike: 0 };
export const REL_KINDS = ['likes', 'owes', 'rivals'];
const MEMORY = 12;   // remembered things kept per person (flags keep them all)
const LOG = 40;

// day 1 is Thursday 1 October 2026; weeks start on Monday
const DAY1 = Date.UTC(2026, 9, 1);
export function weekOf(day) { return Math.floor((day - 1 + 3) / 7); }
export function dateOf(day) {
  const d = new Date(DAY1 + (day - 1) * 864e5);
  return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]} ${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}`;
}
export const safeKey = (s) => String(s).replace(/\W+/g, '_');

export class Bonds {
  // cast: { id: { likes, dislikes, needs, gates, register, rel } }; flag(name) reads a story flag
  constructor({ cast = {}, flag = () => false } = {}) {
    this.cast = {}; this.flag = flag; this.day = 1; this.p = {}; this.rel = {};
    this.merge(cast);
  }

  // ---------- data ----------
  merge(cast = {}) {
    for (const [id, c] of Object.entries(cast)) {
      const o = (this.cast[id] ||= {});
      for (const [k, v] of Object.entries(c)) {
        if (k === 'rel') for (const [b, kind] of Object.entries(v || {})) this.relate(id, b, typeof kind === 'string' ? kind : kind.kind, { base: true });
        else if (v && typeof v === 'object' && !Array.isArray(v)) o[k] = { ...(o[k] || {}), ...v };
        else o[k] = v;
      }
    }
  }
  person(id) {
    return (this.p[id] ||= { pts: 0, met: false, used: {}, dayPts: 0, dayOf: this.day, weekGifts: 0, weekOf: weekOf(this.day), log: [], rem: [], facts: [], noticed: [], seen: [] });
  }
  roll(q) {
    if (q.dayOf !== this.day) { q.dayOf = this.day; q.dayPts = 0; for (const k of Object.keys(q.used)) if (k.startsWith('d:')) delete q.used[k]; }
    const w = weekOf(this.day);
    if (q.weekOf !== w) { q.weekOf = w; q.weekGifts = 0; }
  }
  setDay(day) { this.day = day; for (const q of Object.values(this.p)) this.roll(q); }

  // ---------- steps ----------
  gate(id, n) { return (this.cast[id] && this.cast[id].gates && this.cast[id].gates[n]) || `bond${n}_${id}`; }
  // the most points they can hold now: the threshold of the first step whose scene hasn't played
  cap(id) {
    for (const s of STEPS) if (s.scene && !this.flag(this.gate(id, s.n))) return s.pts;
    return Infinity;
  }
  step(id) {
    const q = this.p[id]; if (!q || !q.met) return 0;
    let n = 1;
    for (const s of STEPS.slice(2)) {
      if (q.pts < s.pts) break;
      if (s.scene && !this.flag(this.gate(id, s.n))) break;
      if (s.n === 5 && n < 4) break;
      n = s.n;
    }
    return n;
  }
  // the step waiting on its scene: points are there, the scene isn't (0 when none)
  ready(id) {
    const q = this.p[id]; if (!q || !q.met) return 0;
    const n = this.step(id) + 1, s = STEPS[n];
    return s && s.scene && q.pts >= s.pts ? n : 0;
  }
  meet(id) { const q = this.person(id); const was = q.met; q.met = true; return !was; }

  // ---------- points ----------
  // award(id, { add, source, key, why }) -> { added, pts, capped: why nothing or less was added, before, after }
  award(id, { add, source = 'scene', key, why = '', item } = {}) {
    const q = this.person(id); this.roll(q);
    // a gift that answers a need they said out loud counts as the need, once
    if (source === 'gift' && item) { const nd = this.openNeed(id, item); if (nd) { source = 'need'; key = nd.id; } }
    const src = SOURCES[source] || SOURCES.scene;
    let want = add;
    if (want === undefined) want = src.pts === 'reaction' ? GIFT_PTS[this.giftReaction(id, item)] || 0 : src.pts;
    const before = this.step(id);
    const res = { id, source, key, want, added: 0, pts: q.pts, capped: '', before, after: before };
    if (want <= 0) { res.capped = want < 0 ? 'negative' : 'zero'; if (want < 0) this.logIt(q, source, 0, why, 'bonds never go down'); return res; }
    const onceKey = src.once === 'ever' ? `e:${source}` : src.once === 'day' ? `d:${source}` : src.once === 'key' ? `k:${source}:${key || why || 'x'}` : key ? `k:${source}:${key}` : null;
    if (onceKey && q.used[onceKey]) { res.capped = 'once'; return res; }
    if (src.perWeek && q.weekGifts >= src.perWeek) { res.capped = 'week'; this.logIt(q, source, 0, why, 'week cap'); return res; }
    let n = Math.min(want, DAY_CAP - q.dayPts);
    if (n <= 0) { res.capped = 'day'; this.logIt(q, source, 0, why, 'day cap'); return res; }
    const room = this.cap(id) - q.pts;
    if (room <= 0) { res.capped = 'gated'; this.logIt(q, source, 0, why, 'waiting on a scene'); return res; }
    if (n > room) { n = room; res.capped = 'gated'; } else if (n < want) res.capped = 'day';
    q.pts += n; q.dayPts += n;
    if (onceKey) q.used[onceKey] = this.day;
    if (src.perWeek) q.weekGifts++;
    this.logIt(q, source, n, why, res.capped);
    res.added = n; res.pts = q.pts; res.after = this.step(id);
    return res;
  }
  logIt(q, source, add, why, note) { q.log.push({ day: this.day, source, add, why, ...(note ? { note } : {}) }); if (q.log.length > LOG) q.log.shift(); }

  // ---------- gifts ----------
  // 'need' (answers a need they've said out loud), 'like', 'dislike' or 'neutral'
  giftReaction(id, item) {
    const c = this.cast[id] || {};
    for (const nd of c.needs || []) if (nd.item === item && (!nd.said || this.flag(nd.said)) && !(this.p[id] && this.p[id].used[`k:need:${nd.id}`])) return 'need';
    if ((c.likes || []).includes(item)) return 'like';
    if ((c.dislikes || []).includes(item)) return 'dislike';
    return 'neutral';
  }
  openNeed(id, item) { const c = this.cast[id] || {}; return (c.needs || []).find((nd) => nd.item === item && (!nd.said || this.flag(nd.said)) && !(this.p[id] && this.p[id].used[`k:need:${nd.id}`])); }
  // a like or dislike Eric has seen for himself: it shows in People from then on
  notice(id, item) { const q = this.person(id); if (!q.noticed.includes(item)) { q.noticed.push(item); return true; } return false; }

  // ---------- memory and facts ----------
  // rememberedBy: notable things Eric did, as they remember it
  remember(id, key, text) {
    const q = this.person(id); key = safeKey(key);
    if (q.seen.includes(key)) return false;
    q.seen.push(key); q.rem.push({ key, text, day: this.day });
    if (q.rem.length > MEMORY) q.rem.shift();
    return true;
  }
  remembers(id, key) { const q = this.p[id]; return !!q && q.seen.includes(safeKey(key)); }
  learnFact(id, key, text) {
    const q = this.person(id); key = safeKey(key);
    if (q.facts.some((f) => f.key === key)) return false;
    q.facts.push({ key, text, day: this.day }); return true;
  }

  // ---------- people and people ----------
  relate(a, b, kind, { base = false } = {}) {
    if (kind && kind !== 'none' && !REL_KINDS.includes(kind)) throw new Error(`relation kind '${kind}' (use ${REL_KINDS.join(', ')} or none)`);
    const r = (this.rel[a] ||= {});
    if (!kind || kind === 'none') delete r[b]; else r[b] = kind;
    if (!base) (this.relChanged ||= new Set()).add(`${a}>${b}`);
  }
  relation(a, b) { return (this.rel[a] && this.rel[a][b]) || ''; }
  // 'kenji likes mori' or 'kenji>mori:likes' -> true/false
  relHolds(expr) {
    const m = /^\s*(\w+)\s*(?:>\s*(\w+)\s*:\s*(\w+)|\s+(\w+)\s+(\w+))\s*$/.exec(expr || '');
    if (!m) return false;
    const [a, b, kind] = m[2] ? [m[1], m[2], m[3]] : [m[1], m[5], m[4]];
    return this.relation(a, b) === kind;
  }

  // ---------- the People panel ----------
  view(id, { itemName = (x) => x } = {}) {
    const q = this.p[id] || this.person(id); const c = this.cast[id] || {};
    const st = this.step(id), nx = STEPS[st + 1];
    const likes = (c.likes || []).filter((x) => q.noticed.includes(x)).map(itemName);
    const dislikes = (c.dislikes || []).filter((x) => q.noticed.includes(x)).map(itemName);
    const known = q.facts.map((f) => f.text);
    if (likes.length) known.push(`Likes ${likes.join(', ').toLowerCase()}.`);
    if (dislikes.length) known.push(`Not keen on ${dislikes.join(', ').toLowerCase()}.`);
    return {
      id, step: st, stepName: STEPS[st].name, pts: q.pts,
      next: nx ? { step: nx.n, name: nx.name, at: nx.pts || 0, scene: !!nx.scene } : null,
      waiting: !!this.ready(id),
      known, remembers: q.rem.map((r) => r.text).reverse(),
    };
  }

  // ---------- save ----------
  toJSON() {
    const p = {};
    for (const [id, q] of Object.entries(this.p)) p[id] = { ...q };
    const changed = {};
    for (const k of this.relChanged || []) { const [a, b] = k.split('>'); changed[k] = this.relation(a, b) || 'none'; }
    return { v: 1, day: this.day, p, rel: changed };
  }
  load(d) {
    if (!d || d.v !== 1) return false;
    this.day = d.day || 1; this.p = {};
    for (const [id, q] of Object.entries(d.p || {})) this.p[id] = { ...this.person(id), ...q };
    for (const [k, kind] of Object.entries(d.rel || {})) { const [a, b] = k.split('>'); this.relate(a, b, kind); }
    return true;
  }
}
