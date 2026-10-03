import { direction, speakers, sayFallbacks, fallbackNodes, repairQueue } from './shared.js';
export default {
  speakers,
  start: 'd2_room',
  on: {
    'talk:computer': 'd2_computer',
    'talk:door_out': 'd2_leave_room',
    'zone:room_exit': 'd2_leave_room',
    'talk:bed': 'd2_bed',
    'talk:window': 'd2_window',
    'talk:boxes': 'd2_boxes',
    ...sayFallbacks,
  },
  goal: { door_out: '!d2_party_done' },
  nodes: {
    d2_room: [
      ...repairQueue,
      { if: 'd2_party_done', then: [{ go: 'd2_end' }] },
      { if: '!d2_started', then: [
        { set: 'd2_started' }, { unset: 'going_home' }, { do: 'period', to: 'morning' },
        { do: 'phone', who: 'eric', state: 'buzz' },
        { say: 'miotext', text: 'station this morning, remember' },
        { if: 'lunch_mio || mio_warm >= 2', then: [{ say: 'miotext', text: 'i’ll meet you down there' }],
          else: [{ say: 'miotext', text: 'the guard knows you’re coming' }] },
        { do: 'phone', who: 'eric', state: 'away' }, { do: 'save' },
      ] },
      ...direction('door_out', 'door_out', 'door_out', 'door_out'),
    ],
    d2_computer: [
      { do: 'sit', who: 'eric', at: 'desk_chair' }, { do: 'cam', on: 'computer', zoom: 1.2 },
      { if: '!d2_computer_seen', then: [
        { set: 'd2_computer_seen' },
        { say: 'eric', emo: 'tired', text: 'At least they set up my account.' },
      ] },
      { choice: [
        { text: 'Open repair requests.', go: 'd2_inbox' },
        { text: 'Write home.', go: 'd2_write_home', if: '!d2_wrote_home' },
        { text: 'Close the computer.', go: 'd2_close_computer' },
      ] },
    ],
    d2_inbox: [
      ...repairQueue,
      { do: 'tickets' }, { do: 'save' },
      { go: 'd2_close_computer' },
    ],
    d2_write_home: [
      { choice: [
        { text: '“I found the office. Still unpacking. I’ll call at the weekend.”', go: 'd2_send_home' },
        { text: '“I’m all right. The people from work are looking after me.”', go: 'd2_send_home' },
        { text: 'Leave it for later.', go: 'd2_close_computer' },
      ] },
    ],
    d2_send_home: [{ set: 'd2_wrote_home' }, '> Message sent.', { go: 'd2_close_computer' }],
    d2_close_computer: [{ do: 'cam', back: true }, { do: 'stand', who: 'eric' }],
    d2_leave_room: [{ do: 'trip', to: 'dorm_court' }],
    d2_bed: [{ say: 'eric', emo: 'tired', text: 'I need to buy a second pillow.' }],
    d2_window: [{ say: 'eric', emo: 'dry', text: 'I can hear people in the courtyard. I can’t see them from here.' }],
    d2_boxes: [{ say: 'eric', emo: 'tired', text: 'There are the shirts. I should hang one up for Monday.' }],
    d2_end: [
      { do: 'goal', text: '' },
      { if: '!d2_complete', then: [
        { do: 'walk', who: 'eric', to: 'desk_front' }, { do: 'face', who: 'eric', to: 'computer' },
        { do: 'cam', on: 'computer', zoom: 1.2 },
        { say: 'eric', emo: 'warm', text: 'I can tell them about tonight when I call.' },
        { do: 'cam', back: true },
      ] },
      { set: 'd2_complete' }, { do: 'save' }, { do: 'end' },
    ],
    ...fallbackNodes,
  },
};
