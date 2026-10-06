// A complete second-day story set, awaiting the loader/scene integration listed in README.md.
import dorms from './dorms.js';
import dorm_court from './dorm_court.js';
import east_lane from './east_lane.js';
import plaza from './plaza.js';
import canteen from './canteen.js';
import forecourt from './forecourt.js';
import gate from './gate.js';
import train from './train.js';
import office from './office.js';
import shotengai from './shotengai.js';
import east_coast from './east_coast.js';
export const STORIES = { dorms, dorm_court, east_lane, plaza, canteen, forecourt, gate, train, office, shotengai, east_coast };
export { WORDS, BASE, FORM_NAME, FORM_NOTE } from './words.js';
export const OPEN_PLACES = Object.keys(STORIES);
// Same small area throughout day 2. Period changes never take away the route back to room 203.
export const PERIODS = ['morning', 'evening'];
export const TRIPS = {
  dorms: ['dorm_court'], dorm_court: ['dorms', 'east_lane'],
  east_lane: ['plaza', 'shotengai', 'dorm_court', 'east_coast'], east_coast: ['east_lane'],
  canteen: ['plaza'], plaza: ['forecourt', 'east_lane', 'shotengai', 'canteen'], forecourt: ['gate', 'office', 'plaza'],
  gate: ['train', 'forecourt'], train: ['gate'], office: ['forecourt'], shotengai: ['east_lane'],
};
// These are explicit requests, not engine registrations. The draft checker treats undeclared ids as errors.
export const NEEDS = {
  dorms: { things: ['computer', 'door_out'], zones: ['room_exit'], seats: ['desk_chair'] },
  dorm_court: { things: ['street_gate'], zones: ['street_exit'] },
  gate: { things: ['platform_way', 'forecourt_way'], zones: ['platform_way', 'forecourt_way'] },
  forecourt: { zones: ['station_exit'] },
  train: { things: ['door_test', 'station_exit'], zones: ['platform_exit'], hooks: ['stationSetup', 'doorTest'] },
  office: { hooks: ['officeDay2'] },
  shotengai: {
    people: ['mio', 'mori', 'kenji'], things: ['mio', 'mori', 'kenji', 'party_seat'],
    spots: ['party_group', 'party_kenji', 'party_mio'], seats: ['party_seat', 'party_mori'], hooks: ['partySetup', 'partyFood'],
  },
  east_coast: { people: ['kuroda'], things: ['lookout', 'kuroda'], spots: ['lookout_view'], hooks: ['coastVisit'] },
};
