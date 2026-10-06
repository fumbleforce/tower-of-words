// Day 4 story set. Physical integration and future-day reuse: README.md.
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
import forecourt from './forecourt.js';
import gate from './gate.js';
import train from './train.js';
import office from './office.js';
export { WORDS } from './words.js';
export { FINDS as FLAVOR_FINDS, NODES as FLAVOR_NODES } from '../days3-5-finds.js';
export { SCENES as MILESTONES, NODES as MILESTONE_NODES } from '../milestones/index.js';
export const PERIODS = ['morning', 'lunch', 'afternoon', 'evening'];
export const STORIES = {
  forecourt, gate, train, office, dorms, dorm_court, east_lane, plaza, sports, pool, gym, east_coast, dorm_commons, shotengai, karaoke, karaoke_booth,
};
export const OPEN_PLACES = Object.keys(STORIES);
// every way a story file here walks, so the trip is allowed (places/definitions.js canTravel)
export const TRIPS = Object.fromEntries(
  Object.entries(STORIES).map(([p, s]) => [
    p,
    Object.values(s.nodes).flatMap((steps) => steps.filter((x) => x && x.do === 'trip').map((x) => x.to)),
  ]),
);

// Requested additions only. These do not register hooks, targets or actors in the engine.
export const NEEDS = {
  all: { hooks: ['day4Setup'] },
  forecourt: { people: ['kuroda'], things: ['kuroda'] },
  plaza: { people: ['aoi', 'tama'], things: ['aoi', 'tama', 'board_map'], hooks: ['boardVisit'] },
  gate: { hooks: ['monitorRepair'] },
  train: { people: ['guard'], things: ['guard'], hooks: ['stationSignoff'] },
  gym: { people: ['attendant', 'mori', 'emi', 'kuro'], things: ['attendant', 'mori', 'emi', 'kuro'], hooks: ['bookingRepair', 'fanRepair'] },
  karaoke: { people: ['kuroda'], things: ['kuroda'] },
  pool: { people: ['emi', 'kuro', 'attendant', 'member'], things: ['emi', 'kuro', 'attendant', 'member', 'pool_notice'], hooks: ['poolSession'] },
  east_coast: { people: ['mio', 'emi', 'kuro', 'tama'], things: ['mio', 'emi', 'kuro', 'tama'] },
  shotengai: { people: ['kuroda', 'kuro', 'aoi', 'rei'], things: ['kuroda', 'kuro', 'aoi', 'rei'] },
  sports: { people: ['rei', 'aoi', 'member'], things: ['rei', 'aoi', 'member', 'bench_ball'], hooks: ['courtRepair', 'tennisSession'] },
  dorm_court: { people: ['tama'], things: ['tama'] },
  dorm_commons: { people: ['kenji', 'mori'], things: ['kenji', 'mori'] },
};
