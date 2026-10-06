import { place, emiHello } from './shared.js';
export default place({ east_lane: ['talk:dorm_street', 'zone:row_exit'], sports: ['talk:courts_walk', 'zone:courts_exit'], dorm_commons: ['talk:commons'] }, {
  labels: { kuro: ['Kuro', 'd3_kuro_intro'] },
  on: { 'talk:mio': 'd4_mio_lunch', 'talk:kuro': 'd4_kuro', 'talk:emi': 'd4_emi', 'talk:tama': 'd4_cat', 'talk:onsen': 'd4_onsen', 'talk:lookout': 'd4_lookout' },
  nodes: {
    d4_mio_lunch: [{ if: '!d4_mio_lunch_seen', then: [
      { say: 'mio', emo: 'casual', text: 'I brought a sandwich. Mum asked if I was eating properly, so I said there’s tomato in it.' },
      { say: 'eric', emo: 'curious', text: 'Is there?' },
      { say: 'mio', emo: 'dry', text: 'There was when I left home. It keeps falling out.' }, { set: 'd4_mio_lunch_seen' },
    ], else: [{ say: 'mio', emo: 'casual', text: 'I’m staying until I finish this. The wind keeps making it difficult.' }] }],
    d4_kuro: [{ if: 'd3_kuro_intro', then: [
      { say: 'kuro', name: 'Kuro', emo: 'warm', text: 'Hello, {mc.name}. There’s less wind at this end.' },
    ], else: [{ say: 'kuro', emo: 'polite', text: 'Hello. This end is a bit more sheltered, if you want to sit.' }] }],
    d4_emi: [...emiHello, { say: 'emi', emo: 'casual', text: 'I’m taking the long way home. If I go straight back I’ll open my work bag.' }],
    d4_cat: [{ say: 'eric', emo: 'warm', text: 'I’ll leave you the warm bit.' }],
    d4_onsen: ['> The boiler repair notice is still on the door.'],
    d4_lookout: [{ do: 'cam', on: 'east_coast_lookout', zoom: 1.2 }, { say: 'eric', emo: 'curious', text: 'I can smell the sea much more from up here.' }, { do: 'cam', back: true }],
  },
});
