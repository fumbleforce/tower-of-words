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
        { say: 'mori', emo: 'polite', text: '{ohayo}ございます。夕食の買い物です。', en: 'Good morning. I’m shopping for dinner.' },
        { if: 'd2_mori_rest_seen', then: [{ say: 'mori', emo: 'warm', text: '箱は月曜日で大丈夫です。今日はお休みですから。', en: 'Monday is fine for those boxes. Have your day off.' }] },
      ],
      d3_kenji: [{ if: "period == 'afternoon'", then: [
        { say: 'kenji', emo: 'sheepish', text: 'I only look. If I play, lunch money... gone.' },
      ], else: [{ say: 'kenji', emo: 'bright', text: 'This bread is curry. Inside! Careful, very hot.' }] }],
      d3_hamada_bread: [
        { say: 'kuroda', emo: 'sheepish', text: 'すみません、先にどうぞ。まだ迷ってて……', en: 'Sorry, go ahead of me. I still haven’t decided.' },
      ],
      d3_aoi_shoes: [{ if: 'd3_aoi_intro', then: [
        { say: 'aoi', name: 'Aoi', emo: 'puzzled', text: 'テニス用って、こんなに種類があるんですね。', en: 'I didn’t know there were this many kinds of tennis shoes.' },
      ], else: [{ say: 'aoi', emo: 'polite', text: 'すみません、ここ、空いてます。', en: 'Excuse me. This spot’s free, if you want it.' }] }],
      d3_kuro_lunch: [{ if: 'kuro_reception_seen || d3_kuro_intro', then: [
        { if: 'd3_kuro_intro', then: [
          { say: 'kuro', name: 'Kuro', emo: 'polite', text: 'Hello. I’m away from the reception desk today.' },
        ], else: [{ say: 'kuro', emo: 'polite', text: 'Hello. I’m away from the reception desk today.' }] },
      ], else: [{ say: 'kuro', emo: 'polite', text: 'Hello. Are you waiting to order?' }] }],
      d3_rei_lunch: [{ say: 'rei', emo: 'casual', text: 'Could I reach past you? My drink’s there.' }],
      d3_bench: [
        { if: 'd2_party_done', then: [{ say: 'eric', emo: 'warm', text: 'Four of us fitted along here last night.' }],
          else: [{ say: 'eric', emo: 'warm', text: 'I could eat out here.' }] },
      ],
    },
  },
);
