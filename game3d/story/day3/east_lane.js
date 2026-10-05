// Day 3 test skeleton (shared.js): the east lane.
import { place } from './shared.js';
export default place({
  plaza: ['talk:plaza_lane', 'zone:plaza_exit'],
  shotengai: ['talk:shop_street', 'zone:shop_exit'],
  east_coast: ['talk:dorm_row', 'zone:row_exit'],
  sports: ['talk:north_street', 'zone:north_exit'],
  dorm_court: ['talk:dorm_gate', 'zone:dorm_exit'],
});
