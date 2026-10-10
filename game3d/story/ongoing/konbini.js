import source from '../konbini.js';
import { place } from './shared.js';
const visit = structuredClone(source);
export default place('konbini', { ...visit, arrive: visit.nodes.arrive });
