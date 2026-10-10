// Sunday placement. Missing periods put a person offstage.
import { benchNear } from '../day3/seats.js';
import { POSTS } from '../../scenes/rooms/gym-plan.js';
const front =
  (id, dx = 0, dz = 0) =>
  (P) => {
    const p = P.things[id].spot();
    return [p[0] + dx, p[1] + dz];
  };
export const PLANS = {
  gate: {
    guard: {
      morning: { home: true },
      lunch: { seat: 'bench_l' },
      afternoon: { home: true },
    },
    tama: { morning: { home: true } },
    kuroda: {},
    aoi: {},
    rei: {},
  },
  forecourt: {
    kuro: {},
    tama: {},
    kuroda: {
      morning: {
        at: front('station_exit', 1.2, 0),
        face: front('station_exit'),
      },
    },
  },
  office: { emi: {}, kenji: {}, mori: {}, aoi: {}, rei: {}, tama: {} },
  plaza: { aoi: { morning: { at: [-1, 9.3], face: [-0.5, 10.46] } }, tama: {} },
  shotengai: {
    mori: {
      lunch: { at: front('izakaya', -0.8, 0.7), face: front('izakaya') },
    },
    kenji: {
      lunch: { at: front('bakery', -0.7, 1.05), face: front('bakery') },
      evening: {
        at: front('game_centre', -0.6, 0.95),
        face: front('game_centre'),
      },
    },
    kuroda: {
      lunch: { at: front('bakery', -0.8, -1.1), face: front('bakery') },
    },
    kuro: {
      afternoon: { at: front('store', -0.65, 0.9), face: front('store') },
    },
    aoi: {},
    rei: {},
  },
  east_coast: {
    mio: { lunch: { seat: (P) => benchNear(P, [0, 0]) } },
    kuro: { lunch: { seat: (P) => benchNear(P, [0, 0], { skip: 1 }) } },
    tama: { afternoon: { at: [1.6, 1.4], pose: 'sleep' } },
    emi: { evening: { at: [1.6, 1.4], face: [4, 0.6] } },
    kuroda: {},
    aoi: {},
  },
  sports: {
    rei: {
      afternoon: {
        at: (P) => P.spots.court_display,
        face: (P) => P.things.court_display.face(),
      },
      evening: {
        at: (P) => P.spots.court_gate,
        face: (P) => P.spots.court_net,
      },
    },
    aoi: {
      evening: {
        at: (P) => [P.spots.court_gate[0] - 0.9, P.spots.court_gate[1]],
        face: (P) => P.spots.court_net,
      },
    },
    member: {
      evening: {
        at: (P) => [P.spots.court_bench[0], P.spots.court_bench[1] + 1.3],
        face: (P) => P.spots.court_bench,
      },
    },
  },
  pool: { emi: {}, kuro: {}, attendant: {}, member: {} },
  dorm_court: {
    tama: {
      lunch: { at: [-2.5, 0.6], pose: 'sleep' },
      evening: { at: [-2.5, 0.6], pose: 'sit' },
    },
  },
  dorm_commons: {
    kenji: { morning: { seat: 'commons_sofa' } },
    mori: {
      afternoon: {
        at: (P) => P.spots.commons_table,
        face: (P) => P.things.art_table.face(),
      },
    },
  },
  gym: {
    attendant: {
      '*': {
        if: "period != 'evening'",
        at: POSTS.attendant.at,
        face: (P) => P.spots.gym_desk,
      },
    },
    emi: {
      morning: {
        at: (P) => P.spots.gym_court,
        face: (P) => P.spots.gym_benches,
      },
    },
    mori: {},
    kuro: {},
  },
  karaoke: {
    kuroda: {
      evening: {
        at: front('karaoke_desk'),
        face: (P) => P.things.karaoke_desk.face(),
      },
    },
  },
};
