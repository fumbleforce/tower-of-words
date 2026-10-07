import source from '../office_quarter.js';
import { interactions, place } from './shared.js';
export default place('office_quarter', interactions(source, ['talk:trading_office', 'talk:foods_office', 'talk:electric_office', 'talk:logistics_office', 'talk:construction_office', 'talk:insurance_office', 'talk:bank']));
