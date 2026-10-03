import { direction, shut, northClosed, sayFallbacks, fallbackNodes } from './shared.js';
export default {
  start: 'd2_arrive',
  on: {
    'talk:plaza_lane': 'd2_to_plaza', 'zone:plaza_exit': 'd2_to_plaza',
    'talk:shop_street': 'd2_to_shops', 'zone:shop_exit': 'd2_to_shops',
    'talk:dorm_row': 'd2_to_coast', 'zone:row_exit': 'd2_to_coast',
    'talk:dorm_gate': 'd2_to_dorms', 'zone:dorm_exit': 'd2_to_dorms',
    'talk:north_street': 'd2_north_closed', 'zone:north_exit': 'd2_north_closed',
    'talk:cafe': 'd2_shut', 'talk:liquor_shop': [{ if: '!d2_sake_tag_seen', node: 'd2_sake_tag' }, 'd2_shut'], 'talk:barber': 'd2_shut', 'talk:travel_office': 'd2_shut',
    ...sayFallbacks,
  },
  nodes: {
    d2_arrive: direction('plaza_lane', 'plaza_lane', 'shop_street', 'dorm_gate'),
    d2_to_plaza: [{ do: 'trip', to: 'plaza' }],
    d2_to_shops: [{ do: 'trip', to: 'shotengai' }],
    d2_to_coast: [{ do: 'trip', to: 'east_coast' }],
    d2_to_dorms: [{ do: 'trip', to: 'dorm_court' }],
    d2_sake_tag: [
      { do: 'cam', on: 'liquor_shop', zoom: 1.2 },
      '> A tag below the cedar ball reads, “New sake is here.”',
      { say: 'eric', emo: 'curious', text: 'Oh, that’s what the ball is for. I thought it was a nest.' },
      { set: 'd2_sake_tag_seen' }, { do: 'cam', back: true },
    ],
    d2_shut: shut, d2_north_closed: northClosed,
    ...fallbackNodes,
  },
};
