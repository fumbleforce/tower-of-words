import { place } from './shared.js';
export default place({ forecourt: ['talk:office_lane', 'zone:office_exit'], plaza: ['talk:plaza_lane', 'zone:plaza_exit'], karaoke: ['talk:karaoke'] }, {
  labels: { kuro: ['Kuro', 'd3_kuro_intro'] },
  on: { 'talk:mori': 'd4_mori', 'talk:kenji': 'd4_kenji', 'talk:kuroda': 'd4_hamada', 'talk:kuro': 'd4_kuro', 'talk:bakery': 'd4_bakery', 'talk:game_centre': 'd4_arcade', 'talk:store': 'd4_store' },
  nodes: {
    d4_mori: [{ say: 'mori', overheard: true, emo: 'warm', text: 'こんにちは。これから、お昼を買いに。' }, { do: 'gesture', who: 'mori', kind: 'point', to: 'bakery' }, { say: 'eric', emo: 'warm', text: 'I’ll let you get your lunch.' }],
    d4_kenji: [{ if: "period == 'evening'", then: [{ say: 'kenji', emo: 'sheepish', text: 'I won a game! I go home now, before I lose again.' }], else: [{ say: 'kenji', emo: 'bright', text: 'I bought curry bread again. Yesterday it was too hot, so today I wait.' }] }],
    d4_hamada: [{ say: 'kuroda', overheard: true, emo: 'polite', text: '{sumimasen}。パンを取りに来ただけなんです。', clear: ['パン'] }, { do: 'gesture', who: 'kuroda', kind: 'point', to: 'bakery' }, { say: 'eric', emo: 'warm', text: 'Oh, am I in the way? Sorry.' }],
    d4_kuro: [{ if: 'd3_kuro_intro', then: [{ say: 'kuro', name: 'Kuro', emo: 'polite', text: 'I came for washing powder. I have to keep saying it or I’ll get home without it.' }], else: [{ say: 'kuro', emo: 'polite', text: 'I came for washing powder. I have to keep saying it or I’ll get home without it.' }] }],
    d4_bakery: ['> “Bread reserved by phone is on the shelf behind the till.”'],
    d4_arcade: [{ say: 'eric', emo: 'curious', text: 'I can hear that machine from halfway down the street.' }],
    d4_store: [{ say: 'eric', emo: 'casual', text: 'I should try a small carton first. I don’t know which one I like yet.' }],
  },
});
