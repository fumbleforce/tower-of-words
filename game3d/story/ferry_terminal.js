// Literal story data for the runtime, voice collector and asset metadata reader.
// Every physical hook is followed by its completion/place guard.
export default {
  'speakers': {
    'ferry_staff': {
      'name': 'Room attendant',
    },
    'ferry_traveller': {
      'name': 'Traveller',
    },
    'ferry_reader': {
      'name': 'Reader',
    },
  },
  'start': 'arrive',
  'on': {
    'talk:ferry_exit': 'leave',
    'talk:ferry_staff': 'staff',
    'talk:ferry_traveller': 'traveller',
    'talk:ferry_reader': 'reader',
    'talk:ferry_window_seat': 'window_seat',
    'talk:ferry_quiet_seat': 'quiet_seat',
    'talk:ferry_landing_seat': 'landing_seat',
    'talk:ferry_notice_seat': 'notice_seat',
  },
  'nodes': {
    'arrive': [],
    'leave': [
      {
        'do': 'trip',
        'to': 'harbour',
      },
    ],
    'staff': [
      {
        'do': 'ferryActivity',
        'state': 'frame',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'if': 'ferry_staff_met',
        'then': [
          {
            'go': 'staff_repeat',
          },
        ],
      },
      {
        'do': 'ferryActivity',
        'state': 'tidy',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'say': 'ferry_staff',
        'text': 'こんにちは。どうぞ、中で休んでいってください。',
        'emo': 'polite',
        'overheard': true,
        'voice': 'ferry-staff-01',
      },
      {
        'do': 'ferryActivity',
        'state': 'seatPoint',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'say': 'eric',
        'text': 'Can I sit in here?',
        'emo': 'neutral',
      },
      {
        'do': 'ferryActivity',
        'state': 'staffSeats',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'say': 'ferry_staff',
        'text': 'はい、どうぞ。',
        'emo': 'polite',
        'overheard': true,
        'voice': 'ferry-staff-02',
      },
      {
        'set': 'ferry_staff_met',
      },
      {
        'go': 'staff_menu',
      },
    ],
    'staff_repeat': [
      {
        'say': 'ferry_staff',
        'text': 'こんにちは。どうぞ。',
        'emo': 'polite',
        'overheard': true,
        'voice': 'ferry-staff-03',
      },
      {
        'go': 'staff_menu',
      },
    ],
    'staff_menu': [
      {
        'choice': [
          {
            'text': 'Something to eat is okay?',
            'go': 'food_ask',
          },
          {
            'text': 'Thank you.',
            'go': 'staff_thanks',
          },
        ],
      },
    ],
    'staff_thanks': [
      {
        'say': 'eric',
        'text': 'Thank you.',
        'emo': 'neutral',
      },
      {
        'go': 'end',
      },
    ],
    'food_ask': [
      {
        'do': 'ferryActivity',
        'state': 'foodMime',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'say': 'eric',
        'text': 'Something to eat is okay?',
        'emo': 'neutral',
      },
      {
        'do': 'ferryActivity',
        'state': 'staffBin',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'say': 'ferry_staff',
        'text': 'ええ。ごみは、そちらにお願いします。',
        'emo': 'polite',
        'overheard': true,
        'voice': 'ferry-staff-04',
      },
      {
        'say': 'eric',
        'text': 'Okay. Thanks.',
        'emo': 'neutral',
      },
      {
        'go': 'end',
      },
    ],
    'traveller': [
      {
        'do': 'ferryActivity',
        'state': 'frame',
        'who': 'ferry_traveller',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'if': 'ferry_bag_moved',
        'then': [
          {
            'go': 'traveller_repeat',
          },
        ],
      },
      {
        'do': 'ferryActivity',
        'state': 'seatPoint',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'say': 'eric',
        'text': 'Is anyone sitting here?',
        'emo': 'neutral',
      },
      {
        'say': 'ferry_traveller',
        'text': 'あ、ごめんなさい。今どけますね。',
        'emo': 'casual',
        'overheard': true,
        'voice': 'ferry-traveller-01',
      },
      {
        'do': 'ferryActivity',
        'state': 'bag',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'say': 'ferry_traveller',
        'text': 'どうぞ。',
        'emo': 'casual',
        'overheard': true,
        'voice': 'ferry-traveller-02',
      },
      {
        'say': 'eric',
        'text': 'Thanks.',
        'emo': 'neutral',
      },
      {
        'go': 'traveller_menu',
      },
    ],
    'traveller_repeat': [
      {
        'say': 'ferry_traveller',
        'text': 'あ、どうも。そこ、空いてますよ。',
        'emo': 'casual',
        'overheard': true,
        'voice': 'ferry-traveller-03',
      },
      {
        'say': 'eric',
        'text': 'Thanks.',
        'emo': 'neutral',
      },
      {
        'go': 'traveller_menu',
      },
    ],
    'traveller_menu': [
      {
        'choice': [
          {
            'text': 'A long walk?',
            'go': 'rest',
          },
          {
            'text': 'Take the window seat.',
            'go': 'window_seat',
          },
          {
            'text': 'Leave him to rest.',
            'go': 'end',
          },
        ],
      },
    ],
    'rest': [
      {
        'say': 'eric',
        'text': 'A long walk?',
        'emo': 'neutral',
      },
      {
        'do': 'ferryActivity',
        'state': 'restKnee',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'say': 'ferry_traveller',
        'text': 'ちょっと休んでから、また歩きます。',
        'emo': 'casual',
        'overheard': true,
        'voice': 'ferry-traveller-04',
      },
      {
        'say': 'eric',
        'text': 'Take your time.',
        'emo': 'neutral',
      },
      {
        'go': 'end',
      },
    ],
    'reader': [
      {
        'do': 'ferryActivity',
        'state': 'frame',
        'who': 'ferry_reader',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'if': 'ferry_reader_met',
        'then': [
          {
            'go': 'reader_repeat',
          },
        ],
      },
      {
        'if': 'know_sumimasen',
        'then': [
          {
            'say': 'eric',
            'text': '{sumimasen}。',
            'emo': 'neutral',
          },
        ],
        'else': [
          {
            'say': 'eric',
            'text': 'Excuse me.',
            'emo': 'neutral',
          },
        ],
      },
      {
        'do': 'ferryActivity',
        'state': 'readerHello',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'say': 'ferry_reader',
        'text': 'あ、こんにちは。',
        'emo': 'calm',
        'overheard': true,
        'voice': 'ferry-reader-01',
      },
      {
        'say': 'eric',
        'text': "Sorry, I didn't mean to interrupt.",
        'emo': 'neutral',
      },
      {
        'do': 'ferryActivity',
        'state': 'window',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'say': 'ferry_reader',
        'text': 'いえいえ。船を見てただけです。',
        'emo': 'calm',
        'overheard': true,
        'voice': 'ferry-reader-02',
      },
      {
        'say': 'eric',
        'text': "Oh. That's a better view.",
        'emo': 'neutral',
      },
      {
        'set': 'ferry_reader_met',
      },
      {
        'go': 'reader_menu',
      },
    ],
    'reader_repeat': [
      {
        'do': 'ferryActivity',
        'state': 'readerHello',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'say': 'ferry_reader',
        'text': 'ここ、よく見えるんですよ。',
        'emo': 'calm',
        'overheard': true,
        'voice': 'ferry-reader-03',
      },
      {
        'say': 'eric',
        'text': "You've got a good spot.",
        'emo': 'neutral',
      },
      {
        'go': 'reader_menu',
      },
    ],
    'reader_menu': [
      {
        'do': 'ferryActivity',
        'state': 'frame',
        'who': 'ferry_reader',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'choice': [
          {
            'text': 'Mind if I sit?',
            'go': 'reader_sit',
          },
          {
            'text': "I'll let you get back to it.",
            'go': 'end',
          },
        ],
      },
    ],
    'reader_sit': [
      {
        'say': 'eric',
        'text': 'Mind if I sit?',
        'emo': 'neutral',
      },
      {
        'do': 'ferryActivity',
        'state': 'readerSeat',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'say': 'ferry_reader',
        'text': 'どうぞ。ここ、風が当たらないんです。',
        'emo': 'calm',
        'overheard': true,
        'voice': 'ferry-reader-04',
      },
      {
        'say': 'eric',
        'text': 'Good enough for me.',
        'emo': 'neutral',
      },
      {
        'go': 'quiet_seat',
      },
    ],
    'window_seat': [
      {
        'if': '!ferry_bag_moved',
        'then': [
          {
            'go': 'traveller',
          },
        ],
      },
      {
        'do': 'ferryActivity',
        'state': 'sit',
        'seat': 'ferry_window_seat',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'go': 'seat_menu',
      },
    ],
    'quiet_seat': [
      {
        'do': 'ferryActivity',
        'state': 'sit',
        'seat': 'ferry_quiet_seat',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'go': 'seat_menu',
      },
    ],
    'seat_menu': [
      {
        'do': 'ferryActivity',
        'state': 'foodSync',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'choice': [
          {
            'if': 'ferry_has_milk',
            'text': 'Drink milk carton.',
            'go': 'food_milk',
          },
          {
            'if': 'ferry_has_riceball',
            'text': 'Eat salted rice ball.',
            'go': 'food_riceball',
          },
          {
            'if': 'ferry_has_curry_bread',
            'text': 'Eat curry bread.',
            'go': 'food_curry_bread',
          },
          {
            'if': 'ferry_has_butter_roll',
            'text': 'Eat butter roll.',
            'go': 'food_butter_roll',
          },
          {
            'if': 'ferry_has_coffee',
            'text': 'Drink canned coffee.',
            'go': 'food_coffee',
          },
          {
            'if': 'ferry_has_tea',
            'text': 'Drink royal milk tea.',
            'go': 'food_tea',
          },
          {
            'if': 'ferry_has_melon',
            'text': 'Drink melon soda.',
            'go': 'food_melon',
          },
          {
            'if': 'ferry_has_cornsoup',
            'text': 'Drink hot corn soup.',
            'go': 'food_cornsoup',
          },
          {
            'text': 'Sit for a while.',
            'go': 'end',
          },
          {
            'text': 'Get up.',
            'go': 'stand',
          },
        ],
      },
    ],
    'food_milk': [
      {
        'do': 'ferryActivity',
        'state': 'prepareFood',
        'item': 'milk',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'go': 'eat_prepared',
      },
    ],
    'food_riceball': [
      {
        'do': 'ferryActivity',
        'state': 'prepareFood',
        'item': 'riceball',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'go': 'eat_prepared',
      },
    ],
    'food_curry_bread': [
      {
        'do': 'ferryActivity',
        'state': 'prepareFood',
        'item': 'curry_bread',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'go': 'eat_prepared',
      },
    ],
    'food_butter_roll': [
      {
        'do': 'ferryActivity',
        'state': 'prepareFood',
        'item': 'butter_roll',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'go': 'eat_prepared',
      },
    ],
    'food_coffee': [
      {
        'do': 'ferryActivity',
        'state': 'prepareFood',
        'item': 'coffee',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'go': 'eat_prepared',
      },
    ],
    'food_tea': [
      {
        'do': 'ferryActivity',
        'state': 'prepareFood',
        'item': 'tea',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'go': 'eat_prepared',
      },
    ],
    'food_melon': [
      {
        'do': 'ferryActivity',
        'state': 'prepareFood',
        'item': 'melon',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'go': 'eat_prepared',
      },
    ],
    'food_cornsoup': [
      {
        'do': 'ferryActivity',
        'state': 'prepareFood',
        'item': 'cornsoup',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'go': 'eat_prepared',
      },
    ],
    'eat_prepared': [
      {
        'do': 'ferryActivity',
        'state': 'consume',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'go': 'seat_menu',
      },
    ],
    'stand': [
      {
        'do': 'stand',
        'who': 'eric',
      },
      {
        'go': 'end',
      },
    ],
    'end': [
      {
        'do': 'ferryActivity',
        'state': 'end',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
    ],
    'landing_seat': [
      {
        'do': 'ferryActivity',
        'state': 'sit',
        'seat': 'ferry_landing_seat',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'go': 'seat_menu',
      },
    ],
    'notice_seat': [
      {
        'do': 'ferryActivity',
        'state': 'sit',
        'seat': 'ferry_notice_seat',
      },
      {
        'if': "!ferry_action_complete || place != 'ferry_terminal'",
        'then': [
          {
            'end': true,
          },
        ],
      },
      {
        'go': 'seat_menu',
      },
    ],
  },
};
