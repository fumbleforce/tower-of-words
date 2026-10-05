import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test, beforeEach } from 'node:test';

// the same browser stand-ins as tickets.test.mjs, so the real sim save runs in Node
register(new URL('../support/save-loader.mjs', import.meta.url));
function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key), clear: () => data.clear() };
}
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.window = { addEventListener() {}, dispatchEvent() {} };
globalThis.fetch = async () => ({ ok: false, json: async () => [] });
globalThis.location = { search: '', reload() {} };
const canvas = { width: 100, height: 100 };
globalThis.document = {
  querySelector: selector => selector === '#c' ? canvas : null,
  addEventListener() {},
  createElement: () => ({ getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,fixture' }),
  body: { classList: { contains: () => false, add() {} } },
};
const S = await import('../../js/sim.js');
const { flags, cond } = await import('../../js/narrative/state.js');
const { dateOf } = await import('../../js/bonds/model.js');
const { personFor, castSet, setRole } = await import('../../js/roles.js');
const { createClubs, memberFlag, progressFlag, dayFlag, eventFlag, WEEKDAYS } = await import('../../js/clubs/model.js');
const { PLACE_DETAILS } = await import('../../js/narrative/contracts.js');
const { GLOBAL_HOOKS } = await import('../../js/narrative/hooks.js');
const { canTravel } = await import('../../js/places/definitions.js');
const { DAYS } = await import('../../js/days.js');
const CLUBS = (await import('../../story/clubs.js')).default;
const { STORIES: DAY3 } = await import('../../story/day3/index.js');

const P = S.PERIODS;
const make = (data = CLUBS) => createClubs({ flags, cond, data: () => data, dateOf, periods: P, personFor });
let game;
beforeEach(() => {
  globalThis.localStorage.clear();
  for (const k of Object.keys(flags)) delete flags[k];
  flags.day = 3;
  game = { found: new Set(), hooks: {}, runner: { run: async () => {}, trigger: () => {} },
    place: { name: 'plaza', people: {} }, story: {}, busy: false, queue: [], beat: fn => fn() };
  globalThis.window.__game = game;
  S.restore(game, { v: 1, day: 3, period: 'morning', flags: { day: 3 }, rel: { bonds: { v: 1, day: 3, p: {}, rel: {} } } });
  S.installSim(game);
});

test('the story clubs are complete: places, weekly meetings, members through roles, session nodes', () => {
  const L = CLUBS.labels;
  for (const k of ['boshu', 'nichiji', 'basho', 'nyukai']) for (const f of ['ja', 'ro', 'en']) assert.ok(L[k]?.[f], `labels.${k}.${f}`);
  assert.deepEqual(Object.keys(CLUBS.clubs).sort(), ['art', 'karaoke', 'swimming', 'tennis']);
  const c = make();
  for (const [id, club] of Object.entries(CLUBS.clubs)) {
    for (const k of ['name', 'ja', 'ro', 'poster']) assert.equal(typeof club[k], 'string', `${id}.${k}`);
    assert.ok(club.meets.length, `${id} meets`);
    for (const m of club.meets) {
      assert.ok(WEEKDAYS.includes(m.weekday), `${id}: weekday ${m.weekday}`);
      assert.ok(P.includes(m.period), `${id}: period ${m.period}`);
      assert.ok(PLACE_DETAILS[m.place], `${id}: place ${m.place}`);
    }
    assert.ok(club.sessions.length, `${id} has sessions`);
    for (const n of [...club.sessions, ...(club.events || []).map(e => e.node)]) {
      assert.ok(Array.isArray(CLUBS.nodes[n]), `${id}: node ${n} in story/clubs.js`);
      assert.ok(!PLACE_DETAILS[n], `${id}: node ${n} is not a place id`);
    }
    for (const m of club.members) if (m.startsWith('role:')) assert.ok(personFor(castSet(), m.slice(5)), `${id}: role ${m}`);
    assert.ok(c.members(id, castSet()).length, `${id} has members`);
    for (const [thing] of Object.entries(club.show || {}))
      assert.ok(club.meets.some(m => PLACE_DETAILS[m.place].things[thing]), `${id}: marker ${thing} is a thing in its place`);
  }
  // session steps only use what any place has: lines, narration, global hooks
  for (const [n, steps] of Object.entries(CLUBS.nodes))
    for (const s of steps) if (s && typeof s === 'object' && s.do) assert.ok(GLOBAL_HOOKS.includes(s.do), `${n}: hook ${s.do}`);
});

test('members come through the cast layer: another person in a role is in the club', () => {
  const c = make();
  assert.deepEqual(c.members('swimming', castSet()), ['emi', 'kuro']);
  const cast = setRole(castSet(), 'team_lead', 'rei');
  assert.deepEqual(c.members('swimming', cast), ['rei', 'kuro']);
  assert.deepEqual(c.members('karaoke', castSet()), ['kenji', 'kuroda']);
});

test('the schedule: next meeting by weekday, today until its period has passed or he went, season lines', () => {
  const c = make();
  assert.equal(dateOf(3), 'Sat 3 Oct');
  const at = (id, day, period) => {
    const m = c.nextMeeting(id, day, period);
    return m && `${m.day} ${m.weekday} ${m.period} ${m.place}`;
  };
  assert.equal(at('swimming', 3, 'morning'), '3 Sat evening pool');
  assert.equal(at('swimming', 3, 'evening'), '3 Sat evening pool');
  assert.equal(at('tennis', 3, 'morning'), '4 Sun evening sports');
  assert.equal(at('art', 3, 'morning'), '6 Tue evening dorm_commons');
  assert.equal(at('karaoke', 3, 'morning'), '7 Wed evening karaoke_booth');
  // after the outdoor season the Saturday club meets in the gym
  assert.equal(at('swimming', 4, 'morning'), '10 Sat evening gym');
  flags[dayFlag('swimming')] = 3; // he went tonight
  assert.equal(at('swimming', 3, 'evening'), '10 Sat evening gym');
  // a single event is on the board until its day has passed
  const data = { ...CLUBS, events: [{ id: 'fair', title: 'Book fair', ja: '古本市', ro: 'furuhonichi', day: 4, period: 'afternoon', place: 'plaza', where: 'Fountain plaza', text: 'x' }] };
  const e = make(data);
  assert.ok(e.posters(4, 'lunch').some(p => p.kind === 'event' && p.next.weekday === 'Sun'));
  assert.ok(!e.posters(4, 'evening').some(p => p.kind === 'event'));
  assert.ok(!e.posters(5, 'morning').some(p => p.kind === 'event'));
});

test('posters are up from day 3; joining takes the slip once', () => {
  const c = make();
  flags.day = 2;
  assert.deepEqual(c.posters(2, 'morning'), [], 'no club posters before day 3');
  flags.day = 3;
  assert.deepEqual(c.posters(3, 'morning').map(p => p.id), ['swimming', 'tennis', 'art', 'karaoke']);
  assert.equal(c.join('tennis'), true);
  assert.equal(c.join('tennis'), false, 'joining twice does nothing');
  assert.equal(c.join('chess'), false, 'unknown clubs are refused');
  assert.equal(cond('club_tennis && clubs_joined == 1'), true);
  assert.equal(c.posters(3, 'morning').find(p => p.id === 'tennis').joined, true);
});

test('a session is due only for a member, at its place, in its period, once that day; progress counts up', () => {
  const c = make();
  assert.equal(c.due('pool', 3, 'evening'), null, 'not a member yet');
  c.join('swimming');
  assert.equal(c.due('pool', 3, 'afternoon'), null, 'outside meeting time the place is quiet');
  assert.equal(c.due('gym', 3, 'evening'), null, 'not where it meets today');
  assert.deepEqual(c.due('pool', 3, 'evening'), { id: 'swimming', node: 'club_swimming_1', event: null });
  assert.deepEqual(c.attend('swimming', 3), { node: 'club_swimming_1', event: null });
  assert.equal(flags[progressFlag('swimming')], 1);
  assert.equal(c.due('pool', 3, 'evening'), null, 'once a day');
  assert.deepEqual(c.due('gym', 10, 'evening'), { id: 'swimming', node: 'club_swimming_2', event: null });
  c.attend('swimming', 10);
  assert.equal(c.due('gym', 17, 'evening').node, 'club_swimming_2', 'the last session repeats');
});

test('a special event runs instead of the week’s session once it is due, and only once', () => {
  const data = structuredClone(CLUBS);
  data.clubs.tennis.events = [{ id: 'cup', node: 'club_tennis_cup', after: 1, if: 'step_rei >= 0' }];
  data.nodes.club_tennis_cup = ['> cup'];
  const c = make(data);
  c.join('tennis');
  assert.equal(c.due('sports', 4, 'evening').node, 'club_tennis_1');
  c.attend('tennis', 4);
  assert.deepEqual(c.due('sports', 11, 'evening'), { id: 'tennis', node: 'club_tennis_cup', event: 'cup' });
  c.attend('tennis', 11);
  assert.equal(flags[eventFlag('tennis', 'cup')], true);
  assert.equal(c.due('sports', 18, 'evening').node, 'club_tennis_2');
});

test('membership and progress survive a save and a restore', () => {
  const c = make();
  c.join('swimming');
  c.join('art');
  c.attend('swimming', 3);
  S.save(game);
  const saved = JSON.parse(JSON.stringify(S.loadSave()));
  for (const k of Object.keys(flags)) delete flags[k];
  assert.deepEqual(make().joined(), []);
  S.restore(game, saved);
  const back = make();
  assert.deepEqual(back.joined(), ['swimming', 'art']);
  assert.equal(back.progress('swimming'), 1);
  assert.equal(flags[memberFlag('art')], true);
  assert.equal(back.due('pool', 3, 'evening'), null, 'tonight’s session stays done');
  assert.equal(back.nextMeeting('swimming', 3, 'evening').day, 10);
});

test('the day-3 test skeleton: ?day=3 only, its ways allowed, its ids real', () => {
  assert.equal(DAYS[3].dir, 'day3/');
  for (const [place, st] of Object.entries(DAY3)) {
    const d = PLACE_DETAILS[place];
    assert.ok(d, place);
    assert.ok(st.nodes[st.start], `${place}: start node`);
    for (const [k, v] of Object.entries(st.on)) {
      const [kind, id] = k.split(':');
      if (kind === 'talk') assert.ok(d.things[id], `${place}: thing ${id}`);
      if (kind === 'zone') assert.ok(d.zones.includes(id), `${place}: zone ${id}`);
      assert.ok(st.nodes[v], `${place}: node ${v}`);
    }
    for (const steps of Object.values(st.nodes))
      for (const s of steps) {
        if (s?.do === 'trip') assert.ok(canTravel(place, s.to, 3), `${place} -> ${s.to}`);
        if (s?.do) assert.ok(GLOBAL_HOOKS.includes(s.do), `${place}: hook ${s.do}`);
        if (s?.go) assert.ok(st.nodes[s.go], `${place}: go ${s.go}`);
        for (const o of s?.choice || []) assert.ok(st.nodes[o.go], `${place}: choice ${o.go}`);
      }
  }
  // every club place can be reached from room 203 on day 3
  const seen = new Set(['dorms']), todo = ['dorms'];
  while (todo.length) {
    const from = todo.shift();
    for (const n of Object.keys(DAY3)) if (canTravel(from, n, 3) && !seen.has(n)) { seen.add(n); todo.push(n); }
  }
  for (const c of Object.values(CLUBS.clubs)) for (const m of c.meets) assert.ok(seen.has(m.place), `day 3 reaches ${m.place}`);
});
