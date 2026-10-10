import source from '../ferry_terminal.js';
import { interactions, place } from './shared.js';
export default place('ferry_terminal', interactions(source,['talk:ferry_staff','talk:ferry_reader','talk:ferry_traveller','talk:ferry_window_seat','talk:ferry_quiet_seat','talk:ferry_landing_seat','talk:ferry_notice_seat']));
