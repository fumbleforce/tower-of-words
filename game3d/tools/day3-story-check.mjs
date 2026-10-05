// Day 3's story checks (story/day3/check.mjs, Codex's authoring contract: routes, branches, tokens, payments once),
// then that every build request in its NEEDS is registered in the engine and every declared trip is an engine trip.
import assert from 'node:assert/strict';
import { NEEDS, TRIPS, STORIES } from '../story/day3/index.js';
import { PLACE_DETAILS, GLOBAL_HOOKS } from '../js/narrative/contracts.js';
import { canTravel } from '../js/places/definitions.js';
import { WORDS } from '../js/lang.js';
import { WORDS as NEW_WORDS } from '../story/day3/words.js';

await import('../story/day3/check.mjs');
for (const [place, need] of Object.entries(NEEDS)) {
  for (const [field, ids] of Object.entries(need)) {
    for (const id of ids) {
      if (place === 'all') {
        assert(GLOBAL_HOOKS.includes(id), `all.${field}: ${id} is not a global hook`);
        continue;
      }
      const base = PLACE_DETAILS[place],
        have = field === 'things' ? Object.keys(base.things) : base[field];
      assert(id === 'mio' || have.includes(id), `${place}.${field}: requested ${id} is not registered`);
    }
  }
}
for (const [from, tos] of Object.entries(TRIPS)) for (const to of tos) assert(canTravel(from, to, 3), `No engine trip ${from} -> ${to}`);
for (const id of Object.keys(NEW_WORDS)) assert(WORDS[id], `day 3's word ${id} is not in lang.js`);
console.log(`day 3: ${Object.keys(STORIES).length} places; build requests registered, trips in the engine, words in lang.js`);
