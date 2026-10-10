import { place } from './shared.js';
import sunday from '../day4/plaza.js';
export default place({ canteen: ['talk:canteen_door'], east_lane: ['talk:dorm_lane', 'zone:dorm_exit'], shotengai: ['talk:shop_walk', 'zone:shop_walk'], forecourt: ['talk:office_lane', 'zone:office_lane'] }, {
  labels: { aoi: ['Aoi', 'd3_aoi_intro'] },
  on: { 'talk:noticeboard': 'd5_board', 'talk:board_map': 'd3_map', 'say:koko:board_map': 'd3_here', 'talk:aoi': 'd5_aoi_lunch', 'talk:fountain': 'd5_fountain' },
  nodes: {
    d3_map: sunday.nodes.d3_map, d3_here: sunday.nodes.d3_here, d3_koko_word: sunday.nodes.d3_koko_word, d3_map_end: sunday.nodes.d3_map_end,
    d5_board: [{ do: 'noticeboard' }, { do: 'save' }],
    d5_aoi_lunch: [{ if: 'd3_aoi_intro', then: [
      { say: 'aoi', name: 'Aoi', overheard: true, emo: 'casual', text: 'やっと、お昼です。' }, { do: 'day5Setup', state: 'aoiLunch' }, { say: 'eric', emo: 'warm', text: 'I’ll let you eat. See you later.' },
    ], else: [{ say: 'aoi', overheard: true, emo: 'polite', text: 'こんにちは。' }, { do: 'bow', who: 'aoi' }, { say: 'eric', emo: 'warm', text: 'Hello.' }] }],
    d5_fountain: [{ say: 'eric', emo: 'warm', text: 'I can get back to B2 from here without checking the map now.' }],
  },
});
