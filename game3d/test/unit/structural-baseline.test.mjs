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
  expected.engine.exact.mio_lunch_offer = ['game3d/js/places/mio-lunch/index.js'];
  for (const key of ['ms2_mio','ms3_mio']) expected.engine.exact[key] = ['game3d/js/places/mio-lunch/state.js'];
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
  expected.engine.prefix.regreact_ = ['game3d/js/gameplay/register-reactions.js']; // #369 register reactions
  // Monday adds declared delivery returns and pre-Talk introduction state.
  for (const event of ['kotodama_first', 'kotodama_cancel', 'kotodama_exit']) expected.engine.events.office[event] = 'teamDrinks';
  for (const flag of ['d5_delivery_seen', 'd5_last_recipient']) expected.engine.exact[flag] = ['game3d/js/places/day5/delivery-state.js'];
  for (const flag of ['d5_kenji_needs_intro', 'd5_mori_needs_intro', 'd3_emi_needs_intro']) expected.engine.exact[flag] = ['game3d/js/places/day5/place.js'];
  expected.engine.exact.d2_content_revision = ['game3d/js/saves/day2.js'];
  expected.engine.exact.place.push('game3d/js/saves/day2.js');
  expected.engine.exact.bakery_action_complete = ['game3d/js/places/bakery/action.js'];
  for (const flag of ['bakery_order_id', 'bakery_item', 'bakery_phase', 'bakery_cant_pay', 'bakery_paid_id', 'bakery_eaten_id', 'bakery_eat_id', 'bakery_eat_item', 'bakery_eat_phase']) expected.engine.exact[flag] = ['game3d/js/places/bakery/trade.js'];
  expected.engine.events.bakery = {};
  expected.engine.placeFile.bakery = 'game3d/js/places/bakery.js';
  for (const flag of ['bakery_can_eat', 'bakery_has_curry', 'bakery_has_roll']) expected.engine.exact[flag] = ['game3d/js/places/bakery/stage.js'];
  for (const key of ['ongoing_workday', 'ongoing_tennis_day', 'ongoing_team_day', 'ongoing_art_day', 'ongoing_model_day', 'ongoing_art_ready', 'ongoing_winter_day', 'ongoing_winter_ready']) expected.engine.exact[key] = ['game3d/js/places/ongoing/index.js'];
  expected.engine.exact.art_action_completed = ['game3d/js/places/commons.js'];
  expected.engine.exact.winter_action_completed = ['game3d/js/places/gym.js'];
  expected.engine.exact.art_first_day = ['game3d/js/places/ongoing/art-progress.js'];
  expected.engine.events.konbini = {};
  expected.engine.placeFile.konbini = 'game3d/js/places/konbini.js';
  expected.engine.exact.konbini_action_complete = ['game3d/js/places/konbini/action.js'];
  for(const flag of ["konbini_basket", "konbini_cant_pay", "konbini_consumed_id", "konbini_count", "konbini_food_id", "konbini_food_item", "konbini_food_phase", "konbini_full", "konbini_has_milk", "konbini_has_riceball", "konbini_order_id", "konbini_paid_id", "konbini_phase", "konbini_selected_coffee", "konbini_selected_milk", "konbini_selected_riceball", "konbini_selected_tea", "konbini_total"]) expected.engine.exact[flag] = ['game3d/js/places/konbini/trade.js'];
  for (const flag of ['garden_worker_busy', 'garden_worker_done', 'garden_bench_free']) expected.engine.exact[flag] = ['game3d/js/places/station-garden/index.js'];
  for (const flag of ['sender_state', 'sender_offered', 'sender_partial', 'sender_compared', 'sender_delivered']) expected.engine.exact[flag] = ['game3d/js/investigations/sender/state.js'];
  for (const flag of ['sender_action_ok', 'sender_available', 'sender_complaint_heard', 'sender_remark_heard', 'sender_failed', 'sender_wants_mori']) expected.engine.exact[flag] = ['game3d/js/investigations/sender/index.js'];
  for (const flag of ['sender_action_ok', 'sender_available']) expected.engine.exact[flag].unshift('game3d/js/investigations/sender/hook.js');
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
