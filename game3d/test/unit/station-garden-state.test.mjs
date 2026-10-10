import assert from 'node:assert/strict';
import test from 'node:test';
import { gardenState, freeBench } from '../../js/places/station-garden/state.js';
test('Continue keeps completed collection and routine progress without retaining mutable save references', () => {
  const source = {
    day: 3,
    period: 'morning',
    patch: 1,
    phase: 'collect',
    time: 1.8,
    collected: [1, 0.6],
    at: [-0.55, -79.2],
  };
  const state = gardenState(JSON.parse(JSON.stringify(source)));
  assert.deepEqual(state, source);
  state.collected[0] = 0;
  assert.equal(source.collected[0], 1);
  assert.deepEqual(gardenState({ phase: 'bad', time: Infinity, at: [NaN, 2] }).at, null);
});
test('a person at either seat excludes that bench while hidden people do not', () => {
  const seats = { a: { x: 0, z: 0 }, b: { x: 0, z: 2 } };
  const person = (z, visible = true) => ({ root: { visible, position: { x: 0, z } } });
  assert.equal(freeBench(seats, []), 'a');
  assert.equal(freeBench(seats, [person(0)]), 'b');
  assert.equal(freeBench(seats, [person(0), person(2)]), null);
  assert.equal(freeBench(seats, [person(0, false)]), 'a');
});
