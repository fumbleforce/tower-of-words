import { place } from './shared.js';
export default place({ east_lane: ['talk:north_street', 'zone:north_exit'], east_coast: ['talk:onsen_path', 'zone:east_exit'], gym: ['talk:gym'], pool: ['talk:pool'] }, {
  closed: ['talk:office_street', 'zone:west_exit'], on: { 'talk:court_display': 'd5_display', 'talk:ball_basket': 'd5_basket' }, nodes: {
    d5_display: [{ if: 'd4_display_done', then: [{ say: 'eric', emo: 'warm', text: 'They’ve put the cover over it.' }], else: [{ say: 'eric', emo: 'casual', text: 'The request says to wait for a Sunday when someone can test it with me.' }] }],
    d5_basket: ['> “Please bring the balls in if it rains.”'],
  },
});
