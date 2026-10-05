import { place } from './shared.js';
export default place(
  { dorms: ['talk:stairs', 'zone:passage'], east_lane: ['talk:street_gate', 'zone:street_exit'] },
  {
    on: { 'talk:mailboxes': 'd3_mail', 'talk:dorm_entry': 'd3_hall', 'talk:tama': 'd3_cat' },
    nodes: {
      d3_mail: [{ if: '!found_bakery_flyer', then: [
        { do: 'mailbox203', state: 'open' }, { do: 'find', id: 'bakery_flyer' }, { do: 'mailbox203', state: 'close' },
      ], else: [{ say: 'eric', emo: 'tired', text: 'Nothing for 203.' }] }],
      d3_hall: [{ say: 'eric', emo: 'warm', text: 'I’ll go up later. It’s too nice to sit indoors.' }],
      d3_cat: [
        { do: 'cam', on: 'tama', zoom: 1.2 },
        { say: 'eric', emo: 'warm', text: 'All right, you can keep that spot.' },
        { do: 'cam', back: true },
      ],
    },
  },
);
