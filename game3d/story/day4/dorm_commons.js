import { place } from './shared.js';
export default place({ east_coast: ['talk:commons_door'] }, { on: { 'talk:kenji': 'd4_tv', 'talk:mori': 'd4_sketch', 'talk:art_table': 'd4_art', 'talk:commons_board': 'd4_board', 'talk:drying_rack': 'd4_rack' }, nodes: {
  d4_tv: [{ do: 'day4Setup', state: 'remote' }, { say: 'kenji', emo: 'sheepish', text: 'Ah, sorry. Remote is under me!' }],
  d4_sketch: [
    { do: 'cam', on: 'mori', zoom: 1.2 },
    { do: 'day4Setup', state: 'sketch' },
    { say: 'mori', overheard: true, emo: 'sheepish', text: '消してばかりで、なかなか進みません。' },
    { say: 'eric', emo: 'warm', text: 'I do that too. Eventually I have to leave the pencil alone.' },
    { if: 'club_art', then: [
      { say: 'mori', overheard: true, emo: 'warm', text: '火曜日、またここで。' },
      { say: 'eric', emo: 'warm', text: 'I’ll see you here for the art club.' },
    ], else: [
      { do: 'gesture', who: 'mori', kind: 'point', to: 'commons_board' },
      { say: 'mori', overheard: true, emo: 'warm', text: 'よかったら、どうぞ。' },
    ] },
    { do: 'cam', back: true },
  ],
  d4_art: ['> The scrap-paper tray says “Both sides, please.”'],
  d4_board: ['> “Art club, Tuesday evening. Please leave room to eat at the other end of the table.”'],
  d4_rack: [{ say: 'eric', emo: 'casual', text: 'These are still damp at the corners.' }],
} });
