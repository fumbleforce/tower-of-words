// Fast travel's rules (game3d/js/travel/, docs/game/systems.md "Fast travel") on fixed cases, the route check over
// each day's ways, and the visited places' save migration.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { createConditionEvaluator } from '../../js/narrative/conditions.js';
import { waysOut, waysGraph, keepPublic, isLift } from '../../js/travel/ways.js';
import { findRoute } from '../../js/travel/route.js';
import { placeStates, openToday, REASON } from '../../js/travel/rules.js';
import { seedVisited, loadVisited, visited } from '../../js/travel/visited.js';
import { PINS } from '../../js/travel/pins.js';
import { PLACE_NAMES } from '../../js/places/definitions.js';
import { fastLiftArrival } from '../../js/travel/arrival.js';
import { cardHTML, listHTML } from '../../js/ui/map/panel.js';

const STORY = new URL('../../story/', import.meta.url);
// a day's stories, as runner.load finds them
async function stories(day) {
  const out = {};
  for (const p of [...openToday(day), 'transitions']) {
    const f = new URL(`${day > 1 ? `day${day}/` : ''}${p}.js`, STORY);
    out[p] = fs.existsSync(f) ? (await import(f.href)).default : { nodes: {}, on: {} };
  }
  return out;
}
const condOf = (flags) => createConditionEvaluator((k) => flags[k] ?? 0);
async function states(day, here, flags = {}, extra = {}) {
  const { transitions, ...byPlace } = await stories(day);
  const opts = { day, visited: extra.visited, cond: condOf(flags), transitions: day === 1 ? transitions : null };
  const graph = waysGraph(byPlace, openToday(day), opts);
  const afterWork = waysGraph(byPlace, openToday(day), { ...opts, cond: condOf({ ...flags, going_home: true }) });
  return { graph, s: placeStates({ here, day, graph, afterWork, visited: new Set(), ...extra }) };
}
const MORNING = { gate_through: true, at_work: false };
const EVENING = { gate_through: true, going_home: true };

test('day 1 morning at the forecourt: the plaza and the east lane go, the dorm courtyard opens after work', async () => {
  const { s } = await states(1, 'forecourt', MORNING);
  assert.equal(s.forecourt.state, 'here');
  assert.equal(s.plaza.state, 'go');
  assert.equal(s.east_lane.state, 'go');
  assert.deepEqual(s.east_lane.route.path, ['forecourt', 'plaza', 'east_lane']);
  assert.equal(s.east_lane.route.via, 'plaza');
  assert.equal(s.dorm_court.state, 'later');
  assert.equal(s.dorm_court.reason, REASON.afterWork);
  assert.equal(s.office.state, 'scene');
  assert.equal(s.office.reason, REASON.lift);
});

test('day 1 in B2 at work: nothing goes; after work only the lift leaves', async () => {
  const work = (await states(1, 'office', MORNING)).s;
  for (const p of Object.values(work)) assert.ok(p.state !== 'go', `${p.id} goes from B2 at work`);
  assert.equal(work.plaza.state, 'stuck');
  assert.equal(work.plaza.reason, REASON.stuck);
  const home = (await states(1, 'office', EVENING)).s;
  assert.equal(home.plaza.state, 'stuck');
  assert.equal(home.plaza.reason, REASON.sceneOut);
});

test('day 1 on the train: no way out, so nothing goes', async () => {
  const { s } = await states(1, 'train', {});
  assert.ok(Object.values(s).every((p) => p.state !== 'go'));
});

test('while something runs, a place that would go waits with its reason', async () => {
  const { s } = await states(1, 'plaza', MORNING, { busy: 'talking' });
  assert.equal(s.east_lane.state, 'wait');
  assert.equal(s.east_lane.reason, REASON.talking);
  const b = (await states(1, 'plaza', MORNING, { busy: 'busy' })).s;
  assert.equal(b.east_lane.reason, REASON.busy);
});

test('day 3: the harbour is not open today; day 2 the sports ground neither', async () => {
  assert.equal((await states(3, 'plaza', {})).s.harbour.state, 'closed');
  assert.equal((await states(3, 'plaza', {})).s.harbour.reason, REASON.closed);
  assert.equal((await states(2, 'plaza', {})).s.sports.state, 'closed');
});

test('a place he has not been to can still be travelled to (any open place, 4b)', async () => {
  const { s } = await states(1, 'plaza', MORNING, { visited: new Set(['plaza']) });
  assert.equal(s.sports.state, 'go');
  assert.equal(s.sports.visited, false);
});

test('a trigger a private plugin adds opens no way', () => {
  const story = { on: { 'zone:a': 'to_a' }, nodes: { to_a: [{ do: 'trip', to: 'forecourt' }] } };
  keepPublic(story);
  story.on['zone:secret'] = 'to_b';
  story.nodes.to_b = [{ do: 'trip', to: 'shotengai' }];
  const ways = waysOut('plaza', story, { cond: condOf({}), day: 1 });
  assert.deepEqual(
    ways.map((w) => w.to),
    ['forecourt'],
  );
});

test('a way with lines or a next move is a scene; a plain walk is not', () => {
  const story = {
    on: { 'zone:a': 'a', 'zone:b': 'b', 'talk:c': 'c' },
    nodes: { a: [{ do: 'trip', to: 'forecourt' }], b: ['> hi', { do: 'trip', to: 'shotengai' }], c: [{ do: 'next' }] },
  };
  const ways = Object.fromEntries(waysOut('plaza', story, { cond: condOf({}), day: 1 }).map((w) => [w.to, w.scene]));
  assert.deepEqual(ways, { forecourt: false, shotengai: true });
});

// The route check: for each day at its main flag states, every place marked go has a route whose every leg is a way
// out the story lets him walk now, none of them a scene or the lift, and the route starts where he is.
const CHECKPOINTS = [
  [1, MORNING, ['forecourt', 'plaza', 'east_lane', 'shotengai', 'sports', 'harbour', 'karaoke_booth']],
  [1, EVENING, ['forecourt', 'plaza', 'shotengai', 'dorm_court']],
  [2, { d2_started: true }, ['dorms', 'dorm_court', 'east_lane', 'plaza', 'forecourt', 'gate', 'train', 'office']],
  [3, {}, ['dorms', 'plaza', 'sports', 'pool', 'east_coast', 'shotengai', 'karaoke', 'gate']],
];
test('route check: every go is a chain of plain ways open now, never the lift', async () => {
  let checked = 0;
  for (const [day, flags, heres] of CHECKPOINTS)
    for (const here of heres) {
      const { graph, s } = await states(day, here, flags);
      for (const p of Object.values(s)) {
        if (p.state !== 'go') continue;
        const path = p.route.path;
        assert.equal(path[0], here);
        assert.equal(path.at(-1), p.id);
        for (let i = 1; i < path.length; i++) {
          const way = graph[path[i - 1]].find((w) => w.to === path[i]);
          assert.ok(way && !way.scene, `day ${day}: ${path[i - 1]} -> ${path[i]} is not a plain way`);
          assert.ok(!isLift(path[i - 1], path[i]), `day ${day}: the route to ${p.id} takes the lift`);
        }
        checked++;
      }
    }
  assert.ok(checked > 40, `only ${checked} routes checked`);
});

test('the route is the shortest by the pins, and an unreachable place has none', () => {
  const g = { a: [{ to: 'plaza' }], plaza: [{ to: 'east_lane' }, { to: 'shotengai' }], shotengai: [{ to: 'east_lane' }] };
  const r = findRoute({ ...g, a: undefined, forecourt: [{ to: 'plaza' }] }, 'forecourt', 'east_lane');
  assert.deepEqual(r.path, ['forecourt', 'plaza', 'east_lane']);
  assert.ok(r.minutes >= 1);
  assert.equal(findRoute(g, 'plaza', 'harbour'), null);
});

test('every place has a pin or a place it is inside, and a name', () => {
  for (const p of Object.keys(PLACE_NAMES)) assert.ok(PINS[p]?.at || PINS[p]?.in, p);
});

test('visited: saved as a list; an older save is seeded from its day and place', () => {
  assert.deepEqual(seedVisited({ day: 1, place: 'gate' }), ['train', 'gate']);
  assert.deepEqual(seedVisited({ day: 1, place: 'plaza' }).sort(), ['forecourt', 'gate', 'plaza', 'train']);
  assert.ok(seedVisited({ day: 1, place: 'plaza', flags: { going_home: true } }).includes('office'));
  assert.ok(seedVisited({ day: 2, place: 'dorms' }).includes('dorm_court'));
  loadVisited({ visited: ['harbour'] });
  assert.deepEqual([...visited], ['harbour']);
  loadVisited({ day: 3, place: 'gym' });
  assert.ok(visited.has('gym') && visited.has('train'));
});


test('discovered B2 is a direct map destination on days 2–5, still gated before discovery', async () => {
  for (const day of [2, 3, 4, 5]) {
    const unseen = (await states(day, 'plaza')).s;
    assert.equal(unseen.office.state, 'scene');
    const {s, graph} = await states(day, 'plaza', {}, {visited: new Set(['office'])});
    assert.equal(s.office.state, 'go', `day ${day}`);
    assert.equal(s.office.route.via, 'forecourt');
    assert.equal(graph.forecourt.find(w => w.to === 'office').scene, false);
    assert.match(listHTML(s, null), /data-pick="office"/);
    assert.match(cardHTML(s.forecourt, s, {phone: true}), /data-pick="office"/);
    assert.match(cardHTML(s.office, s, {phone: true}), /Go there/);
    const back = (await states(day, 'office', {}, {visited: new Set(['office'])})).s;
    assert.equal(back.forecourt.state, 'go');
    assert.equal(back.plaza.state, 'go');
    const busy = (await states(day, 'plaza', {}, {visited: new Set(['office']), busy:'talking'})).s;
    assert.equal(busy.office.state, 'wait');
  }
});

test('B2 shortcut preserves first-day introduction, work and after-work return gates', async () => {
  const visited = new Set(['office']);
  assert.equal((await states(1,'forecourt',MORNING,{visited})).s.office.state,'scene');
  assert.equal((await states(1,'office',MORNING,{visited})).s.plaza.state,'stuck');
  assert.equal((await states(1,'office',EVENING,{visited})).s.forecourt.state,'go');
  assert.equal((await states(1,'forecourt',EVENING,{visited})).s.office.state,'later');
  const work = (await states(2,'office',{d2_ticket_done:true,d2_brief_done:true},{visited})).s;
  assert.equal(work.forecourt.state,'go'); // Day 2's authored exit remains open during the shift.
});

test('fast lift arrival and resumed fast arrival use free landings without changing progression', () => {
  for (const [name,from,at] of [['office','forecourt',[-5.45,-2.4]],['forecourt','office',[8,2]]]) {
    const game={transition:{fast:true,from,to:name,phase:'arriving'},
      player:{root:{position:{set(...p){this.at=p;}},rotation:{}},setState(s){this.state=s;}},
      walker:{sync(){this.synced=true;}}, period:'afternoon',yen:5000};
    const place={name,spots:{lift_out:at},liftSite:{out:at},nav:{free:()=>true},cam:{snap(){}}};
    assert.equal(fastLiftArrival(game,place),true);
    assert.deepEqual(game.player.root.position.at,[at[0],0,at[1]]);
    assert.equal(game.walker.synced,true);
    assert.equal(game.period,'afternoon');assert.equal(game.yen,5000);
    place.nav.free=()=>false;
    assert.throws(()=>fastLiftArrival(game,place),/free lift landing/);
    game.transition.fast=false;
    assert.equal(fastLiftArrival(game,place),false);
  }
});
