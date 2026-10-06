import { direction, sayFallbacks, fallbackNodes } from './shared.js';
export default {
  start: 'd2_arrive',
  on: {
    'talk:shop_lane': 'd2_to_shotengai', 'zone:shop_exit': 'd2_to_shotengai',
    'talk:station_exit': 'd2_to_station', 'zone:station_exit': 'd2_to_station',
    'talk:office_entrance': 'd2_to_office', 'zone:lift_front': 'd2_to_office',
    'talk:plaza_lane': 'd2_to_plaza', 'zone:plaza_lane': 'd2_to_plaza',
    ...sayFallbacks,
  },
  nodes: {
    d2_to_shotengai: [{ do: 'trip', to: 'shotengai' }],
    d2_arrive: direction('station_exit', 'office_entrance', 'plaza_lane', 'plaza_lane'),
    d2_to_station: [{ do: 'trip', to: 'gate' }],
    d2_to_office: [{ do: 'trip', to: 'office' }],
    d2_to_plaza: [{ do: 'trip', to: 'plaza' }],
    ...fallbackNodes,
  },
};
