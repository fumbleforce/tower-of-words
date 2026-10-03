// Day 2's branch routes (story/day2/), restored through Continue like day 1's: node game3d/tools/fast-routes.mjs --day 2
// Each seed is day 1's end plus day 2's progress up to the branch. The command fails while any authored day-2 choice
// option is uncovered.
const day1 = ['ohayo', 'yoroshiku', 'sumimasen', 'matte', 'ugoite'];
const history = {
  mio: { gate_magic: true, lunch_mio: true, mio_warm: 2, dorm_room_known: true },
  mori: { gate_magic: false, lunch_mori: true, mio_warm: 1, dorm_room_known: true },
  cold: { gate_magic: false, mio_warm: 0, dorm_room_known: true },
};
const started = { d2_started: true };
const ticket = { ...started, d2_station_seen: true, d2_checked: true, d2_ticket_done: true };
const briefed = { ...ticket, d2_brief_done: true };
const shift = { ...briefed, d2_shift_done: true };
const ate = { ...shift, d2_met_kenji: true, d2_ate: true, d2_food: 'riceball' };
const done = { ...ate, d2_party_done: true, going_home: true };
const seed = (place, flags, extra = {}) => ({ day: 2, place, known: day1, ...extra, flags: { ...history.mio, ...flags } });
const use = (target, extra = {}) => ({ type: 'use', target, ...extra });
const say = (word, target) => ({ type: 'say', word, target });

export default [
  {
    id: 'd2-station-mio-voice',
    description: 'Mio came (lunch with her): run the check, try "wait" on the doors first, then order the sensor.',
    seed: seed('train', started),
    choices: ['Try saying “wait” again before I submit it.', 'Report: “The sensor needs replacing.”'],
    actions: [use('door_test')],
    expect: {
      nodes: ['d2_check', 'd2_report', 'd2_voice_test', 'd2_report', 'd2_order_sensor', 'd2_submit'],
      flags: { d2_mio_here: true, d2_checked: true, d2_voice_tested: true, d2_order_sensor: true, d2_ticket_done: true },
    },
  },
  {
    id: 'd2-station-alone-pass',
    description: 'No promise from Mio: her messages, the check, and the report that the sensor passes.',
    seed: seed('train', { ...started, ...history.cold, lunch_mio: false }),
    choices: ['Report: “The sensor passes. No replacement needed.”'],
    actions: [use('door_test')],
    expect: {
      nodes: ['d2_check', 'd2_report', 'd2_keep_sensor', 'd2_submit'],
      flags: { d2_mio_here: false, d2_order_sensor: false, d2_ticket_done: true },
    },
  },
  {
    id: 'd2-station-alone-voice',
    description: 'Alone at the doors (lunch with Mori), the voice experiment with the motor humming, then the pass report.',
    seed: seed('train', { ...started, ...history.mori, lunch_mio: false }),
    choices: ['Try saying “wait” again before I submit it.', 'Report: “The sensor passes. No replacement needed.”'],
    actions: [use('door_test'), use('door_test', { line: 'I’ve sent the report.' })],
    expect: {
      nodes: ['d2_voice_test', 'd2_keep_sensor', 'd2_submit', 'd2_checked_again'],
      flags: { d2_mio_here: false, d2_voice_tested: true, d2_ticket_done: true },
    },
  },
  {
    id: 'd2-b2-before-station',
    description: 'B2 first: Emi sends him to the station, and the guard points the way.',
    seed: seed('office', started),
    actions: [use('emi'), use('lift', { settleAt: 'forecourt' })],
    expect: { nodes: ['d2_emi_waiting', 'd2_leave'], flags: { d2_brief_done: false } },
  },
  {
    id: 'd2-guard-both',
    description: 'The guard before the check.',
    seed: seed('gate', started),
    actions: [use('guard')],
    expect: { nodes: ['d2_guard'] },
  },
  {
    id: 'd2-brief-order-assess',
    description: 'The ordered sensor at B2, asking for time to assess, the invitation, and the desk to evening.',
    seed: seed('office', { ...ticket, d2_order_sensor: true }),
    choices: ['I’ll need time to see what you’ve got.'],
    actions: [use('emi'), use('my_desk')],
    expect: {
      nodes: ['d2_brief', 'd2_assess', 'd2_invitation', 'd2_work'],
      flags: { d2_brief_done: true, d2_shift_done: true },
      period: 'evening',
    },
  },
  {
    id: 'd2-brief-pass-limits',
    description: 'The passed sensor at B2 and the honest limit on ten years.',
    seed: seed('office', { ...ticket, d2_order_sensor: false }),
    choices: ['I can keep it running. I can’t promise ten years.'],
    actions: [use('emi'), use('kenji', { line: 'Blue curtain! After work. I am there.' })],
    expect: { nodes: ['d2_brief', 'd2_limits', 'd2_invitation', 'd2_kenji_invite_again'], flags: { d2_brief_done: true } },
  },
  {
    id: 'd2-party-riceball-afterwork-home',
    description: 'Meet Kenji at the curtain, sit, take a rice ball (typing tabetai), talk about evenings, then head home.',
    seed: seed('shotengai', shift, { period: 'evening' }),
    choices: ['I’d like a rice ball.', 'What do you do here after work?', 'Head home.'],
    actions: [use('kenji'), use('party_seat'), use('party_seat')],
    expect: {
      nodes: ['d2_meet_kenji', 'd2_supper', 'd2_take_food', 'd2_after_work', 'd2_party_free', 'd2_seat_menu', 'd2_goodnight'],
      flags: { d2_food: 'riceball', d2_ate: true, d2_party_done: true, going_home: true },
      known: ['tabetai'],
    },
  },
  {
    id: 'd2-party-sandwich-lillehammer-stay',
    description: 'Straight to the bench (Kenji gathers), an egg sandwich, Lillehammer after lunch with Mori, stay longer.',
    seed: seed('shotengai', { ...shift, ...history.mori }, { period: 'evening' }),
    choices: ['An egg sandwich, please.', 'You said you went to Lillehammer, didn’t you?', 'Stay a little longer.'],
    actions: [use('party_seat'), use('party_seat')],
    expect: {
      nodes: ['d2_supper', 'd2_take_food', 'd2_norway', 'd2_party_free', 'd2_seat_menu', 'd2_stay'],
      flags: { d2_food: 'sandwich', d2_met_kenji: true, d2_party_done: false },
      known: ['tabetai'],
    },
  },
  {
    id: 'd2-party-norway-quiet',
    description: 'Asking about Norway without the lunch history.',
    seed: seed('shotengai', { ...shift, ...history.cold }, { period: 'evening' }),
    choices: ['I’d like a rice ball.', 'Did you ever get to Norway, Mori-san?'],
    actions: [use('party_seat')],
    expect: { nodes: ['d2_supper', 'd2_take_food', 'd2_norway'], known: ['tabetai'] },
  },
  {
    id: 'd2-party-listen',
    description: 'Eat and listen: Mio shares her pickles.',
    seed: seed('shotengai', shift, { period: 'evening' }),
    choices: ['An egg sandwich, please.', 'Eat and listen for a while.'],
    actions: [use('party_seat')],
    expect: { nodes: ['d2_take_food', 'd2_quiet', 'd2_party_free'], known: ['tabetai'] },
  },
  {
    id: 'd2-party-drinks-and-more',
    description: 'Learn nomitai from Kenji, ask again, decline, and say tabetai for more food.',
    seed: seed('shotengai', ate, { period: 'evening', known: [...day1, 'tabetai'] }),
    choices: ['How do I say I want a drink?', 'I’d like a drink.', 'I’m all right, thanks.'],
    actions: [use('kenji'), use('kenji'), use('kenji'), say('tabetai', 'mori'), use('mio')],
    expect: {
      nodes: ['d2_kenji_party', 'd2_drink_word', 'd2_more_drink', 'd2_kenji_party', 'd2_more_drink', 'd2_stay', 'd2_more_food', 'd2_mio_party'],
      known: ['nomitai'],
    },
  },
  {
    id: 'd2-after-party-mori',
    description: 'After the goodbye: Mori resting in the back alley, twice; food words now get the plain reply.',
    seed: seed('shotengai', done, { period: 'evening', known: [...day1, 'tabetai'] }),
    actions: [use('mori'), use('mori'), say('tabetai', 'mori')],
    expect: { nodes: ['d2_mori_rest', 'd2_mori_rest_again', 'd2_more_food', 'd2_food_away'], flags: { d2_mori_rest_seen: true } },
  },
  {
    id: 'd2-computer-home-inbox',
    description: 'The room computer: write home, then read the inbox, then close it.',
    seed: seed('dorms', started, { world: { inside: true } }),
    choices: [
      'Write home.',
      '“I found the office. Still unpacking. I’ll call at the weekend.”',
      'Read the repair inbox.',
      'Close the computer.',
    ],
    actions: [use('computer'), use('computer'), use('computer')],
    expect: { nodes: ['d2_computer', 'd2_write_home', 'd2_send_home', 'd2_inbox', 'd2_close_computer'], flags: { d2_wrote_home: true } },
  },
  {
    id: 'd2-computer-later',
    description: 'Leave the message for later, then send the other one.',
    seed: seed('dorms', ticket, { world: { inside: true } }),
    choices: ['Write home.', 'Leave it for later.', 'Write home.', '“I’m all right. The people from work are looking after me.”'],
    actions: [use('computer'), use('computer')],
    expect: { nodes: ['d2_write_home', 'd2_close_computer', 'd2_send_home'], flags: { d2_wrote_home: true } },
  },
  {
    id: 'd2-visits-closed-ways',
    description: 'The east coast: the lookout twice, the closed pool approach and the shut onsen.',
    seed: seed('east_coast', started),
    actions: [use('lookout'), use('lookout'), use('courts_walk'), use('onsen')],
    expect: { nodes: ['d2_lookout', 'd2_lookout_again', 'd2_north_closed', 'd2_shut'], flags: { d2_lookout_seen: true } },
  },
  {
    id: 'd2-east-lane-north',
    description: 'The east lane: the north road closed for resurfacing, and a shut café.',
    seed: seed('east_lane', ticket),
    actions: [use('north_street'), use('cafe')],
    expect: { nodes: ['d2_north_closed', 'd2_shut'] },
  },
  {
    id: 'd2-home-end',
    description: 'Home after the party: up the stairs and in at 203, and the day-two summary.',
    seed: seed('dorm_court', done, { period: 'evening' }),
    actions: [use('stairs', { settleAt: 'dorms' })],
    expect: { nodes: ['d2_go_up', 'd2_room', 'd2_end'], flags: { d2_complete: true }, ended: true },
  },
  {
    id: 'd2-continue-midparty',
    description: 'Reload a real autosave mid-party and finish the conversation from it.',
    seed: seed('shotengai', shift, { period: 'evening', node: 'd2_supper' }),
    choices: ['I’d like a rice ball.', 'What do you do here after work?'],
    resumeAt: 'd2_after_work',
    actions: [],
    expect: {
      beforeReloadNodes: ['d2_supper', 'd2_take_food', 'd2_topic', 'd2_after_work'],
      nodes: ['d2_after_work', 'd2_party_free'],
      flags: { d2_ate: true },
      known: ['tabetai'],
    },
  },
];
