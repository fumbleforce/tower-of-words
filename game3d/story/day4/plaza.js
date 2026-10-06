import { place } from './shared.js';
import saturday from '../day3/plaza.js';
export default place({ east_lane: ['talk:dorm_lane', 'zone:dorm_exit'], shotengai: ['talk:shop_walk', 'zone:shop_walk'], forecourt: ['talk:office_lane', 'zone:office_lane'] }, {
  labels: { aoi: ['Aoi', 'd3_aoi_intro'] },
  on: { 'talk:noticeboard': 'd4_board', 'talk:board_map': 'd3_map', 'say:koko:board_map': 'd3_here', 'talk:aoi': 'd4_aoi_walk', 'talk:fountain': 'd4_fountain' },
  nodes: {
    d3_map: saturday.nodes.d3_map, d3_here: saturday.nodes.d3_here,
    d3_koko_word: saturday.nodes.d3_koko_word, d3_map_end: saturday.nodes.d3_map_end,
    d4_board: [{ do: 'noticeboard' }, { set: 'd4_board_read' }, { do: 'save' }],
    d4_aoi_walk: [{ if: 'd3_aoi_intro', then: [
      { say: 'aoi', name: 'Aoi', overheard: true, emo: 'casual', text: '今夜、テニスに行きます。', clear: ['テニス'] },
      { say: 'eric', emo: 'warm', text: 'You’re going to tennis? I might see you there.' },
    ], else: [{ say: 'aoi', overheard: true, emo: 'polite', text: '{ohayo}。' }, { do: 'bow', who: 'aoi' }] }],
    d4_fountain: [{ say: 'eric', emo: 'warm', text: 'I can hear it before I turn the corner now.' }],
  },
});
