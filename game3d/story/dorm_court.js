// The dorm courtyard after work, reached along the lane from the plaza (docs/game/places.md); it also loads
// directly with ?place=dorm_court. Walking into the hall doors, or using them, starts the watched walk to Eric's room.
export default {
  start: 'arrive',
  on: {
    'talk:dorm_entry': 'go_in',
    'zone:dorm_entry': { node: 'go_in', once: true },
  },
  goal: { dorm_entry: true },
  nodes: {
    arrive: [{ do: 'goal', text: 'Go in through the dorm entrance to your room.' }],
    go_in: [{ do: 'next' }],
  },
};
