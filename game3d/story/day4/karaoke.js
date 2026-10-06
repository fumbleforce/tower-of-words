import { place } from './shared.js';
export default place({ shotengai: ['talk:karaoke_door'], karaoke_booth: ['talk:karaoke_stairs'] }, { on: { 'talk:karaoke_desk': 'd4_booking', 'talk:kuroda': 'd4_hamada_booking' }, nodes: {
  d4_booking: ['> “Wednesday club booking: upstairs. You can come just to listen.”'],
  d4_hamada_booking: [
    { do: 'gesture', who: 'kuroda', kind: 'point', to: 'karaoke_desk' },
    { say: 'kuroda', overheard: true, emo: 'polite', text: '水曜日の予約を、確認していたんです。' },
    { say: 'eric', emo: 'warm', text: 'The Wednesday booking? It’s on the card here.' },
    { do: 'bow', who: 'kuroda' },
    { say: 'kuroda', overheard: true, emo: 'sheepish', text: '{sumimasen}。受付をふさいでしまって。' },
  ],
} });
