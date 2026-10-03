import { direction, sayFallbacks, fallbackNodes } from './shared.js';
export default {
  start: 'd2_arrive',
  on: {
    'talk:office_lane': 'd2_to_office', 'zone:office_lane': 'd2_to_office',
    'talk:dorm_lane': 'd2_to_lane', 'zone:dorm_exit': 'd2_to_lane',
    'talk:shop_walk': 'd2_to_shops', 'zone:shop_walk': 'd2_to_shops',
    'talk:fountain': 'd2_fountain',
    ...sayFallbacks,
  },
  nodes: {
    d2_arrive: direction('office_lane', 'office_lane', 'shop_walk', 'dorm_lane'),
    d2_to_office: [{ do: 'trip', to: 'forecourt' }],
    d2_to_lane: [{ do: 'trip', to: 'east_lane' }],
    d2_to_shops: [{ do: 'trip', to: 'shotengai' }],
    d2_fountain: [{ say: 'eric', emo: 'tired', text: 'I could sit here a minute.' }],
    ...fallbackNodes,
  },
};
