// The ambient crowd's data for the island's south-east and south (crowd/data.js has the format and the rest).
import { MIXED, HOME, ACTIVE, OFFICE } from './data-kinds.js';

export const CROWD_SOUTH = {
  east_coast: {
    ends: {
      dorm_street: [-50.2, 0],
      courts: [-27.5, -68.0],
      onsen: [-3.4, -97.8],
    },
    periods: {
      early: {
        who: ACTIVE,
        walk: 7,
        flows: [
          ['dorm_street', 'courts', 2, 'jog'],
          ['courts', 'dorm_street', 1, 'jog'],
          ['dorm_street', 'onsen', 1, 'jog'],
          ['onsen', 'dorm_street', 1],
          ['dorm_street', 'courts', 1, 'stroll'],
        ],
        sit: 1,
      },
      morning: {
        who: ACTIVE,
        walk: 4,
        flows: [
          ['dorm_street', 'courts', 1, 'stroll'],
          ['courts', 'dorm_street', 1, 'jog'],
        ],
        sit: 1,
      },
      lunch: {
        who: MIXED,
        walk: 6,
        flows: [
          ['dorm_street', 'onsen', 1, 'stroll'],
          ['onsen', 'dorm_street', 1],
          ['courts', 'dorm_street', 1, 'jog'],
        ],
        sit: 2,
      },
      afternoon: {
        who: ACTIVE,
        walk: 4,
        flows: [
          ['dorm_street', 'courts', 1, 'jog'],
          ['onsen', 'dorm_street', 1],
        ],
        sit: 1,
      },
      evening: {
        who: HOME,
        walk: 11,
        flows: [
          ['dorm_street', 'onsen', 3],
          ['onsen', 'dorm_street', 2],
          ['dorm_street', 'courts', 2, 'jog'],
          ['courts', 'dorm_street', 1, 'jog'],
          ['dorm_street', 'courts', 1, 'stroll'],
        ],
        sit: 2,
        chat: 1,
      },
    },
  },
  sports: {
    ends: {
      north_street: [11.1, 19.8],
      onsen_path: [43.0, 0],
      office_street: [-31.6, 3.5],
      pool: [0.1, -32.9],
    },
    periods: {
      early: {
        who: ACTIVE,
        walk: 10,
        flows: [
          ['north_street', 'onsen_path', 2, 'jog'],
          ['onsen_path', 'office_street', 2, 'jog'],
          ['north_street', 'office_street', 2],
          ['pool', 'north_street', 1],
          ['office_street', 'pool', 1, 'jog'],
        ],
        chat: 1,
      },
      morning: {
        who: ACTIVE,
        walk: 4,
        flows: [
          ['north_street', 'pool', 1],
          ['onsen_path', 'north_street', 1, 'jog'],
        ],
      },
      lunch: {
        who: ACTIVE,
        walk: 7,
        flows: [
          ['office_street', 'pool', 2],
          ['pool', 'office_street', 2],
          ['north_street', 'onsen_path', 1, 'jog'],
        ],
        chat: 1,
      },
      afternoon: {
        who: ACTIVE,
        walk: 5,
        flows: [
          ['north_street', 'onsen_path', 1, 'jog'],
          ['pool', 'north_street', 1],
        ],
      },
      evening: {
        who: ACTIVE,
        walk: 11,
        flows: [
          ['office_street', 'pool', 2],
          ['office_street', 'north_street', 2],
          ['north_street', 'onsen_path', 2, 'jog'],
          ['onsen_path', 'north_street', 1, 'jog'],
          ['pool', 'north_street', 1],
        ],
        chat: 1,
      },
    },
  },
  office_quarter: {
    ends: {
      sports: [39.4, 6.0],
      harbour: [-44.6, 0],
      bank: [0, 7.0],
      quarter: [14.9, -14.8],
      gym: [34.2, 7.0],
    },
    periods: {
      early: {
        who: OFFICE,
        walk: 17,
        flows: [
          ['sports', 'harbour', 3],
          ['gym', 'quarter', 2],
          ['bank', 'harbour', 2],
          ['sports', 'quarter', 2],
          ['harbour', 'quarter', 1],
          ['quarter', 'bank', 1],
        ],
        chat: 1,
      },
      morning: {
        who: OFFICE,
        walk: 7,
        flows: [
          ['harbour', 'quarter', 1],
          ['quarter', 'bank', 1],
          ['bank', 'sports', 1],
        ],
      },
      lunch: {
        who: OFFICE,
        walk: 14,
        flows: [
          ['quarter', 'bank', 2],
          ['bank', 'quarter', 2],
          ['harbour', 'sports', 1],
          ['sports', 'harbour', 1],
        ],
        chat: 2,
      },
      afternoon: {
        who: OFFICE,
        walk: 7,
        flows: [
          ['quarter', 'harbour', 1],
          ['bank', 'quarter', 1],
        ],
      },
      evening: {
        who: OFFICE,
        walk: 14,
        flows: [
          ['harbour', 'sports', 3],
          ['quarter', 'gym', 2],
          ['quarter', 'sports', 2],
          ['harbour', 'bank', 1],
        ],
        chat: 1,
      },
    },
  },
  harbour: {
    ends: {
      street: [69.2, 34.0],
      walk_s: [58.4, 58.0],
      works: [18.0, -12.4],
      pier: [-25.0, 9.0],
      ferry: [-12.0, -11.0],
    },
    periods: {
      early: {
        who: { office: 2, casual: 3, elder: 1 },
        walk: 7,
        flows: [
          ['street', 'works', 2],
          ['street', 'pier', 2],
          ['ferry', 'street', 1],
          ['walk_s', 'street', 1, 'jog'],
        ],
        chat: 1,
        sit: 1,
      },
      morning: {
        who: MIXED,
        walk: 4,
        flows: [
          ['street', 'pier', 1],
          ['works', 'street', 1],
        ],
        chat: 1,
      },
      lunch: {
        who: MIXED,
        walk: 6,
        flows: [
          ['pier', 'street', 1],
          ['street', 'ferry', 1],
        ],
        sit: 2,
        chat: 1,
      },
      afternoon: {
        who: MIXED,
        walk: 4,
        flows: [
          ['street', 'works', 1],
          ['pier', 'street', 1],
        ],
        chat: 1,
      },
      evening: {
        who: MIXED,
        walk: 7,
        flows: [
          ['works', 'street', 2],
          ['pier', 'street', 2],
          ['street', 'walk_s', 1, 'stroll'],
          ['ferry', 'street', 1],
        ],
        sit: 2,
        chat: 1,
      },
    },
  },
};
