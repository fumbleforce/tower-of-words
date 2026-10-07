import source from '../day3/dorm_commons.js';
import { artNodes } from './art.js';
import { interactions, place } from './shared.js';
const room = interactions(source, ['talk:kenji', 'talk:drying_rack', 'talk:commons_board', 'talk:commons_printer']);
export default place('dorm_commons', {
  on: { ...room.on, 'talk:mori': 'ongoing_mori_table', 'talk:art_table': 'ongoing_art_table' },
  nodes: {
    ...room.nodes, ...artNodes,
    club_art_1: [{ go: 'ongoing_art' }],
    club_art_2: [{ go: 'ongoing_art' }],
    ongoing_mori_table: [
      { if: 'ongoing_art_day && period_evening && club_art && ongoing_art_ready', then: [{ go: 'ongoing_art' }] },
      { do: 'cam', on: 'mori', zoom: 1.2 },
      { if: 'period_evening', then: [{ say: 'mori', overheard: true, emo: 'warm', text: 'こんばんは。よかったら、どうぞ。' }], else: [{ say: 'mori', overheard: true, emo: 'warm', text: 'こんにちは。火曜日は、ここで描いています。よかったら、どうぞ。' }] },
      { do: 'gesture', who: 'mori', kind: 'point', to: 'art_table' },
      { do: 'cam', back: true },
    ],
    ongoing_art_table: [
      { if: 'ongoing_art_day && period_evening && club_art && ongoing_art_ready', then: [{ go: 'ongoing_art' }] },
      '> “Please leave the brushes here. Art club, Tuesday evening.”',
    ],
  },
});
