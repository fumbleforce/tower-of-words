import { place } from './shared.js';
export default place(
  {
    east_lane: ['talk:north_street', 'zone:north_exit'], east_coast: ['talk:onsen_path', 'zone:east_exit'],
    gym: ['talk:gym'], pool: ['talk:pool'],
  },
  {
    closed: ['talk:office_street', 'zone:west_exit'],
    labels: { rei: 'Tennis player' },
    on: { 'talk:rei': 'd3_rei_practice', 'talk:ball_basket': 'd3_basket', 'talk:court_display': 'd3_display' },
    nodes: {
      d3_rei_practice: [
        { say: 'rei', emo: 'curt', text: 'The club plays here tomorrow, so I’m getting some serves in today. Stay off the court while I’m hitting.' },
        { say: 'rei', emo: 'casual', text: 'If you want to watch, sit on the bench, and throw the balls back when they come your way.' },
      ],
      d3_basket: [{ say: 'eric', emo: 'dry', text: 'There are enough balls here for me to lose a few.' }],
      d3_display: [{ say: 'eric', emo: 'curious', text: 'I know the numbers. Counting them while running is the problem.' }],
    },
  },
);
