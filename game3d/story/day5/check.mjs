// Authoring checks only: run hooks as records, never claim the pending scene hooks are built.
import assert from 'node:assert/strict';
import process from 'node:process';
import { writeFileSync } from 'node:fs';
import { STORIES, WORDS as NEW_WORDS, NEEDS, TRIPS, PERIODS } from './index.js';
import CLUBS from '../clubs.js';
import { KOTODAMA } from './kotodama.js';
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
        assert(!Object.hasOwn(s, 'en'), `${where}/${name}: subtitled Japanese (en) in a day-5 conversation`);
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
    assert(kind === 'event' || (kind === 'zone' ? base.zones.includes(target) : things.has(target)), `${where}: unknown trigger ${trigger}`);
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
    this.where = where; this.flags = { day: 5, period: 'morning', place: where, ...flags };
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
for (const known of [false, true]) for (const met of [false, true]) {
  const p = new Play('office', { period: 'evening', know_dashite: known, met_kenji: met, met_mori: met });
  p.run('d5_drinks', ['d5_reveal_agree']);
  assert(!p.flags.d5_team_witnessed); assert(p.flags.know_dashite);
  assert.equal(p.hooks.at(-1).state, 'guidedDelivery');
  if (!known) assert(p.hooks.findIndex(h => h.state === 'printLesson') < p.hooks.findIndex(h => h.do === 'type'));
  p.flags.d5_delivery_seen = true;
  p.run('d5_first_reactions', ['d5_first_exit']); assert(p.flags.d5_team_witnessed); assert(p.flags.d5_reveal_done);
  assert.equal(p.flags.period, 'evening'); assert.equal(p.payments.length, 0);
  p.record(`First drinks, knew dashite ${known}, met colleagues ${met}`);
  const q = new Play('office', p.flags); q.run('d5_drinks', ['d5_drinks_free']);
  assert(!q.dialogue.some(s => s.text.includes('move things by speaking')));
}
{
  const p = new Play('office', { period: 'evening' }); p.run('d5_drinks', ['d5_reveal_defer']);
  assert(!p.flags.d5_team_witnessed); assert(!p.hooks.some(h => h.state === 'guidedDelivery'));
  p.run('d5_drinks', ['d5_reveal_agree']); assert(p.flags.d5_reveal_agreed);
  p.run('d5_delivery_cancel'); assert(!p.flags.d5_team_witnessed); assert(!p.flags.d5_reveal_agreed); assert(!p.flags.d5_reveal_done);
  p.record('Defer, retry, cancel before delivery');
}
for (const who of ['kenji', 'mori', 'mio', '']) {
  const p = new Play('office', { d5_team_witnessed: true, period: 'evening', d5_last_recipient: who });
  p.run('d5_rounds_exit'); assert(p.flags.d5_reveal_done); assert.equal(p.dialogue.length, who ? 1 : 0);
  if (who) assert.equal(p.dialogue[0].say, who); assert.equal(p.flags.period, 'evening');
}
for (const method of ['d5_selector_key', 'd5_selector_magic']) {
  const p = new Play('karaoke_booth', { period: 'lunch', know_matte: true });
  p.run('d5_selector', [method]); p.run('d5_selector');
  assert.deepEqual(p.payments, [{ id: 'T-0008', yen: 2000 }]); assert.equal(p.flags.period, 'lunch');
  assert(!p.flags.d5_team_witnessed); p.record(method);
}
{
  const p = new Play('forecourt'); p.run('d5_label', ['d5_label_leave']); assert.equal(p.payments.length, 0);
  p.run('d5_label', ['d5_label_fix']); p.run('d5_label'); assert.deepEqual(p.payments, [{ id: 'T-0007', yen: 1500 }]);
  p.record('Label leave, repair, replay');
  const q = new Play('forecourt', { period: 'lunch' }); q.run('d5_label'); assert.equal(q.payments.length, 0);
}
{
  const p = new Play('dorms'); p.run('d5_room'); p.run('d5_rest', ['d5_rest_now']); p.run('d5_bed', ['d5_sleep']);
  assert(p.ended); assert(p.flags.d5_complete); assert(!p.flags.d5_team_witnessed); p.record('Skip everything and sleep');
}
// The adapter is story dialogue too; glosses on word/command records are not subtitles.
function checkAdapter(value) {
  if (!value || typeof value !== 'object') return;
  if (value.say) {
    assert(!Object.hasOwn(value, 'en'), 'Subtitled dialogue in Kotodama adapter');
    assert(value.emo, 'Missing adapter voice direction');
  }
  for (const child of Object.values(value)) checkAdapter(child);
}
checkAdapter(KOTODAMA);
{
  const p = new Play('office', { period: 'evening', d5_delivery_seen: true, know_dashite: true });
  p.run('d5_drinks', ['d5_drinks_continue']);
  assert(p.flags.d5_team_witnessed); assert(!p.flags.d5_reveal_done);
  assert(!p.hooks.some(h => h.state === 'guidedDelivery'));
  p.flags.d5_last_recipient = 'mori'; p.run('d5_rounds_exit');
  assert(p.flags.d5_reveal_done); p.record('Restore after delivery, continue rounds, exit');
}
for (const where of ['office', 'dorm_commons', 'karaoke_booth']) {
  const p = new Play(where, { period: 'lunch' }); p.run('d5_arrive');
  p.flags.met_mori = true; p.flags.met_kenji = true;
  p.run(where === 'office' ? 'd5_mori_name' : where === 'dorm_commons' ? 'd5_art_setup' : 'd5_booth_hello');
  assert(where === 'karaoke_booth' ? !p.flags.d5_kenji_needs_intro : !p.flags.d5_mori_needs_intro);
  p.record(`Talk introduction: ${where}`);
}
assert.deepEqual(KOTODAMA.people, ['kenji', 'mori', 'mio']);
assert.equal(KOTODAMA.first.request.item, KOTODAMA.first.item.id);
for (const event of [KOTODAMA.first.successEvent, KOTODAMA.first.cancelEvent, KOTODAMA.repeat.exitEvent]) {
  assert(STORIES.office.on['event:' + event]);
}
for (const mc of Object.values(PROTAGONISTS)) assert(!JSON.stringify(expandMc(structuredClone(KOTODAMA), mc)).includes('{mc.'));
if (process.argv[2]) writeFileSync(process.argv[2], transcripts.join('\n'));
console.log(`Day 5: ${checked} contextual nodes, routes, tokens and branch checks pass (authoring only).`);
