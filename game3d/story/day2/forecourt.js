import { direction, sayFallbacks, fallbackNodes } from './shared.js';
export default {
  start: 'd2_arrive',
  speakers: { kuro: { name: 'Receptionist' } },
  labels: { kuro: 'Receptionist' },
  on: {
    'talk:shop_lane': 'd2_to_shotengai', 'zone:shop_exit': 'd2_to_shotengai',
    'talk:kuro': 'd2_kuro_talk',
    'say:ohayo:kuro': 'd2_kuro_greet',
    'say:daijoubu:kuro': 'd2_kuro_ok',
    'talk:station_exit': 'd2_to_station', 'zone:station_exit': 'd2_to_station',
    'talk:office_entrance': 'd2_to_office', 'zone:lift_front': 'd2_to_office',
    'talk:plaza_lane': 'd2_to_plaza', 'zone:plaza_lane': 'd2_to_plaza',
    ...sayFallbacks,
  },
  nodes: {
    d2_to_shotengai: [{ do: 'trip', to: 'shotengai' }],
    d2_kuro_talk: [
      { do: 'face', who: 'kuro', to: 'eric' },
      { do: 'cam', on: 'kuro', zoom: 1.2 },
      { if: 'd2_kuro_work_seen && d2_kuro_weekend_seen', then: [
        { say: 'kuro', emo: 'polite', text: 'I have to make a call. See you later?' },
        { go: 'd2_kuro_end' },
      ], else: [{ go: 'd2_kuro_topics' }] },
    ],
    d2_kuro_topics: [{ choice: [
      { text: '{ohayo}. Good morning.', if: 'know_ohayo && !d2_kuro_greeted', go: 'd2_kuro_greet' },
      { text: 'Do you work here every day?', if: '!d2_kuro_work_seen', go: 'd2_kuro_work' },
      { text: 'What do you do on your days off?', if: '!d2_kuro_weekend_seen', go: 'd2_kuro_weekend' },
      { text: '{daijoubu}. I found my way today.', if: 'know_daijoubu && !d2_kuro_ok_seen', go: 'd2_kuro_ok' },
      { text: 'I’ll let you get back to work.', go: 'd2_kuro_end' },
    ] }],
    d2_kuro_greet: [
      { say: 'eric', emo: 'polite', text: '{ohayo}.' },
      { say: 'kuro', overheard: true, emo: 'warm', text: '{ohayo}ございます。' },
      { say: 'kuro', emo: 'teasing', text: 'You remembered.' },
      { set: 'd2_kuro_greeted' }, { go: 'd2_kuro_topics' },
    ],
    d2_kuro_work: [
      { say: 'kuro', overheard: true, emo: 'casual', text: '明日は{yasumi}です。' },
      { say: 'kuro', emo: 'casual', text: 'Tomorrow is my day off.' },
      { say: 'kuro', emo: 'slow', slow: true, text: '{yasumi}。' },
      { do: 'type', word: 'yasumi', from: 'kuro', prompt: 'She has tomorrow off. Try yasumi: a break or day off.' },
      { say: 'eric', emo: 'warm', text: 'Mine too. I’m still working out what’s here.' },
      { set: 'd2_kuro_work_seen' }, { go: 'd2_kuro_topics' },
    ],
    d2_kuro_weekend: [
      { if: 'know_yasumi', then: [{ say: 'eric', emo: 'curious', text: '{yasumi}... What do you do then?' }], else: [{ say: 'eric', emo: 'curious', text: 'What do you do when you’re off work?' }] },
      { say: 'kuro', emo: 'casual', text: 'I go swimming. Can you swim?' },
      { choice: [
        { text: 'Yes. I haven’t been for a while.', go: 'd2_kuro_swimmer' },
        { text: 'A little. I’d have to start slowly.', go: 'd2_kuro_beginner' },
      ] },
    ],
    d2_kuro_swimmer: [
      { say: 'kuro', emo: 'warm', text: 'Come tomorrow, then. After six.' },
      { set: 'd2_kuro_weekend_seen' }, { go: 'd2_kuro_topics' },
    ],
    d2_kuro_beginner: [
      { say: 'kuro', emo: 'warm', text: 'Slow is fine. Come tomorrow, after six.' },
      { set: 'd2_kuro_weekend_seen' }, { go: 'd2_kuro_topics' },
    ],
    d2_kuro_ok: [
      { say: 'eric', emo: 'warm', text: '{daijoubu}. I found the right lift today.' },
      { say: 'kuro', emo: 'teasing', text: 'Then you came just to talk?' },
      { say: 'eric', emo: 'warm', text: 'I did, yes.' },
      { set: 'd2_kuro_ok_seen' }, { go: 'd2_kuro_topics' },
    ],
    d2_kuro_end: [{ do: 'cam', back: true }, { do: 'save' }],
    d2_arrive: direction('station_exit', 'office_entrance', 'plaza_lane', 'plaza_lane'),
    d2_to_station: [{ do: 'trip', to: 'gate' }],
    d2_to_office: [{ do: 'trip', to: 'office' }],
    d2_to_plaza: [{ do: 'trip', to: 'plaza' }],
    ...fallbackNodes,
  },
};
