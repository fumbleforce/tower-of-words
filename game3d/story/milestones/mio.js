import { offer, finish } from './shared.js';
export const scenes = [
  { who: 'mio', step: 2, from: 5, place: 'office', period: 'lunch', weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], node: 'ms_mio_lunch', if: 'step_mio >= 2 && !ms2_mio', cost: 'next' },
  { who: 'mio', step: 3, from: 5, place: 'office', period: 'lunch', weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], node: 'ms_mio_help', if: 'bondready_mio == 3 && !ms3_mio', cost: 'next' },
];
export const nodes = {
  ...offer('ms_mio_lunch', 'step_mio >= 2 && !ms2_mio', [
    { do: 'milestone', who: 'mio', state: 'lunchSpace' },
    { say: 'mio', emo: 'casual', text: 'You can sit here. I moved the spare cable, so you won’t be sitting on anything expensive.' },
  ], 'Stay for the rest of lunch.', [
    { do: 'milestone', who: 'mio', state: 'lunchSpace' },
    { say: 'eric', emo: 'warm', text: 'Thanks. Is this where you usually eat?' },
    { say: 'mio', emo: 'casual', text: 'Usually. If someone comes in, I can pretend I was working before they arrived.' },
    { do: 'milestone', who: 'mio', state: 'eat' },
    ...finish('mio', 2, 'Stayed for lunch beside the servers.', true),
  ]),
  ...offer('ms_mio_help', 'bondready_mio == 3 && !ms3_mio', [
    { do: 'milestone', who: 'mio', state: 'checklist' },
    { say: 'mio', emo: 'casual', text: 'It’s working. I just want to run through the checks once more before I eat.' },
  ], 'Spend the rest of lunch with Mio.', [
    { do: 'milestone', who: 'mio', state: 'checklist' },
    { choice: [{ text: 'I can do the next ordinary check.', go: 'ms_mio_take_check' }, { text: 'Could you eat first? I can keep an eye on it.', go: 'ms_mio_eat_first' }] },
  ]),
  ms_mio_take_check: [{ say: 'mio', emo: 'hesitant', text: 'Just the list, okay? If something changes, call me before you try anything.' }, { go: 'ms_mio_handover' }],
  ms_mio_eat_first: [{ say: 'mio', emo: 'hesitant', text: 'Yeah. It is getting cold. Here, so you don’t have to guess what I was checking.' }, { go: 'ms_mio_handover' }],
  ms_mio_handover: [
    { do: 'milestone', who: 'mio', state: 'handover' },
    { say: 'eric', emo: 'warm', text: 'I’ll call if anything changes.' },
    { say: 'mio', emo: 'casual', text: 'I’m only going outside. I’ll be back after lunch.' },
    { do: 'milestone', who: 'mio', state: 'leaveForLunch' },
    ...finish('mio', 3, 'Took an ordinary check so she could leave for lunch.', true),
  ],
};
