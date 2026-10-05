// Saturday's people, place by place (notes/days3-5-outline.md, "Where everyone is"; docs/game/places.md, "Who's there
// when"): in these places "sea terrace" is the east coast, "station desk" the gate, the game-centre frontage the shop
// street. A period with no entry is offstage. The format is places/day3/index.js applyPlan. Coordinates are each
// place's own (its things, spots and seats where it has them).
import { benchNear } from './seats.js';

const thingSpot =
  (id, [dx, dz] = [0, 0]) =>
  (P) => {
    const s = P.things[id].spot();
    return [s[0] + dx, s[1] + dz];
  };
const thingFace = (id) => (P) => P.things[id].face();

export const PLANS = {
  // the station desk: the guard on duty in the morning and afternoon, on his break at lunch on the bench by the
  // counter, gone home in the evening; Tama at her bowl in the morning and in her shelter in the evening; nobody
  // else from day 1
  gate: {
    guard: { morning: { home: true }, lunch: { seat: 'bench_l' }, afternoon: { home: true } },
    tama: { morning: { home: true }, evening: { home: true } },
    kuroda: {},
    aoi: {},
    rei: {},
  },
  forecourt: { kuro: {}, tama: {} },
  // B2 is empty on Saturday
  office: { emi: {}, kenji: {}, mori: {}, aoi: {}, rei: {}, tama: {} },
  // the board in the morning until her scene; Tama asleep in the seat bay's shade at lunch
  plaza: {
    aoi: { morning: { if: '!d3_aoi_intro', at: [-1.0, 9.3], face: [-0.5, 10.46] } },
    tama: { lunch: { at: [19.15, -6.35], yaw: -2.2, pose: 'sleep' } },
  },
  // the shop street's east side, its fronts at x 2.25: Mori shopping for dinner in the morning; at lunch Kenji with
  // his curry bread and Hamada making up his mind at the bakery, Aoi at the shoes, Kuro and Rei at the izakaya's
  // lunch counter; Kenji watching the game centre in the afternoon
  shotengai: {
    mori: { morning: { at: thingSpot('store', [-0.65, 0.9]), face: thingFace('store') } },
    kenji: {
      lunch: { at: thingSpot('bakery', [-0.7, 1.05]), face: thingFace('bakery') },
      afternoon: { at: thingSpot('game_centre', [-0.6, 0.95]), face: thingFace('game_centre') },
    },
    kuroda: { lunch: { at: thingSpot('bakery', [-0.8, -1.1]), face: thingFace('bakery') } },
    aoi: { lunch: { at: thingSpot('bike_shop', [-0.65, 1.6]), face: (P) => thingSpot('bike_shop', [0.85, 1.6])(P) } },
    kuro: { lunch: { at: thingSpot('izakaya', [-1.05, 0.75]), face: thingFace('izakaya') } },
    rei: { lunch: { at: thingSpot('izakaya', [-0.55, -0.85]), face: thingFace('izakaya') } },
  },
  // the sea terrace: Emi's lunch on one bench, Mio with her laptop on the other in the afternoon, Hamada resting on the
  // coast walk's first bench, Aoi walking by the terrace's sea wall in the evening
  east_coast: {
    emi: { lunch: { seat: (P) => benchNear(P, [0, 0], { skip: 1 }) } },
    mio: { afternoon: { seat: (P) => benchNear(P, [0, 0]) } },
    kuroda: { afternoon: { seat: (P) => benchNear(P, [2.75, -20.5]) } },
    aoi: { evening: { at: [1.6, 1.4], face: [4, 0.6] } },
  },
  // Rei serving on the west court in the afternoon (the club meets on Sunday)
  sports: {
    rei: { afternoon: { at: (P) => P.spots.court_baseline_s, face: (P) => P.spots.court_net } },
  },
  dorm_court: {
    tama: { afternoon: { at: (P) => catOnBench(P), yaw: 1.4, pose: 'sleep' } },
  },
  dorm_commons: { kenji: { evening: { seat: 'commons_sofa' } } },
  // the gym's desk staffed through the day (the attendant behind the counter); Mori checking his Tuesday booking in
  // the afternoon, Emi at the equipment store looking for the pool keys
  gym: {
    attendant: { '*': { if: "period != 'evening'", at: [4.75, -1.6], face: [4.6, -3.0] } },
    mori: { afternoon: { at: [3.05, -3.35], face: [4.2, -2.55] } },
    emi: { afternoon: { at: [-5.85, -3.5], face: [-7.4, -2.6] } },
    kuro: {},
  },
};

// asleep at one end of the courtyard's bench (its seat top, so she lies on it)
function catOnBench(P) {
  const s = benchNear(P, [0, 0]);
  if (!s) return [-2.5, 0.6];
  const side = [Math.cos(s.ry) * 0.45, -Math.sin(s.ry) * 0.45];
  return [s.x + side[0], s.z + side[1], s.top];
}
