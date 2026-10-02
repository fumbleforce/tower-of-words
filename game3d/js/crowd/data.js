// Who is about in each outdoor place, by period: the ambient crowd's data (crowd/index.js). The facts are in
// docs/game/places.md, each place's "Who's there when" ("Crowd" line); tools/facts/check.mjs keeps the two in step.
//
// Per place:
//   ends    where people come from and go to, in the place's own x/z: a street running on out of the chunk ([x, z],
//           they walk out of view there), or a door they go in and out of ({ door: <thing id>, out: [x, z] }: an open
//           building; out is the floor outside it when the thing's spot is not).
//   periods early | morning | lunch | afternoon | evening:
//           walk   how many are walking at once; flows [from, to, weight] pick their way (kind 'jog' runs, in
//                  sports clothes; 'stroll' is slow)
//           sit    how many sit on the place's benches
//           chat   pairs standing talking, on open paving off the walking lines
//           queue  [thing id, n]: n waiting in a line at a shut door (the konbini before it opens)
//   who     the mix of clothes: office, casual, sport, elder (weights)
// Counts are for a desktop at high quality; phones and the low tier take fewer (TIERS in crowd/index.js).

import { MIXED, HOME, OFFICE } from './data-kinds.js';
import { CROWD_SOUTH } from './data-south.js';

export const CROWD = {
  forecourt: {
    ends: {
      station: { door: 'station_exit' },
      office: { door: 'office_entrance', out: [12.25, -1.7] },
      plaza: [34.4, -2.1],
      bikes: [9.9, 10.0],
    },
    periods: {
      early: {
        who: OFFICE,
        walk: 17,
        flows: [
          ['plaza', 'office', 6],
          ['station', 'office', 1],
          ['bikes', 'office', 3],
          ['office', 'plaza', 1],
        ],
        chat: 1,
      },
      morning: {
        who: OFFICE,
        walk: 6,
        flows: [
          ['office', 'plaza', 1],
          ['plaza', 'office', 1],
          ['bikes', 'plaza', 1],
        ],
      },
      lunch: {
        who: OFFICE,
        walk: 14,
        flows: [
          ['office', 'plaza', 4],
          ['plaza', 'office', 3],
          ['office', 'bikes', 1],
          ['bikes', 'office', 1],
        ],
        chat: 2,
      },
      afternoon: {
        who: OFFICE,
        walk: 6,
        flows: [
          ['office', 'plaza', 1],
          ['plaza', 'office', 1],
        ],
      },
      evening: {
        who: OFFICE,
        walk: 17,
        flows: [
          ['office', 'plaza', 6],
          ['office', 'bikes', 3],
          ['office', 'station', 1],
          ['plaza', 'office', 1],
        ],
        chat: 2,
      },
    },
  },
  plaza: {
    ends: {
      forecourt: [-16.8, -0.3],
      dorms: [22.9, -0.3],
      canteen: [-0.6, -17.2],
      shops: [19.5, 5.3],
    },
    periods: {
      early: {
        who: OFFICE,
        walk: 14,
        flows: [
          ['dorms', 'forecourt', 6],
          ['shops', 'forecourt', 2],
          ['dorms', 'canteen', 1],
          ['canteen', 'forecourt', 1],
        ],
        sit: 2,
        chat: 1,
      },
      morning: {
        who: MIXED,
        walk: 6,
        flows: [
          ['dorms', 'forecourt', 1],
          ['forecourt', 'shops', 1],
        ],
        sit: 2,
      },
      lunch: {
        who: OFFICE,
        walk: 17,
        flows: [
          ['forecourt', 'canteen', 4],
          ['canteen', 'forecourt', 2],
          ['forecourt', 'shops', 2],
          ['shops', 'forecourt', 2],
          ['canteen', 'dorms', 1],
        ],
        sit: 4,
        chat: 2,
      },
      afternoon: {
        who: MIXED,
        walk: 7,
        flows: [
          ['forecourt', 'dorms', 1],
          ['dorms', 'forecourt', 1],
        ],
        sit: 2,
        chat: 1,
      },
      evening: {
        who: HOME,
        walk: 17,
        flows: [
          ['forecourt', 'dorms', 6],
          ['forecourt', 'shops', 3],
          ['shops', 'dorms', 1],
          ['dorms', 'forecourt', 1],
        ],
        sit: 3,
        chat: 2,
      },
    },
  },
  shotengai: {
    ends: {
      street: [0, 10.4],
      arcade_w: [0, -76.5],
      prom_e: [-9.5, 5.0],
      prom_w: [-9.5, -76.0],
    },
    periods: {
      early: {
        who: MIXED,
        walk: 10,
        flows: [
          ['arcade_w', 'street', 3],
          ['street', 'arcade_w', 2],
          ['prom_w', 'prom_e', 2, 'jog'],
          ['prom_e', 'prom_w', 1, 'stroll'],
        ],
        sit: 1,
        queue: ['store', 3],
      },
      morning: {
        who: MIXED,
        walk: 7,
        flows: [
          ['street', 'arcade_w', 1],
          ['arcade_w', 'street', 1],
        ],
        sit: 2,
        chat: 1,
      },
      lunch: {
        who: MIXED,
        walk: 20,
        flows: [
          ['street', 'arcade_w', 4],
          ['arcade_w', 'street', 4],
          ['prom_e', 'prom_w', 1, 'stroll'],
          ['prom_w', 'prom_e', 1, 'stroll'],
        ],
        sit: 4,
        chat: 2,
      },
      afternoon: {
        who: MIXED,
        walk: 9,
        flows: [
          ['street', 'arcade_w', 1],
          ['arcade_w', 'street', 1],
        ],
        sit: 2,
        chat: 1,
      },
      evening: {
        who: HOME,
        walk: 17,
        flows: [
          ['street', 'arcade_w', 4],
          ['arcade_w', 'street', 3],
          ['prom_e', 'prom_w', 2, 'stroll'],
          ['prom_w', 'prom_e', 1, 'jog'],
        ],
        sit: 3,
        chat: 2,
      },
    },
  },
  east_lane: {
    ends: {
      plaza: [-17.0, 0],
      north: [0, -35.2],
      shops: [5.3, 16.2],
      dorm_row: [9.0, 13.2],
      dorm_gate: [9.0, 2.0],
    },
    periods: {
      early: {
        who: OFFICE,
        walk: 14,
        flows: [
          ['dorm_gate', 'plaza', 4],
          ['dorm_row', 'plaza', 3],
          ['dorm_row', 'north', 1],
          ['shops', 'plaza', 1],
          ['dorm_gate', 'north', 1],
        ],
        sit: 1,
        chat: 1,
      },
      morning: {
        who: MIXED,
        walk: 6,
        flows: [
          ['dorm_gate', 'plaza', 1],
          ['plaza', 'shops', 1],
        ],
        sit: 1,
      },
      lunch: {
        who: MIXED,
        walk: 12,
        flows: [
          ['plaza', 'shops', 2],
          ['shops', 'plaza', 2],
          ['north', 'plaza', 1],
        ],
        sit: 2,
        chat: 1,
      },
      afternoon: {
        who: MIXED,
        walk: 6,
        flows: [
          ['plaza', 'dorm_row', 1],
          ['north', 'shops', 1],
        ],
        sit: 1,
      },
      evening: {
        who: HOME,
        walk: 14,
        flows: [
          ['plaza', 'dorm_gate', 4],
          ['plaza', 'dorm_row', 3],
          ['north', 'dorm_row', 1],
          ['plaza', 'shops', 2],
        ],
        sit: 2,
        chat: 1,
      },
    },
  },
  ...CROWD_SOUTH,
  // the dorm courtyard after work (Grok, G-0034): two or three residents between the street gate and the hall, nobody
  // seated, nobody standing in the doors, the passage, the sento doorway or at the mailboxes
  dorm_court: {
    ends: { gate: [0, 2.2], hall: { door: 'dorm_entry' } },
    periods: {
      evening: {
        who: HOME,
        walk: 3,
        flows: [
          ['gate', 'hall', 2],
          ['hall', 'gate', 1],
        ],
      },
    },
  },
};
