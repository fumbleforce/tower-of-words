import source from '../day3/pool.js';
import notices from '../day4/pool.js';
import CLUBS from '../clubs.js';
import { swimmingNodes } from './swimming.js';
import { interactions, place } from './shared.js';
const pool = interactions(source, ['talk:emi', 'talk:kuro', 'talk:pool_goggles', 'talk:attendant']);
export default place('pool', {
  ...pool,
  labels: source.labels, show: source.show,
  on: { ...pool.on, 'talk:emi': [
    { if: 'period_evening && club_swimming', node: 'ongoing_swimming' }, 'd3_emi_pool',
  ], 'talk:pool_notice': 'd4_pool_notice' },
  nodes: { ...source.nodes, ...Object.fromEntries(Object.entries(CLUBS.nodes).filter(([id]) => id.startsWith('club_swimming'))), ...notices.nodes, ...swimmingNodes,
    club_swimming_1: structuredClone(CLUBS.nodes.club_swimming_1),
    club_swimming_2: [{ go: 'ongoing_swimming' }],
    ongoing_swimming_join: CLUBS.nodes.club_swimming_join.slice(1).map(step => step.go === 'club_swimming_length' ? { go: 'ongoing_swimming_length' } : structuredClone(step)),
    ongoing_swimming_watch: CLUBS.nodes.club_swimming_watch.map(step => step.go === 'club_swimming_deck' ? { go: 'ongoing_swimming_deck' } : structuredClone(step)),
  },
});
