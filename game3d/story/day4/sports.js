import { place, goal } from './shared.js';
import { tennisNodes } from './tennis.js';
export default place({ east_lane: ['talk:north_street', 'zone:north_exit'],
  east_coast: ['talk:onsen_path', 'zone:east_exit'], gym: ['talk:gym'], pool: ['talk:pool'] }, {
  closed: ['talk:office_street', 'zone:west_exit'],
  labels: { rei: ['Rei', 'd4_rei_intro'], aoi: ['Aoi', 'd3_aoi_intro'] },
  show: { bench_ball: "period == 'evening' && !d4_bottle_seen" },
  on: {
    'talk:rei': 'd4_rei', 'talk:aoi': 'd4_aoi', 'talk:court_display': 'd4_display',
    'talk:ball_basket': 'd4_basket', 'talk:bench_ball': 'd4_bench_ball',
  },
  nodes: {
    ...tennisNodes,
    d4_rei: [
      { call: 'd4_rei_name' },
      { if: "period == 'evening' && club_tennis && !d4_tennis_done", then: [{ go: 'd4_tennis_offer' }] },
      { if: "ticket_T0005 != 'done' && (period == 'afternoon' || period == 'evening')", then: [{ go: 'd4_display' }] },
      { if: 'club_tennis', then: [
        { say: 'rei', name: 'Rei', emo: 'casual', text: 'Take the spare racket, and put it back by the basket when you’ve finished. Not on the bench.' },
      ], else: [{ say: 'rei', name: 'Rei', emo: 'curt', text: 'You’re not a member yet. Go to the plaza board, take a slip, and bring it back here if you want to play.' }] },
    ],
    d4_aoi: [
      { call: 'd4_aoi_name' },
      { if: 'club_tennis && !d4_tennis_done', then: [{ go: 'd4_tennis_offer' }] },
      { if: 'd4_tennis_done', then: [
        { say: 'aoi', name: 'Aoi', overheard: true, emo: 'warm', text: 'もう少し打っていきます。' },
        { do: 'gesture', who: 'aoi', kind: 'point', to: 'ball_basket' },
      ], else: [{ call: 'd4_rei_name' }, { say: 'aoi', name: 'Aoi', overheard: true, emo: 'polite', text: '広場のテニスの紙、取りました？', clear: ['テニス'] },
        { say: 'rei', name: 'Rei', emo: 'curt', text: 'You’re not a member yet. Go to the plaza board, take a slip, and bring it back here if you want to play.' }] },
    ],
    d4_display: [
      { if: "ticket_T0005 == 'done'", then: [{ say: 'eric', emo: 'warm', text: 'It’s counting properly now.' }, { end: true }] },
      { if: "period != 'afternoon' && period != 'evening'", then: [
        { say: 'eric', emo: 'casual', text: 'I’ll ask someone about this when the afternoon players get here.' }, { end: true },
      ] },
      { call: 'd4_rei_name' },
      { do: 'cam', on: 'rei', zoom: 1.2 },
      { say: 'rei', name: 'Rei', emo: 'curt', face: 'cold', text: 'You’re from IT, so have a look at the score display. I sent a request this morning and nobody’s come. Watch what happens when I press this.' },
      { do: 'ticket', add: 'T-0005' },
      { do: 'courtRepair', state: 'fault' },
      { if: 'know_gamen', then: [{ say: 'eric', emo: 'curious', text: 'The {gamen} is fine. The button cap’s catching on the edge. Can I lift it out?' }],
        else: [{ say: 'eric', emo: 'curious', text: 'The cap’s catching on the edge. Can I lift it out?' }] },
      { choice: [
        { text: 'Reseat the button cap.', go: 'd4_display_fix' },
        { text: 'Leave the display for later.', go: 'd4_display_leave' },
      ] },
    ],
    d4_display_fix: [
      { do: 'ticket', start: 'T-0005' }, { do: 'courtRepair', state: 'reseat' },
      { say: 'eric', emo: 'warm', text: 'Try it once more.' }, { do: 'courtRepair', state: 'verify' },
      { say: 'rei', name: 'Rei', emo: 'casual', text: 'Good. I’ve been keeping the score in my head for a week. Next time I send a request, come the same day.' },
      { set: 'd4_display_done' }, { do: 'ticket', close: 'T-0005' },
      { do: 'cam', back: true }, { do: 'save' }, ...goal(),
    ],
    d4_display_leave: [{ do: 'courtRepair', state: 'away' }, { do: 'cam', back: true }],
    d4_basket: [{ say: 'eric', emo: 'curious', text: 'The balls at the bottom look much newer. Nobody wants to tip it out.' }],
    d4_bench_ball: [
      { if: "d4_bottle_seen || period != 'evening'", then: [{ end: true }] },
      { do: 'tennisSession', state: 'bottle' },
      { say: 'member', overheard: true, emo: 'casual', text: 'ちょっと待って。靴ひも、結び直すから。' },
      { set: 'd4_bottle_seen' }, { do: 'cam', back: true }, { do: 'save' },
    ],
  },
});
