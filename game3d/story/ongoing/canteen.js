import source from '../canteen.js';
import { place } from './shared.js';
// The canteen's seating, service and personal conversations have no introductory date.
export default place('canteen', { speakers: source.speakers, on: source.on, nodes: source.nodes, labels: source.labels });
