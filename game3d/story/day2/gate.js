import { direction, sayFallbacks, fallbackNodes } from './shared.js';
export default {
  start: 'd2_gate',
  on: {
    'talk:guard': 'd2_guard', 'idle:guard': 'd2_guard_idle',
    'talk:reader_l': 'd2_reader', 'talk:reader_r': 'd2_reader',
    'talk:platform_way': 'd2_to_platform', 'zone:platform_way': 'd2_to_platform',
    'talk:forecourt_way': 'd2_to_forecourt', 'zone:forecourt_way': 'd2_to_forecourt',
    'talk:tama': 'd2_cat',
    ...sayFallbacks,
    'say:tabetai:guard': 'd2_guard_food', 'say:nomitai:guard': 'd2_guard_drink',
    'say:tabetai:tama': 'd2_cat_food', 'say:nomitai:tama': 'd2_cat_drink',
  },
  nodes: {
    d2_gate: [{ do: 'cardOk' }, ...direction('platform_way', 'forecourt_way', 'forecourt_way', 'forecourt_way')],
    d2_guard: [
      { if: '!d2_ticket_done', then: [
        { say: 'guard', emo: 'polite', text: '点検ですね。どうぞ。', en: 'You’re here for the check. Go ahead.' },
        { do: 'gesture', who: 'guard', kind: 'point', to: 'platform_way' },
      ], else: [{ say: 'guard', emo: 'polite', text: 'お疲れさまです。', en: 'Thanks for your work.' }] },
    ],
    d2_guard_idle: [{ say: 'guard', emo: 'polite', text: 'はい、どうぞ。', en: 'Yes, go ahead.' }],
    d2_reader: [{ do: 'reader', side: 'r', state: 'green' }, { do: 'gate', state: 'open' }],
    d2_cat: [
      { say: 'eric', emo: 'warm', text: 'They still haven’t given you a badge, then.' },
      { say: 'guard', emo: 'polite', text: '猫はいません。', en: 'There is no cat.' },
    ],
    d2_guard_food: [{ say: 'guard', emo: 'polite', text: '食堂は下です。', en: 'The canteen is downstairs.' }],
    d2_guard_drink: [{ say: 'guard', emo: 'polite', text: '外に自動販売機があります。', en: 'There’s a drinks machine outside.' }],
    d2_cat_food: [{ say: 'eric', emo: 'dry', text: 'I’m telling the wrong person. You’d eat my lunch as well.' }],
    d2_cat_drink: [{ say: 'eric', emo: 'warm', text: 'I don’t suppose you’ve got any change. I’ll find a machine.' }],
    d2_to_platform: [{ do: 'trip', to: 'train' }],
    d2_to_forecourt: [{ do: 'trip', to: 'forecourt' }],
    ...fallbackNodes,
  },
};
