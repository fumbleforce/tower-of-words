import { place } from './shared.js';
export default place({ east_lane: ['talk:dorm_street', 'zone:row_exit'], sports: ['talk:courts_walk', 'zone:courts_exit'], dorm_commons: ['talk:commons'] }, {
  labels: { rei: ['Rei', 'd4_rei_intro'] }, on: { 'talk:rei': 'd5_rei', 'talk:onsen': 'd5_onsen', 'talk:lookout': 'd5_lookout' }, nodes: {
    d5_rei: [{ if: 'd4_rei_intro', then: [{ say: 'rei', name: 'Rei', emo: 'casual', text: 'I’ve been sitting all day. I might walk round once more before I go home.' }], else: [{ say: 'rei', emo: 'polite', text: 'Good evening. There’s room to get past.' }] }],
    d5_onsen: ['> The boiler repair notice is still on the door.'],
    d5_lookout: [{ say: 'eric', emo: 'curious', text: 'I can hear the water against the steps from up here.' }],
  },
});
