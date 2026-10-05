import { place } from './shared.js';
export default place(
  { gate: ['talk:station_exit', 'zone:station_exit'], office: ['talk:office_entrance', 'zone:lift_front'],
    plaza: ['talk:plaza_lane', 'zone:plaza_lane'] },
  { nodes: {} },
);
