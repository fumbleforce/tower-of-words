// The short walk from station security into the separate head-office building.
export default {
  start: 'outside',
  on: {
    'talk:office_entrance': 'head_office',
    'talk:lift': 'to_b2',
    'zone:lift_front': { node: 'to_b2', once: true },
  },
  goal: { lift: true },
  nodes: {
    outside: [{ do: 'goal', text: 'Cross the forecourt and take the head-office lift to B2.' }],
    head_office: [{ do: 'goal', text: 'Take the lift inside head office down to B2.' }],
    to_b2: [{ do: 'next' }],
  },
};
