import { place } from './shared.js';
export default place({ plaza: ['talk:plaza_lane', 'zone:plaza_exit'], karaoke: ['talk:karaoke'] }, {
  labels: { rei: ['Rei', 'd4_rei_intro'] }, on: { 'talk:rei': 'd5_rei_lunch', 'talk:kuroda': 'd5_hamada', 'talk:bakery': 'd5_bakery', 'talk:store': 'd5_store' }, nodes: {
    d5_rei_lunch: [{ if: 'd4_rei_intro', then: [{ say: 'rei', name: 'Rei', emo: 'casual', text: 'I’m taking lunch back today. Somebody moved the afternoon meeting forward.' }], else: [{ say: 'rei', emo: 'polite', text: 'Excuse me, can I get past?' }] }],
    d5_hamada: [{ do: 'gesture', who: 'kuroda', kind: 'point', to: 'bakery' }, { say: 'kuroda', overheard: true, emo: 'sheepish', text: 'パン、まだあるでしょうか。', clear: ['パン'] }, { say: 'eric', emo: 'warm', text: 'I haven’t been in yet. Let’s have a look.' }],
    d5_bakery: ['> “Tomorrow’s orders: please write your room number clearly.”'],
    d5_store: [{ say: 'eric', emo: 'casual', text: 'I need breakfast things before I go home.' }],
  },
});
