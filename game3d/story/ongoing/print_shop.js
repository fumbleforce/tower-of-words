import source from '../print_shop.js';
import { interactions, place } from './shared.js';
export default place('print_shop', interactions(source, ['talk:directory_printer', 'talk:print_seat']));
