// Day 3 test skeleton (shared.js): the fountain plaza and its notice board.
import { place, goal } from './shared.js';
export default place(
  { east_lane: ['talk:dorm_lane', 'zone:dorm_exit'], shotengai: ['talk:shop_walk', 'zone:shop_walk'] },
  {
    closed: ['talk:office_lane', 'zone:office_lane'],
    at: 'noticeboard',
    // reading the board, then the goal line after it (a slip taken: where the clubs are listed)
    on: { 'talk:noticeboard': 'd3_board' },
    nodes: { d3_board: [{ do: 'noticeboard' }, ...goal('noticeboard')] },
  },
);
