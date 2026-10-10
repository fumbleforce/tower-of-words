import { place } from './shared.js';
export default place(
  { karaoke: ['talk:booth_door'] },
  {
    on: { 'talk:song_terminal': 'd3_songbook', 'talk:booth_screen': 'd3_screen' },
    nodes: {
      d3_songbook: ['> A bookmark says “Songs with long introductions”. Someone has crossed out two of them.'],
      d3_screen: [{ say: 'eric', emo: 'dry', text: 'I could manage the words if it were always this quiet.' }],
    },
  },
);
