import source from '../day3/shotengai.js';
import { reiIntroduction } from './east_coast.js';
import { interactions, place } from './shared.js';
const familiar = interactions(source, [
  'talk:bakery_door', 'talk:bakery', 'talk:bike_shop', 'talk:game_centre', 'talk:kenji', 'talk:kuroda', 'talk:kuro', 'talk:aoi',
]);
export default place('shotengai', {
  ...familiar,
  labels: { aoi: ['Aoi', 'd3_aoi_intro'], kuro: ['Kuro', 'd3_kuro_intro'], rei: ['Rei', 'd4_rei_intro'] },
  on: { ...familiar.on, 'talk:store': 'ongoing_store', 'talk:party_seat': 'ongoing_bench', 'talk:mori': 'ongoing_mori_shopping', 'talk:rei': 'ongoing_rei_shopping' },
  nodes: {
    ...familiar.nodes,
    d3_aoi_shoes: [{ if: 'met_aoi || d3_aoi_intro', then: [
      { say: 'aoi', name: 'Aoi', overheard: true, emo: 'puzzled', text: 'テニスの靴って、こんなにあるんですね……', clear: ['テニス'] },
      { say: 'eric', emo: 'curious', text: 'Are you shopping for tennis things?' },
    ], else: [
      { say: 'aoi', overheard: true, emo: 'polite', text: '{sumimasen}。{koko}、どうぞ。' },
      { do: 'gesture', who: 'aoi', kind: 'point' },
    ] }],
    ongoing_store: [{ say: 'eric', emo: 'curious', text: 'I should find out which of those cartons is milk.' }],
    ongoing_bench: [{ say: 'eric', emo: 'warm', text: 'I could eat out here.' }],
    ongoing_mori_shopping: [
      { say: 'mori', overheard: true, emo: 'polite', text: 'あ、{mc.name_jp}さん。お買い物ですか。' },
      { do: 'bow', who: 'mori' },
    ],
    ongoing_rei_shopping: [
      { do: 'cam', on: 'rei', zoom: 1.2 },
      ...reiIntroduction,
      { say: 'rei', name: 'Rei', emo: 'casual', text: 'I’m getting something before I go back. Have you found a place you like yet?' },
      { choice: [
        { text: 'Ask what she usually buys.', go: 'ongoing_rei_order' },
        { text: 'Let her order.', go: 'ongoing_shop_leave' },
      ] },
    ],
    ongoing_rei_order: [
      { say: 'rei', name: 'Rei', emo: 'casual', text: 'The curry bread, if it’s still warm. Kenji usually knows when it comes out.' },
      { say: 'eric', emo: 'warm', text: 'I’ll ask him.' },
      { go: 'ongoing_shop_leave' },
    ],
    ongoing_shop_leave: [{ do: 'cam', back: true }],
  },
});
