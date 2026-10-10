// Authoring checks only: run hooks as records, never claim the pending scene hooks are built.
import assert from 'node:assert/strict';
import process from 'node:process';
import { writeFileSync } from 'node:fs';
import { STORIES, WORDS as NEW_WORDS, NEEDS, TRIPS, PERIODS } from './index.js';
import CLUBS from '../clubs.js';
import TICKETS from '../tickets.js';
import { WORDS } from '../../js/lang.js';
import { DEFAULT_SPEAKERS, PLACE_DETAILS, GLOBAL_HOOKS } from '../../js/narrative/contracts.js';
import { compileCondition, createConditionEvaluator } from '../../js/narrative/conditions.js';
import { createTickets } from '../../js/tickets/model.js';
import { expandMc, PROTAGONISTS } from '../../js/mc.js';

const transcripts = [], words = { ...WORDS, ...NEW_WORDS };
let checked = 0;
for (const [where, story] of Object.entries(STORIES)) {
  const base = PLACE_DETAILS[where], need = NEEDS[where] || {};
  const things = new Set([...Object.keys(base.things), ...(need.things || []), 'mio']);
  const ids = new Set([...things, ...base.spots, ...base.seats, ...(need.spots || []), 'eric', 'player']);
  const hooks = new Set([...GLOBAL_HOOKS, ...base.hooks, ...NEEDS.all.hooks, ...(need.hooks || [])]);
  const nodes = { ...story.nodes, ...CLUBS.nodes }, seen = new Set();
  const condition = s => assert(!compileCondition(s).error, `${where}: invalid condition ${s}`);
  const text = s => {
    for (const [, word] of (s || '').matchAll(/\{(\w+)\}/g)) assert(words[word], `${where}: missing word ${word}`);
    assert(!/\bEric\b|エリック|Carina|カリーナ/.test(s || ''), `${where}: literal protagonist name`);
  };
  function node(id) {
    assert(nodes[id], `${where}: missing node ${id}`);
    if (seen.has(id)) return;
    seen.add(id); checked++; steps(nodes[id], id);
  }
  function steps(list, name) {
    for (const s of list) {
      if (typeof s === 'string') { assert(s.startsWith('>'), `${where}/${name}: line without emo`); text(s); continue; }
      assert(!s.wait, `${where}/${name}: timed step`);
      if (s.say) {
        const speaker = story.speakers?.[s.say] || DEFAULT_SPEAKERS[s.say];
        assert(speaker, `${where}/${name}: speaker ${s.say}`);
        assert(s.emo || speaker.phone, `${where}/${name}: no voice direction`);
        assert(!Object.hasOwn(s, 'en'), `${where}/${name}: subtitled Japanese (en) in a day-4 conversation`);
        if (['guard', 'mori', 'kuroda', 'aoi', 'attendant', 'member'].includes(s.say)) {
          assert(s.overheard || /^(\{\w+\}[。、.…!?！？]*\s*)+$/.test(s.text), `${where}/${name}: Japanese line neither overheard nor a taught word`);
        }
      }
      for (const k of ['text', 'en', 'prompt']) text(s[k]);
      if (s.if) condition(s.if);
      // The shared first club node explicitly selects the appropriate physical place.
      if (s.if === "place == 'gym'") steps(where === 'gym' ? s.then : s.else, name);
      else { if (s.then) steps(s.then, name); if (s.else) steps(s.else, name); }
      for (const k of ['go', 'call']) if (s[k]) node(s[k]);
      for (const c of s.choice || []) { if (c.if) condition(c.if); text(c.text); node(c.go || c.call); }
      if (!s.do) continue;
      assert(hooks.has(s.do), `${where}/${name}: undeclared hook ${s.do}`);
      if (s.do === 'trip') assert(TRIPS[where].includes(s.to), `${where}/${name}: undeclared trip ${s.to}`);
      if (s.do === 'type') assert(words[s.word], `${where}/${name}: missing lesson ${s.word}`);
      if (s.do === 'ticket') for (const op of ['add', 'start', 'close']) if (s[op]) assert(TICKETS[s[op]]);
      if (['cam', 'walk', 'face', 'look', 'gesture', 'sit', 'stand', 'goal'].includes(s.do)) {
        for (const k of ['who', 'on', 'at', 'to']) if (typeof s[k] === 'string') assert(ids.has(s[k]), `${where}/${name}: missing ${k} ${s[k]}`);
      }
      if (s.do === 'sit') assert(base.seats.includes(s.at), `${where}/${name}: missing seat ${s.at}`);
    }
  }
  node(story.start);
  for (const [trigger, values] of Object.entries(story.on)) {
    const [kind, a, b] = trigger.split(':'), target = kind === 'say' ? b : a;
    assert(kind === 'zone' ? base.zones.includes(target) : things.has(target), `${where}: unknown trigger ${trigger}`);
    for (const entry of Array.isArray(values) ? values : [values]) {
      if (typeof entry === 'string') node(entry);
      else { condition(entry.if || 'true'); node(entry.node); }
    }
  }
  for (const [target, expr] of Object.entries(story.show || {})) { assert(things.has(target)); condition(expr); }
  for (const [target, label] of Object.entries(story.labels || {})) {
    assert(things.has(target), `${where}: label for missing target ${target}`);
    if (Array.isArray(label)) condition(label[1]);
  }
  for (const id of Object.keys(story.nodes)) node(id);
  if (where === 'sports') node('club_tennis_1');
}
for (const mc of Object.values(PROTAGONISTS)) {
  const expanded = expandMc(structuredClone({ STORIES, CLUBS, TICKETS }), mc);
  assert(!JSON.stringify(expanded).includes('{mc.'), `Unresolved token for ${mc.id}`);
}
// Every open place remains reachable from home, and can reach home again.
for (const from of Object.keys(STORIES)) {
  const reached = new Set(), visit = p => { if (reached.has(p)) return; reached.add(p); TRIPS[p].forEach(visit); };
  visit(from); assert.equal(reached.size, Object.keys(STORIES).length, `Disconnected route from ${from}`);
}

class Play {
  constructor(where, flags = {}) {
    this.where = where; this.flags = { day: 4, period: 'morning', place: where, ...flags };
    this.lines = []; this.dialogue = []; this.hooks = []; this.payments = []; this.count = 0;
    this.cond = createConditionEvaluator(key => this.flags[key] ?? false);
    this.tickets = createTickets({ flags: this.flags, cond: this.cond, defs: () => TICKETS,
      onClose: (id, yen) => this.payments.push({ id, yen }) });
  }
  run(id, picks = []) {
    const nodes = { ...STORIES[this.where].nodes, ...CLUBS.nodes };
    const set = s => typeof s === 'string' ? this.flags[s] = true : Object.assign(this.flags, s);
    const walk = list => {
      for (const s of list) {
        assert(++this.count < 2000, 'Runaway node');
        if (typeof s === 'string') { this.lines.push(s); continue; }
        if (s.set) set(s.set); if (s.unset) delete this.flags[s.unset];
        if (s.if) { const r = walk(this.cond(s.if) ? s.then || [] : s.else || []); if (r) return r; }
        if (s.say) {
          const name = s.name || STORIES[this.where].speakers?.[s.say]?.name || DEFAULT_SPEAKERS[s.say]?.name;
          this.lines.push(`${name}: ${s.en || s.text}`);
          this.dialogue.push({ ...s, name });
        }
        if (s.call) this.run(s.call, picks);
        if (s.go) return { go: s.go };
        if (s.end) return { stop: true };
        if (s.choice) {
          const selected = picks.shift(), c = s.choice.find(c => (c.go || c.call) === selected && this.cond(c.if));
          assert(c, `${this.where}/${id}: unavailable choice ${selected}`);
          this.lines.push(`CHOICE: ${c.text}`);
          if (c.set) set(c.set);
          if (c.go) return { go: c.go };
          if (c.call) this.run(c.call, picks);
        }
        if (s.do) {
          this.hooks.push(s);
          if (s.do === 'ticket') for (const op of ['add', 'start', 'close']) if (s[op]) this.tickets[op](s[op]);
          if (s.do === 'type') { this.flags['know_' + s.word] = true; this.flags['typed_' + s.word] = true; }
          if (s.do === 'meet') this.flags['met_' + s.who] = true;
          if (s.do === 'period') this.flags.period = s.to === 'next' ? PERIODS[PERIODS.indexOf(this.flags.period) + 1] : s.to;
          if (s.do === 'trip') { this.destination = s.to; return { stop: true }; }
          if (s.do === 'end') this.ended = true;
        }
      }
    };
    let next = id;
    while (next) { assert(nodes[next], `Missing node ${next}`); next = walk(nodes[next])?.go; }
  }
  record(title) { transcripts.push(`\n## ${title}\n${this.lines.join('\n')}`); }
}
for (const branch of ['d4_aoi_rally', 'd4_rei_serve']) for (const met of [false, true]) for (const drink of [false, true]) {
  const p = new Play('sports', { period: 'evening', club_tennis: true, d3_aoi_intro: met, d4_rei_intro: met });
  p.run('d4_tennis_offer', ['d4_together', branch, drink ? 'd4_tennis_drink' : 'd4_tennis_leave']);
  assert(p.flags.d4_tennis_done); assert(p.flags.know_isshoni); assert.equal(p.flags.period, 'evening');
  assert(!p.hooks.some(h => h.do === 'bondStep' || h.do === 'bond'));
  assert.equal(p.dialogue.some(s => s.text.includes('I’m Rei.')), !met);
  p.record(`Tennis ${branch}, introduced ${met}, drink ${drink}`);
}
{
  const p = new Play('sports', { period: 'evening', club_tennis: true });
  p.run('d4_tennis_offer', ['d4_tennis_leave']); assert(!p.flags.d4_tennis_done);
  const q = new Play('sports', { ...p.flags, day: 11 });
  q.run('club_tennis_2', ['d4_tennis_choose', 'd4_aoi_rally', 'd4_tennis_leave']); assert(q.flags.d4_tennis_done);
  const n = new Play('sports', { period: 'evening' }); n.run('d4_tennis_offer'); assert.equal(n.hooks.length, 0);
}
for (const method of ['d4_fan_lever', 'd4_fan_magic']) {
  const p = new Play('gym', { know_ugoite: true }); p.run('d4_fan', [method]); p.run('d4_fan');
  assert.deepEqual(p.payments, [{ id: 'T-0006', yen: 1000 }]); assert.equal(p.flags.period, 'morning');
  assert(p.hooks.some(h => h.state === 'oscillate')); p.record(method);
}
{
  const p = new Play('sports', { period: 'afternoon' }); p.run('d4_display', ['d4_display_fix']); p.run('d4_display');
  assert.deepEqual(p.payments, [{ id: 'T-0005', yen: 1500 }]); p.record('Court repair and replay');
  const q = new Play('sports'); q.run('d4_display'); assert.equal(q.payments.length, 0);
}
{
  const p = new Play('gym', { ticket_T0004: 'done' }); p.run('d4_printer');
  assert(p.flags.know_dashite); assert(p.hooks.findIndex(h => h.state === 'print') < p.hooks.findIndex(h => h.do === 'type'));
  assert.equal(p.payments.length, 0); p.record('Deferred lesson');
}
{
  const p = new Play('dorms'); p.run('d4_room'); p.run('d4_rest', ['d4_rest_now']); p.run('d4_bed', ['d4_sleep']);
  assert(p.ended); assert(p.flags.d4_complete); assert.equal(p.payments.length, 0);
  p.record('No work, no club, sleep');
}
{
  const p = new Play('sports', { period: 'evening', club_tennis: true, know_isshoni: true, know_ikitai: true });
  p.run('d4_tennis_offer', ['d4_tennis_invite', 'd4_rei_serve', 'd4_tennis_leave']);
  assert(p.flags.d4_invitation_said); assert(p.flags.d4_tennis_done);
  p.record('Optional combined invitation');
}
{
  const p = new Play('sports', { period: 'evening' }); p.run('d4_aoi');
  assert(p.flags.d4_rei_intro); assert(p.flags.d3_aoi_intro);
  assert(p.dialogue.findIndex(s => s.text.includes('I’m Rei.')) < p.dialogue.findIndex(s => s.text.includes('join at the plaza')));
  p.record('Nonmember, Aoi first, both names unknown');
}
for (const member of [false, true]) {
  const p = new Play('sports', { period: 'evening', ticket_T0005: 'done', d4_tennis_done: member, club_tennis: member });
  p.run('d4_rei');
  assert.equal(p.dialogue.some(s => s.text.includes('use the spare racket')), member);
  assert.equal(p.dialogue.some(s => s.text.includes('join at the plaza')), !member);
  p.record(`Rei after repair, membership ${member}`);
}
for (const knows of [false, true]) {
  const display = new Play('sports', { period: 'afternoon', know_gamen: knows });
  display.run('d4_display', ['d4_display_leave']);
  assert.equal(display.lines.some(s => s.includes('{gamen}')), knows);
  assert(!display.hooks.some(h => h.do === 'type'));
  const club = new Play('sports', { period: 'evening', club_tennis: true, know_yoyaku: knows, know_isshoni: true });
  club.run('d4_tennis_offer', ['d4_tennis_leave']);
  assert.equal(club.lines.some(s => s.includes('{yoyaku}')), knows);
  assert(!club.hooks.some(h => h.do === 'type'));
  display.record(`Familiar screen word ${knows}`); club.record(`Familiar booking word ${knows}`);
}
if (process.argv[2]) writeFileSync(process.argv[2], transcripts.join('\n'));
console.log(`Day 4: ${checked} contextual nodes, routes, tokens and branch checks pass (authoring only).`);
