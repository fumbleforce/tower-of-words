// Sunday supplements are constructed before batching and share existing actors with Saturday staging.
import { snapshotPeople, restorePeople } from '../saved-people.js';
import { dayCast } from '../day-cast.js';
import { applyPlan } from '../day3/index.js';
import { PLANS } from './plan.js';
import { day3Place } from '../day3/place.js';
import { isSunday } from './calendar.js';
import { sundayProps } from './props.js';
import { tennisCourt } from './tennis.js';
import { actionShot } from './shot.js';
import { fanRepair } from './fan.js';

export function attachSunday(game, P, name) {
  const cast = dayCast(game, { root: P.space, K: P.charScale || 1, have: P.people });
  const shot = actionShot(P);
  const props = sundayProps(game, P, name, shot);
  const court = name === 'sports' ? tennisCourt(game, P, cast, shot) : null;
  const fan = name === 'gym' ? fanRepair(game, P, shot) : null;
  P.sunday = {
    restore: () => {
      court?.restore();
      fan?.restore();
    },
    hooks: { ...court?.hooks, ...fan?.hooks },
    things: { ...props.things, ...court?.things },
  };
  const update = P.update;
  P.update = (dt) => {
    update?.(dt);
    cast.update(dt);
    court?.update(dt);
    fan?.update(dt);
    shot.update();
  };
  const snapshot = P.snapshotState,
    load = P.restoreState;
  P.snapshotState = () => ({
    ...snapshot?.(),
    sunday: {
      people: snapshotPeople(P.people),
      shot: shot.snapshot(),
      props: props.snapshot(),
      court: court?.snapshot(),
      fan: fan?.snapshot(),
    },
  });
  P.restoreState = (saved) => {
    load?.(saved);
    const s = saved.world?.sunday;
    if (!s) return;
    restorePeople(P.people, s.people);
    props.load(s.props);
    shot.load(s.shot);
    if (s.court) court?.load(s.court);
    if (s.fan) fan?.load(s.fan);
  };
  P.day4Period = () => {
    const plan = PLANS[name] || {};
    for (const id of Object.keys(plan)) if (!cast.people[id] && P.people[id]) cast.adopt(id, P.people[id]);
    applyPlan(cast, P, plan);
    props.sync();
    court?.restore();
    fan?.restore();
  };
  P.day4 = async (a = {}) => {
    if (P.day3) await P.day3(a);
    else {
      const d3 = day3Place(game, name, { root: P.space, K: P.charScale || 1 });
      if (P.onDay3) d3.also(P.onDay3);
      P.day3 = (o) => d3.setup(P, o);
      await P.day3(a);
    }
    await props.setup(a);
    court?.restore();
    fan?.restore();
  };
}
export function installDay4(game) {
  game.hooks.day4Setup = (a) => isSunday() && game.place?.day4(a);
}
