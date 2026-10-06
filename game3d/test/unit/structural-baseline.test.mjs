import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { expandMc, PROTAGONISTS } from '../../js/mc.js';
import { STORY_FILES, buildGraph } from '../../../bible/story-graph.js';
import { assertRegistered, assertPlaceRegistered } from '../../js/narrative/registration.js';
import { DEFAULT_SPEAKERS, PORTRAITS, ITEMS, PLACE_DETAILS } from '../../js/narrative/contracts.js';
import baseline from '../fixtures/structural-baseline.json' with { type: 'json' };
import declarations from '../fixtures/declarations-before.json' with { type: 'json' };

test('shared literals and complete place registrations match the pre-extraction runtime', () => {
  assert.deepEqual({ DEFAULT_SPEAKERS, PORTRAITS, ITEMS, places: PLACE_DETAILS }, declarations);
});

test('structural migration preserves ordered graph IDs, edges and engine declarations', async () => {
  const root = new URL('../../../', import.meta.url);
  const files = {}, mods = {};
  for (const name of STORY_FILES) {
    const file = `game3d/story/${name}.js`;
    mods[name] = expandMc(structuredClone((await import(new URL(file, root))).default), PROTAGONISTS.eric);
    files[file] = fs.readFileSync(new URL(file, root), 'utf8');
  }
  const graph = buildGraph({ files, mods });
  const actual = { engine: graph.engine, places: graph.places.map(place => place.id),
    nodes: [...graph.nodes.keys()], edges: graph.edges, flags: [...graph.flags.keys()] };
  const plain = JSON.parse(JSON.stringify(actual, (_key, value) =>
    value instanceof Map ? Object.fromEntries(value) : value instanceof Set ? [...value] : value));
  // Old source regex missed direct gate runner events. Their explicit declarations
  // add provenance only; all ordered graph IDs and edges must still match.
  const expected = structuredClone(baseline);
  expected.engine.events.gate = { card_red: null, card_ok: null };
  expected.engine.prefix.gave_ = ['game3d/js/gameplay/gifts.js'];
  expected.engine.prefix.shown_ = ['game3d/js/narrative/hooks/movement.js'];
  expected.engine.prefix.typed_ = ['game3d/js/narrative/hooks/progression.js'];
  expected.engine.prefix.bought_ = ['game3d/js/narrative/hooks/progression.js'];
  expected.engine.exact.cant_buy = ['game3d/js/narrative/hooks/progression.js'];
  expected.engine.exact.say_tip = ['game3d/js/ui.js'];
  expected.engine.prefix.ticket_ = ['game3d/js/tickets/model.js'];
  expected.engine.prefix.ticketread_ = ['game3d/js/tickets/model.js'];
  expected.engine.exact.clubs_joined = ['game3d/js/clubs/model.js'];
  for (const k of ['club_', 'clubprog_', 'clubday_', 'clubev_']) expected.engine.prefix[k] = ['game3d/js/clubs/model.js'];
  expected.engine.prefix.met_ = ['game3d/js/sim.js', 'game3d/js/saves/met.js'];
  expected.engine.prefix.bond2_ = ['game3d/js/sim.js'];
  expected.engine.prefix.period_ = ['game3d/js/period-flags.js'];
  // Monday adds declared delivery returns and pre-Talk introduction state.
  for (const event of ['kotodama_first', 'kotodama_cancel', 'kotodama_exit']) expected.engine.events.office[event] = 'teamDrinks';
  for (const flag of ['d5_delivery_seen', 'd5_last_recipient']) expected.engine.exact[flag] = ['game3d/js/places/day5/delivery-state.js'];
  for (const flag of ['d5_kenji_needs_intro', 'd5_mori_needs_intro', 'd3_emi_needs_intro']) expected.engine.exact[flag] = ['game3d/js/places/day5/place.js'];
  expected.engine.exact.d2_content_revision = ['game3d/js/saves/day2.js'];
  expected.engine.exact.place.push('game3d/js/saves/day2.js');
  assert.deepEqual(plain, expected);
});
test('missing and unexpected runtime registrations fail before play', () => {
  assert.throws(() => assertRegistered(['train', 'gate', 'office'], { train() {}, office() {} }, 'places'), /missing \[gate\]/);
  assert.throws(() => assertRegistered(['train'], { train() {}, stray() {} }, 'places'), /unexpected \[stray\]/);
  assert.doesNotThrow(() => assertRegistered(['train'], { train() {} }, 'places'));
});
test('completed place validation detects a missing object, hook or coordinate registration', () => {
  const details = PLACE_DETAILS.office;
  const place = Object.fromEntries(Object.entries(details).map(([field, value]) => [field,
    Object.fromEntries((Array.isArray(value) ? value : Object.keys(value)).map(key => [key, {}]))]));
  assert.doesNotThrow(() => assertPlaceRegistered(place, 'office', details));
  for (const field of ['things', 'hooks', 'spots', 'seats', 'zones', 'people']) {
    const actual = { ...place[field] }, key = Object.keys(actual)[0];
    delete actual[key];
    assert.throws(() => assertPlaceRegistered({ ...place, [field]: actual }, 'office', details),
      error => error.message.includes(`office.${field}`) && error.message.includes(`missing [${key}]`));
  }
});
