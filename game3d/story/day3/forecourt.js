import { place } from './shared.js';
export default place(
  { campus:['talk:campus','zone:campus_exit'], shotengai: ['talk:shop_lane', 'zone:shop_exit'], gate: ['talk:station_exit', 'zone:station_exit'], office: ['talk:office_entrance', 'zone:lift_front'],
    plaza: ['talk:plaza_lane', 'zone:plaza_lane'] },
  { nodes: {} },
);
