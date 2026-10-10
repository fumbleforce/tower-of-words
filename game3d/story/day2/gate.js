import { direction, sayFallbacks, fallbackNodes } from './shared.js';
export default {
  start: 'd2_gate',
  on: {
    'talk:guard': [{ if: 'd2_ticket_done', node: 'd2_guard_report' }, 'd2_guard'], 'idle:guard': 'd2_guard_idle',
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
    d2_guard_report: [
      { do: 'face', who: 'guard', to: 'eric' },
      { say: 'guard', overheard: true, emo: 'polite', text: 'ドアは{daijoubu}ですか。' },
      { choice: [
        { text: '{daijoubu}. The doors work.', go: 'd2_guard_ok', if: 'know_daijoubu' },
        { text: 'I sent the report to B2.', go: 'd2_guard_sent' },
      ] },
    ],
    d2_guard_ok: [
      { say: 'eric', emo: 'polite', text: '{daijoubu}.' },
      { say: 'guard', overheard: true, emo: 'warm', text: 'はい、ありがとうございます。' },
      { do: 'bow', who: 'guard' },
    ],
    d2_guard_sent: [{ say: 'eric', emo: 'polite', text: 'The report is with B2.' }, { do: 'bow', who: 'guard' }],
    d2_guard: [
      { if: '!d2_ticket_done', then: [
        { say: 'guard', overheard: true, emo: 'polite', text: '点検ですね。どうぞ。' },
        { do: 'gesture', who: 'guard', kind: 'point', to: 'platform_way' },
      ], else: [{ say: 'guard', overheard: true, emo: 'polite', text: 'お疲れさまです。' }] },
    ],
    d2_guard_idle: [{ say: 'guard', voice: 'guard-dozo', overheard: true, emo: 'polite', text: 'はい、どうぞ。' }],
    d2_reader: [{ do: 'reader', side: 'r', state: 'green' }, { do: 'gate', state: 'open' }],
    d2_cat: [
      { say: 'eric', emo: 'warm', text: 'They still haven’t given you a badge, then.' },
      { say: 'guard', overheard: true, emo: 'polite', text: '猫はいません。' },
    ],
    d2_guard_food: [{ say: 'guard', overheard: true, emo: 'polite', text: '食堂は下です。' }],
    d2_guard_drink: [{ say: 'guard', overheard: true, emo: 'polite', text: '外に自動販売機があります。' }],
    d2_cat_food: [{ say: 'eric', emo: 'dry', text: 'I’m telling the wrong person. You’d eat my lunch as well.' }],
    d2_cat_drink: [{ say: 'eric', emo: 'warm', text: 'I don’t suppose you’ve got any change. I’ll find a machine.' }],
    d2_to_platform: [{ do: 'trip', to: 'train' }],
    d2_to_forecourt: [{ do: 'trip', to: 'forecourt' }],
    ...fallbackNodes,
  },
};
