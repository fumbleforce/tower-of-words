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
  },
  nodes: {
    d2_gate: [{ do: 'cardOk' }, ...direction('platform_way', 'forecourt_way', 'forecourt_way', 'forecourt_way')],
    d2_guard: [
      { if: '!d2_ticket_done', then: [
        { say: 'guard', emo: 'polite', text: '点検ですね。どうぞ。', en: 'You’re here for the check. Go ahead.' },
        { do: 'gesture', who: 'guard', kind: 'point', to: 'platform_way' },
      ], else: [{ say: 'guard', emo: 'polite', text: 'お疲れさまです。', en: 'Thanks for checking it.' }] },
    ],
    d2_guard_idle: [{ say: 'guard', emo: 'polite', text: 'はい、どうぞ。', en: 'Yes, go ahead.' }],
    d2_reader: [{ do: 'reader', side: 'r', state: 'green' }, { do: 'gate', state: 'open' }],
    d2_cat: [{ say: 'eric', emo: 'warm', text: 'Your card still works too, I see.' }],
    d2_to_platform: [{ do: 'trip', to: 'train' }],
    d2_to_forecourt: [{ do: 'trip', to: 'forecourt' }],
    ...fallbackNodes,
  },
};
