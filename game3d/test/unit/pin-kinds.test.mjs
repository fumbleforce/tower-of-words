import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { PLACE_DETAILS } from '../../js/places/catalog.js';
import {
  TRAVEL_KINDS,
  TRAVEL_PINS,
  TRAVEL_VERBS,
  travelOf,
  pinGlyph,
  pinTip,
  isPrivatePin,
} from '../../js/gameplay/pin-kinds.js';
import { PIN_GLYPHS } from '../../js/ui/pin-tip.js';

// a pin as interactions.js builds it from the catalog
const pinFor = (place, id) => {
  const t = PLACE_DETAILS[place].things[id];
  const travel = travelOf(place, id, t);
  return { ...t, id, travel, verb: travel ? travel.verb : t.verb };
};

test('every travel kind and every other pin has a symbol', () => {
  for (const k of Object.values(TRAVEL_KINDS)) assert.ok(PIN_GLYPHS[k.glyph], k.glyph);
  for (const g of ['talk', 'look', 'paw']) assert.ok(PIN_GLYPHS[g], g);
  for (const kind of Object.values(TRAVEL_VERBS)) assert.ok(TRAVEL_KINDS[kind], kind);
});

test('the travel table names only things the catalog has, with a known kind', () => {
  for (const [place, ids] of Object.entries(TRAVEL_PINS))
    for (const [id, e] of Object.entries(ids)) {
      assert.ok(PLACE_DETAILS[place]?.things?.[id], `${place}.${id} is not in the catalog`);
      assert.ok(TRAVEL_KINDS[e.kind], `${place}.${id}: kind ${e.kind}`);
    }
});

test('a thing whose verb goes somewhere is a way out, and never has the eye', () => {
  for (const [place, d] of Object.entries(PLACE_DETAILS))
    for (const [id, t] of Object.entries(d.things || {})) {
      if (!TRAVEL_VERBS[t.verb]) continue;
      const pin = pinFor(place, id);
      assert.ok(pin.travel, `${place}.${id} (${t.verb})`);
      assert.notEqual(pinGlyph(pin), 'look', `${place}.${id}`);
    }
});

test('the kinds: doors, stairs, the lift, ways out and walk-to spots', () => {
  const kind = (place, id) => pinFor(place, id).travel?.kind;
  assert.equal(kind('forecourt', 'lift'), 'lift');
  assert.equal(kind('office', 'lift'), 'lift');
  assert.equal(kind('forecourt', 'office_entrance'), 'door');
  assert.equal(kind('dorms', 'door_203'), 'door');
  assert.equal(kind('shotengai', 'bakery_door'), 'door'); // a shut shop's door with its card is still a door
  assert.equal(kind('dorm_court', 'stairs'), 'stairs');
  assert.equal(kind('karaoke', 'karaoke_stairs'), 'stairs');
  assert.equal(kind('plaza', 'office_lane'), 'exit');
  assert.equal(kind('plaza', 'dorm_lane'), 'exit');
  assert.equal(kind('gate', 'lift'), 'exit'); // the old lift id is the open exit to the forecourt
  assert.equal(travelOf(null, 'goal_at', { verb: 'Walk to' }).kind, 'walk');
  // not ways out: the office stairs only have a look line, and people and plain things keep their symbols
  assert.equal(kind('office', 'stairs'), undefined);
  assert.equal(kind('office', 'vending'), undefined);
  assert.equal(pinGlyph(pinFor('office', 'vending')), 'look');
  assert.equal(pinGlyph(pinFor('forecourt', 'kuro')), 'talk');
  assert.equal(pinGlyph(pinFor('gate', 'tama')), 'paw');
  assert.equal(pinGlyph(pinFor('forecourt', 'lift')), 'lift');
  assert.equal(pinGlyph(pinFor('dorms', 'door_203')), 'door');
  assert.equal(pinGlyph(pinFor('dorm_court', 'stairs')), 'stairs');
  assert.equal(pinGlyph(pinFor('plaza', 'shop_walk')), 'arrow');
});

// every talk trigger in the story that ends in a trip to another place is on a pin classed as a way out
test('every pin the story uses to change place is a way out', async () => {
  const files = ['story', 'story/day2', 'story/day3'].flatMap((d) =>
    fs
      .readdirSync(new URL(`../../${d}/`, import.meta.url))
      .filter((f) => f.endsWith('.js') && PLACE_DETAILS[f.slice(0, -3)])
      .map((f) => [d, f.slice(0, -3)]),
  );
  let checked = 0;
  for (const [d, place] of files) {
    const s = (await import(`../../${d}/${place}.js`)).default;
    if (!s?.on) continue;
    const nodes = s.nodes || {};
    const trips = (n, seen = new Set()) => {
      if (seen.has(n) || !nodes[n]) return false;
      seen.add(n);
      const j = JSON.stringify(nodes[n]);
      if (/"do":"trip"/.test(j)) return true;
      return [...j.matchAll(/"(?:call|goto|node)":"([a-z0-9_]+)"/g)].some((m) => trips(m[1], seen));
    };
    for (const [k, v] of Object.entries(s.on)) {
      if (!k.startsWith('talk:')) continue;
      const id = k.slice(5);
      const names = [...JSON.stringify(v).matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]);
      if (!names.some((n) => trips(n)) || !PLACE_DETAILS[place].things[id]) continue;
      checked++;
      assert.ok(pinFor(place, id).travel, `${d}/${place}.js talk:${id} trips but its pin is not a way out`);
    }
  }
  assert.ok(checked > 40, `only ${checked} trips found`);
});

test('the tooltip says the verb and what it is', () => {
  const tip = (pin) => pinTip(pin).text;
  assert.equal(tip(pinFor('office', 'vending')), 'Look: Vending machine');
  assert.equal(tip({ id: 'mori', label: 'Mr. Mori', kind: 'person' }), 'Talk: Mr. Mori');
  assert.equal(tip(pinFor('gate', 'tama')), 'Pet: Tama');
  assert.equal(tip(pinFor('plaza', 'office_lane')), 'Go to head office');
  assert.equal(tip(pinFor('plaza', 'shop_walk')), 'Go to the shop street');
  assert.equal(tip(pinFor('karaoke', 'karaoke_door')), 'Go out to the shop street');
  assert.equal(tip(pinFor('shotengai', 'bakery_door')), 'Go in: Bakery');
  assert.equal(tip(pinFor('forecourt', 'lift')), 'Take the lift down to B2');
  assert.equal(tip(pinFor('dorms', 'door_203')), 'Go into room 203');
  // the action menu's verb matches the tooltip
  assert.equal(pinTip(pinFor('forecourt', 'lift')).verb, 'Take the lift');
  assert.equal(pinTip(pinFor('dorm_court', 'stairs')).verb, 'Take the stairs');
  assert.equal(pinTip(pinFor('office', 'vending')).verb, 'Look');
});

test('a private pin says nothing private while private mode is off', () => {
  const heart = { id: 'x', label: 'A private label', kind: 'thing small', verb: 'Look', icon: 'heart-soft' };
  assert.ok(isPrivatePin(heart));
  assert.deepEqual(pinTip(heart, { privateMode: false }), { verb: 'Look', name: '', text: 'Look' });
  assert.deepEqual(pinTip({ ...heart, icon: () => 'heart-hard' }, { privateMode: false }).text, 'Look');
  assert.deepEqual(pinTip({ ...heart, icon: undefined, private: true }, { privateMode: false }).text, 'Look');
  assert.equal(pinTip({ ...heart, tip: 'A private tip' }).text, 'Look');
  // a person keeps their public name and Talk
  assert.equal(pinTip({ id: 'kuro', label: 'Receptionist', kind: 'person', icon: 'heart-soft' }).text, 'Talk: Receptionist');
  // private mode on: the plugin's own label
  assert.equal(pinTip(heart, { privateMode: true }).text, 'Look: A private label');
  // a plugin's icon function that gives nothing is a public pin
  assert.equal(isPrivatePin({ ...heart, icon: () => '' }), false);
});
