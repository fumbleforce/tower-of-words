// The dorm courtyard, reached along the lane from the plaza (docs/game/places.md); it also loads directly with
// ?place=dorm_court. Eric walks in through the hall doors himself; the passage at the back of the hall (walking into
// it, or using it) starts the trip up the stairs to his floor.
export default {
  start: 'arrive',
  on: {
    'talk:dorm_entry': 'hall',
    'zone:hall': { node: 'hall', once: true },
    'talk:stairs': 'go_up',
    'zone:passage': { node: 'go_up', once: true },
  },
  nodes: {
    arrive: [
      { do: 'goal', text: 'Go in through the dorm entrance. Your room is 203.', at: 'dorm_entry' },
      { set: 'dorm_room_known' },
    ],
    hall: [{ do: 'goal', text: 'Room 203 is on 2F. The stairs are through the back.', at: 'stairs' }],
    go_up: [{ do: 'next' }],
  },
};
