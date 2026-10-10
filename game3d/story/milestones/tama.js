import { offer, finish } from './shared.js';
export const scenes = [
  { who: 'tama', step: 1, from: 3, place: 'gate', period: 'morning', node: 'ms_tama_name', if: '!ms_tama_named', cost: 'none', label: 'Crouch beside the cat.' },
  { who: 'tama', step: 2, from: 5, place: 'office', period: 'lunch', weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], node: 'ms_tama_chair', if: 'step_tama >= 2 && !ms2_tama', cost: 'next' },
  { who: 'tama', step: 3, from: 4, place: 'dorm_court', period: 'evening', node: 'ms_tama_bag', if: 'bondready_tama == 3 && !ms3_tama', cost: 'none' },
];
export const nodes = {
  ms_tama_name: [
    { if: 'ms_tama_named', then: [{ end: true }] },
    { do: 'milestone', who: 'tama', state: 'crouch' },
    { say: 'guard', overheard: true, emo: 'polite', text: 'タマです。眠いようですから、そのままで。', clear: ['タマ'] },
    { say: 'eric', emo: 'warm', text: 'Hello, Tama. I’m not moving you.' },
    { set: 'ms_tama_named' }, { do: 'meet', who: 'tama' }, { do: 'save' },
  ],
  ...offer('ms_tama_chair', 'step_tama >= 2 && !ms2_tama', [
    { do: 'milestone', who: 'tama', state: 'chair' },
    { say: 'eric', emo: 'warm', text: 'You were here first.' },
  ], 'Spend the rest of lunch nearby.', [
    { choice: [{ text: 'Wait beside the chair.', go: 'ms_tama_wait' }, { text: 'Use another seat.', go: 'ms_tama_other_seat' }] },
  ]),
  ms_tama_wait: [{ do: 'milestone', who: 'tama', state: 'waitNear' }, { go: 'ms_tama_stays' }],
  ms_tama_other_seat: [{ do: 'milestone', who: 'tama', state: 'otherSeat' }, { go: 'ms_tama_stays' }],
  ms_tama_stays: [{ do: 'milestone', who: 'tama', state: 'stays' }, ...finish('tama', 2, 'Sat nearby without moving her from the chair.', true)],
  ...offer('ms_tama_bag', 'bondready_tama == 3 && !ms3_tama', [
    { do: 'milestone', who: 'tama', state: 'approachBag' },
  ], 'Stay while Tama comes over.', [
    { choice: [{ text: 'Move your bag off the bench.', go: 'ms_tama_move_bag' }, { text: 'Move along to leave her room.', go: 'ms_tama_move_self' }] },
  ]),
  ms_tama_move_bag: [{ do: 'milestone', who: 'tama', state: 'moveBag' }, { go: 'ms_tama_jumps' }],
  ms_tama_move_self: [{ do: 'milestone', who: 'tama', state: 'moveSelf' }, { go: 'ms_tama_jumps' }],
  ms_tama_jumps: [{ do: 'milestone', who: 'tama', state: 'jumpToSpace' }, { say: 'eric', emo: 'warm', text: 'There you go.' }, ...finish('tama', 3, 'Made room for her on the dorm bench.')],
};
