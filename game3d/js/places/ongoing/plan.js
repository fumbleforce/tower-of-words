import { PLANS as SATURDAY } from '../day3/plan.js';
import { PLANS as SUNDAY } from '../day4/plan.js';
import { PLANS as MONDAY } from '../day5/plan.js';
import { benchNear } from '../day3/seats.js';
import { weekdayOf, isWeekend } from './calendar.js';
import { POSTS as GYM_POSTS } from '../../scenes/rooms/gym-plan.js';

const home = { home: true };
const table = { at: (P) => P.spots.commons_table, face: (P) => P.things.art_table.face() };
const sofa = { seat: 'commons_sofa' };
// Every scheduled identity starts offstage in every place that can host it.
// This prevents an inherited introduction or club arrangement duplicating it.
function emptyPlan() {
  const plan = {};
  for (const source of [SATURDAY, SUNDAY, MONDAY])
    for (const [place, people] of Object.entries(source)) {
      plan[place] ||= {};
      for (const id of Object.keys(people)) plan[place][id] = {};
    }
  return plan;
}
export function weeklyPlan(day) {
  const week = weekdayOf(day),
    plan = emptyPlan();
  const at = (place, id, periods) => {
    plan[place] ||= {};
    plan[place][id] = periods;
  };
  at('gate', 'guard', {
    morning: { ...home, if: '!d3_signoff_walk' },
    lunch: { seat: 'bench_l' },
    afternoon: home,
  });
  at('train', 'guard', { morning: { ...home, if: 'd3_signoff_walk' } });
  at('gate', 'tama', { morning: home });
  at('dorm_court', 'tama', { evening: { at: [-2.5, 0.6], pose: 'sit' } });
  at('gym', 'attendant', SATURDAY.gym.attendant);
  if (isWeekend(day)) {
    for (const place of ['shotengai', 'east_coast', 'plaza', 'sports', 'dorm_commons']) {
      const source = (week === 6 ? SATURDAY : SUNDAY)[place] || {};
      for (const [id, periods] of Object.entries(source)) if (id !== 'tama') at(place, id, periods);
    }
    // A completed introduction does not remove Aoi from the island on Saturdays.
    if (week === 6) at('plaza', 'aoi', { morning: { at: [-1, 9.3], face: [-0.5, 10.46] } });
    // The seasonal outdoor pool has closed; the weekly gathering is indoors.
    if (week === 6) {
      at('gym', 'attendant', { ...SATURDAY.gym.attendant, evening: GYM_POSTS.attendant });
      at('gym', 'emi', { evening: { at: (P) => P.spots.gym_benches, face: (P) => P.spots.gym_court } });
      at('gym', 'kuro', { evening: { seat: 'gym_bench_s' } });
    }
    return plan;
  }
  for (const id of ['mio', 'kenji', 'mori', 'emi']) {
    const source = MONDAY.office[id];
    at('office', id, {
      ...(source.morning ? { morning: source.morning } : {}),
      ...(source.afternoon ? { afternoon: source.afternoon } : {}),
    });
  }
  plan.office.mio.lunch = MONDAY.office.mio.lunch;
  at('forecourt', 'kuro', { morning: home, afternoon: home });
  at('plaza', 'aoi', MONDAY.plaza.aoi);
  at('shotengai', 'kenji', { lunch: { ...SATURDAY.shotengai.kenji.lunch, if: "ticket_T0008 == 'done'" } });
  at('karaoke_booth', 'kenji', { lunch: { ...MONDAY.karaoke_booth.kenji.lunch, if: "ticket_T0008 != 'done'" } });
  at('shotengai', 'rei', MONDAY.shotengai.rei);
  at('shotengai', 'kuroda', { lunch: SATURDAY.shotengai.kuroda.lunch });
  at('east_coast', 'emi', { lunch: { seat: (P) => benchNear(P, [0, 0], { skip: 1 }) } });
  at('east_coast', 'mio', MONDAY.east_coast.mio);
  // Thursday evenings he works at the long table on his model spaceship (no prop; the kit has none).
  at('dorm_commons', 'kenji', week === 5 || week === 3 ? {} : { evening: week === 4 ? table : sofa });
  at('dorm_commons', 'mori', week === 2 ? { evening: table } : { lunch: table });
  at('east_coast', 'rei', MONDAY.east_coast.rei);
  if (week === 3) {
    at('karaoke_booth', 'kenji', { ...plan.karaoke_booth.kenji, evening: { seat: 'booth_seat_w' } });
    at('karaoke_booth', 'kuroda', { evening: { seat: 'booth_seat_e' } });
  } else
    at('shotengai', 'kuroda', { lunch: SATURDAY.shotengai.kuroda.lunch, evening: MONDAY.shotengai.kuroda.evening });
  // Friday's B2 gathering also allows a missed introduction to the word experiment.
  if (week === 5) for (const id of ['mio', 'kenji', 'mori']) plan.office[id].evening = MONDAY.office[id].evening;
  // Around seven he is at the kitchenette counter; the drinks scene puts him back by the lift.
  if (week === 5) plan.office.kenji.evening = { at: [1.2, 3.3], face: [1.3, 2.76] };
  return plan;
}
