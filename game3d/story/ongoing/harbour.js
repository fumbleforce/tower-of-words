import source from '../harbour.js';
import { interactions, place } from './shared.js';
export default place('harbour', interactions(source, ['talk:ferry_terminal', 'talk:harbour_office']));
