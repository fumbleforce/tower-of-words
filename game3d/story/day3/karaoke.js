import { place } from './shared.js';
export default place(
  { shotengai: ['talk:karaoke_door'], karaoke_booth: ['talk:karaoke_stairs'] },
  {
    on: { 'talk:karaoke_desk': 'd3_karaoke_desk' },
    nodes: { d3_karaoke_desk: [
      '> The club’s booking card says “Wednesday evening, upstairs. Listeners welcome.”',
    ] },
  },
);
