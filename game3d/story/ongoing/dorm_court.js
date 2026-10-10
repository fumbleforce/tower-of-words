import source from '../day3/dorm_court.js';
import { interactions, place } from './shared.js';
export default place('dorm_court', interactions(source, ['talk:mailboxes', 'talk:dorm_entry', 'talk:tama']));
