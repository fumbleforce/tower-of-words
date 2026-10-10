// Day 1 wired into the bond system without touching a line of the story. Keyed by story node names:
// when a node starts, its moment is recorded once (sim.js). The story's own `bond` steps get their source
// from REASONS, so the caps know what they are.
//
// MOMENTS[place][node]: { if, remember: [[who, key, text, if?]], fact: [[who, key, text, if?]], notice: [[who, item]],
//                         bond: [[who, source, add?, why]] }
// REASONS[place][node] or REASONS[place]['node:who']: { source, why } for a `bond` step inside that node.
// Remembered and fact texts show in the People panel, so they're written for the player.

export const MOMENTS = {
  train: {
    lesson2: { bond: [['mio', 'greet', 1, 'said おはようございます to her first']] },
    caught: { remember: [['mio', 'caught_bag', 'You caught her lunch bag when the train lurched.']] },
    dropped: { remember: [['mio', 'dropped_bag', 'You let her lunch bag fall off the seat.']] },
    family: {
      remember: [['mio', 'asked_mum', 'You asked about her mum.']],
      fact: [['mio', 'mum', 'Stays at her mum’s on the mainland. Her mum packs too much food.']],
    },
    platform: {
      remember: [
        ['mio', 'held_doors', 'You held the train doors with 待って.'],
        ['kuroda', 'held_doors', 'The train doors waited for him after you said 待って.'],
      ],
    },
    mio_tests: { fact: [['mio', 'her_list', 'Anything reported broken goes on her list.']] },
  },
  gate: {
    ohayo_guard: { remember: [['guard', 'greeted', 'You said good morning before trying the gate.']] },
    yoroshiku_guard: { remember: [['guard', 'greeted', 'You greeted him before trying the gate.']] },
    card_red: {
      if: '!greeted_guard',
      remember: [['guard', 'no_greeting', 'You went for the gate without a good morning.']],
    },
    word_say: {
      remember: [
        ['kuroda', 'akete', 'You said 開けて with him, and the gate flew open.'],
        ['guard', 'gate_burst', 'The gate burst open when you spoke to it.'],
      ],
      bond: [['kuroda', 'help', 1, 'got him through the jammed gate']],
    },
    mime_cat: { remember: [['guard', 'pointed_cat', 'You pointed at the cat he says isn’t there.']] },
    mime_lift: {
      remember: [
        ['kuroda', 'mime', 'You got the guard to see the briefcase problem.'],
        ['guard', 'laughed', 'You made him laugh with the briefcase mime.', '!guard_cool'],
      ],
    },
  },
  office: {
    // ---------- morning
    yoroshiku_mori: { remember: [['mori', 'yoroshiku', 'You answered him with よろしくおねがいします.']] },
    ohayo_mori: { remember: [['mori', 'ohayo', 'You answered his introduction with おはようございます.']] },
    ohayo_kenji: {
      bond: [['kenji', 'greet', 1, 'greeted him']],
      fact: [['kenji', 'deep_bow', 'Bows deeper than you do when you greet him.']],
    },
    yoroshiku_kenji: { bond: [['kenji', 'greet', 1, 'greeted him']] },
    ohayo_mio: { fact: [['mio', 'too_polite', 'Finds おはようございます too polite from you.']] },
    kenji_first: { fact: [['kenji', 'chair', 'Borrowed your chair because his broke.']] },
    kenji_again: {
      if: 'chair_back && !kenji_talked',
      remember: [['kenji', 'chair_back', 'You got your chair back from the machine room without a fuss.']],
    },
    kenji_small: { remember: [['kenji', 'practise', 'You told him your Japanese is worse than his English.']] },
    kenji_pat: { remember: [['kenji', 'patted_chair', 'You patted the chair. He patted his desk.']] },
    akete_machine: { remember: [['mio', 'machine_door', 'You opened the machine room door without a card.']] },
    ticket: { fact: [['mori', 'copier_1996', 'Opened the copier’s repair request in 1996, when he was new.']] },
    copier: { remember: [['mori', 'copier', 'You got the copier going with 動いて, his word for it.']] },
    ticket_done: { remember: [['mio', 'copier', 'You fixed the copier three companies gave up on.']] },

    // ---------- lunch, the one choice
    lunch_start: { fact: [['mio', 'lunch_spot', 'Eats her lunch in the machine room, where it’s quiet.']] },
    mio_lunch_end: { remember: [['mio', 'lunch', 'You had lunch with her in the machine room.']] },
    mio_b2: {
      fact: [['mio', 'why_b2', 'Works in B2 so she doesn’t have to bow all day. Looks after the old machines.']],
    },
    mio_doors: {
      remember: [['mio', 'asked_doors', 'You asked her about the doors.']],
      fact: [['mio', 'sensor', 'Told the station the doors were the sensor.']],
    },
    mio_quiet: { remember: [['mio', 'quiet_lunch', 'You ate with her and didn’t talk.']] },
    mio_bond: { remember: [['mio', 'rack', 'You stopped the rack alarm with 止まって when she asked.']] },
    mori_cups: { remember: [['mori', 'lunch', 'You had lunch with him in the kitchenette.']] },
    mori_landing: {
      remember: [['mori', 'ski_jump', 'You landed his ski jump with him.']],
      fact: [['mori', 'lillehammer', 'Went to the Lillehammer Olympics in 1994.']],
    },
    mori_pour: {
      remember: [['mori', 'poured', 'You poured his tea before your own.']],
      bond: [['mori', 'their_way', 1, 'poured his tea first']],
    },
    mori_bond: { remember: [['mori', 'seven_cups', 'You filled all seven cups with 入れて.']] },
    lunch_end: {
      notice: [['mori', 'cornsoup']],
      fact: [['mori', 'soup', 'Has corn soup from a can every afternoon.']],
    },

    // ---------- afternoon: gifts
    gift_mio_coffee: { remember: [['mio', 'coffee', 'You brought her a black coffee.']], notice: [['mio', 'coffee']] },
    gift_mio_other: { remember: [['mio', 'sweet', 'You brought her something too sweet.']] },
    gift_mori_cornsoup: { remember: [['mori', 'cornsoup', 'You brought him his corn soup.']] },
    gift_mori_other: { remember: [['mori', 'gift', 'You brought him a drink.']] },
    gift_kenji_melon: {
      remember: [['kenji', 'melon', 'You brought him a melon soda. He says he owes you.']],
      notice: [['kenji', 'melon']],
      bond: [['kenji', 'gift', 1, 'melon soda']],
    },
    gift_kenji_other: { remember: [['kenji', 'gift', 'You brought him a drink he didn’t open.']] },

    // ---------- evening
    emi_drops_in: {
      fact: [['emi', 'ten_years', 'Told head office B2 can keep every machine running for ten more years.']],
    },
  },
};

// sources for the `bond` steps already in the story
export const REASONS = {
  gate: {
    ohayo_guard: { source: 'greet', why: 'greeted him' },
    yoroshiku_guard: { source: 'greet', why: 'greeted him' },
    'mime_lift:guard': { source: 'scene', why: 'made him laugh with the briefcase mime' },
    'mime_lift:kuroda': { source: 'help', why: 'got him through the jammed gate' },
  },
  office: {
    yoroshiku_mori: { source: 'greet', why: 'greeted him properly' },
    copier: { source: 'ticket', why: 'fixed his copier' },
    mio_lunch_end: { source: 'scene', why: 'lunch in the machine room' },
    mori_cups: { source: 'scene', why: 'lunch in the kitchenette' },
    lunch_end: { source: 'scene', why: 'Hamada’s crackers' },
    gift_mio_coffee: { source: 'gift', why: 'black coffee' },
    gift_mori_cornsoup: { source: 'gift', why: 'corn soup' },
  },
};

// What the fast test checks at the end of day 1 (?test=fast; sim.js pushes a failure for each mismatch).
// The driver takes the first reply every time: its Eric (not the family question), lunch with Mio, the first
// lunch topic, "I don't know". It greets with おはようございます, the first word it knows. It never buys a
// drink to give, so no gifts. Per person: step, points, and remembered keys that must be there.
// `magic` opens the gate with 開けて; `social` gets the guard to help with すみません and the mime; `+mori` is lunch
// with Mori. Keyed by what happened (flags gate_magic, lunch_mori). game3d/js/bonds/day1-check.mjs plays all three.
export const EXPECT = {
  magic: {
    mio: { step: 1, pts: 3, remembers: ['held_doors', 'lunch', 'rack', 'copier'] },
    mori: { step: 1, pts: 1, remembers: ['ohayo', 'copier'] },
    kenji: { step: 1, pts: 1 },
    guard: { step: 1, pts: 1, remembers: ['greeted', 'gate_burst'] },
    kuroda: { pts: 1, remembers: ['held_doors', 'akete'] },
  },
  // the magic way, with lunch in the kitchenette
  'magic+mori': {
    mio: { step: 1, pts: 1, remembers: ['held_doors', 'copier'] },
    mori: { step: 1, pts: 3, remembers: ['ohayo', 'copier', 'lunch', 'ski_jump', 'seven_cups'] },
    kenji: { step: 1, pts: 1 },
    guard: { step: 1, pts: 1, remembers: ['greeted', 'gate_burst'] },
    kuroda: { pts: 1, remembers: ['held_doors', 'akete'] },
  },
  social: {
    mio: { step: 1, pts: 3, remembers: ['held_doors', 'lunch', 'rack', 'copier'] },
    mori: { step: 1, pts: 2, remembers: ['ohayo', 'copier'] },
    kenji: { step: 1, pts: 1 },
    guard: { step: 1, pts: 2, remembers: ['greeted', 'laughed'] },
    kuroda: { step: 1, pts: 1, remembers: ['held_doors', 'mime'] },
  },
};
