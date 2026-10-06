import { place } from './shared.js';
export default place({ sports: ['talk:changing_room'] }, { on: { 'talk:pool_notice': 'd5_pool_notice' }, nodes: {
  d5_pool_notice: ['> “Pool closed for the season. Swimming club meets in the gym on Saturday evenings.”'],
} });
