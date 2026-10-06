import { receptionNodes } from './reception.js';
import { place } from './shared.js';
export default place(
  { gate: ['talk:station_exit', 'zone:station_exit'], office: ['talk:office_entrance', 'zone:lift_front'],
    plaza: ['talk:plaza_lane', 'zone:plaza_lane'] },
  { labels: { kuro: ['Kuro', 'd3_kuro_intro'] }, on: { 'talk:kuro': 'd5_label', 'talk:label_printer': 'd5_label' }, nodes: receptionNodes },
);
