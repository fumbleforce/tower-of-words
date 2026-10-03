import { direction, shut, northClosed, sayFallbacks, fallbackNodes } from './shared.js';
export default {
  start: 'd2_arrive',
  on: {
    'talk:dorm_street': 'd2_to_lane', 'zone:row_exit': 'd2_to_lane',
    'talk:courts_walk': 'd2_north_closed', 'zone:courts_exit': 'd2_north_closed',
    'talk:onsen': 'd2_shut',
    'talk:lookout': [{ if: '!d2_lookout_seen', node: 'd2_lookout' }, 'd2_lookout_again'],
    ...sayFallbacks,
  },
  nodes: {
    d2_arrive: direction('dorm_street', 'dorm_street', 'dorm_street', 'dorm_street'),
    d2_to_lane: [{ do: 'trip', to: 'east_lane' }],
    d2_north_closed: northClosed, d2_shut: shut,
    d2_lookout: [
      { do: 'cam', on: 'east_coast_lookout', zoom: 1.3 },
      '> A cold breeze comes up off the water.',
      { set: 'd2_lookout_seen' }, { do: 'cam', back: true },
    ],
    d2_lookout_again: [{ do: 'cam', on: 'east_coast_lookout', zoom: 1.3 }, '> The wind has picked up.', { do: 'cam', back: true }],
    ...fallbackNodes,
  },
};
