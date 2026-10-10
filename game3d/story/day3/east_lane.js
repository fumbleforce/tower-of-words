import { place } from './shared.js';
export default place(
  {
    plaza: ['talk:plaza_lane', 'zone:plaza_exit'],
    shotengai: ['talk:shop_street', 'zone:shop_exit'],
    east_coast: ['talk:dorm_row', 'zone:row_exit'],
    sports: ['talk:north_street', 'zone:north_exit'],
    dorm_court: ['talk:dorm_gate', 'zone:dorm_exit'],
  },
  {
    on: { 'talk:liquor_shop': 'd3_liquor', 'talk:travel_office': 'd3_travel', 'talk:cafe': 'd3_cafe', 'talk:barber': 'd3_barber' },
    nodes: {
      d3_liquor: [{ say: 'eric', emo: 'curious', text: 'They deliver rice as well. That would be a long walk with a sack.' }],
      d3_travel: ['> The opening hours in the window say “Weekdays”.'],
      d3_cafe: [{ say: 'eric', emo: 'warm', text: 'I can smell the toast from here.' }],
      d3_barber: ['> A small card beside the booking number says “Please take off your glasses.”'],
    },
  },
);
