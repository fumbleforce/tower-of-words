// Day 3 test skeleton (shared.js): the dorm row and the coast, with the common room's door off the inner court.
import { place } from './shared.js';
export default place(
  {
    east_lane: ['talk:dorm_street', 'zone:row_exit'],
    sports: ['talk:courts_walk', 'zone:courts_exit'],
    dorm_commons: ['talk:commons'],
  },
  { closed: ['talk:onsen'] },
);
