const train = (flags = {}) => ({ place: 'train', period: 'early', flags });
const platform = () => ({
  ...train({ sat: true, lesson_on: true, lesson_done: true, arriving: true, arrived: true, alighted: true }),
  known: ['gaijin', 'ohayo', 'yoroshiku', 'sumimasen'],
});
// The lobby's Continue restore derives the jam and Hamada's position from these flags.
const jam = (greeted_guard) => ({
  place: 'gate', period: 'morning',
  flags: { jammed: true, guard_asked: true, greeted_guard, held_doors: true },
  known: ['gaijin', 'ohayo', 'yoroshiku', 'sumimasen', 'matte'],
});

export default [
  {
    id: 'train-catch-family',
    description: 'Catch the lunchbox, ask about her mother, know one Japanese word, and greet the cat.',
    seed: train(),
    choices: ['Catch the lunchbox', '“Were you visiting your mum?”', '“ありがとう (arigatō, thanks). That\'s about it.”'],
    actions: [
      { type: 'use', target: 'mio' },
      { type: 'use', target: 'mio' },
      { type: 'say', word: 'ohayo', target: 'tama' },
      { type: 'use', target: 'mio' },
    ],
    expect: {
      nodes: ['seat', 'caught', 'sit', 'family', 'chat1_end', 'lesson', 'jp_one', 'lesson2', 'ohayo_cat', 'lesson3'],
      flags: { sat: true, heard_mum: true, mio_warm: 2, bag_wobble: false, chat1: true, cat_task: false, cat_done: true, lesson_done: true },
      known: ['gaijin', 'ohayo', 'yoroshiku'],
    },
  },
  {
    id: 'train-drop-name',
    description: 'Drop the lunchbox, introduce Eric, and say he knows no Japanese.',
    seed: train(),
    choices: ['Let the lunchbox fall', '“I\'m Eric.”', '“Not really.”'],
    actions: [{ type: 'use', target: 'mio' }, { type: 'use', target: 'mio' }],
    expect: {
      nodes: ['seat', 'dropped', 'sit', 'its_eric', 'chat1_end', 'lesson', 'jp_none', 'lesson2'],
      flags: { sat: true, heard_mum: true, mio_warm: false, bag_wobble: false, chat1: true, lesson_on: true, cat_task: true },
      known: ['gaijin', 'ohayo'],
    },
  },
  {
    id: 'train-mio-catches-nod',
    description: 'Let Mio catch her lunchbox and answer her introduction with a nod.',
    seed: train(),
    choices: ['Let her catch the lunchbox', 'Just nod'],
    actions: [{ type: 'use', target: 'mio' }],
    expect: {
      nodes: ['seat', 'mio_catches', 'sit', 'leave_it', 'chat1_end'],
      flags: { sat: true, mio_named: true, heard_mum: false, mio_warm: false, bag_wobble: false, chat1: true },
      known: ['gaijin'],
    },
  },
  ...[
    ['train-doors-question', '“Did I do that?”', 'did_i'],
    ['train-doors-quiet', 'Say nothing', 'did_quiet'],
  ].map(([id, choice, reaction]) => ({
    id,
    description: `Save Hamada at the train doors, then choose ${choice}.`,
    seed: platform(),
    choices: [choice],
    actions: [{ type: 'use', target: 'door_l', settleAt: 'gate' }],
    expect: {
      nodes: ['platform', reaction, 'mio_tests', 'mio_phone'],
      flags: { on_platform: true, held_doors: true, phone_buzz: true, can_exit: true },
      known: ['matte'],
    },
  })),
  {
    id: 'gate-hamada-akete',
    description: 'Learn akete from Hamada and open the jammed gate with it.',
    seed: jam(true),
    choices: ['Say 開けて (akete, open) with him'],
    actions: [{ type: 'use', target: 'kuroda' }],
    expect: {
      nodes: ['hamada_stuck', 'word_type', 'word_say'],
      flags: { gate_through_way: true, gate_magic: true, gateOpen: true, hamada_friend: false },
      known: ['akete'],
    },
  },
  {
    id: 'gate-leave-social-cool',
    description: 'Leave Hamada, get the ungreeted guard, try the cat detour and the failed squeeze, then lift.',
    seed: jam(false),
    choices: [
      'Leave him to it',
      'Point at the cat under his desk',
      'Mime squeezing sideways through a gap',
      'Mime lifting the briefcase over the gate',
    ],
    actions: [{ type: 'use', target: 'kuroda' }, { type: 'say', word: 'sumimasen', target: 'guard' }],
    expect: {
      nodes: ['hamada_stuck', 'noop', 'way_social', 'mime_menu', 'mime_cat', 'mime_squeeze', 'mime_lift'],
      flags: { gate_through_way: true, gate_magic: false, guard_cool: true, pt_cat: true, m_squeeze: true, hamada_friend: true, gateOpen: true },
    },
  },
  {
    id: 'gate-social-greeted',
    description: 'The greeted guard helps; mime lifting the briefcase immediately.',
    seed: jam(true),
    choices: ['Mime lifting the briefcase over the gate'],
    actions: [{ type: 'say', word: 'sumimasen', target: 'guard' }],
    expect: {
      nodes: ['way_social', 'mime_menu', 'mime_lift'],
      flags: { gate_through_way: true, gate_magic: false, guard_cool: false, hamada_friend: true, gateOpen: true },
    },
  },
];
