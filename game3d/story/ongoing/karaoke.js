import source from '../day3/karaoke.js';
import { interactions, place } from './shared.js';
export default place('karaoke', interactions(source, ['talk:karaoke_desk']));
