// Day 1 at the security gate (#575): a jump over the shut gate brings the guard's call-back, and walking back in from
// the forecourt is a trip into the security room, as often as he likes.
import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({
  resolve(s, c, n) {
    if (s === 'three') return n(new URL('../../vendor/three/three.module.js', import.meta.url).href, c);
    if (s.startsWith('three/addons/')) return n(new URL('../../vendor/' + s.slice(13), import.meta.url).href, c);
    return n(s, c);
  },
});
const { createConditionEvaluator } = await import('../../js/narrative/conditions.js');
const { waysOut } = await import('../../js/travel/ways.js');
const { canTravel, PLACE_DETAILS } = await import('../../js/places/definitions.js').then(async (d) => ({
  ...d,
  PLACE_DETAILS: (await import('../../js/places/catalog.js')).PLACE_DETAILS,
}));
const gate = (await import('../../story/gate.js')).default;
const forecourt = (await import('../../story/forecourt.js')).default;

const evaluator = (flags) => createConditionEvaluator((k) => ({ day: 1, period: 'morning', ...flags })[k] ?? 0);
// the node a trigger runs now, as the runner resolves it (a used `once` is skipped)
function resolve(story, key, flags, used = new Set()) {
  const cond = evaluator(flags);
  for (const e of [story.on[key]].flat()) {
    const t = typeof e === 'string' ? { node: e } : e;
    if (t.once && used.has(t.node)) continue;
    if (cond(t.if)) return t.node;
  }
  return null;
}
// the steps a node runs with these flags, `if` steps opened into their branch
const flatten = (steps, cond) =>
  steps.flatMap((s) => (s && typeof s === 'object' && 'if' in s && (s.then || s.else) ? flatten(cond(s.if) ? s.then : s.else || [], cond) : [s]));

test('past the shut gate without going through it, the guard calls him back every time', () => {
  for (const flags of [{}, { greeted_guard: true, guard_asked: true }, { jammed: true, guard_asked: true }])
    assert.equal(resolve(gate, 'zone:past_gate', flags), 'gate_jumped', JSON.stringify(flags));
  assert.equal(resolve(gate, 'zone:past_gate', {}, new Set(['past_gate'])), 'gate_jumped', 'never used up');
  const steps = gate.nodes.gate_jumped;
  assert.ok(steps.some((s) => s.do === 'sendBack'), 'he is taken back to the readers');
  const line = steps.find((s) => s.say === 'guard');
  assert.ok(line.overheard && /カード/.test(line.text), 'the guard asks for the card, in Japanese');
  assert.deepEqual(line.clear, ['ゲート', 'カード'], 'only the loanwords show clear');
  assert.ok(steps.findIndex((s) => s.say === 'eric') > steps.findIndex((s) => s.do === 'sendBack'));
  assert.ok(!steps.some((s) => s.set === 'gate_through'), 'a jump never counts as getting through');
  assert.ok(PLACE_DETAILS.gate.hooks.includes('sendBack'));
});

test('through the gate the way the story opens it, the zone lets him on to the exit', () => {
  assert.equal(resolve(gate, 'zone:past_gate', { gate_through_way: true }), 'past_gate');
  assert.equal(resolve(gate, 'zone:past_gate', { gate_through_way: true }, new Set(['past_gate'])), null);
  assert.equal(resolve(gate, 'zone:lift_front', { gate_through: true }), 'to_lift');
  assert.equal(resolve(gate, 'zone:lift_front', {}), null, 'a jumper never reaches the exit trip');
  assert.ok(![gate.on['zone:lift_front']].flat().some((t) => t.once), 'he can leave again after coming back in');
});

test('day 1: walking back into the station door from the forecourt is the trip into the security room', () => {
  assert.ok(canTravel('forecourt', 'gate', 1));
  for (const flags of [{}, { going_home: true, period: 'evening' }]) {
    const cond = evaluator(flags);
    const way = waysOut('forecourt', forecourt, { cond, day: 1 }).find((w) => w.to === 'gate');
    assert.ok(way, JSON.stringify(flags));
    assert.equal(resolve(forecourt, 'zone:station_exit', flags), 'to_station');
    assert.equal(resolve(forecourt, 'talk:station_exit', flags), 'to_station');
  }
});

test('back in the security room after getting through, the morning greeting does not play again', () => {
  const morning = flatten(gate.nodes.lobby_in, evaluator({ gate_through: true }));
  assert.deepEqual(morning, [{ do: 'goal', text: 'Leave the station and walk to head office.' }]);
  const evening = flatten(gate.nodes.lobby_in, evaluator({ gate_through: true, going_home: true }));
  assert.equal(evening.length, 1);
  assert.match(evening[0].text, /Head home/);
  const first = flatten(gate.nodes.lobby_in, evaluator({}));
  assert.ok(first.some((s) => s.say === 'guard'), 'the first arrival still has the greeting');
});

test('the gate-jump hook: back through the open flaps, or a crossfade past a jam; a reopened gate stays open', async () => {
  const { gateJump } = await import('../../js/places/gate-jump.js');
  const { flags } = await import('../../js/narrative/state.js');
  const BZ = -0.5;
  const pos = { x: 0, z: BZ - 1.2, set(x, y, z) { Object.assign(this, { x, y, z }); } };
  const calls = [];
  const game = {
    player: { root: { position: pos, rotation: { y: 0 } }, setState: (s) => calls.push(s) },
    walker: { stop: () => calls.push('stop'), sync: () => {} },
    snapshot: () => 'shot',
    crossfade: (s) => calls.push('crossfade:' + s),
    wait: async () => {},
  };
  const st = { jam: 1, gateOpen: false, flapWant: 0 };
  const opened = [];
  const jump = gateJump(game, { st, BZ, cam: { snap: () => {} }, setGate: (s) => opened.push(s), gateOpenFlag: 'gateOpen', sfx: () => {} });
  await jump.sendBack();
  assert.deepEqual([pos.x, pos.z], [0, BZ + 0.85]);
  assert.ok(calls.includes('crossfade:shot'));
  assert.equal(st.flapWant, 0, 'a jammed gate stays shut');
  assert.equal(game.player.scripted, false);
  assert.equal(game.walker.locked, false);
  flags.gateOpen = false;
  jump.reopen(1);
  assert.deepEqual(opened, []);
  flags.gateOpen = true;
  jump.reopen(2);
  assert.deepEqual(opened, [], 'day 2 opens its own gate');
  jump.reopen(1);
  assert.deepEqual(opened, ['open']);
  delete flags.gateOpen;
});
