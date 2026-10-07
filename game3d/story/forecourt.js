// The short walk from station security into the separate head-office building; after work, the way home starts here.
export default {
  speakers: {
    kuro: { name: 'Receptionist' },
  },
  start: 'outside',
  on: {
    'talk:shop_lane': 'to_shotengai', 'zone:shop_exit': 'to_shotengai',
    // Kuro greets arrivals at reception and people heading home after work.
    'talk:garden_bench': { if: 'going_home', node: 'garden_bench' },
    'talk:fallen_bicycle': { if: 'going_home && !evening_bikes_upright', node: 'fallen_bicycle' },
    'talk:kuro': [{ if: '!going_home && !kuro_reception_seen', node: 'kuro_intro' }, 'kuro'],
    'say:ohayo:kuro': [{ if: '!going_home && !kuro_reception_seen', node: 'kuro_intro' }, 'ohayo_kuro'],
    'say:yoroshiku:kuro': 'yoroshiku_kuro',
    'talk:office_entrance': { if: '!going_home', node: 'head_office' },
    'talk:lift': { if: '!going_home', node: 'to_b2' },
    'zone:lift_front': { if: '!going_home', node: 'to_b2', once: true },
    'talk:plaza_lane': 'to_plaza',
    'zone:plaza_lane': 'to_plaza',
  },
  show: { office_entrance: '!going_home', lift: '!going_home', garden_bench: 'going_home', fallen_bicycle: 'going_home && !evening_bikes_upright' },
  goal: { lift: '!going_home', plaza_lane: 'going_home' },
  labels: { kuro: 'Receptionist' },
  nodes: {
    to_shotengai: [{ do: 'trip', to: 'shotengai' }],
    garden_bench: [
      { do: 'cam', on: 'garden_bench', zoom: 1.8 },
      { do: 'sit', who: 'eric', at: 'garden_bench' },
      { if: '!evening_bench_seen', then: [
        { do: 'gardenCat', state: 'lap' },
        { say: 'eric', emo: 'low', text: 'I was only going to sit down for a second.' },
        { do: 'gardenCat', state: 'bench' },
        { set: 'evening_bench_seen' },
      ] },
      { do: 'cam', back: true },
    ],
    fallen_bicycle: [
      { do: 'cam', on: 'fallen_bicycle', zoom: 1.8 },
      { if: '!evening_bike_tipped', then: [
        { do: 'bicycle', state: 'lift' },
        { do: 'bicycle', state: 'tip' },
        { set: 'evening_bike_tipped' },
      ], else: [
        { do: 'bicycle', state: 'second' },
        { set: 'evening_bikes_upright' },
      ] },
      { do: 'cam', back: true },
    ],
    outside: [
      { if: 'going_home', then: [{ do: 'goal', text: 'Head home: walk east along the lane to the dorms.' }],
        else: [{ do: 'goal', text: 'Cross the forecourt and take the head-office lift to B2.' }] },
    ],
    head_office: [{ do: 'goal', text: 'Take the lift inside head office down to B2.' }],
    to_b2: [{ do: 'next' }],
    to_plaza: [{ do: 'trip', to: 'plaza' }],
    kuro_intro: [
      { do: 'face', who: 'kuro', to: 'eric' },
      { do: 'cam', on: 'kuro', zoom: 1.2 },
      { say: 'kuro', emo: 'polite', text: '{ohayo}. Which floor, please?' },
      { say: 'eric', emo: 'polite', text: 'B2. Sorry, I should have said.' },
      { say: 'kuro', emo: 'teasing', text: "You're allowed to say good morning first." },
      { say: 'eric', emo: 'casual', text: "I'll remember that." },
      { say: 'kuro', emo: 'polite', text: 'Do come and say it tomorrow.' },
      { do: 'face', who: 'kuro', to: 'lift' },
      { do: 'gesture', who: 'kuro', kind: 'point' },
      { do: 'face', who: 'kuro', to: 'eric' },
      { do: 'cam', back: true },
      { set: 'kuro_reception_seen' },
      { do: 'save' },
    ],
    kuro: [
      { do: 'face', who: 'kuro', to: 'eric' },
      { if: 'going_home', then: [
        { say: 'kuro', voice: 'kuro-otsukare', overheard: true, emo: 'polite', text: 'お疲れさまです。' },
        { do: 'bow', who: 'kuro' },
      ], else: [
        { say: 'kuro', overheard: true, emo: 'polite', text: '{ohayo}。どうぞ。' },
        { do: 'face', who: 'kuro', to: 'lift' },
        { do: 'gesture', who: 'kuro', kind: 'point' },
        { do: 'face', who: 'kuro', to: 'eric' },
      ] },
    ],
    ohayo_kuro: [
      { do: 'face', who: 'kuro', to: 'eric' },
      { if: 'going_home', then: [
        { say: 'kuro', voice: 'kuro-otsukare', overheard: true, emo: 'polite', text: 'お疲れさまです。' },
      ], else: [
        { say: 'kuro', overheard: true, emo: 'polite', text: 'あ、{ohayo}。' },
      ] },
      { do: 'bow', who: 'kuro' },
    ],
    yoroshiku_kuro: [
      { do: 'face', who: 'kuro', to: 'eric' },
      { say: 'kuro', overheard: true, emo: 'polite', text: 'こちらこそ。{yoroshiku}。' },
      { do: 'bow', who: 'kuro' },
    ],
  },
};
