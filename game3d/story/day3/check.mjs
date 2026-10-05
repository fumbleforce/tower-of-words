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
import { createClubs } from '../../js/clubs/model.js';
import { dateOf } from '../../js/bonds/model.js';
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
        // Japanese speakers talk Japanese on screen, as on day 1: overheard (known words sharp, the rest by context and
        // gesture), or a bare taught word ({dashite}). The subtitled `en` form is never used in a day-3 conversation.
        assert(!s.en, `${where}/${name}: subtitled Japanese (en) in a day-3 conversation`);
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
  if (['pool', 'gym'].includes(where)) node('club_swimming_1');
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
    this.where = where; this.flags = { day: 3, period: 'morning', place: where, ...flags };
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
for (const order of [false, true]) {
  const p = new Play('train', { d2_ticket_done: true, d2_order_sensor: order });
  p.run('d3_signoff', ['d3_signoff_test']);
  assert.deepEqual(p.payments, [{ id: 'T-0002', yen: 5000 }]);
  assert.equal(p.flags.period, 'morning');
  assert.deepEqual(p.hooks.filter(h => h.do === 'stationSignoff').map(h => h.state), ['test', 'retrieve', 'close', 'sign', 'leave']);
  p.run('d3_signoff'); assert.equal(p.payments.length, 1);
  const q = new Play('train', structuredClone(p.flags)); q.run('d3_signoff'); assert.equal(q.payments.length, 0);
  p.record(`Station: replacement ${order}`);
}
for (const f of [{}, { d2_ticket_done: true, period: 'afternoon' }]) {
  const p = new Play('train', f); p.run('d3_signoff'); assert.equal(p.payments.length, 0);
}
{
  const p = new Play('train', { d2_ticket_done: true }); p.run('d3_signoff', ['d3_signoff_later']); assert.equal(p.payments.length, 0);
}
{
  const p = new Play('gate'); p.run('d3_monitor', ['d3_monitor_later']); assert.equal(p.payments.length, 0);
  p.run('d3_monitor', ['d3_monitor_fix']); p.run('d3_monitor');
  assert.deepEqual(p.payments, [{ id: 'T-0003', yen: 1000 }]); assert.equal(p.flags.period, 'morning');
  const q = new Play('gate', structuredClone(p.flags)); q.run('d3_monitor'); assert.equal(q.payments.length, 0);
  p.record('Monitor: defer, fix, return');
}
for (const method of ['d3_booking_reset', 'd3_booking_magic']) for (const known of [false, true]) {
  const p = new Play('gym', { know_ugoite: true, know_dashite: known });
  p.run('d3_booking', [method]); p.run('d3_printer', ['d3_booking_later']);
  assert.equal(p.payments.length, 0); assert(p.flags.d3_booking_restarted);
  const q = new Play('gym', structuredClone(p.flags)); q.run('d3_printer', ['d3_print']); q.run('d3_printer');
  assert.deepEqual(q.payments, [{ id: 'T-0004', yen: 1500 }]); assert(q.flags.know_dashite);
  assert.equal(q.flags.period, 'morning');
  assert(!q.hooks.some(h => h.do === 'kotodama'), 'Typing dashite must not cast it');
  const printing = q.hooks.findIndex(h => h.do === 'bookingRepair' && h.state === 'print');
  const typing = q.hooks.findIndex(h => h.do === 'type' && h.word === 'dashite');
  assert(known ? typing === -1 : typing > printing, 'Only practise dashite after the completed print');
  assert(!p.flags.typed_dashite, 'Deferring the print must also defer the word');
  p.record(`Booking ${method}; knew dashite ${known}`); q.record('Return and print');
}
for (const where of ['gate', 'gym']) {
  const p = new Play(where, { period: 'evening' }); p.run(where === 'gym' ? 'd3_booking' : 'd3_monitor');
  assert.equal(p.payments.length, 0);
}
for (const heard of ['d3_aoi_heard', 'd3_aoi_missed']) {
  const p = new Play('plaza'); p.run('d3_board', [heard]); assert(p.flags.d3_aoi_intro); assert(!p.flags.club_tennis);
  p.run('d3_board'); assert.equal(p.hooks.filter(h => h.do === 'boardVisit' && h.state === 'slip').length, 1);
  p.record(`Board: ${heard}`);
}
{
  const p = new Play('plaza', { period: 'afternoon' }); p.run('d3_board'); assert(!p.flags.d3_aoi_intro);
  p.run('d3_map', ['d3_map_end']); assert(!p.flags.know_koko);
  p.run('d3_map', ['d3_koko_word']); assert(p.flags.typed_koko);
}
{
  const p = new Play('dorms'); p.run('d3_room'); p.run('d3_chair', ['d3_inbox']);
  assert.equal(p.tickets.list().length, 2); assert.equal(p.flags.period, 'morning');
  p.run('d3_chair', ['d3_rest', 'd3_up']); assert.equal(p.flags.period, 'morning');
  for (const period of ['lunch', 'afternoon', 'evening']) { p.run('d3_chair', ['d3_wait']); assert.equal(p.flags.period, period); }
  p.run('d3_room'); assert(!p.ended); p.run('d3_bed', ['d3_awake']); assert(!p.ended);
  p.run('d3_bed', ['d3_sleep']); assert(p.ended); assert.equal(p.payments.length, 0);
}
{
  const p = new Play('dorms'); p.run('d3_chair', ['d3_rest', 'd3_rest_now']); assert.equal(p.flags.period, 'evening');
}
const poolChoices = [
  ['club_swimming_join'], ['club_swimming_bags', 'club_swimming_after_bags'],
  ['club_swimming_bags', 'club_swimming_deck'], ['club_swimming_watch'],
];
for (const route of poolChoices) for (const finish of ['club_swimming_sit', 'club_swimming_goodnight']) for (const known of [false, true]) {
  const p = new Play('pool', { period: 'evening', met_emi: known, kuro_reception_seen: known });
  p.run('club_swimming_1', [...route, finish]); assert(p.flags.d3_swim_done);
  assert.equal(p.flags.period, 'evening'); assert.equal(p.payments.length, 0);
  assert.equal(p.hooks.filter(h => h.do === 'bond').length, 2);
  assert(!p.hooks.some(h => h.do === 'bondStep'));
  if (route.includes('club_swimming_watch') || route.includes('club_swimming_deck')) assert(!p.flags.d3_player_swims);
  assert.equal(p.hooks.filter(h => h.do === 'poolSession' && h.state === 'length').length, 1);
  assert.equal(p.lines.some(s => s.includes('Was that pace all right?')), !!p.flags.d3_player_swims);
  assert(p.dialogue.filter(s => s.say === 'kuro' && s.name === 'Receptionist').length > 0);
  assert(p.dialogue.filter(s => s.say === 'kuro' && s.name === 'Kuro').length > 0);
  p.record(`Pool: ${route.join(', ')}, ${finish}, known people ${known}`);
}
// The escort continues on arrival; independent platform visits still offer the sign-off goal.
{
  const gate = new Play('gate', { d2_ticket_done: true });
  gate.run('d3_guard', ['d3_offer_signoff']);
  assert(gate.flags.d3_monitor_seen); assert.equal(gate.destination, 'train');
  const train = new Play('train', { ...gate.flags, place: 'train' });
  train.run('d3_arrive', ['d3_signoff_later']);
  assert(!train.flags.d3_signoff_walk); assert(train.lines.some(s => s.includes('センサー')));
  assert(!train.hooks.some(h => h.do === 'goal' && h.at === 'door_test'));
  train.run('d3_arrive'); assert(train.hooks.some(h => h.do === 'goal' && h.at === 'door_test'));
  gate.record('Guard: monitor setup without PC, then escort'); train.record('Platform: escorted arrival and return');
}
for (const period of PERIODS) {
  const p = new Play('gate', { period, ticket_T0002: 'done', ticket_T0003: 'done' });
  p.run('d3_guard'); // No menu when all checks are complete.
  assert(!p.lines.some(s => /check|点検/.test(s))); p.record(`Guard: completed jobs, ${period}`);
}
for (const joined of [false, true]) {
  const aoi = new Play('plaza', { d3_aoi_intro: true, club_tennis: joined }); aoi.run('d3_aoi_again');
  assert.equal(aoi.lines.some(s => s.includes('テニスで')), joined);
  const emi = new Play('gym', { met_emi: true, club_swimming: joined }); emi.run('d3_emi');
  assert.equal(emi.lines.some(s => s.includes('Take a slip')), !joined);
  aoi.record(`Aoi: member ${joined}`); emi.record(`Emi: member ${joined}`);
}
for (const known of [false, true]) for (const named of [false, true]) {
  for (const [where, node] of [['shotengai', 'd3_kuro_lunch'], ['pool', 'd3_kuro_pool']]) {
    const p = new Play(where, { kuro_reception_seen: known, d3_kuro_intro: named }); p.run(node);
    assert(p.dialogue.every(s => s.name === (named ? 'Kuro' : 'Receptionist')));
    assert(p.dialogue.every(s => !s.en), 'Kuro uses short English with the player');
    p.record(`Kuro ${where}: reception ${known}, introduced ${named}`);
  }
}
for (const reported of [false, true]) {
  const p = new Play('dorms', { d2_ticket_done: reported }); p.run('d3_room');
  assert(p.lines.some(s => s.includes('club posters'))); assert(!p.lines.some(s => /Ishibashi|ishibashi/.test(s)));
  p.record(`Morning texts: report submitted ${reported}`);
}
{
  const p = new Play('pool', { period: 'evening' }); p.run('club_swimming_1', ['club_swimming_leave_early']);
  assert(!p.flags.d3_swim_done); assert(!p.flags.d3_swimming_shared);
  p.run('club_swimming_pool', ['club_swimming_watch', 'club_swimming_goodnight']); assert(p.flags.d3_swim_done);
}
{
  const p = new Play('gym', { day: 10, period: 'evening' });
  p.run('club_swimming_1', ['club_swimming_winter_leave']); assert(!p.flags.d3_winter_intro_done);
  p.flags.day = 17; p.run('club_swimming_2', ['club_swimming_winter_leave']); assert(!p.flags.d3_winter_intro_done);
  p.flags.day = 24; p.run('club_swimming_2', ['club_swimming_winter_sit']); assert(p.flags.d3_winter_intro_done);
  assert(!p.flags.d3_swim_done); assert(!p.hooks.some(h => h.do === 'poolSession'));
  assert.equal(p.hooks.filter(h => h.do === 'bond').length, 2); p.record('Winter: defer twice, then sit');
}
{
  const p = new Play('pool', { period: 'evening' }); p.run('d3_goggles'); p.run('d3_goggles');
  assert.equal(p.hooks.filter(h => h.do === 'poolSession' && h.state === 'goggles').length, 1);
  assert(!p.hooks.some(h => h.do === 'find' || h.do === 'take')); p.record('Goggles');
}
// The real Talk action marks a person met before dispatching the story.
for (const [where, node] of [['gym', 'd3_emi'], ['east_coast', 'd3_emi_lunch'], ['pool', 'd3_emi_pool']]) {
  const p = new Play(where); p.run('d3_arrive'); p.flags.met_emi = true;
  p.run(node);
  assert(p.lines.some(s => s.includes('I’m Emi, your team lead')), `${where}: first introduction lost to Talk`);
  assert(!p.flags.d3_emi_needs_intro);
  const q = new Play('pool', structuredClone(p.flags));
  q.run('club_swimming_intro'); assert(!q.lines.some(s => s.includes('I’m Emi, your team lead')), 'Repeated Emi introduction');
}
// Test seasonal dispatch through the real club model, including multiple missed/declined meetings.
{
  const flags = { day: 3, period: 'morning' }, cond = createConditionEvaluator(k => flags[k] ?? false);
  const c = createClubs({ flags, cond, data: () => CLUBS, dateOf, periods: PERIODS });
  assert.equal(c.due('pool', 3, 'evening'), null); c.join('swimming');
  assert.equal(c.due('gym', 10, 'evening').node, 'club_swimming_1');
  c.attend('swimming', 10);
  assert.equal(c.due('gym', 10, 'evening'), null);
  assert.equal(c.due('gym', 17, 'evening').node, 'club_swimming_2');
  assert.equal(c.due('pool', 17, 'evening'), null);
}
const output = process.argv[2];
if (output) writeFileSync(output, transcripts.join('\n'));
console.log(`Day 3 authoring: ${checked} contextual nodes; routes, branches, tokens and once-only payments pass. Physical hooks are pending.`);
