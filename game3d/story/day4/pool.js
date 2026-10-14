import { place } from './shared.js';
export default place({ sports: ['talk:changing_room'] }, { labels: { changing_room: 'Back to the sports lane' }, on: { 'talk:pool_notice': 'd4_pool_notice' }, nodes: {
  d4_pool_notice: ['> “Swimming club meets here on Saturday evenings.”'],
} });
