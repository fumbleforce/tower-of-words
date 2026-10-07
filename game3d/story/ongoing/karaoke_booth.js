import source from '../day5/karaoke_booth.js';
import { interactions, place } from './shared.js';
const repairs = interactions(source, ['talk:kenji', 'talk:song_terminal', 'talk:booth_screen', 'say:matte:song_terminal']);
export default place('karaoke_booth', {
  ...repairs,
  on: { ...repairs.on, 'say:matte:song_terminal': { if: 'period_lunch && ongoing_workday && know_matte && d5_selector_requested && !d5_selector_done', node: 'd5_selector_magic' } },
  nodes: {
    ...repairs.nodes,
    d5_selector: [
      { if: "!period_lunch || !ongoing_workday", then: [
        { say: 'eric', emo: 'casual', text: 'Kenji checks the song selector here on weekdays at lunch. I’ll catch him then.' },
        { end: true },
      ] },
      ...repairs.nodes.d5_selector.slice(1),
    ],
  },
});
