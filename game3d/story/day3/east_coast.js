import { place, emiHello } from './shared.js';
export default place(
  { east_lane: ['talk:dorm_street', 'zone:row_exit'], sports: ['talk:courts_walk', 'zone:courts_exit'], dorm_commons: ['talk:commons'] },
  {
    labels: { aoi: ['Aoi', 'd3_aoi_intro'] },
    on: {
      'talk:onsen': 'd3_onsen', 'talk:lookout': 'd3_lookout',
      'talk:mio': 'd3_mio', 'talk:emi': 'd3_emi_lunch', 'talk:kuroda': 'd3_hamada', 'talk:aoi': 'd3_aoi_walk',
    },
    nodes: {
      d3_onsen: ['> The door notice says “Closed for boiler repairs.”'],
      d3_lookout: [
        { do: 'cam', on: 'east_coast_lookout', zoom: 1.2 },
        { if: 'd2_lookout_seen', then: [{ say: 'eric', emo: 'warm', text: 'I can just make out those steps without the telescope now.' }],
          else: [{ say: 'eric', emo: 'curious', text: 'I wonder which bit of the mainland I came from.' }] },
        { do: 'cam', back: true },
      ],
      d3_mio: [
        { if: '!d3_mio_terrace', then: [
          { say: 'mio', emo: 'casual', text: 'There’s no socket here. I checked before I sat down, which is a bit sad.' },
          { say: 'eric', emo: 'curious', text: 'Are you working?' },
          { say: 'mio', emo: 'dry', text: 'Mm. Reading about the thing I was working on. Apparently that’s my afternoon also.' },
          { set: 'd3_mio_terrace' },
        ], else: [{ say: 'mio', emo: 'tired', text: 'I’m nearly out of battery. Then I have to stop, so...' }] },
      ],
      d3_emi_lunch: [...emiHello, { say: 'emi', emo: 'bright', text: 'You’ve found my lunch spot. I can usually finish a sandwich here.' }],
      d3_hamada: [
        { if: 'd2_hamada_seen', then: [
          { say: 'kuroda', overheard: true, emo: 'sheepish', text: 'あ、今日は拭きません。座ってるだけです。' },
          { say: 'eric', emo: 'warm', text: 'You’ve left the cloth at home today, then.' },
        ], else: [
          { say: 'kuroda', overheard: true, emo: 'polite', text: 'あ、{sumimasen}。どうぞ、どうぞ。' },
          { do: 'gesture', who: 'kuroda', kind: 'point', to: 'east_coast_lookout' },
        ] },
      ],
      d3_aoi_walk: [
        { if: 'd3_aoi_intro', then: [
          { say: 'aoi', name: 'Aoi', overheard: true, emo: 'bright', text: '靴、買えました！明日はラケットを借りて、テニスです。', clear: ['ラケット', 'テニス'] },
          { do: 'emote', who: 'aoi', kind: '♪' },
        ], else: [
          { say: 'aoi', overheard: true, emo: 'polite', text: 'こんばんは。' }, { do: 'bow', who: 'aoi' },
        ] },
      ],
    },
  },
);
