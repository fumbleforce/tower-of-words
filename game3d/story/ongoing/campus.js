import source from '../campus.js';
import { interactions, place } from './shared.js';
export default place('campus', interactions(source, ['talk:campus_bench']));
