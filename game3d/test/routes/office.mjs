const morning = { greeted_mori: true, kenji_intro: true };
const repaired = {
  ...morning,
  machine_open: true,
  chair_back: true,
  got_ticket: true,
  copier_done: true,
  ticket_closed: true,
};
const afternoon = { ...repaired, afternoon_on: true };
const seed = (period, flags, extra = {}) => ({ place: 'office', period, flags, ...extra });
const use = (target) => ({ type: 'use', target });
const give = (item, target, line) => ({ type: 'give', item, target, ...(line ? { line } : {}) });
const repeatGift = (item, target) => give(item, target, "They've already had one from you.");

const lunchRoutes = [
  ['mio-b2', 'mio', '“Why B2?”', 'mio_b2'],
  ['mio-doors', 'mio', '“The doors this morning...”', 'mio_doors'],
  ['mio-quiet', 'mio', 'Eat, and say nothing', 'mio_quiet'],
  ['mori-landing', 'mori', 'Mime the ski-jump landing', 'mori_landing'],
  ['mori-tea', 'mori', 'Pour his tea for him', 'mori_pour'],
].map(([id, person, reply, node]) => {
  const isMio = person === 'mio';
  const echo = isMio ? 'mio_tomatte_echo' : 'mori_irete_echo';
  return {
    id: `office-lunch-${id}`,
    description: `Continue before lunch, choose ${reply}, then hear ${person}'s afternoon echo.`,
    seed: seed('morning', { ...repaired, mio_warm: 0 }, { node: 'lunch_start', known: ['ugoite'] }),
    choices: [
      isMio ? 'Lunch with Mio, in the machine room' : 'Lunch with Mori, in the kitchenette',
      reply,
    ],
    actions: [use(person)],
    expect: {
      nodes: ['lunch_start', `lunch_${person}`, node, `${person}_bond`, 'lunch_end', echo],
      flags: {
        [`lunch_${person}`]: true,
        [`lunch_${isMio ? 'mori' : 'mio'}`]: false,
        [`${person}_bond_done`]: true,
        [`${person}_echo`]: true,
        afternoon_on: true,
        lunch_on: false,
        mio_warm: id === 'mio-quiet' ? 1 : 0,
      },
      known: [isMio ? 'tomatte' : 'irete'],
      period: 'afternoon',
    },
  };
});

const vendingRoutes = [
  ['coffee', 'Canned coffee', 1],
  ['tea', 'Royal milk tea', 2],
  ['melon', 'Melon soda', 3],
  ['cornsoup', 'Corn soup', 4],
].map(([item, choice, want]) => ({
  id: `office-vending-${item}`,
  description: `Unstick ${item}, verify a repeated tap cannot reorder, then buy another normally.`,
  seed: seed('afternoon', { ...afternoon }, { known: ['ugoite'], inv: [], yen: 1000 }),
  choices: item === 'coffee' ? [choice, choice, 'Nothing'] : [choice, choice],
  actions: [
    use('vending'),
    use('vending'),
    { type: 'say', word: 'ugoite', target: 'vending' },
    use('vending'),
    { type: 'say', word: 'ugoite', target: 'vending' },
    ...(item === 'coffee' ? [use('vending')] : []),
  ],
  expect: {
    nodes: ['vending', `buy_${item}`, 'vend_stuck', 'vend_still_stuck', 'vend_ugoite', 'vend_ugoite_idle', ...(item === 'coffee' ? ['noop'] : [])],
    flags: { vend_tried: true, vend_stuck: false, vend_want: want, [`bought_${item}`]: true, cant_buy: false },
    inv: [item, item],
    yen: item === 'coffee' ? 760 : 740,
  },
}));

const giftRoutes = [
  ['mio', 'coffee'],
  ['mori', 'cornsoup'],
  ['kenji', 'melon'],
].flatMap(([person, favorite]) => [
  {
    id: `office-gift-${person}-liked-repeat`,
    description: `${person} accepts a favourite; repeat favourite and other gifts are refused and kept.`,
    seed: seed('afternoon', { ...afternoon }, { inv: [favorite, favorite, 'tea'] }),
    choices: [],
    actions: [give(favorite, person), repeatGift(favorite, person), repeatGift('tea', person)],
    expect: {
      nodes: [`gift_${person}_${favorite}`, 'gift_again', 'gift_again'],
      flags: { [`gifted_${person}`]: true, [`gave_${favorite}_${person}`]: true, [`gave_tea_${person}`]: false },
      inv: [favorite, 'tea'],
    },
  },
  {
    id: `office-gift-${person}-disliked`,
    description: `${person} accepts an unwanted tea but leaves it; this still uses the day's gift.`,
    seed: seed('afternoon', { ...afternoon }, { inv: ['tea', favorite] }),
    choices: [],
    actions: [give('tea', person), repeatGift(favorite, person)],
    expect: {
      nodes: [`gift_${person}_other`, 'gift_again'],
      flags: { [`gifted_${person}`]: true, [`gave_tea_${person}`]: true, [`gave_${favorite}_${person}`]: false },
      inv: [favorite],
    },
  },
]);

// after Mio's evening scene: up by lift, east through the plaza, into the dorm and his room, where the day ends
const walkHome = [
  { ...use('lift'), settleAt: 'forecourt' },
  { ...use('plaza_lane'), settleAt: 'plaza' },
  { ...use('dorm_lane'), settleAt: 'dorm_court' },
  { ...use('dorm_entry'), settleAt: 'dorms' },
];
const endingRoutes = [
  ['dunno', '“I don\'t know.”', { lunch_mio: true }, ['tomatte']],
  ['nicely', '“I asked nicely.”', { lunch_mori: true, gate_magic: true }, ['irete', 'akete']],
  ['quiet', 'Say nothing', { lunch_mori: true, mio_warm: 2 }, ['irete']],
].map(([id, reply, flags, known]) => ({
  id: `office-ending-${id}`,
  description: `Continue before finishing work, answer Mio with ${reply}, and walk home`,
  seed: seed('afternoon', { ...afternoon, ...flags }, { known: ['matte', 'ugoite', ...known] }),
  choices: [reply],
  actions: [use('my_desk'), ...walkHome],
  expect: {
    nodes: ['work_afternoon', 'emi_drops_in', 'ending', `end_${id}`, 'end_ticket', 'go_home', 'outside', 'to_plaza', 'arrive', 'to_dorms', 'arrive', 'go_in', 'home'],
    flags: { evening_on: true, going_home: true },
    period: 'evening',
    ended: true,
  },
}));

export default [
  {
    id: 'office-door-knock',
    description: 'One knock: Mio comes and opens the machine room and Eric walks in; akete to the open door says so.',
    seed: seed('morning', { ...morning }, { known: ['akete'] }),
    choices: [],
    actions: [use('machine_door'), { type: 'say', word: 'akete', target: 'machine_door' }],
    expect: {
      nodes: ['machine_door', 'mio_opens', 'machine_walk_in', 'akete_open_door'],
      flags: { knocked: true, machine_open: true, door_magic: false },
    },
  },
  {
    id: 'office-door-akete',
    description: 'Open the machine room with akete before knocking; Eric walks in.',
    seed: seed('morning', { ...morning }, { known: ['akete'] }),
    choices: [],
    actions: [{ type: 'say', word: 'akete', target: 'machine_door' }],
    expect: { nodes: ['akete_machine', 'machine_walk_in'], flags: { knocked: false, machine_open: true, door_magic: true } },
  },
  ...[
    ['small', '“Mine\'s worse. My Japanese, I mean.”', true],
    ['pat', 'Pat the chair', false],
  ].map(([id, reply, laughed]) => ({
    id: `office-kenji-${id}`,
    description: `With the chair returned, answer Kenji with ${reply}`,
    seed: seed('morning', { ...morning, machine_open: true, chair_back: true }),
    choices: [reply],
    actions: [use('kenji')],
    expect: { nodes: ['kenji_again', `kenji_${id}`], flags: { kenji_talked: true, kenji_laughed: laughed } },
  })),
  ...lunchRoutes,
  ...vendingRoutes,
  {
    id: 'office-vending-stays-stuck',
    description: 'Repeated taps leave the first order stuck, without another choice or duplicate purchase.',
    seed: seed('afternoon', { ...afternoon }, { inv: [], yen: 1000 }),
    choices: ['Corn soup'],
    actions: [use('vending'), use('vending'), use('vending')],
    expect: { nodes: ['buy_cornsoup', 'vend_stuck', 'vend_still_stuck'], flags: { vend_tried: true, vend_stuck: true, vend_want: 4, bought_cornsoup: false }, inv: [], yen: 1000 },
  },
  ...giftRoutes,
  {
    id: 'office-gift-refused-target',
    description: 'Tama has no drink gift handler, so the generic refusal leaves the coffee in the bag.',
    seed: seed('afternoon', { ...afternoon }, { inv: ['coffee'] }),
    choices: [],
    actions: [give('coffee', 'tama', "Cat doesn't seem to want the canned coffee. You keep it.")],
    expect: { nodes: [], flags: { gave_coffee_tama: false }, inv: ['coffee'] },
  },
  ...endingRoutes,
];
