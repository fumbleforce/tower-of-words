import source from '../day4/pool.js';
import { interactions, place } from './shared.js';
export default place('pool', interactions(source, ['talk:pool_notice']));
