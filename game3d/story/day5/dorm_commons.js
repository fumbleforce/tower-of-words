import { place } from './shared.js';
export default place({ east_coast: ['talk:commons_door'] }, {
  labels: { aoi: ['Aoi', 'd3_aoi_intro'] },
  on: { 'talk:mori': 'd5_art_setup', 'talk:aoi': 'd5_aoi', 'talk:art_table': 'd5_art', 'talk:drying_rack': 'd5_sketch', 'talk:commons_board': 'd5_board' },
  nodes: {
    d5_art_setup: [
      { if: '!met_mori || d5_mori_needs_intro', then: [
        { say: 'mori', overheard: true, emo: 'polite', text: '森です。B2で働いています。{yoroshiku}。', clear: ['森', 'B2'] },
        { do: 'bow', who: 'mori' },
        { say: 'eric', emo: 'warm', text: 'I’m {mc.name}. I’m on B2 too.' },
        { do: 'meet', who: 'mori' }, { unset: 'd5_mori_needs_intro' },
      ] },
      { do: 'day5Commons', state: 'paper' },
      { say: 'mori', overheard: true, emo: 'polite', text: '明日の分です。ここなら、邪魔になりませんね。' },
      { do: 'gesture', who: 'mori', kind: 'point', to: 'commons_board' },
      { say: 'eric', emo: 'warm', text: 'You’re getting ready for tomorrow’s art club?' },
      { do: 'gesture', who: 'mori', kind: 'nod' },
      { if: 'club_art', then: [
        { say: 'eric', emo: 'warm', text: 'I’ve signed up. I’ll see you here.' },
        { say: 'mori', overheard: true, emo: 'warm', text: 'お待ちしています。' },
      ], else: [{ say: 'mori', overheard: true, emo: 'warm', text: 'よかったら、どうぞ。' }] },
    ],
    d5_aoi: [
      { do: 'day5Commons', state: 'seat' },
      { if: 'd3_aoi_intro', then: [
        { say: 'aoi', name: 'Aoi', overheard: true, emo: 'warm', text: 'どうぞ。ここ、空いてますよ。' },
      ], else: [{ say: 'aoi', overheard: true, emo: 'polite', text: 'どうぞ。ここ、空いてますよ。' }] },
      { say: 'eric', emo: 'warm', text: 'Thanks. I could sit down for a bit.' },
      { do: 'day5Commons', state: 'sit' },
    ],
    d5_art: ['> “Pencils are in the tin. Please leave the sharpener on the table.”'],
    d5_board: ['> “Art club tomorrow evening. The table by the window.”'],
    d5_sketch: [
      { if: 'd5_sketch_seen', then: [{ end: true }] },
      { do: 'day5Commons', state: 'sketch' },
      { say: 'eric', emo: 'curious', text: 'That’s the wall outside my window. They can see it from the next block too.' },
      '> On the back: “From room 204, next block. Please leave this on the shelf.”',
      { set: 'd5_sketch_seen' }, { do: 'cam', back: true }, { do: 'save' },
    ],
  },
});
