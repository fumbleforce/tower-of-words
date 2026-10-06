// Day 3's branch routes (story/day3/, and the swimming club's pool session from story/clubs.js), restored through
// Continue like the other days': node game3d/tools/fast-routes.mjs --day 3 (npm run check:routes:day3). Each seed is
// a finished day 2 plus Saturday's progress up to the branch; payments are checked once per closed request (yen),
// and again after a repeat visit. The command fails while any authored day-3 choice option is uncovered.
const known = ['ohayo', 'yoroshiku', 'sumimasen', 'matte', 'akete', 'ugoite', 'irete', 'tabetai'];
const day2 = {
  gate_magic: true, lunch_mio: true, mio_warm: 2, dorm_room_known: true, met_emi: true,
  d2_started: true, d2_station_seen: true, d2_checked: true, d2_ticket_done: true, d2_order_sensor: true,
  d2_brief_done: true, d2_shift_done: true, d2_met_kenji: true, d2_ate: true, d2_food: 'riceball',
  d2_party_done: true, d2_complete: true, ticket_T0001: 'done', ticket_T0002: 'progress',
};
const started = { ...day2, d3_started: true, ticket_T0003: 'new', ticket_T0004: 'new' };
const YEN = 4000;
const seed = (place, flags = {}, extra = {}) => ({ day: 3, place, known, met: ['mio', 'guard', 'kuroda', 'emi', 'kenji', 'mori'], yen: YEN, ...extra, flags: { ...started, ...flags } });
const use = (target, extra = {}) => ({ type: 'use', target, ...extra });
const club = { club_swimming: true };

export default [
  // the room: the computer, the chair's ways through the day, the bed
  {
    id: 'd3-room-morning', description: 'Saturday starts: the messages, then the two new requests on the computer.',
    seed: { ...seed('dorms', {}), flags: { ...day2 } },
    choices: ['Open repair requests.'], actions: [use('computer')],
    expect: { nodes: ['d3_room', 'd3_chair', 'd3_inbox', 'd3_up'], flags: { d3_started: true, ticket_T0003: 'new', ticket_T0004: 'new' }, period: 'morning' },
  },
  {
    id: 'd3-chair-morning', description: 'The rest of the morning at the desk: lunch.',
    seed: seed('dorms'), choices: ['Spend the rest of the morning here.'], actions: [use('computer')],
    expect: { nodes: ['d3_chair', 'd3_wait'], period: 'lunch' },
  },
  {
    id: 'd3-chair-lunch', description: 'The rest of lunch: the afternoon.',
    seed: seed('dorms', {}, { period: 'lunch' }), choices: ['Spend the rest of lunch here.'], actions: [use('computer')],
    expect: { nodes: ['d3_wait'], period: 'afternoon' },
  },
  {
    id: 'd3-chair-afternoon', description: 'The rest of the afternoon: the evening.',
    seed: seed('dorms', {}, { period: 'afternoon' }), choices: ['Spend the rest of the afternoon here.'], actions: [use('computer')],
    expect: { nodes: ['d3_wait'], period: 'evening' },
  },
  {
    id: 'd3-rest-not-yet', description: 'Rest until evening, the clock explained, and backing out of it.',
    seed: seed('dorms'), choices: ['Rest until evening.', 'Not yet.'], actions: [use('computer')],
    expect: { nodes: ['d3_rest', 'd3_up'], flags: { d3_time_seen: true }, period: 'morning' },
  },
  {
    id: 'd3-rest-first', description: 'Rest until evening the first time: the clock explained, then rest.',
    seed: seed('dorms'), choices: ['Rest until evening.', 'Rest until evening.'], actions: [use('computer')],
    expect: { nodes: ['d3_rest', 'd3_rest_now'], flags: { d3_time_seen: true }, period: 'evening' },
  },
  {
    id: 'd3-rest-evening', description: 'Rest until evening, the second time without the explanation.',
    seed: seed('dorms', { d3_time_seen: true }), choices: ['Rest until evening.', 'Get up.'], actions: [use('computer'), use('computer')],
    expect: { nodes: ['d3_rest', 'd3_rest_now', 'd3_chair', 'd3_up'], period: 'evening' },
  },
  {
    id: 'd3-bed-stay', description: 'The bed in the evening: stay up a little longer.',
    seed: seed('dorms', {}, { period: 'evening' }), choices: ['Stay up a little longer.'], actions: [use('bed')],
    expect: { nodes: ['d3_bed', 'd3_awake'], flags: { d3_complete: false } },
  },
  {
    id: 'd3-sleep-no-jobs', description: 'No job and no club: Sleep ends Saturday.',
    seed: seed('dorms', {}, { period: 'evening' }), choices: ['Sleep.'], actions: [use('bed')],
    expect: { nodes: ['d3_bed', 'd3_sleep'], flags: { d3_complete: true }, ended: true, yen: YEN },
  },
  // the board: Aoi's moment both ways, the map's word, and putting it down
  {
    id: 'd3-board-aoi-heard', description: 'Aoi at the board: Eric tells her not to worry about her train call; the board after.',
    seed: seed('plaza'), choices: ['Tell her not to worry about it.'], actions: [use('noticeboard')],
    expect: { nodes: ['d3_board', 'd3_aoi', 'd3_aoi_heard', 'd3_aoi_name'], flags: { d3_aoi_intro: true, d3_board_read: true } },
  },
  {
    id: 'd3-board-aoi-missed', description: 'Talking to Aoi first; Eric admits he followed none of the call.',
    seed: seed('plaza'), choices: ['Admit you didn’t follow a word of it.'], actions: [use('aoi'), use('noticeboard')],
    expect: { nodes: ['d3_aoi', 'd3_aoi_missed', 'd3_aoi_name', 'd3_board'], flags: { d3_aoi_intro: true, d3_board_read: true } },
  },
  {
    id: 'd3-map-koko', description: 'The map: try “here”, typed, then said to the map.',
    seed: seed('plaza', { d3_aoi_intro: true }), choices: ['Try saying “here”.'], actions: [use('board_map')],
    expect: { nodes: ['d3_map', 'd3_koko_word', 'd3_here', 'd3_map_end'], known: ['koko'] },
  },
  {
    id: 'd3-map-down', description: 'The map put down without the word.',
    seed: seed('plaza', { d3_aoi_intro: true }), choices: ['Leave the map.'], actions: [use('board_map')],
    expect: { nodes: ['d3_map', 'd3_map_end'] },
  },
  // the station: the guard's sign-off (both sensor histories, later), the monitor (mended, later), a hello
  {
    id: 'd3-signoff-walk', description: 'From the guard to the platform; the witnessed check, signed; paid once, also on a second look.',
    seed: seed('gate', { d3_monitor_seen: true }), startAt: 'gate',
    choices: ['Do the final door check.', 'Run the final check.'], actions: [use('guard', { settleAt: 'train' }), use('door_test', { settleAt: 'train' })],
    expect: { nodes: ['d3_offer_signoff', 'd3_signoff', 'd3_signoff_test', 'd3_signoff'], flags: { ticket_T0002: 'done', d3_station_done: true }, yen: YEN + 5000 },
  },
  {
    id: 'd3-signoff-kept-sensor', description: 'The old sensor kept on day 2: it passes, Mio’s other message.',
    seed: seed('train', { d2_order_sensor: false }), choices: ['Run the final check.'], actions: [use('door_test')],
    expect: { nodes: ['d3_signoff', 'd3_signoff_test'], flags: { ticket_T0002: 'done' }, yen: YEN + 5000 },
  },
  {
    id: 'd3-signoff-later', description: 'The check left for another morning.',
    seed: seed('train'), choices: ['Do the check another morning.'], actions: [use('door_test')],
    expect: { nodes: ['d3_signoff', 'd3_signoff_later'], flags: { ticket_T0002: 'progress' }, yen: YEN },
  },
  {
    id: 'd3-guard-hello', description: 'The guard shows the monitor fault first, then just a good morning.',
    seed: seed('gate'), choices: ['Just saying good morning.'], actions: [use('guard')],
    expect: { nodes: ['d3_guard', 'd3_guard_hello'], flags: { d3_monitor_seen: true, ticket_T0003: 'new' } },
  },
  {
    id: 'd3-monitor-fix', description: 'The monitor through the guard: the plug seated, his thanks; paid once, the screen still steady.',
    seed: seed('gate', { d3_monitor_seen: true, ticket_T0002: 'done' }),
    choices: ['Look at the monitor.', 'Seat the loose connector.', 'The picture stayed on. Finish the request.'], actions: [use('guard'), use('guard_monitor')],
    expect: { nodes: ['d3_monitor', 'd3_monitor_fix', 'd3_monitor'], flags: { ticket_T0003: 'done', d3_monitor_done: true, d3_monitor_thanked: true }, known: ['gamen'], yen: YEN + 1000 },
  },
  {
    id: 'd3-monitor-retest', description: 'Repeat the physical turning check before reporting the monitor fixed.',
    seed: seed('gate', { d3_monitor_seen: true, ticket_T0002: 'done' }),
    choices: ['Seat the loose connector.', 'Ask him to turn it once more.', 'The picture stayed on. Finish the request.'],
    actions: [use('guard_monitor')],
    expect: { nodes: ['d3_monitor_fix', 'd3_monitor_check', 'd3_monitor_again', 'd3_monitor_check', 'd3_monitor_complete'], flags: { ticket_T0003: 'done' }, known: ['gamen'], yen: YEN + 1000 },
  },
  {
    id: 'd3-monitor-known-repeat', description: 'The previously learned station phrase is reused while asking for a real monitor retest.',
    seed: seed('gate', { d3_monitor_seen: true, ticket_T0002: 'done' }, { known: [...known, 'mouichido'] }),
    choices: ['Seat the loose connector.', 'Ask him to turn it once more.', 'The picture stayed on. Finish the request.'],
    actions: [use('guard_monitor', { line: 'もう一度 (mou ichido, once more). Just to be sure.' })],
    expect: { nodes: ['d3_monitor_fix', 'd3_monitor_check', 'd3_monitor_again', 'd3_monitor_complete'], flags: { ticket_T0003: 'done' }, known: ['gamen'], yen: YEN + 1000 },
  },
  {
    id: 'd3-monitor-continue', description: 'Continue after seating the connector repeats the visible check, preserves the learned word and pays once.',
    seed: seed('gate', { ticket_T0002: 'done' }, { node: 'd3_monitor' }),
    resumeAt: 'd3_monitor_check', resumeYenDelta: 1000,
    choices: ['Seat the loose connector.', 'The picture stayed on. Finish the request.'], actions: [use('guard_monitor')],
    expect: { nodes: ['d3_monitor_check', 'd3_monitor_complete', 'd3_monitor'], flags: { ticket_T0003: 'done' }, known: ['gamen'], yen: YEN + 1000 },
  },
  {
    id: 'd3-monitor-later', description: 'The monitor left for another morning.',
    seed: seed('gate', { d3_monitor_seen: true }), choices: ['Leave the monitor for another morning.'], actions: [use('guard_monitor')],
    expect: { nodes: ['d3_monitor', 'd3_monitor_later'], flags: { ticket_T0003: 'new', d3_monitor_done: false }, yen: YEN },
  },
  // the gym's booking terminal: reset and print (the printer's word), the word, later
  {
    id: 'd3-booking-reset-print', description: 'The reset control, Print, the attendant’s word, the check; paid once.',
    seed: seed('gym'), choices: ['Restart the terminal with the red button.', 'Press Print for today’s bookings.'],
    actions: [use('booking_terminal'), use('gym_printer'), use('booking_terminal')],
    expect: { nodes: ['d3_booking', 'd3_booking_reset', 'd3_booking_ready', 'd3_printer', 'd3_print', 'd3_dashite_word', 'd3_booking'], flags: { ticket_T0004: 'done', d3_booking_done: true }, known: ['dashite', 'yoyaku'], yen: YEN + 1500 },
  },
  {
    id: 'd3-booking-word-later', description: '動いて on the terminal; the printout left, then printed on a second try.',
    seed: seed('gym'), choices: ['Say 動いて (ugoite, move) to the terminal.', 'Leave the printout for later.', 'Press Print for today’s bookings.'],
    actions: [use('booking_terminal'), use('gym_printer'), use('gym_printer')],
    expect: { nodes: ['d3_booking_magic', 'd3_booking_ready', 'd3_printer', 'd3_booking_later', 'd3_print'], flags: { d3_booking_magic: true, ticket_T0004: 'done' }, yen: YEN + 1500 },
  },
  {
    id: 'd3-booking-later', description: 'The terminal left for later.',
    seed: seed('gym'), choices: ['Come back to it later.'], actions: [use('booking_terminal')],
    expect: { nodes: ['d3_booking', 'd3_booking_later'], flags: { d3_booking_restarted: false }, yen: YEN },
  },
  // the swimming club's last outdoor swim: every way through it, and the goggles
  {
    id: 'd3-pool-swim-sit', description: 'A member arriving: the introductions, swimming with Kuro, sitting with them after.',
    seed: seed('pool', club, { period: 'evening' }), choices: ['Swim with Kuro.', 'Sit with them after the swim.'],
    expect: { nodes: ['club_swimming_1', 'club_swimming_intro', 'club_swimming_pool', 'club_swimming_join', 'club_swimming_length', 'club_swimming_sit'], flags: { d3_swim_done: true, d3_player_swims: true, d3_kuro_intro: true, d3_swimming_shared: true }, known: [] },
  },
  {
    id: 'd3-pool-optional-word', description: 'Choose to learn the swim reply, use it in the water invitation, then hear it again in a later conversation.',
    seed: seed('pool', club, { period: 'evening' }), choices: ['Ask how to say you’ll swim.', 'Sit with them after the swim.'],
    actions: [use('kuro')],
    expect: { nodes: ['club_swimming_word', 'club_swimming_join', 'club_swimming_sit', 'd3_kuro_pool'], flags: { d3_swim_done: true }, known: ['oyogu'] },
  },
  {
    id: 'd3-pool-swim-continue', description: 'Continue at water entry resumes the conversation and swim without inserting a lesson.',
    seed: seed('pool', club, { period: 'evening', node: 'club_swimming_1' }), resumeAt: 'club_swimming_slow',
    choices: ['Swim with Kuro.', 'Sit with them after the swim.'],
    expect: { nodes: ['club_swimming_slow', 'club_swimming_sit'], flags: { d3_swim_done: true }, known: [] },
  },
  {
    id: 'd3-pool-bags-water', description: 'Carrying the bags, then into the water; goodnight and out to the sports ground.',
    seed: seed('pool', club, { period: 'evening' }), startAt: 'sports',
    choices: ['Carry Emi’s bags to the attendant.', 'Get in the water.', 'Say goodnight and leave the pool.'],
    expect: { nodes: ['club_swimming_bags', 'club_swimming_after_bags', 'club_swimming_length', 'club_swimming_goodnight'], flags: { d3_swim_done: true, d3_player_swims: true } },
  },
  {
    id: 'd3-pool-bags-deck', description: 'Carrying the bags, then a seat on the deck; sitting with them after.',
    seed: seed('pool', club, { period: 'evening' }),
    choices: ['Carry Emi’s bags to the attendant.', 'Take a seat on the deck.', 'Sit with them after the swim.'],
    expect: { nodes: ['club_swimming_bags', 'club_swimming_deck', 'club_swimming_length', 'club_swimming_sit'], flags: { d3_swim_done: true, d3_player_swims: false } },
  },
  {
    id: 'd3-pool-watch', description: 'Watching from the deck.',
    seed: seed('pool', club, { period: 'evening' }), choices: ['Sit on the deck and watch.', 'Sit with them after the swim.'],
    expect: { nodes: ['club_swimming_watch', 'club_swimming_deck', 'club_swimming_length', 'club_swimming_sit'], flags: { d3_swim_done: true }, known: [] },
  },
  {
    id: 'd3-pool-leave-early', description: 'Leaving them to their evening: the swim waits at Emi.',
    seed: seed('pool', club, { period: 'evening' }), startAt: 'sports', choices: ['Leave them to their evening.'],
    expect: { nodes: ['club_swimming_pool', 'club_swimming_leave_early'], flags: { d3_swim_done: false } },
  },
  {
    id: 'd3-pool-goggles', description: 'After the swim: the goggles on the fence go back to their owner.',
    seed: seed('pool', { ...club, d3_swim_done: true, d3_kuro_intro: true, clubday_swimming: 3, clubprog_swimming: 1 }, { period: 'evening' }),
    actions: [use('pool_goggles')],
    expect: { nodes: ['d3_goggles'], flags: { d3_goggles_returned: true } },
  },
];
