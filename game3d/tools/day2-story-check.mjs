// Authoring checks for the pending day-2 set. This does not claim the requested scene hooks are implemented.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { STORIES, WORDS as NEW_WORDS, NEEDS, TRIPS, OPEN_PLACES, PERIODS } from '../story/day2/index.js';
import { WORDS } from '../js/lang.js';
import { DEFAULT_SPEAKERS, PLACE_DETAILS, GLOBAL_HOOKS } from '../js/narrative/contracts.js';
import { allowedConditionCharacters, compileCondition, createConditionEvaluator } from '../js/narrative/conditions.js';

const words = { ...WORDS, ...NEW_WORDS };
const typed = [];
let nodeCount = 0;
const factRoot = new URL('../../docs/game/stories/day2/', import.meta.url);
const facts = ['service.md', 'welcome.md', 'visits.md'].map(f => fs.readFileSync(new URL(f, factRoot), 'utf8')).join('\n');
for (const [place, story] of Object.entries(STORIES)) {
  const base = PLACE_DETAILS[place], need = NEEDS[place] || {};
  const things = new Set([...Object.keys(base.things), ...(need.things || []), 'mio']);
  const ids = new Set([...things, ...base.spots, ...base.seats, ...(need.spots || []), ...(need.seats || []), 'eric', 'player']);
  const zones = new Set([...base.zones, ...(need.zones || [])]);
  const seats = new Set([...base.seats, ...(need.seats || [])]);
  const hooks = new Set([...GLOBAL_HOOKS, ...base.hooks, ...(need.hooks || [])]);
  const speakers = { ...DEFAULT_SPEAKERS, ...story.speakers };
  const cond = text => {
    assert(allowedConditionCharacters(text), `${place}: invalid condition characters: ${text}`);
    assert(!compileCondition(text).error, `${place}: invalid condition: ${text}`);
  };
  const text = value => {
    for (const [, id] of (value || '').matchAll(/\{(\w+)\}/g)) assert(words[id], `${place}: unknown word ${id}`);
    assert(!/\\[nrt]|&quot;|&amp;/.test(value || ''), `${place}: escaped story text`);
  };
  function steps(list, node) {
    assert(Array.isArray(list), `${place}/${node}: not a list`);
    for (const s of list) {
      if (typeof s === 'string') { assert(s.startsWith('>'), `${place}/${node}: spoken lines need emo`); text(s); continue; }
      if (s.say) {
        assert(speakers[s.say], `${place}/${node}: unknown speaker ${s.say}`);
        assert(s.emo || speakers[s.say].phone, `${place}/${node}: unvoiced direction for ${s.say}`);
        if (['mori', 'guard'].includes(s.say)) assert(s.en && !s.overheard, `${place}/${node}: Japanese must be subtitled`);
      }
      for (const k of ['text', 'prompt', 'line', 'en']) if (s[k]) text(s[k]);
      if (s.if) cond(s.if);
      for (const k of ['go', 'call']) if (s[k]) assert(story.nodes[s[k]], `${place}/${node}: missing ${s[k]}`);
      for (const k of ['then', 'else']) if (s[k]) steps(s[k], node);
      for (const o of s.choice || []) {
        text(o.text); if (o.if) cond(o.if);
        assert(story.nodes[o.go || o.call], `${place}/${node}: missing choice destination`);
      }
      if (s.do) {
        assert(hooks.has(s.do), `${place}/${node}: undeclared hook ${s.do}`);
        if (s.do === 'trip') assert(TRIPS[place]?.includes(s.to), `${place}/${node}: undeclared trip ${s.to}`);
        else if (s.do !== 'period') {
          for (const k of ['who', 'at', 'on', 'to']) if (typeof s[k] === 'string') assert(ids.has(s[k]), `${place}/${node}: undeclared ${k} ${s[k]}`);
        }
        if (s.do === 'sit' && s.at) assert(seats.has(s.at), `${place}/${node}: missing seat ${s.at}`);
        if (s.do === 'type') {
          assert(words[s.word] && speakers[s.from], `${place}/${node}: bad teaching step`);
          typed.push({ place, node, word: s.word, from: s.from });
        }
      }
    }
  }
  assert(story.nodes[story.start], `${place}: missing start`);
  for (const [node, body] of Object.entries(story.nodes)) { steps(body, node); nodeCount++; }
  for (const [key, entries] of Object.entries(story.on)) {
    const [kind, a, b] = key.split(':');
    const target = kind === 'say' ? b : a;
    if (kind === 'zone') assert(zones.has(target), `${place}: unknown zone ${target}`);
    else assert(target === '*' || things.has(target), `${place}: unknown target ${target}`);
    if (kind === 'say') assert(words[a]?.cmd || words[a]?.phrase, `${place}: unsayable ${a}`);
    for (const entry of Array.isArray(entries) ? entries : [entries]) {
      const e = typeof entry === 'string' ? { node: entry } : entry;
      assert(story.nodes[e.node], `${place}: trigger to missing ${e.node}`); if (e.if) cond(e.if);
    }
  }
  for (const [id, c] of Object.entries({ ...story.show, ...story.goal })) { assert(things.has(id), `${place}: bad marker ${id}`); cond(c); }
  for (const id of Object.keys(story.labels || {})) assert(things.has(id), `${place}: bad label ${id}`);
  assert(facts.includes(`day2/${place}.js`), `${place}: missing facts entry`);
  for (const node of Object.keys(story.nodes)) assert(facts.includes('`' + node + '`'), `${place}/${node}: missing facts node`);
}
assert.deepEqual(typed.map(x => x.word).sort(), Object.keys(NEW_WORDS).sort(), 'Each new word needs exactly one teaching node');
for (const t of typed) assert(facts.includes(`| \`${t.word}\` | \`${t.from}\` | \`${t.node}\` |`), 'Missing taught-word fact');

// Exercise actual story data with the engine's condition evaluator. Hooks are recorded, not faked as built scenes.
class Play {
  constructor(flags) { this.flags = { ...flags }; this.lines = []; this.hooks = []; this.place = 'dorms'; this.steps = 0; }
  cond = createConditionEvaluator(key => this.flags[key] ?? false);
  set(value) { if (typeof value === 'string') this.flags[value] = true; else Object.assign(this.flags, value); }
  run(node, picks = []) {
    const story = STORIES[this.place];
    const visit = list => {
      for (const s of list) {
        assert(++this.steps < 3000, 'Story loop');
        if (typeof s === 'string') { this.lines.push(s); continue; }
        if (s.set) this.set(s.set); if (s.unset) delete this.flags[s.unset];
        if (s.if) { const jump = visit(this.cond(s.if) ? s.then || [] : s.else || []); if (jump) return jump; }
        if (s.say) this.lines.push(s.text);
        if (s.choice) {
          const pick = picks.shift();
          const go = typeof pick === 'string' ? pick : pick?.go;
          const choice = s.choice.find(o => (o.go || o.call) === go && this.cond(o.if)
            && (typeof pick === 'string' || o.set?.d2_food === pick?.food));
          assert(choice, `${this.place}/${node}: unavailable choice ${go}`);
          if (choice.set) this.set(choice.set);
          if (choice.go) return { go: choice.go };
          this.run(choice.call, picks);
        }
        if (s.call) this.run(s.call, picks);
        if (s.go) return { go: s.go };
        if (s.end) return { stop: true };
        if (s.do) {
          this.hooks.push({ place: this.place, ...s });
          if (s.do === 'type') { this.flags['know_' + s.word] = true; this.flags['typed_' + s.word] = true; }
          if (s.do === 'period') this.flags.period = s.to;
          if (s.do === 'trip') return { trip: s.to };
          if (s.do === 'end') this.ended = true;
        }
      }
    };
    for (;;) {
      const result = visit(story.nodes[node]);
      if (result?.go) { node = result.go; continue; }
      if (result?.trip) { this.place = result.trip; this.run(STORIES[this.place].start); }
      break;
    }
  }
  fire(key, picks = []) {
    const values = STORIES[this.place].on[key]; assert(values, `${this.place}: no trigger ${key}`);
    const entry = (Array.isArray(values) ? values : [values]).map(x => typeof x === 'string' ? { node: x } : x).find(x => this.cond(x.if));
    assert(entry, `${this.place}: inactive ${key}`); this.run(entry.node, picks);
    assert.equal(picks.length, 0, 'Unused test choices');
  }
  move(to) {
    assert(TRIPS[this.place].includes(to), `No route ${this.place} -> ${to}`);
    const route = Object.entries(STORIES[this.place].nodes).find(([, body]) => body.length === 1 && body[0].do === 'trip' && body[0].to === to);
    assert(route, `No authored trip ${this.place} -> ${to}`); this.run(route[0]); assert.equal(this.place, to);
  }
}
// The route graph must support every optional detour and a return home in both periods.
for (const period of PERIODS) for (const start of OPEN_PLACES) {
  const seen = new Set([start]), queue = [start];
  while (queue.length) for (const next of TRIPS[queue.shift()]) if (!seen.has(next)) { seen.add(next); queue.push(next); }
  assert.equal(seen.size, OPEN_PLACES.length, `${period}: stranded at ${start}`);
}
const transcripts = [];
let routes = 0;
for (const historyKind of ['cold', 'lunch', 'warmth']) for (const order of [false, true]) for (const experiment of [false, true])
for (const topic of ['d2_norway', 'd2_quiet', 'd2_after_work']) for (const food of ['riceball', 'sandwich']) for (const extra of [false, true]) for (const meetFirst of [false, true]) {
  const warm = historyKind !== 'cold';
  const history = { know_matte: true, know_ugoite: true, know_ohayo: true, know_akete: warm, lunch_mori: historyKind !== 'lunch', lunch_mio: historyKind === 'lunch', mio_warm: warm ? 2 : 0, going_home: true };
  const p = new Play(history); p.run('d2_room'); assert(!p.flags.going_home);
  if (extra) p.fire('talk:computer', ['d2_write_home', 'd2_send_home']);
  p.move('dorm_court'); p.move('east_lane');
  if (extra) { p.move('east_coast'); p.fire('talk:lookout'); p.move('east_lane'); }
  p.move('plaza'); p.move('forecourt'); p.move('gate'); p.move('train');
  assert.equal(!!p.flags.d2_mio_here, warm);
  p.fire('talk:door_test', [...(experiment ? ['d2_voice_test'] : []), order ? 'd2_order_sensor' : 'd2_keep_sensor']);
  assert(p.flags.d2_ticket_done); assert.equal(!!p.flags.d2_order_sensor, order);
  assert.equal(p.hooks.filter(x => x.do === 'doorTest').length, 1);
  assert.equal(p.hooks.filter(x => x.do === 'doorsHold').length, Number(experiment));
  p.fire('talk:door_test'); assert.equal(p.hooks.filter(x => x.do === 'doorTest').length, 1, 'Repeat test replayed');
  p.move('gate'); p.move('forecourt'); p.move('office');
  p.fire('talk:emi', [warm ? 'd2_limits' : 'd2_assess']);
  assert(p.lines.some(s => s.includes(order ? 'put the order through' : 'keep the money')), 'Report was not read');
  p.fire(meetFirst ? 'talk:my_chair' : 'talk:my_desk'); assert(p.flags.d2_shift_done); assert.equal(p.flags.period, 'evening');
  p.move('forecourt'); p.move('plaza'); p.move('shotengai');
  if (meetFirst) p.fire('talk:kenji');
  p.fire('talk:party_seat', [{ go: 'd2_take_food', food }, topic]);
  assert.equal(p.flags.d2_food, food); assert(p.flags.know_tabetai); assert(!p.flags.know_nomitai);
  assert.equal(p.hooks.filter(x => x.do === 'type' && x.word === 'tabetai').length, 1);
  if (extra) { p.fire('talk:kenji', ['d2_drink_word']); assert(p.flags.know_nomitai); }
  p.move('east_lane'); p.move('shotengai');
  p.fire('talk:party_seat', ['d2_goodnight']); assert(p.flags.d2_party_done);
  if (extra) { p.fire('talk:mori'); p.fire('talk:mori'); assert(p.flags.d2_mori_rest_seen); }
  p.move('east_lane'); p.move('plaza'); p.move('forecourt'); p.move('office');
  assert(p.hooks.at(-1).text.includes('Head home'), 'Office return lost the home goal');
  p.move('forecourt'); p.move('gate'); p.move('train');
  assert(!p.flags.d2_mio_here, 'Mio duplicated at the station after work');
  assert(p.hooks.at(-1).text.includes('Head home'), 'Station return lost the home goal');
  p.move('gate'); p.move('forecourt'); p.move('plaza'); p.move('east_lane');
  p.move('east_coast'); p.move('east_lane'); p.move('dorm_court'); p.move('dorms');
  assert(p.ended && p.flags.d2_complete);
  for (const [k, v] of Object.entries(history)) if (k !== 'going_home') assert.equal(p.flags[k], v, `Changed day-1 history ${k}`);
  // A saved flag set must preserve typed words and completed scenes on return.
  const resumed = new Play(JSON.parse(JSON.stringify(p.flags))); resumed.place = 'shotengai'; resumed.run('d2_arrive');
  assert(!resumed.hooks.some(x => x.do === 'type')); assert(resumed.flags.d2_party_done);
  if (process.env.TRANSCRIPTS) transcripts.push({ historyKind, order, experiment, food, extra, meetFirst, topic, lines: p.lines });
  routes++;
}
if (process.env.TRANSCRIPTS) fs.writeFileSync(process.env.TRANSCRIPTS, JSON.stringify(transcripts, null, 2) + '\n');
console.log(`day 2 draft: ${nodeCount} nodes, ${typed.length} new words, ${routes} complete branch routes passed`);
console.log('Scene hooks, trips, audio, placement and runtime save integration remain pending in story/day2/README.md.');
