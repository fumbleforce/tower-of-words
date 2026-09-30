// The dorm courtyard, reached along the lane from the plaza (docs/game/places.md); it also loads directly with
// ?place=dorm_court. Eric walks in through the hall doors himself; the passage at the back of the hall (walking into
// it, or using it) starts the trip up the stairs to his floor.
export default {
  start: 'arrive',
  on: {
    'talk:bath': { if: 'going_home && !evening_bath_heard', node: 'bath' },
    'talk:mailboxes': { if: 'going_home && dorm_room_known', node: 'mailboxes' },
    'talk:dorm_entry': 'hall',
    'zone:hall': { node: 'hall', once: true },
    'talk:stairs': 'go_up',
    'zone:passage': { node: 'go_up', once: true },
  },
  show: { bath: 'going_home && !evening_bath_heard', mailboxes: 'going_home && dorm_room_known' },
  nodes: {
    bath: [
      { do: 'face', who: 'eric', to: 'bath' },
      { do: 'bathSong', state: 'answer' },
      "> Someone else finishes the song for him. He's worse.",
      { set: 'evening_bath_heard' },
    ],
    mailboxes: [
      { do: 'mailbox203', state: 'open' },
      '> エリック · erikku · Eric',
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
