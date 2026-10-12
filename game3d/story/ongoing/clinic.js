import source from '../clinic.js';
import { interactions, place } from './shared.js';
// The clinic in the continuing weeks: the nurse and the examination bed as on the first days, and the wake-up after a
// fall from the start node (story/clinic.js).
const visit = interactions(source, ['talk:clinic_nurse', 'talk:exam_bed']);
export default place('clinic', {
  ...visit,
  nodes: { ...visit.nodes, ...Object.fromEntries(Object.entries(source.nodes).filter(([id]) => id.startsWith('wake'))) },
  arrive: source.nodes.arrive,
});
