import source from '../day3/east_lane.js';
import { interactions, place } from './shared.js';
export default place('east_lane', interactions(source, ['talk:liquor_shop', 'talk:travel_office', 'talk:cafe', 'talk:barber']));
