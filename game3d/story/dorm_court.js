// The dorm courtyard, reached along the lane from the plaza (docs/game/places.md); it also loads directly with
// ?place=dorm_court. Eric walks in through the hall doors himself; the passage at the back of the hall (walking into
// it, or using it) starts the trip up the stairs to his floor.
export default {
  start: 'arrive',
  on: {
    'talk:mailboxes': { if: 'going_home && dorm_room_known && !found_bakery_flyer', node: 'mailboxes' },
    'talk:dorm_entry': 'hall',
    'zone:hall': { node: 'hall', once: true },
    'talk:stairs': 'go_up',
    'zone:passage': { node: 'go_up', once: true },
  },
  show: { bath: 'false', mailboxes: 'going_home && dorm_room_known && !found_bakery_flyer' },
  nodes: {
    mailboxes: [
      { do: 'mailbox203', state: 'open' },
      '> {mc.name_jp} · {mc.name_ro} · {mc.name}',
      { do: 'find', id: 'bakery_flyer' },
      { do: 'mailbox203', state: 'close' },
    ],
    arrive: [
      { do: 'goal', text: 'Go in through the dorm entrance. Your room is 203.', at: 'dorm_entry' },
      { set: 'dorm_room_known' },
    ],
    hall: [{ do: 'goal', text: 'Room 203 is on 2F. The stairs are through the back.', at: 'stairs' }],
    go_up: [{ do: 'next' }],
  },
};
