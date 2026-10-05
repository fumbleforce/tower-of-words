// Day 3 TEST SKELETON (#228; shared.js): ?day=3 only, so the clubs and the notice board can be played before the
// day's story exists. LAST_DAY stays 2 (js/days.js), so no player reaches it from day 2's end. Codex's day 3
// (#229) replaces these files.
import dorms from './dorms.js';
import dorm_court from './dorm_court.js';
import east_lane from './east_lane.js';
import plaza from './plaza.js';
import sports from './sports.js';
import pool from './pool.js';
import gym from './gym.js';
import east_coast from './east_coast.js';
import dorm_commons from './dorm_commons.js';
import shotengai from './shotengai.js';
import karaoke from './karaoke.js';
import karaoke_booth from './karaoke_booth.js';
export const STORIES = {
  dorms, dorm_court, east_lane, plaza, sports, pool, gym, east_coast, dorm_commons, shotengai, karaoke, karaoke_booth,
};
export const OPEN_PLACES = Object.keys(STORIES);
// every way a story file here walks, so the trip is allowed (places/definitions.js canTravel)
export const TRIPS = Object.fromEntries(
  Object.entries(STORIES).map(([p, s]) => [
    p,
    Object.values(s.nodes).flatMap((steps) => steps.filter((x) => x && x.do === 'trip').map((x) => x.to)),
  ]),
);
