import { campusRoutes } from '../campus-routes.js';
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
import izakaya from './izakaya.js';
import east_coast from './east_coast.js';
export const STORIES = campusRoutes({ dorms, dorm_court, east_lane, plaza, canteen, forecourt, gate, train, office, shotengai, izakaya, east_coast });
export { WORDS, BASE, FORM_NAME, FORM_NOTE } from './words.js';
export const OPEN_PLACES = Object.keys(STORIES);
// Same small area throughout day 2. Period changes never take away the route back to room 203.
export const PERIODS = ['morning', 'evening'];
export const TRIPS = {
 campus:['forecourt','office_quarter','harbour','print_shop'],print_shop:['campus'],office_quarter:['campus','harbour'],harbour:['campus','office_quarter','ferry_terminal'],ferry_terminal:['harbour'],
  dorms: ['dorm_court'], dorm_court: ['dorms', 'east_lane'],
  east_lane: ['plaza', 'shotengai', 'dorm_court', 'east_coast'], east_coast: ['east_lane'],
  canteen: ['plaza'], plaza: ['forecourt', 'east_lane', 'shotengai', 'canteen'], forecourt: ['gate', 'office', 'plaza', 'shotengai', 'campus'],
  gate: ['train', 'forecourt'], train: ['gate'], office: ['forecourt'], shotengai: ['east_lane', 'forecourt', 'izakaya'], izakaya: ['shotengai'],
};
// These are explicit requests, not engine registrations. The draft checker treats undeclared ids as errors.
export const NEEDS = {
  dorms: { things: ['computer', 'door_out'], zones: ['room_exit'], seats: ['desk_chair'] },
  dorm_court: { things: ['street_gate'], zones: ['street_exit'] },
  gate: { things: ['platform_way', 'forecourt_way'], zones: ['platform_way', 'forecourt_way'] },
  forecourt: { zones: ['station_exit'] },
  train: { things: ['door_test', 'station_exit'], zones: ['platform_exit'], hooks: ['stationSetup', 'doorTest'] },
  office: { hooks: ['officeDay2'] },
  shotengai: { people: ['kenji'], things: ['kenji'], hooks: ['partySetup'] },
  izakaya: {
    people: ['mio', 'mori', 'kenji', 'emi'], things: ['mio', 'mori', 'kenji', 'emi', 'party_seat', 'izakaya_exit'],
    spots: ['party_group', 'party_food', 'party_mio', 'party_kenji', 'party_emi', 'service_counter'],
    seats: ['party_seat', 'party_mori', 'party_mio', 'party_kenji', 'party_emi'],
    hooks: ['partySetup', 'partyFood'], zones: ['izakaya_exit'],
  },
  east_coast: { people: ['kuroda'], things: ['lookout', 'kuroda'], spots: ['lookout_view'], hooks: ['coastVisit'] },
};
