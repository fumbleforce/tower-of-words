import source from '../bakery.js';
import { place } from './shared.js';
const visit = structuredClone(source);
export default place('bakery', { ...visit, arrive: visit.nodes.arrive });
