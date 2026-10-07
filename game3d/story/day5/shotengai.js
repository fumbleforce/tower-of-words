import { BAKERY_OPEN, KONBINI_OPEN } from '../../js/gameplay/shop-hours.js';
import { place } from './shared.js';
export default place({ forecourt: ['talk:office_lane', 'zone:office_exit'], plaza: ['talk:plaza_lane', 'zone:plaza_exit'], karaoke: ['talk:karaoke'] }, {
  labels: { rei: ['Rei', 'd4_rei_intro'] }, on: { 'talk:store_door': 'konbini_enter', 'talk:bakery_door': 'bakery_enter', 'talk:rei': 'd5_rei_lunch', 'talk:kuroda': 'd5_hamada', 'talk:bakery': 'd5_bakery', 'talk:store': 'd5_store' }, nodes: {
    konbini_enter: [{ if: KONBINI_OPEN, then: [{ go: 'konbini_open' }], else: ['> The shop is closed.'] }],
      konbini_open: [{ do: 'trip', to: 'konbini' }],
      bakery_enter: [{ if: BAKERY_OPEN, then: [{ go: 'bakery_open' }], else: ['> The bakery is closed.'] }],
    bakery_open: [{ do: 'trip', to: 'bakery' }],
    d5_rei_lunch: [{ if: 'd4_rei_intro', then: [{ say: 'rei', name: 'Rei', emo: 'casual', text: 'I’m taking lunch back today. Somebody moved the afternoon meeting forward.' }], else: [{ say: 'rei', emo: 'polite', text: 'Excuse me, can I get past?' }] }],
    d5_hamada: [{ do: 'gesture', who: 'kuroda', kind: 'point', to: 'bakery_door' }, { say: 'kuroda', overheard: true, emo: 'sheepish', text: 'パン、まだあるでしょうか。', clear: ['パン'] }, { if: 'bakery_visited', then: [{ say: 'eric', emo: 'curious', text: 'I can have a look, then.' }], else: [{ say: 'eric', emo: 'warm', text: 'I haven’t been in yet. Let’s have a look.' }] }],
    d5_bakery: ['> “Tomorrow’s orders: please write your room number clearly.”'],
    d5_store: [{ if: 'konbini_visited', then: ['> Milk cartons · 150 yen'], else: [{ say: 'eric', emo: 'casual', text: 'I need breakfast things before I go home.' }] }],
  },
});
