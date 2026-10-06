// Day 2's branch routes (story/day2/), restored through Continue like day 1's: node game3d/tools/fast-routes.mjs --day 2
// Each seed is day 1's end plus day 2's progress up to the branch. The command fails while any authored day-2 choice
// option is uncovered.
const day1 = ['ohayo', 'yoroshiku', 'sumimasen', 'matte', 'ugoite'];
const history = {
  mio: { gate_magic: true, lunch_mio: true, lunch_mori: false, mio_warm: 2, dorm_room_known: true },
  mori: { gate_magic: false, lunch_mio: false, lunch_mori: true, d2_mio_saw_test: false, mio_warm: 1, dorm_room_known: true },
  cold: { gate_magic: false, lunch_mio: false, lunch_mori: false, d2_mio_saw_test: false, mio_warm: 0, dorm_room_known: true },
};
const started = { d2_started: true, d2_ticket_taken: true, ticket_T0001: 'done', ticket_T0002: 'progress' };
const ticket = { ...started, d2_station_seen: true, d2_checked: true, d2_voice_tested: true, d2_mio_saw_test: true, d2_ticket_done: true };
const briefed = { ...ticket, d2_brief_done: true };
const shift = { ...briefed, d2_shift_done: true };
const ate = { ...shift, d2_met_kenji: true, d2_ate: true, d2_food: 'yakitori' };
const done = { ...ate, d2_party_done: true, going_home: true };
const seed = (place, flags, extra = {}) => ({ day: 2, place, known: day1, ...extra, flags: { d2_content_revision: 2, ...history.mio, ...flags } });
const use = (target, extra = {}) => ({ type: 'use', target, ...extra });
const say = (word, target) => ({ type: 'say', word, target });

export default [
  {
    id: 'd2-station-mio-voice',
    description: 'Mio came (lunch with her): run the check, try matte on the doors first, order the sensor; she walks off to B2.',
    seed: seed('train', started),
    choices: ['Keep Mio’s sensor explanation in the report.'],
    actions: [use('door_test')],
    expect: {
      nodes: ['d2_check', 'd2_voice_test', 'd2_report', 'd2_order_sensor', 'd2_submit'],
      flags: { d2_mio_here: false, d2_checked: true, d2_voice_tested: true, d2_order_sensor: true, d2_ticket_done: true },
    },
  },
  {
    id: 'd2-station-alone-pass',
    description: 'No promise from Mio: her messages, two normal checks, the empty-car voice test, and the passing-sensor report.',
    seed: seed('train', { ...started, ...history.cold, lunch_mio: false }),
    choices: ['Report the passing sensor test.'],
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
    choices: ['Report the passing sensor test.'],
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
    choices: ['I’ll need time to see what you’ve got.', 'Read Mori’s notes for the afternoon.', 'Go through the old requests with Mori.'],
    actions: [use('emi'), use('my_desk'), use('my_desk')],
    expect: {
      nodes: ['d2_brief', 'd2_assess', 'd2_invitation', 'd2_work', 'd2_notes', 'd2_review_requests', 'd2_desk_later'],
      flags: { d2_brief_done: true, d2_shift_done: true, ticket_T0001: 'done', ticket_T0002: 'progress' },
      period: 'evening',
    },
  },
  {
    id: 'd2-desk-defer',
    description: 'Read the repair list twice and get up without spending the afternoon.',
    seed: seed('office', briefed),
    choices: ['Get up.', 'Get up.'],
    actions: [use('my_desk'), use('my_chair')],
    expect: {
      nodes: ['d2_work', 'd2_leave_desk'],
      flags: { d2_shift_done: false, ticket_T0001: 'done', ticket_T0002: 'progress' },
      period: 'morning',
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
    id: 'd2-party-yakitori-afterwork-home',
    description: 'Meet Kenji at the curtain, sit, take a chicken skewer (typing tabetai), talk about evenings, then head home.',
    seed: seed('shotengai', shift, { period: 'evening' }),
    choices: ['Raise your glass with them.', 'I’d like a chicken skewer.', 'What do you do here after work?', 'Thank everyone and head home.'],
    actions: [use('kenji'), use('izakaya', {settleAt:'izakaya'}), use('party_seat',{settleAt:'izakaya'}), use('party_seat',{settleAt:'izakaya'})],
    expect: {
      nodes: ['d2_meet_kenji', 'd2_supper', 'd2_take_food', 'd2_after_work', 'd2_party_free', 'd2_seat_menu', 'd2_goodnight'],
      flags: { d2_food: 'yakitori', d2_ate: true, d2_party_done: true, going_home: true },
      known: ['tabetai'],
    },
  },
  {
    id: 'd2-party-vegetables-lillehammer-stay',
    description: 'Straight inside the restaurant, grilled vegetables, Lillehammer after lunch with Mori, stay longer.',
    seed: seed('izakaya', { ...shift, ...history.mori }, { period: 'evening' }),
    choices: ['Try the toast in Japanese.', 'The grilled vegetables, please.', 'You said you went to Lillehammer, didn’t you?', 'Stay a little longer.'],
    actions: [use('party_seat'), use('party_seat')],
    expect: {
      nodes: ['d2_supper', 'd2_take_food', 'd2_norway', 'd2_party_free', 'd2_seat_menu', 'd2_stay'],
      flags: { d2_food: 'vegetables', d2_met_kenji: true, d2_party_done: false },
      known: ['kanpai','tabetai'],
    },
  },
  {
    id: 'd2-party-norway-quiet',
    description: 'Asking about Norway without the lunch history.',
    seed: seed('izakaya', { ...shift, ...history.cold }, { period: 'evening' }),
    choices: ['Raise your glass with them.', 'I’d like a chicken skewer.', 'Have you ever been to Norway, Mori-san?'],
    actions: [use('party_seat')],
    expect: { nodes: ['d2_supper', 'd2_take_food', 'd2_norway'], known: ['tabetai'] },
  },
  {
    id: 'd2-party-listen',
    description: 'Eat and listen: Mio shares her pickles.',
    seed: seed('izakaya', shift, { period: 'evening' }),
    choices: ['Try the toast in Japanese.', 'The grilled vegetables, please.', 'Eat and listen for a while.'],
    actions: [use('party_seat')],
    expect: { nodes: ['d2_take_food', 'd2_quiet', 'd2_party_free'], known: ['tabetai'] },
  },
  {
    id: 'd2-party-drinks-and-more',
    description: 'Learn nomitai from Kenji, ask again, decline, and say tabetai for more food.',
    seed: seed('izakaya', ate, { period: 'evening', known: [...day1, 'tabetai'] }),
    choices: ['How do I say I want a drink?', 'I’d like a drink.', 'I’m all right, thanks.'],
    actions: [use('kenji'), use('kenji'), use('kenji'), say('tabetai', 'kenji'), use('mio')],
    expect: {
      nodes: ['d2_kenji_party', 'd2_drink_word', 'd2_kenji_party', 'd2_more_drink', 'd2_no_drink', 'd2_more_food', 'd2_mio_party'],
      flags: { d2_mio_party_seen: true },
      known: ['nomitai'],
    },
  },
  {
    id: 'd2-after-party-mori-later-word',
    description: 'After the goodbye: Mori packing at the table with Emi; the word for "go" left for later, then asked for; an out-of-context food request.',
    seed: seed('izakaya', done, { period: 'evening', known: [...day1, 'tabetai'] }),
    choices: ['I’ll look forward to seeing the photos.', 'How did you say “I want to go” earlier?'],
    actions: [use('mori'), use('mori'), say('tabetai', 'mori')],
    expect: {
      nodes: ['d2_mori_rest', 'd2_mori_rest_end', 'd2_mori_rest_again', 'd2_go_word', 'd2_food_away'],
      flags: { d2_mori_rest_seen: true },
      known: ['ikitai'],
    },
  },
  {
    id: 'd2-after-party-mori-word',
    description: 'After the goodbye: the word for "go" straight away, then saying it back to him.',
    seed: seed('izakaya', { ...done, ...history.mori }, { period: 'evening', known: [...day1, 'tabetai'] }),
    choices: ['How do you say “I want to go”?'],
    actions: [use('mori'), use('mori'), say('ikitai', 'mori')],
    expect: { nodes: ['d2_mori_rest', 'd2_go_word', 'd2_mori_rest_again', 'd2_mori_go_reply'], known: ['ikitai'] },
  },
  {
    id: 'd2-after-party-mori-goodnight',
    description: 'After the goodbye: the photos promised, then goodnight; a drink asked for once the tea is gone.',
    seed: seed('izakaya', done, { period: 'evening', known: [...day1, 'tabetai', 'nomitai'] }),
    choices: ['I’ll look forward to seeing the photos.', 'Goodnight, Mori-san.'],
    actions: [use('mori'), use('mori'), say('nomitai', 'mori')],
    expect: { nodes: ['d2_mori_rest', 'd2_mori_rest_again', 'd2_mori_rest_end', 'd2_drink_away'] },
  },
  {
    id: 'd2-coast-hamada-word',
    description: 'After work at the lookout: Hamada cleans the lens; learn mitai from him, look, look again, leave.',
    seed: seed('east_coast', shift, { period: 'evening' }),
    choices: ['How do I say “I want to see”?', 'Have another look through the telescope.', 'Leave him to enjoy the view.'],
    actions: [use('kuroda'), use('kuroda'), use('kuroda')],
    expect: {
      nodes: ['d2_hamada', 'd2_see_word', 'd2_lookout_view', 'd2_hamada_again', 'd2_lookout_view', 'd2_hamada_again', 'd2_leave_lookout'],
      flags: { d2_hamada_seen: true, d2_lookout_seen: true },
      known: ['mitai'],
    },
  },
  {
    id: 'd2-coast-hamada-look',
    description: 'Look straight away, then ask for the word on a second visit, then say it to him.',
    seed: seed('east_coast', shift, { period: 'evening' }),
    choices: ['Have a look through the telescope.', 'How do I say “I want to see”?'],
    actions: [use('kuroda'), use('kuroda'), say('mitai', 'kuroda')],
    expect: { nodes: ['d2_hamada', 'd2_lookout_view', 'd2_hamada_again', 'd2_see_word', 'd2_lookout_view'], known: ['mitai'] },
  },
  {
    id: 'd2-coast-hamada-leave',
    description: 'Leave Hamada to the view; the closed onsen after work.',
    seed: seed('east_coast', shift, { period: 'evening' }),
    choices: ['Leave him to enjoy the view.'],
    actions: [use('kuroda'), use('onsen')],
    expect: { nodes: ['d2_hamada', 'd2_leave_lookout', 'd2_onsen'], flags: { d2_hamada_seen: true } },
  },
  {
    id: 'd2-computer-home-inbox',
    description: 'The room computer: write home, then read the inbox, then close it.',
    seed: seed('dorms', started, { world: { inside: true } }),
    choices: [
      'Write home.',
      '“I found the office. Still unpacking. I’ll call at the weekend.”',
      'Open repair requests.',
      'Open repair requests.',
      'Close the computer.',
    ],
    actions: [use('computer'), use('computer'), use('computer'), use('computer')],
    expect: {
      nodes: ['d2_computer', 'd2_write_home', 'd2_send_home', 'd2_inbox', 'd2_close_computer'],
      flags: { d2_wrote_home: true, ticket_T0001: 'done', ticket_T0002: 'progress' }, period: 'morning',
    },
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
    description: 'The east coast in the morning: the lookout twice (no Hamada), the closed pool approach and the shut onsen.',
    seed: seed('east_coast', started),
    actions: [use('lookout'), use('lookout'), use('courts_walk'), use('onsen')],
    expect: { nodes: ['d2_lookout', 'd2_lookout_view', 'd2_lookout_again', 'd2_north_closed', 'd2_onsen'], flags: { d2_lookout_seen: true } },
  },
  {
    id: 'd2-shop-street-morning',
    description: 'The shop street before work: the bakery’s delivery notice (the flyer remembered), twice, and the izakaya.',
    seed: seed('shotengai', started, { found: ['bakery_flyer'] }),
    actions: [use('bakery'), use('bakery'), use('izakaya')],
    expect: { nodes: ['d2_bakery', 'd2_shut', 'd2_izakaya'], flags: { d2_bakery_seen: true } },
  },
  {
    id: 'd2-east-lane-north',
    description: 'The east lane: the north road closed for resurfacing, and a shut café.',
    seed: seed('east_lane', ticket),
    actions: [use('north_street'), use('cafe'), use('liquor_shop'), use('liquor_shop')],
    expect: { nodes: ['d2_north_closed', 'd2_shut', 'd2_sake_tag', 'd2_shut'], flags: { d2_sake_tag_seen: true } },
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
    seed: seed('izakaya', shift, { period: 'evening', node: 'd2_supper' }),
    choices: ['Raise your glass with them.', 'I’d like a chicken skewer.', 'What do you do here after work?'],
    resumeAt: 'd2_after_work',
    actions: [],
    expect: {
      beforeReloadNodes: ['d2_supper', 'd2_take_food', 'd2_topic', 'd2_after_work'],
      nodes: ['d2_after_work', 'd2_party_free'],
      flags: { d2_ate: true },
      known: ['tabetai'],
    },
  },
  {
    id:'d2-request-accept', description:'Accept the explicit station request on the first morning.',
    seed:seed('dorms',{d2_started:false,d2_ticket_taken:false},{world:{inside:true},node:'d2_room'}),
    choices:['Take the station door check.'],actions:[],
    expect:{nodes:['d2_first_request','d2_take_request'],flags:{d2_ticket_taken:true,ticket_T0002:'progress'}},
  },
  {
    id:'d2-request-defer-computer', description:'Defer the morning request, leave it in the inbox once, then explicitly accept it.',
    seed:seed('dorms',{d2_started:false,d2_ticket_taken:false},{world:{inside:true},node:'d2_room'}),
    choices:['Get ready before accepting it.','Open repair requests.','Leave it for now.','Open repair requests.','Take the station door check.'],
    actions:[use('computer'),use('computer')],expect:{nodes:['d2_ready_first','d2_inbox','d2_close_computer','d2_inbox','d2_accept_at_computer','d2_take_request'],flags:{d2_ticket_taken:true}},
  },
  {
    id:'d2-notes-defer-review',description:'Read the dated copier notes, defer the afternoon, then choose the actual review.',
    seed:seed('office',briefed),choices:['Read Mori’s notes for the afternoon.','Get up and come back to this.','Read Mori’s notes for the afternoon.','Go through the old requests with Mori.'],
    actions:[use('my_desk'),use('my_desk')],expect:{nodes:['d2_notes','d2_leave_desk','d2_notes','d2_review_requests'],flags:{d2_shift_done:true},period:'evening'},
  },
  {
    id:'d2-office-mio-topics',description:'Ordinary work/weekend conversation with Mio, and an explicit neutral exit.',
    seed:seed('office',briefed),choices:['Leave her to finish.','What are you working on?','Do you usually stay on the island at weekends?'],
    actions:[use('mio'),use('mio'),use('mio')],expect:{nodes:['d2_social_end','d2_mio_job','d2_mio_weekend'],flags:{d2_mio_job_talked:true,d2_mio_weekend_talked:true}},
  },
  {
    id:'d2-reception-topics-swimmer',description:'Use yesterday’s greeting, learn day off, reuse okay, and accept the swimming invitation.',
    seed:seed('forecourt',started,{known:[...day1,'daijoubu']}),
    choices:['{ohayo}. Good morning.','Do you work here every day?','{daijoubu}. I found my way today.','What do you do on your days off?','Yes. I haven’t been for a while.','I’ll let you get back to work.'],
    actions:[use('kuro')],expect:{nodes:['d2_kuro_greet','d2_kuro_work','d2_kuro_ok','d2_kuro_swimmer','d2_kuro_end'],known:['yasumi']},
  },
  {
    id:'d2-reception-beginner',description:'Ask about the weekend without taking the optional day-off lesson.',
    seed:seed('forecourt',started),choices:['What do you do on your days off?','A little. I’d have to start slowly.','I’ll let you get back to work.'],
    actions:[use('kuro')],expect:{nodes:['d2_kuro_beginner','d2_kuro_end'],flags:{d2_kuro_work_seen:false,d2_kuro_weekend_seen:true}},
  },
  {
    id:'d2-party-emi-topics',description:'Emi joins the complete department: B2 visits, food recommendation, and neutral leave.',
    seed:seed('izakaya',ate,{period:'evening',known:[...day1,'tabetai']}),
    choices:['Do you get much time down on B2?','What would you order here?','Let her finish eating.'],actions:[use('emi'),use('emi'),use('emi')],
    expect:{nodes:['d2_emi_department','d2_emi_food','d2_party_free']},
  },
  {
    id:'d2-party-compliment-optional',description:'Learn delicious only by choosing the compliment, reuse it, ask about Norway, and leave Mori to eat.',
    seed:seed('izakaya',ate,{period:'evening',known:[...day1,'tabetai']}),
    choices:['Tell him you’re enjoying the food.','{oishii}. The food is lovely.','Ask about his trip to Norway.','Let him eat.'],
    actions:[use('mori'),use('mori'),use('mori'),use('mori')],expect:{nodes:['d2_compliment','d2_food_reply','d2_norway','d2_party_free'],known:['oishii']},
  },

  {id:'d2-guard-report-reuse',description:'Reuse okay with the guard after the real test, then use the ordinary report reply.',
    seed:seed('gate',ticket,{known:[...day1,'daijoubu']}),choices:['{daijoubu}. The doors work.','I sent the report to B2.'],actions:[use('guard'),use('guard')],
    expect:{nodes:['d2_guard_ok','d2_guard_sent']}},
];
