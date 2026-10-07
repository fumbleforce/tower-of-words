import source from '../day4/sports.js';
import { tennisNodes } from '../day4/tennis.js';
import { interactions, place } from './shared.js';
const familiar = interactions(source, ['talk:rei', 'talk:aoi', 'talk:court_display', 'talk:ball_basket', 'talk:bench_ball']);
export default place('sports', {
  ...familiar,
  labels: source.labels,
  show: { bench_ball: 'ongoing_tennis_day && period_evening && !d4_bottle_seen' },
  nodes: {
    ...tennisNodes, ...familiar.nodes,
    d4_display: [
      { if: "ticket_T0005 != 'done' && !ongoing_tennis_day", then: [
        { say: 'eric', emo: 'warm', text: 'I’ll check this with the Sunday players. They’ll know what’s going wrong.' },
        { end: true },
      ] },
      ...familiar.nodes.d4_display,
    ],
  },
});
