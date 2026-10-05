import { place } from './shared.js';
export default place(
  { plaza: ['talk:plaza_lane', 'zone:plaza_exit'], karaoke: ['talk:karaoke'] },
  {
    labels: { aoi: ['Aoi', 'd3_aoi_intro'], kuro: ['Kuro', 'd3_kuro_intro'], rei: 'Tennis player' },
    on: {
      'talk:bakery': 'd3_bakery', 'talk:store': 'd3_store', 'talk:bike_shop': 'd3_bike',
      'talk:game_centre': 'd3_arcade', 'talk:izakaya': 'd3_izakaya',
      'talk:mori': 'd3_mori_shopping', 'talk:kenji': 'd3_kenji', 'talk:kuroda': 'd3_hamada_bread',
      'talk:aoi': 'd3_aoi_shoes', 'talk:kuro': 'd3_kuro_lunch', 'talk:rei': 'd3_rei_lunch',
      'talk:party_seat': 'd3_bench',
    },
    nodes: {
      d3_bakery: ['> The delivery card says orders for the dorms go to the manager’s window.'],
      d3_store: [{ say: 'eric', emo: 'tired', text: 'I should find out which of those cartons is milk before Monday.' }],
      d3_bike: ['> A card on the repair stand says “Back tyre only. Front one is new.”'],
      d3_arcade: [{ say: 'eric', emo: 'curious', text: 'I can hear the same losing tune from both machines.' }],
      d3_izakaya: [{ say: 'eric', emo: 'warm', text: 'They’re cooking already. I should eat before I come past here hungry.' }],
      d3_mori_shopping: [
        { say: 'mori', overheard: true, emo: 'polite', text: 'あ、{mc.name_jp}さん。お買い物ですか。' },
        { do: 'bow', who: 'mori' },
        { if: 'd2_mori_rest_seen', then: [
          { say: 'eric', emo: 'warm', text: 'I’ll still help you carry those boxes back on Monday.' },
          { do: 'gesture', who: 'mori', kind: 'nod', to: 'eric' },
        ] },
      ],
      d3_kenji: [{ if: "period == 'afternoon'", then: [
        { say: 'kenji', emo: 'sheepish', text: 'I only look. If I play, lunch money... gone.' },
      ], else: [{ say: 'kenji', emo: 'bright', text: 'This bread is curry. Inside! Careful, very hot.' }] }],
      d3_hamada_bread: [
        { say: 'kuroda', overheard: true, emo: 'sheepish', text: 'あ、{sumimasen}、先にどうぞ。まだ迷ってて……' },
        { do: 'gesture', who: 'kuroda', kind: 'point', to: 'bakery' },
        { say: 'eric', emo: 'warm', text: 'Oh, thanks. Take your time choosing.' },
      ],
      d3_aoi_shoes: [{ if: 'd3_aoi_intro', then: [
        { say: 'aoi', name: 'Aoi', overheard: true, emo: 'puzzled', text: 'テニスの靴って、こんなにあるんですね……', clear: ['テニス'] },
        { say: 'eric', emo: 'dry', text: 'Still shopping for tennis things?' },
      ], else: [
        { say: 'aoi', overheard: true, emo: 'polite', text: '{sumimasen}。{koko}、どうぞ。' },
        { do: 'gesture', who: 'aoi', kind: 'point' },
      ] }],
      d3_kuro_lunch: [{ if: 'kuro_reception_seen || d3_kuro_intro', then: [
        { if: 'd3_kuro_intro', then: [
          { say: 'kuro', name: 'Kuro', emo: 'teasing', text: 'Hello. It’s strange without a counter between us, isn’t it?' },
        ], else: [{ say: 'kuro', emo: 'teasing', text: 'Hello. It’s strange without a counter between us, isn’t it?' }] },
      ], else: [{ say: 'kuro', emo: 'polite', text: 'Hello. Are you waiting to order?' }] }],
      d3_rei_lunch: [{ say: 'rei', emo: 'casual', text: 'Could I reach past you? My drink’s there.' }],
      d3_bench: [
        { if: 'd2_party_done', then: [{ say: 'eric', emo: 'warm', text: 'Four of us fitted along here last night.' }],
          else: [{ say: 'eric', emo: 'warm', text: 'I could eat out here.' }] },
      ],
    },
  },
);
