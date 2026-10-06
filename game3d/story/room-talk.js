// Ordinary room conversations. The existing timetable owns who is present; leaving learns nothing by itself.
export const sofaNodes = {
  room_kenji: [
    { do: 'roomSofa', state: 'frame' },
    { if: '!room_tv_hello', then: [
      { say: 'kenji', emo: 'bright', text: '{mc.name}! Sit, sit. This is replay. I know winner.' },
      { say: 'eric', emo: 'dry', text: 'Don’t tell me, then.' },
      { say: 'kenji', emo: 'sheepish', text: 'Okay. I am quiet.' },
      { set: 'room_tv_hello' },
    ], else: [{ say: 'kenji', emo: 'warm', text: 'Ah, {mc.name}. TV again. My room is... small.' }] },
    { choice: [
      { text: '“You watch even when you know the result?”', go: 'room_replay' },
      { text: '“How’s work going?”', go: 'room_work' },
      { text: '“I’ll let you watch.”', go: 'room_sofa_end' },
    ] },
  ],
  room_replay: [
    { if: 'room_replay_seen', then: [
      { say: 'kenji', emo: 'sheepish', text: 'Same match. Still good!' },
    ], else: [
      { say: 'kenji', emo: 'bright', text: 'Yes! Last point is very good. Look, look.' },
      { do: 'roomSofa', state: 'watch' },
      { say: 'eric', emo: 'dry', text: 'You nearly told me again.' },
      { say: 'kenji', emo: 'sheepish', text: 'Ah. Sorry!' },
      { set: 'room_replay_seen' },
    ] },
    { go: 'room_sofa_end' },
  ],
  room_work: [
    { if: 'room_work_seen', then: [
      { say: 'kenji', emo: 'sheepish', text: 'Machine room? Still no Kenji.' },
    ], else: [
      { say: 'kenji', emo: 'sheepish', text: 'Machine room is... no Kenji. Mio says.' },
      { say: 'eric', emo: 'dry', text: 'Have you tried asking her?' },
      { say: 'kenji', emo: 'sheepish', text: 'Yes. Very fast no.' },
      { if: 'kenji_arcade_talked', then: [
        { say: 'eric', emo: 'dry', text: 'At least the crane machine lets you keep trying.' },
        { say: 'kenji', emo: 'sheepish', text: 'Crane takes my money. Every time.' },
      ] },
      { set: 'room_work_seen' },
    ] },
    { go: 'room_sofa_end' },
  ],
  room_sofa_end: [{ do: 'cam', back: true }, { do: 'save' }],
};
