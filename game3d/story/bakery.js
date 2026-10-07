export default {
  speakers: { bakery_clerk: { name: 'Bakery clerk' } },
  start: 'arrive',
  on: {
    'talk:bakery_exit': 'leave', 'talk:bread_rack': 'choose',
    'talk:bakery_clerk': [ { if: "bakery_phase == 'paid'", node: 'paid' }, { if: "bakery_phase == 'selected'", node: 'checkout' }, { node: 'clerk' } ],
    'talk:bakery_seat': 'window',
  },
  nodes: {
    arrive: [{ set: 'bakery_visited' }],
    leave: [{ do: 'trip', to: 'shotengai' }],
    clerk: [
      { do: 'bakeryShop', state: 'frame' }, { if: "!bakery_action_complete || place != 'bakery'", then: [{ end: true }] },
      { do: 'gesture', who: 'bakery_clerk', kind: 'point', to: 'bread_rack' },
      { say: 'bakery_clerk', overheard: true, emo: 'polite', voice: 'bakery-welcome', text: 'いらっしゃいませ。トレーはこちらです。' },
      { choice: [{ text: 'Choose some bread.', go: 'choose' }, { text: 'Point to the window seat.', go: 'seat_ask' }, { text: 'Keep looking.', go: 'end' }] },
    ],
    choose: [{ choice: [
      { text: 'Take a curry bread. ¥180', go: 'curry' },
      { text: 'Take a butter roll. ¥120', go: 'roll' },
      { text: 'Leave the bread.', go: 'end' },
    ] }],
    curry: [{ do: 'bakeryShop', state: 'select', item: 'curry_bread' }, { if: "!bakery_action_complete || place != 'bakery'", then: [{ end: true }] }, { go: 'checkout' }],
    roll: [{ do: 'bakeryShop', state: 'select', item: 'butter_roll' }, { if: "!bakery_action_complete || place != 'bakery'", then: [{ end: true }] }, { go: 'checkout' }],
    checkout: [
      { do: 'bakeryShop', state: 'frame' }, { if: "!bakery_action_complete || place != 'bakery'", then: [{ end: true }] },
      { if: "bakery_item == 'curry_bread'", then: [{ say: 'bakery_clerk', overheard: true, emo: 'polite', voice: 'bakery-curry', text: 'カレーパン、お一つですね。百八十円です。' }], else: [{ say: 'bakery_clerk', overheard: true, emo: 'polite', voice: 'bakery-roll', text: 'バターロール、お一つですね。百二十円です。' }] },
      { choice: [
        { if: "bakery_item == 'curry_bread'", text: 'Pay ¥180.', go: 'pay' },
        { if: "bakery_item == 'butter_roll'", text: 'Pay ¥120.', go: 'pay' },
        { text: 'Put the bread back.', go: 'cancel' },
      ] },
    ],
    pay: [
      { do: 'bakeryShop', state: 'pay' }, { if: "!bakery_action_complete || place != 'bakery'", then: [{ end: true }] },
      { if: 'bakery_cant_pay', then: ['> You don’t have enough yen.', { go: 'cancel' }] },
      { say: 'bakery_clerk', overheard: true, emo: 'warm', voice: 'bakery-thanks', text: 'ありがとうございます。' },
      { go: 'paid' },
    ],
    paid: [
      { choice: [{ text: 'Take the bag.', go: 'take' }, { text: 'Eat at the window.', go: 'eat_now' }] },
    ],
    take: [{ do: 'bakeryShop', state: 'take' }, { if: "!bakery_action_complete || place != 'bakery'", then: [{ end: true }] }, { go: 'end' }],
    eat_now: [{ do: 'bakeryShop', state: 'take' }, { if: "!bakery_action_complete || place != 'bakery'", then: [{ end: true }] }, { do: 'bakeryShop', state: 'prepareEat' }, { if: "!bakery_action_complete || place != 'bakery'", then: [{ end: true }] }, { go: 'eat' }],
    cancel: [{ do: 'bakeryShop', state: 'cancel' }, { if: "!bakery_action_complete || place != 'bakery'", then: [{ end: true }] }, { go: 'end' }],
    seat_ask: [
      { do: 'gesture', who: 'eric', kind: 'point', to: 'window' },
      { do: 'gesture', who: 'bakery_clerk', kind: 'point', to: 'window' },
      { say: 'bakery_clerk', overheard: true, emo: 'polite', voice: 'bakery-seat', text: 'はい、そちらでどうぞ。' },
      { go: 'window' },
    ],
    window: [{ do: 'bakeryShop', state: 'sit' }, { if: "!bakery_action_complete || place != 'bakery'", then: [{ end: true }] }, { choice: [
      { if: 'bakery_has_curry', text: 'Eat a curry bread.', go: 'eat_curry' },
      { if: 'bakery_has_roll', text: 'Eat a butter roll.', go: 'eat_roll' },
      { text: 'Sit for a while.', go: 'end' },
      { text: 'Get up.', go: 'stand' },
    ] }],
    eat_curry: [{ do: 'bakeryShop', state: 'prepareEat', item: 'curry_bread' }, { if: "!bakery_action_complete || place != 'bakery'", then: [{ end: true }] }, { go: 'eat' }],
    eat_roll: [{ do: 'bakeryShop', state: 'prepareEat', item: 'butter_roll' }, { if: "!bakery_action_complete || place != 'bakery'", then: [{ end: true }] }, { go: 'eat' }],
    eat: [{ do: 'bakeryShop', state: 'eat' }, { if: "!bakery_action_complete || place != 'bakery'", then: [{ end: true }] }, { go: 'end' }],
    stand: [{ do: 'stand', who: 'eric' }, { go: 'end' }],
    end: [{ do: 'bakeryShop', state: 'end' }, { if: "!bakery_action_complete || place != 'bakery'", then: [{ end: true }] }],
  },
};
