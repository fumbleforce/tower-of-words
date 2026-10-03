import { direction, sayFallbacks, fallbackNodes } from './shared.js';
export default {
  start: 'd2_arrive',
  on: {
    'talk:stairs': 'd2_go_up', 'zone:passage': 'd2_go_up',
    'talk:dorm_entry': 'd2_hall',
    'talk:street_gate': 'd2_to_lane', 'zone:street_exit': 'd2_to_lane',
    'talk:mailboxes': 'd2_mailboxes',
    ...sayFallbacks,
  },
  nodes: {
    d2_arrive: direction('street_gate', 'street_gate', 'street_gate', 'stairs'),
    d2_hall: [
      { say: 'eric', emo: 'tired', text: 'Upstairs, 203. I know this bit now.' },
      { if: 'd2_party_done', then: [{ do: 'goal', text: 'Your room is upstairs, 203.', at: 'stairs' }] },
    ],
    d2_go_up: [{ do: 'trip', to: 'dorms' }],
    d2_to_lane: [{ do: 'trip', to: 'east_lane' }],
    d2_mailboxes: [
      { if: 'found_bakery_flyer', then: [{ say: 'eric', emo: 'tired', text: 'Nothing new.' }], else: [
        { do: 'mailbox203', state: 'open' }, { do: 'find', id: 'bakery_flyer' }, { do: 'mailbox203', state: 'close' },
      ] },
    ],
    ...fallbackNodes,
  },
};
