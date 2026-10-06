import { direction, sayFallbacks, fallbackNodes } from './shared.js';
export default {
  start: 'd2_izakaya_arrive',
  on: {
    'talk:izakaya_exit': 'd2_exit_izakaya', 'zone:izakaya_exit': 'd2_exit_izakaya',
    'talk:party_seat': [{ if: '!d2_ate', node: 'd2_supper' }, { if: '!d2_party_done', node: 'd2_seat_menu' }, 'd2_empty_bench'],
    'talk:mio': [{ if: 'd2_ate', node: 'd2_mio_party' }, 'd2_mio_wait'],
    'talk:kenji': [{ if: 'd2_ate', node: 'd2_kenji_party' }, 'd2_kenji_wait'],
    'talk:mori': [{ if: 'd2_party_done && !d2_mori_rest_seen', node: 'd2_mori_rest' }, { if: 'd2_party_done', node: 'd2_mori_rest_again' }, { if: 'd2_ate', node: 'd2_mori_party' }, 'd2_mori_wait'],
    'talk:emi': 'd2_emi_party',
    ...sayFallbacks,
    'say:tabetai:kenji': 'd2_more_food', 'say:nomitai:kenji': 'd2_more_drink',
    'say:ikitai:mori': 'd2_mori_go_reply', 'say:mitai:mori': 'd2_mori_see_reply',
    'say:oishii:mori': 'd2_food_reply',
  },
  goal: { party_seat: '!d2_party_done', izakaya_exit: 'd2_party_done' },
  nodes: {
    d2_izakaya_arrive: [
      { do: 'partySetup' },
      { if: '!d2_ate', then: [{ do: 'goal', text: 'Join your colleagues at the table.', at: 'party_seat' }], else: [
        { if: '!d2_party_done', then: [{ do: 'goal', text: 'Talk with your colleagues, or say goodnight at your seat.', at: 'party_seat' }], else: direction('izakaya_exit','izakaya_exit','izakaya_exit','izakaya_exit') },
      ] },
    ],
    d2_exit_izakaya: [{ do: 'stand', who: 'eric' }, { do: 'trip', to: 'shotengai' }],
    d2_food_reply: [{ say: 'mori', overheard: true, emo: 'warm', text: 'よかった。もう少しどうですか。' }, { do: 'partyFood', state: 'offerMore' }],
    d2_emi_party: [
      { choice: [
        { text: 'Do you get much time down on B2?', go: 'd2_emi_department' },
        { text: 'What would you order here?', go: 'd2_emi_food' },
        { text: 'Let her finish eating.', go: 'd2_party_free' },
      ] },
    ],
    d2_emi_department: [
      { say: 'emi', emo: 'casual', text: 'Less than I’d like. I come down to ask for something, and then I’m off upstairs again.' },
      { say: 'mio', emo: 'dry', text: 'You could come down when you don’t need something.' },
      { say: 'emi', emo: 'sheepish', text: 'I know. I keep meaning to. Could we have lunch next week?' },
      { go: 'd2_party_free' },
    ],
    d2_emi_food: [
      { say: 'emi', emo: 'warm', text: 'The grilled vegetables. Mori orders them every time, and then spends dinner giving them to everyone else.' },
      { do: 'partyFood', state: 'offerMore', food: 'vegetables' }, { go: 'd2_party_free' },
    ],
    d2_supper: [
      { set: 'd2_met_kenji' }, { do: 'partySetup', state: 'gather' },
      { say: 'mori', overheard: true, emo: 'warm', text: 'お疲れさまです。どうぞ、座ってください。' },
      { do: 'sit', who: 'eric', at: 'party_seat' }, { do: 'cam', on: 'party_group', zoom: 1.2 },
      { if: 'lunch_mio', then: [{ say: 'mio', emo: 'casual', text: 'Hey. I left that end for you.' }],
        else: [{ say: 'mio', emo: 'dry', text: 'You found us, then. There’s room at the end.' }] },
      { say: 'emi', emo: 'bright', text: 'I made it. Sorry, I had to wait for someone to stop talking.' },
      { say: 'kenji', emo: 'bright', text: 'You like chicken? Mori-san ordered vegetables also.' },
      { do: 'partyFood', state: 'open' },
      { say: 'mori', overheard: true, emo: 'sheepish', text: '少し多かったですかね。' },
      { say: 'mio', emo: 'dry', text: 'He’s asking if he ordered too much. We haven’t even started yet.' },
      { say: 'emi', emo: 'warm', text: 'Before he eats everything, shall we welcome you properly? {kanpai}!' },
      { choice: [
        { text: 'Try the toast in Japanese.', go: 'd2_toast_word', if: '!know_kanpai' },
        { text: 'Raise your glass with them.', go: 'd2_toast' },
      ] },
    ],
    d2_toast_word: [
      { say: 'emi', emo: 'slow', slow: true, text: '{kanpai}.' },
      { do: 'type', word: 'kanpai', from: 'emi', prompt: 'Raise your glass with the others: “Cheers.”' },
      { go: 'd2_toast' },
    ],
    d2_toast: [
      { do: 'partyFood', state: 'toast' },
      { say: 'kenji', emo: 'bright', text: '{kanpai}!' },
      { say: 'kenji', emo: 'bright', text: '{tabetai}!' },
      { say: 'kenji', emo: 'slow', slow: true, text: '{tabetai}...' },
      { say: 'kenji', emo: 'bright', text: 'Is “want eat”. Me, yes!' },
      { say: 'mori', overheard: true, emo: 'warm', text: '{mc.called.mori}は、どちらがいいですか。' },
      { say: 'mio', emo: 'casual', text: 'The chicken or the vegetables? Take whichever you like.' },
      { choice: [
        { text: 'I’d like a chicken skewer.', set: { d2_food: 'yakitori' }, go: 'd2_take_food' },
        { text: 'The grilled vegetables, please.', set: { d2_food: 'vegetables' }, go: 'd2_take_food' },
      ] },
    ],
    d2_take_food: [
      { if: "d2_food == 'yakitori'", then: [
        { do: 'type', word: 'tabetai', from: 'kenji', prompt: 'Say “I want to eat” as you take a chicken skewer.' },
      ], else: [
        { do: 'type', word: 'tabetai', from: 'kenji', prompt: 'Say “I want to eat” as you take some grilled vegetables.' },
      ] },
      { if: "d2_food == 'yakitori'", then: [{ do: 'partyFood', state: 'take', food: 'yakitori' }],
        else: [{ do: 'partyFood', state: 'take', food: 'vegetables' }] },
      { set: 'd2_ate' },
      { go: 'd2_topic' },
    ],
    d2_compliment: [
      { say: 'eric', emo: 'warm', text: 'This is good. Thank you for doing all this.' },
      { say: 'mio', emo: 'casual', text: '{oishii}. He’ll understand that. Means it tastes good.' },
      { say: 'mio', emo: 'slow', slow: true, text: '{oishii}.' },
      { do: 'type', word: 'oishii', from: 'mio', prompt: 'Tell Mori you’re enjoying the food.' },
      { say: 'mori', overheard: true, emo: 'warm', text: 'よかったです。まだありますから、どうぞ。' },
      { go: 'd2_party_free' },
    ],
    d2_topic: [{ choice: [
      { text: 'What do you do here after work?', go: 'd2_after_work' },
      { text: 'Have you ever been to Norway, Mori-san?', go: 'd2_norway', if: '!lunch_mori' },
      { text: 'You said you went to Lillehammer, didn’t you?', go: 'd2_norway', if: 'lunch_mori' },
      { text: 'Eat and listen for a while.', go: 'd2_quiet' },
    ] }],
    d2_after_work: [
      { say: 'mio', emo: 'casual', text: 'I was going to do washing tonight. I can do it tomorrow also.' },
      { say: 'kenji', emo: 'bright', text: 'Me, computer game. You play?' },
      { say: 'eric', emo: 'tired', text: 'I should probably finish unpacking first.' },
      { say: 'mio', emo: 'dry', text: 'There’s still a box under my lamp. I’ve sort of stopped noticing it.' },
      { go: 'd2_party_free' },
    ],
    d2_norway: [
      { set: 'd2_norway_talked' },
      { if: 'lunch_mori', then: [
        { say: 'mori', overheard: true, emo: 'warm', text: 'はい。写真がどこにあるか、探さないと。' },
        { say: 'emi', emo: 'warm', text: 'He’s going to find the photos for you.' },
      ], else: [
        { say: 'mori', overheard: true, emo: 'warm', text: 'はい。1994年にリレハンメルへ行きました。' },
        { say: 'emi', emo: 'warm', text: 'Lillehammer, in 1994. He’s got photos somewhere.' },
      ] },
      { if: 'lunch_mori', then: [{ say: 'eric', emo: 'warm', text: 'You’ll have to show me. I only know the ski jump from television.' }],
        else: [{ say: 'eric', emo: 'curious', text: 'What did you think of it?' }] },
      { say: 'mori', overheard: true, emo: 'fond', text: '寒かったですが、また行きたいですね。' },
      { say: 'emi', emo: 'warm', text: 'He wants to go again, even after that cold. Would summer be better?' },
      { say: 'eric', emo: 'warm', text: 'For walking around, definitely. You can stay out much longer.' },
      { go: 'd2_party_free' },
    ],
    d2_quiet: [
      { do: 'partyFood', state: 'sharePickles' },
      
      { say: 'kenji', emo: 'bright', text: 'Tomorrow, new game. Very big download. Tonight, I start. Maybe Monday, finish.' },
      { go: 'd2_party_free' },
    ],
    d2_party_free: [
      { do: 'cam', back: true },
      { do: 'goal', text: 'Stay a while, or choose “Head home” at your seat.', at: 'party_seat' }, { do: 'save' },
    ],
    d2_seat_menu: [{ choice: [
      { text: 'Stay a little longer.', go: 'd2_stay' },
      { text: 'Thank everyone and head home.', go: 'd2_goodnight' },
    ] }],
    d2_stay: [{ do: 'sit', who: 'eric', at: 'party_seat' }],
    d2_goodnight: [
      { say: 'eric', emo: 'warm', text: 'I’m going to head back. Thank you for tonight.' },
      { say: 'mori', overheard: true, emo: 'warm', text: '気をつけて。おやすみなさい。' },
      { say: 'mio', emo: 'tired', text: 'Night. I think my washing can wait until tomorrow also.' },
      { say: 'kenji', emo: 'bright', text: 'Yes! See you Monday, {mc.name}. Computer game also, maybe?' },
      { do: 'stand', who: 'eric' }, { set: 'd2_party_done' }, { set: 'going_home' },
      { do: 'partySetup', state: 'pack' },
      { do: 'goal', text: 'Head home when you’re ready. Your room is 203.', at: 'izakaya_exit' }, { do: 'save' },
    ],
    d2_kenji_party: [{ choice: [
      { text: 'How do I say I want a drink?', go: 'd2_drink_word', if: '!know_nomitai' },
      { text: 'I’d like a drink.', go: 'd2_more_drink', if: 'know_nomitai' },
      { text: 'I’m all right, thanks.', go: 'd2_no_drink' },
    ] }],
    d2_drink_word: [
      { say: 'kenji', emo: 'bright', text: '{nomitai}. Want drink. Same “tai”!' },
      { say: 'kenji', emo: 'slow', slow: true, text: '{nomitai}...' },
      { do: 'type', word: 'nomitai', from: 'kenji', prompt: 'Kenji has the tea ready. Say “I want to drink” as you take your cup.' },
      { do: 'partyFood', state: 'drink', drink: 'tea' }, { go: 'd2_party_free' },
    ],
    d2_no_drink: [{ say: 'kenji', emo: 'bright', text: 'Okay. Tea is here, if you want.' }],
    d2_more_drink: [
      { if: 'd2_ate && !d2_party_done', then: [
        { say: 'kenji', emo: 'bright', text: 'Yes! Here.' }, { do: 'partyFood', state: 'drink', drink: 'tea' },
      ], else: [{ go: 'd2_drink_away' }] },
    ],
    d2_more_food: [
      { if: 'd2_ate && !d2_party_done', then: [{ do: 'partyFood', state: 'offerMore' }],
        else: [{ go: 'd2_food_away' }] },
    ],
    d2_mio_party: [
      { if: '!d2_mio_party_seen', then: [
        { if: 'd2_mio_saw_test', then: [
          { say: 'mio', emo: 'low', text: 'I keep thinking about those doors. They stopped as soon as you said it.' },
        ], else: [
          { say: 'eric', emo: 'low', text: 'There was something I left out of the report. I tried speaking to the doors again.' },
          { say: 'mio', emo: 'quiet', text: 'And? Did anything happen?' },
          { say: 'eric', emo: 'low', text: 'They stayed open. The test worked normally until I spoke.' },
          { say: 'mio', emo: 'quiet', text: 'I wish you’d waited for me.' },
        ] },
        { say: 'eric', emo: 'hesitant', text: 'I don’t really know how to explain it yet.' },
        { say: 'mio', emo: 'casual', text: 'Okay. You can tell me when you do. Pass the vegetables?' },
        { do: 'partyFood', state: 'passVegetables' }, { set: 'd2_mio_party_seen' },
      ], else: [{ say: 'mio', emo: 'casual', text: 'I’m taking these pickles home if nobody eats them.' }] },
    ],
    d2_mori_party: [{ choice: [
      { text: 'Tell him you’re enjoying the food.', go: 'd2_compliment', if: '!know_oishii' },
      { text: '{oishii}. The food is lovely.', go: 'd2_food_reply', if: 'know_oishii' },
      { text: 'Ask about his trip to Norway.', go: 'd2_norway' },
      { text: 'Let him eat.', go: 'd2_party_free' },
    ] }],
    d2_kenji_wait: [{ say: 'kenji', emo: 'bright', text: 'Food is there. This way!' }],
    d2_mio_wait: [{ say: 'mio', emo: 'tired', text: 'There’s a seat beside me, if you’re staying.'  }],
    d2_mori_wait: [{ say: 'mori', overheard: true, emo: 'warm', text: 'こちらへどうぞ。' }],
    d2_mori_rest: [
      { do: 'cam', on: 'mori', zoom: 1.2 },
      { do: 'partyFood', state: 'packLeftovers' },
      { say: 'eric', emo: 'warm', text: 'Did we leave you with all the clearing up?' },
      { say: 'mori', overheard: true, emo: 'warm', text: 'いいえ。残りは持って帰ります。' },
      { say: 'emi', emo: 'casual', text: 'He’s taking the leftovers home. I said I’d help with the bags.' },
      { say: 'mori', overheard: true, emo: 'warm', text: 'ありがとうございます。写真も持ってきますね。リレハンメルの。' },
      { say: 'emi', emo: 'warm', text: 'He says he’ll bring his photos from Norway. You might need to clear a bit of your desk.' },
      { if: '!lunch_mori && !d2_norway_talked', then: [
        { say: 'mori', overheard: true, emo: 'fond', text: '1994年に行ったんです。また行きたいですね。' },
      ], else: [{ say: 'mori', overheard: true, emo: 'fond', text: 'また行きたいですね。今度は夏に。' }] },
      { say: 'emi', emo: 'warm', text: 'He’d like to go back. I told him you might have some suggestions.' },
      { set: 'd2_mori_rest_seen' },
      { choice: [
        { text: 'How do you say “I want to go”?', go: 'd2_go_word', if: '!know_ikitai' },
        { text: 'I’ll look forward to seeing the photos.', go: 'd2_mori_rest_end' },
      ] },
    ],
    d2_go_word: [
      { say: 'mori', overheard: true, emo: 'warm', text: '{ikitai}。' },
      { say: 'mori', emo: 'slow', slow: true, text: '{ikitai}。' },
      { do: 'type', word: 'ikitai', from: 'mori', prompt: 'Mori wants to go back to Norway. Try “I want to go”.' },
      { say: 'eric', emo: 'warm', text: 'I’d like to see more of Japan first.' },
      { say: 'mori', overheard: true, emo: 'warm', text: 'ええ、ぜひ。' },
      { go: 'd2_mori_rest_end' },
    ],
    d2_mori_rest_end: [{ do: 'cam', back: true }],
    d2_leftovers: [
      { say: 'mori', overheard: true, emo: 'warm', text: 'まだありますよ。どうぞ。' },
      { do: 'partyFood', state: 'leftovers' },
    ],
    d2_mori_drink: [{ say: 'mori', overheard: true, emo: 'polite', text: 'お茶は終わってしまいました。寮の前に自動販売機がありますよ。' }],
    d2_mori_rest_idle: [{ say: 'mori', overheard: true, emo: 'warm', text: 'もう少ししたら、帰ります。' }],
    d2_mori_rest_again: [
      { say: 'mori', overheard: true, emo: 'warm', text: 'もう少ししたら、帰ります。' },
      { if: '!know_ikitai', then: [{ choice: [
        { text: 'How did you say “I want to go” earlier?', go: 'd2_go_word' },
        { text: 'Goodnight, Mori-san.', go: 'd2_mori_rest_end' },
      ] }] },
    ],
    d2_mori_go_reply: [{ say: 'mori', overheard: true, emo: 'warm', text: 'どこへ行きたいですか。' }, { say: 'emi', emo: 'casual', text: 'Where would you like to go?' }, { say: 'eric', emo: 'warm', text: 'I haven’t decided yet. I’m still finding my way round here.' }],
    d2_mori_see_reply: [
      { if: 'd2_norway_talked || d2_mori_rest_seen || lunch_mori', then: [{ say: 'mori', overheard: true, emo: 'warm', text: '写真ですね。月曜日に持ってきます。' }],
        else: [{ say: 'mori', overheard: true, emo: 'warm', text: '何が見たいですか。' }, { say: 'emi', emo: 'casual', text: 'What would you like to see?' }, { say: 'eric', emo: 'warm', text: 'A bit more of the island. I’ve barely been outside work.' }] },
    ],
    d2_empty_bench: [{ say: 'eric', emo: 'tired', text: 'They’ve kept the table for us.' }],
    ...fallbackNodes,
  },
};
