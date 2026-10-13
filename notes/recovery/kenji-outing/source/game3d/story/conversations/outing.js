import { KONBINI_OPEN } from '../../js/gameplay/shop-hours.js';

const kenji = (text, emo = 'casual') => ({ say: 'kenji', overheard: true, emo, text });
const player = (text, emo = 'warm') => ({ say: 'eric', emo, text });
const action = (state) => ({ do: 'outing', state });
const release = [{ do: 'cam', back: true }, { do: 'save' }];
const failed = (retry, label) => [
  {
    if: '!outing_action_complete',
    then: [
      {
        choice: [
          { text: label, go: retry },
          { text: 'Keep walking together.', go: 'outing_keep_walking' },
        ],
      },
    ],
  },
];

// Optional companion conversation. The controller alone records physically completed stops.
export default {
  on: { 'ask:kenji': 'outing_chat' },
  nodes: {
    outing_chat: [
      { do: 'cam', on: 'kenji', zoom: 1.3, conversation: 'kenji' },
      { if: 'outing_active', then: [{ go: 'outing_controls' }] },
      {
        choice: [
          { text: 'Invite Kenji for a walk.', if: '!outing_paused', go: 'outing_invite' },
          {
            text: 'Try “I’d like to go together.”',
            if: '!outing_paused && know_ikitai && know_isshoni',
            go: 'outing_invite_words',
          },
          { text: 'Continue our walk.', if: 'outing_paused', go: 'outing_resume' },
          {
            text: 'Ask about stopping at the game centre.',
            if: "outing_callback == 'arcade'",
            go: 'outing_recall_arcade',
          },
          { text: 'Mention the drink stop.', if: "outing_callback == 'drink'", go: 'outing_recall_drink' },
          {
            text: 'Tell him you liked the seafront stop.',
            if: "outing_callback == 'coast'",
            go: 'outing_recall_coast',
          },
          { text: 'Talk about the arcade.', go: 'conversation_kenji' },
          { text: 'Maybe another time.', go: 'outing_leave_chat' },
        ],
      },
    ],
    outing_invite: [player('Want to come for a walk?'), { go: 'outing_accept' }],
    outing_invite_words: [
      player('{isshoni}……{ikitai}。', 'hesitant'),
      action('invite'),
      { if: '!outing_action_complete', then: [{ go: 'outing_busy' }] },
      kenji('うん、{isshoni}行こう。', 'warm'),
      { go: 'outing_choose_route' },
    ],
    outing_accept: [
      action('invite'),
      { if: '!outing_action_complete', then: [{ go: 'outing_busy' }] },
      kenji('うん、行こう。どっち？', 'bright'),
      { go: 'outing_choose_route' },
    ],
    outing_resume: [
      player('Want to carry on with our walk?'),
      action('resume'),
      { if: '!outing_action_complete', then: [{ go: 'outing_busy' }] },
      kenji('うん、行こう。', 'warm'),
      { go: 'outing_choose_route' },
    ],
    outing_busy: [
      kenji('ごめん、今はちょっと。またあとで。', 'sheepish'),
      player("Okay, I'll ask you later."),
      ...release,
    ],
    outing_choose_route: [
      { do: 'gesture', who: 'kenji', kind: 'nod', to: 'eric' },
      {
        choice: [
          { text: 'Walk to the shop street together.', go: 'outing_route_shop' },
          { text: 'Walk to the seafront together.', go: 'outing_route_coast' },
          { text: 'Actually, another time.', go: 'outing_defer' },
        ],
      },
    ],
    outing_controls: [
      { if: 'outing_seated', then: [{ go: 'outing_bench_controls' }] },
      { if: 'outing_waiting', then: [{ go: 'outing_wait_controls' }] },
      {
        choice: [
          { text: 'Stop by the game centre together.', if: "place == 'shotengai'", go: 'outing_arcade' },
          { text: 'Buy a drink at the convenience store.', if: "place == 'shotengai'", go: 'outing_drink' },
          { text: 'Sit on the seafront bench with Kenji.', if: "place == 'east_coast'", go: 'outing_coast' },
          { text: 'Head to the shop street.', if: "place != 'shotengai'", go: 'outing_route_shop' },
          { text: 'Head to the seafront.', if: "place != 'east_coast'", go: 'outing_route_coast' },
          { text: 'Talk about the arcade.', go: 'conversation_kenji' },
          { text: 'Keep walking together.', go: 'outing_keep_walking' },
          { text: "Let's split up here.", go: 'outing_part' },
        ],
      },
    ],
    outing_route_shop: [
      action('keepWalking'),
      { do: 'outing', state: 'goal', text: 'Walk with Kenji to the shop street. Chat with him to choose a stop.' },
      ...release,
    ],
    outing_route_coast: [
      action('keepWalking'),
      { do: 'outing', state: 'goal', text: 'Walk with Kenji to the seafront bench. Chat with him to choose a stop.' },
      ...release,
    ],
    outing_keep_walking: [
      action('keepWalking'),
      { do: 'outing', state: 'goal', text: 'Walk with Kenji. Chat with him to stop or say goodbye.' },
      ...release,
    ],
    outing_arcade: [
      { do: 'cam', back: true },
      { set: { outing_arcade_repeat: false } },
      { if: 'outing_done_arcade', then: [{ set: 'outing_arcade_repeat' }] },
      action('arcade'),
      ...failed('outing_arcade', 'Try the game centre again.'),
      { do: 'cam', on: 'kenji', zoom: 1.2, conversation: 'kenji' },
      {
        if: 'outing_arcade_repeat',
        then: [kenji('もう少し見る？'), { go: 'outing_shop_controls' }],
      },
      { do: 'gesture', who: 'kenji', kind: 'point', to: 'game_centre' },
      {
        if: 'kenji_arcade_talked',
        then: [
          kenji('あ、ここ。前に話したゲームセンター。', 'bright'),
          player('The crane game you were telling me about?', 'amused'),
          { do: 'gesture', who: 'kenji', kind: 'nod', to: 'game_centre' },
        ],
        else: [kenji('あ、ゲームセンター。ちょっと見ていい？', 'bright'), player("Sure. I'll have a look too.")],
      },
      { do: 'face', who: 'kenji', to: 'game_centre' },
      { go: 'outing_shop_controls' },
    ],
    outing_shop_controls: [
      {
        choice: [
          { text: 'Stay here a little longer.', go: 'outing_stay_arcade' },
          { text: 'Buy a drink at the convenience store.', go: 'outing_drink' },
          { text: 'Head to the seafront.', go: 'outing_route_coast' },
          { text: 'Keep walking together.', go: 'outing_keep_walking' },
          { text: "Let's split up here.", go: 'outing_part' },
        ],
      },
    ],
    outing_stay_arcade: [
      { do: 'outing', state: 'goal', text: 'Look around with Kenji. Chat with him when you want to move on.' },
      ...release,
    ],
    outing_drink: [
      {
        if: `!(${KONBINI_OPEN})`,
        then: [
          { do: 'cam', on: 'store', zoom: 1.2 },
          player("It's closed. Let's keep going.", 'casual'),
          { go: 'outing_keep_walking' },
        ],
      },
      player("I'm going to get a drink.", 'casual'),
      { do: 'gesture', who: 'eric', kind: 'point', to: 'store' },
      { do: 'cam', back: true },
      action('drink'),
      ...failed('outing_drink', 'Try waiting at the store again.'),
      kenji('うん。ここで待ってるね。'),
      {
        do: 'outing',
        state: 'goal',
        text: 'Kenji is waiting outside the convenience store. Return here when you are ready.',
      },
      ...release,
    ],
    outing_wait_controls: [
      {
        choice: [
          { text: "I'll head into the convenience store.", go: 'outing_enter_store' },
          { text: 'Keep walking together.', go: 'outing_keep_walking' },
          { text: "Let's split up here.", go: 'outing_part' },
        ],
      },
    ],
    outing_enter_store: [
      { do: 'outing', state: 'goal', text: 'Enter the convenience store. Kenji is waiting outside.' },
      ...release,
    ],
    outing_coast: [
      { do: 'cam', back: true },
      { set: { outing_coast_repeat: false } },
      { if: 'outing_done_coast', then: [{ set: 'outing_coast_repeat' }] },
      action('coast'),
      {
        if: '!outing_action_complete',
        then: [player("We can't sit here together. Let's keep walking.", 'casual'), { go: 'outing_keep_walking' }],
      },
      { do: 'cam', on: 'kenji', zoom: 1.2, conversation: 'kenji' },
      { if: '!outing_coast_repeat', then: [kenji('あー、ちょっと休もう。')] },
      { do: 'outing', state: 'goal', text: 'Sit with Kenji. Chat with him when you want to get up.' },
      { go: 'outing_bench_controls' },
    ],
    outing_bench_controls: [
      { do: 'cam', on: 'kenji', zoom: 1.2, conversation: 'kenji' },
      {
        choice: [
          { text: 'Stay on the bench a little longer.', go: 'outing_leave_chat' },
          { text: 'Get up and keep walking.', go: 'outing_stand' },
          { text: 'I should get going.', go: 'outing_part' },
        ],
      },
    ],
    outing_stand: [
      player('Shall we keep going?', 'casual'),
      kenji('うん、行こう。', 'warm'),
      { go: 'outing_keep_walking' },
    ],
    outing_part: [
      player('I should get going. See you later.'),
      kenji('うん、またね。', 'warm'),
      { do: 'cam', back: true },
      { go: 'outing_finish' },
    ],
    outing_finish: [
      action('finish'),
      ...failed('outing_finish', 'Let Kenji try to leave again.'),
      { do: 'outing', state: 'goal', text: '' },
      { do: 'save' },
    ],
    outing_defer: [kenji('うん、またあとで。'), action('pause'), { do: 'outing', state: 'goal', text: '' }, ...release],
    outing_recall_arcade: [
      player('Did you want to go into the game centre when we stopped there?'),
      kenji('うん。でも、見てるだけでも面白いよ。', 'warm'),
      { do: 'gesture', who: 'kenji', kind: 'shrug' },
      ...release,
    ],
    outing_recall_drink: [
      player('Thanks for waiting while I got my drink.'),
      kenji('うん。また行こうよ。', 'warm'),
      { do: 'gesture', who: 'kenji', kind: 'nod', to: 'eric' },
      ...release,
    ],
    outing_recall_coast: [
      player('I liked stopping at that bench with you.'),
      kenji('うん。またあそこに座ろうよ。', 'warm'),
      { do: 'gesture', who: 'kenji', kind: 'nod', to: 'eric' },
      ...release,
    ],
    outing_leave_chat: [...release],
  },
};
