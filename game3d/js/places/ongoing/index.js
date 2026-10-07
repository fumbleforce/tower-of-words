import { dayCast } from '../day-cast.js';
import { applyPlan } from '../day3/index.js';
import { weeklyPlan } from './plan.js';
import { isContinuing, isWeekend, weekdayOf } from './calendar.js';
import { sim } from '../../sim.js';
import { flags } from '../../narrative/state.js';
import { flagKeys } from '../../narrative/engine-flags.js';
import { completeFirstPage } from './art-progress.js';
const KEYS = flagKeys('game3d/js/places/ongoing/index.js');
import { clubs, whenText } from '../../clubs/index.js';
import { PLACE_NAMES } from '../definitions.js';
import { clubStageReady } from '../../clubs/staging.js';

import { EXTRA } from './catalog.js';

export function attachOngoing(game, P, name) {
  const added = EXTRA[name] || {};
  const cast = dayCast(game, { root: P.space, K: P.charScale || 1, have: P.people, ids: Object.keys(added) });
  for (const [id, info] of Object.entries(added)) {
    P.people[id] = cast.people[id];
    P.things[id] = { ...info, ...cast.thing(id) };
  }
  function adopt() {
    for (const [id, rig] of Object.entries(P.people)) if (!cast.people[id]) cast.adopt(id, rig);
  }
  P.ongoingPeriod = () => {
    if (!isContinuing(sim.day)) return;
    adopt();
    const plan = weeklyPlan(sim.day)[name] || {};
    applyPlan(cast, P, plan);
    for (const id of Object.keys(plan)) {
      if (!P.things[id] || !cast.people[id] || P.things[id].fixedSpot) continue;
      P.things[id] = { ...P.things[id], ...cast.thing(id) };
    }
    P.roomResidents?.sync({ kenji: !!plan.kenji?.[sim.period] });
    flags[KEYS.ongoing_art_ready] = name === 'dorm_commons' && clubStageReady(sim.day, 'art', P);
    flags[KEYS.ongoing_winter_ready] = name === 'gym' && clubStageReady(sim.day, 'swimming', P);
  };
  P.ongoing = async (a = {}) => {
    if (!isContinuing(sim.day)) return;
    adopt();
    // Existing restoration knows whether a deferred connector, printer or court has been repaired.
    if (P.day3) await P.day3(a);
    else await P.onDay3?.(a);
    P.sunday?.restore?.();
    P.monday?.restoreRoutine?.();
    if (!a.state) P.ongoingPeriod();
  };
  const update = P.update;
  P.update = function (...args) {
    update?.apply(this, args);
    if (isContinuing(sim.day)) cast.update(args[0]);
  };
}
export function installOngoing(game) {
  game.hooks.ongoingSetup = (a) => {
    flags[KEYS.ongoing_workday] = !isWeekend(sim.day);
    flags[KEYS.ongoing_tennis_day] = weekdayOf(sim.day) === 0;
    flags[KEYS.ongoing_team_day] = weekdayOf(sim.day) === 5;
    flags[KEYS.ongoing_art_day] = weekdayOf(sim.day) === 2;
    flags[KEYS.ongoing_winter_day] = weekdayOf(sim.day) === 6;
    return game.place?.ongoing?.(a);
  };
  game.hooks.artVisit = ({ state }) => {
    if (state !== 'firstPage') throw new Error(`Unknown art visit ${state}`);
    completeFirstPage(flags, sim.day);
  };
  game.hooks.ongoingGoal = () => {
    const meetings = clubs
      .joined()
      .map((id) => ({ id, next: clubs.nextMeeting(id, sim.day, sim.period) }))
      .filter((x) => x.next?.day === sim.day);
    const meeting = meetings[0];
    const text = meeting
      ? `${clubs.club(meeting.id).name}: ${whenText(meeting.next)}, ${PLACE_NAMES[meeting.next.place]}.`
      : sim.period === 'evening'
        ? 'Visit someone, explore, or sleep in room 203 when you are ready.'
        : 'Check your repair requests, visit someone, or read the plaza noticeboard.';
    game.hooks.goal({ text });
  };
}
