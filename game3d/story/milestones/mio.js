export const scenes = [
  { who: 'mio', step: 2, from: 5, place: 'office', period: 'lunch', weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], node: 'ms_mio_lunch', if: 'step_mio >= 2 && !ms2_mio && !ms3_mio', cost: 'next' },
  { who: 'mio', step: 3, from: 5, place: 'office', period: 'lunch', weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], node: 'ms_mio_help', if: 'bondready_mio == 3 && !ms3_mio', cost: 'next' },
];
export const nodes = {
  ms_mio_lunch: [{ if: 'step_mio >= 2 && !ms2_mio && !ms3_mio', then: [
    { do: 'mioLunch', state: 'offerLunch' },
    { say: 'mio', emo: 'casual', text: 'You can sit here. I moved the cable, so you won’t be sitting on anything expensive.' },
    { choice: [{ text: 'Stay for the rest of lunch.', go: 'ms_mio_lunch_play' }, { text: 'Another time.', go: 'ms_mio_leave' }] },
  ] }],
  ms_mio_lunch_play: [
    { do: 'mioLunch', state: 'sit' },
    { say: 'eric', emo: 'warm', text: 'Thanks. Is this where you usually eat?' },
    { say: 'mio', emo: 'casual', text: 'Usually. If someone comes in, I can pretend I was working before they arrived.' },
    { do: 'mioLunch', state: 'eat' },
    { do: 'mioLunch', state: 'settle' },
    { do: 'mioLunchComplete', step: 2, text: 'Stayed for lunch beside the servers.' },
  ],
  ms_mio_help: [{ if: 'bondready_mio == 3 && !ms3_mio', then: [
    { do: 'mioLunch', state: 'offerHelp' },
    { say: 'mio', emo: 'casual', text: 'This rack’s fine. I’m just checking the front vent before I eat.' },
    { choice: [
      { text: 'I can check the vent.', go: 'ms_mio_take_check' },
      { text: 'Go and eat. I can keep an eye on it.', go: 'ms_mio_eat_first' },
      { text: 'Another time.', go: 'ms_mio_leave' },
    ] },
  ] }],
  ms_mio_take_check: [
    { do: 'mioLunch', state: 'acceptHelp' },
    { say: 'mio', emo: 'hesitant', text: 'Okay, but just look. If anything’s caught in there, call me before you touch it.' },
    { go: 'ms_mio_handover' },
  ],
  ms_mio_eat_first: [
    { do: 'mioLunch', state: 'acceptHelp' },
    { say: 'mio', emo: 'hesitant', text: 'Yeah... it is getting cold. Here, this is the one I was checking.' },
    { go: 'ms_mio_handover' },
  ],
  ms_mio_handover: [
    { do: 'mioLunch', state: 'handover' },
    { say: 'eric', emo: 'warm', text: 'The front vent. Got it.' },
    { say: 'mio', emo: 'casual', text: 'Just that row. I’ll do the rest when I’m back.' },
    { do: 'mioLunch', state: 'leaveForLunch' },
    { choice: [{ text: 'Check the vent and mark its row.', go: 'ms_mio_check' }] },
  ],
  ms_mio_check: [
    { do: 'mioLunch', state: 'inspect' },
    { say: 'eric', emo: 'casual', text: 'Nothing’s blocking it.' },
    { do: 'mioLunch', state: 'mark' },
    { do: 'mioLunch', state: 'return' },
    { say: 'eric', emo: 'casual', text: 'It was clear. I marked the row.' },
    { say: 'mio', emo: 'warm', text: 'Thanks. I actually got outside before lunch was over.' },
    { do: 'mioLunch', state: 'settle' },
    { do: 'mioLunchComplete', step: 3, text: 'Took an ordinary check so she could leave for lunch.' },
  ],
  ms_mio_leave: [{ do: 'mioLunch', state: 'free' }, { do: 'cam', back: true }],
};
