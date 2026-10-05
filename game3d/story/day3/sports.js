// Day 3 test skeleton (shared.js): the sports ground, its tennis courts, and the doors to the gym and the pool deck.
import { place } from './shared.js';
export default place(
  {
    east_lane: ['talk:north_street', 'zone:north_exit'],
    east_coast: ['talk:onsen_path', 'zone:east_exit'],
    gym: ['talk:gym'],
    pool: ['talk:pool'],
  },
  { closed: ['talk:office_street', 'zone:west_exit'] },
);
