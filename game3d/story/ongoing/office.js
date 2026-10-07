import { nodes as mioLunchNodes } from '../milestones/mio.js';
import source from '../day5/office.js';
import { interactions, place } from './shared.js';
const familiar = interactions(source, [
  'event:kotodama_first', 'event:kotodama_cancel', 'event:kotodama_exit',
  'talk:vending', 'talk:copier', 'talk:mori', 'talk:emi',
]);
export default place('office', {
  on: {
    ...familiar.on,
    'talk:my_desk': 'ongoing_desk', 'talk:my_chair': 'ongoing_desk',
    'talk:kenji': 'ongoing_kenji', 'talk:mio': [{ node: 'ms_mio_help', if: 'mio_lunch_offer == 3' }, { node: 'ms_mio_lunch', if: 'mio_lunch_offer == 2' }, 'ongoing_mio'],
  },
  nodes: {
    ...mioLunchNodes,
    ...familiar.nodes,
    ongoing_desk: [
      { do: 'sitDown' }, { do: 'tickets' },
      { do: 'stand', who: 'eric' }, { do: 'save' },
    ],
    ongoing_kenji: [
      { call: 'd5_kenji_name' },
      { if: 'period_evening && ongoing_team_day', then: [{ go: 'd5_drinks' }] },
      { say: 'kenji', emo: 'warm', text: 'On Friday we have drinks here after work. You want to come?' },
      { do: 'gesture', who: 'kenji', kind: 'point', to: 'vending' },
      { if: 'kenji_arcade_talked', then: [
        { say: 'kenji', emo: 'warm', text: 'Maybe we go to game centre after. I must finish this first.' },
      ] },
    ],
    ongoing_mio: [
      { if: 'period_evening && ongoing_team_day', then: [{ go: 'd5_drinks' }] },
      { say: 'mio', emo: 'casual', text: 'I’ve nearly finished this. If the printer’s playing up, Kenji is right beside it.' },
      { choice: [
        { text: 'Ask about the open requests.', go: 'ongoing_mio_requests' },
        { text: 'Ask where she goes for lunch.', go: 'ongoing_mio_lunch' },
        { text: 'Let her finish.', go: 'ongoing_mio_leave' },
      ] },
    ],
    ongoing_mio_requests: [
      { say: 'mio', emo: 'casual', text: 'The list keeps anything you haven’t signed off. If someone’s out, try them another time. You don’t have to get it all done today.' },
      { do: 'tickets' }, { go: 'ongoing_mio_leave' },
    ],
    ongoing_mio_lunch: [
      { say: 'mio', emo: 'warm', text: 'There’s a bench by the water, past the dorms. Usually nobody needs a printer fixed out there.' },
      { say: 'eric', emo: 'warm', text: 'I’ll leave my requests here, then.' },
      { say: 'mio', emo: 'amused', text: 'Please do.' },
      { do: 'remember', who: 'mio', id: 'coast_lunch', text: 'Told you where she likes to sit for lunch.' },
      { go: 'ongoing_mio_leave' },
    ],
    ongoing_mio_leave: [{ do: 'cam', back: true }, { do: 'save' }],
    d5_drinks: [
      { if: '!ongoing_team_day || !period_evening', then: [
        { say: 'eric', emo: 'warm', text: 'They get together here on Friday after work.' }, { end: true },
      ] },
      ...familiar.nodes.d5_drinks.slice(1),
    ],
  },
});
