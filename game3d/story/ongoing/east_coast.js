import source from '../day5/east_coast.js';
import { interactions, place } from './shared.js';
const familiar = interactions(source, ['talk:onsen', 'talk:lookout']);
export const reiIntroduction = [
  { if: 'met_rei', then: [{ set: 'd4_rei_intro' }] },
  { if: '!met_rei && !d4_rei_intro', then: [
    { say: 'rei', emo: 'polite', text: 'Hello. I’m Rei. I’ve seen you around the office.' },
    { say: 'eric', emo: 'warm', text: '{mc.name}. I’m on B2.' },
    { do: 'meet', who: 'rei' }, { set: 'd4_rei_intro' },
  ] },
];
export default place('east_coast', {
  on: { ...familiar.on, 'talk:mio': 'ongoing_mio_coast', 'talk:rei': 'ongoing_rei_coast', 'talk:emi': 'ongoing_emi_coast' },
  labels: { rei: ['Rei', 'd4_rei_intro'] },
  nodes: {
    ...familiar.nodes,
    ongoing_mio_coast: [
      { do: 'cam', on: 'mio', zoom: 1.2 },
      { if: 'rem_mio_coast_lunch', then: [
        { say: 'mio', emo: 'warm', text: 'You found it. No requests, right?' },
      ], else: [{ if: 'period_lunch', then: [{ say: 'mio', emo: 'warm', text: 'Hey. I’m hiding out here for lunch.' }],
        else: [{ say: 'mio', emo: 'warm', text: 'Hey. I thought I’d sit out here for a bit.' }] }] },
      { choice: [
        { text: 'Ask whether she minds the quiet.', go: 'ongoing_mio_quiet' },
        { text: 'Ask about coming here after work.', go: 'ongoing_mio_evening' },
        { text: 'Leave her to her break.', go: 'ongoing_coast_leave' },
      ] },
    ],
    ongoing_mio_quiet: [
      { say: 'eric', emo: 'curious', text: 'You don’t get bored sitting out here?' },
      { if: 'ongoing_workday', then: [{ say: 'mio', emo: 'casual', text: 'I hear people talking all morning. This is quite nice.' }],
        else: [{ say: 'mio', emo: 'casual', text: 'I get enough people talking during the week. This is quite nice.' }] },
      { say: 'eric', emo: 'sheepish', text: 'And then I turn up.' },
      { say: 'mio', emo: 'amused', text: 'You can stay. I’ll tell you if you start sounding like the help desk.' },
      { do: 'bond', who: 'mio', source: 'talk', why: 'talked during her break by the water' },
      { go: 'ongoing_coast_leave' },
    ],
    ongoing_mio_evening: [
      { say: 'mio', emo: 'casual', text: 'Sometimes. If I’m hungry I go through the shop street instead.' },
      { say: 'eric', emo: 'warm', text: 'So it depends how lunch went.' },
      { say: 'mio', emo: 'warm', text: 'Usually, yeah.' },
      { go: 'ongoing_coast_leave' },
    ],
    ongoing_rei_coast: [
      { do: 'cam', on: 'rei', zoom: 1.2 },
      ...reiIntroduction,
      { choice: [
        { text: 'Ask about tennis practice.', go: 'ongoing_rei_practice' },
        { text: 'Ask about her walk.', go: 'ongoing_rei_walk' },
        { text: 'Say goodnight.', go: 'ongoing_coast_leave' },
      ] },
    ],
    ongoing_rei_practice: [
      { if: 'd4_tennis_done', then: [
        { say: 'rei', name: 'Rei', emo: 'warm', text: 'Come again on Sunday. We can change partners this time.' },
      ], else: [{ say: 'rei', name: 'Rei', emo: 'casual', text: 'Sunday evening, by the gym. We have spare rackets if you want to try.' }] },
      { say: 'eric', emo: 'curious', text: 'Do you play during the week too?' },
      { say: 'rei', name: 'Rei', emo: 'casual', text: 'When I can find someone. Walking is easier to arrange.' },
      { go: 'ongoing_coast_leave' },
    ],
    ongoing_rei_walk: [
      { say: 'rei', name: 'Rei', emo: 'casual', text: 'I go up to the courts, then back through the dorm street. It’s enough after sitting all day.' },
      { say: 'eric', emo: 'warm', text: 'I keep ending up back at the shops.' },
      { say: 'rei', name: 'Rei', emo: 'amused', text: 'That’s a walk too. You just come home carrying more.' },
      { do: 'bond', who: 'rei', source: 'talk', why: 'talked about her evening walk' },
      { go: 'ongoing_coast_leave' },
    ],
    ongoing_emi_coast: [
      { do: 'cam', on: 'emi', zoom: 1.2 },
      { say: 'emi', emo: 'warm', text: 'I’m having lunch before someone remembers where I am. Have you had yours?' },
      { choice: [
        { text: 'Ask about the club’s winter sessions.', go: 'ongoing_emi_club' },
        { text: 'Let her eat.', go: 'ongoing_coast_leave' },
      ] },
    ],
    ongoing_emi_club: [
      { say: 'emi', emo: 'casual', text: 'Saturday evenings in the gym. Kuro comes too. I need someone to make me leave the office.' },
      { say: 'eric', emo: 'warm', text: 'Does she come up and get you?' },
      { say: 'emi', emo: 'amused', text: 'She has done. I can’t pretend I’m out when she’s at reception.' },
      { go: 'ongoing_coast_leave' },
    ],
    ongoing_coast_leave: [{ do: 'cam', back: true }, { do: 'save' }],
  },
});
