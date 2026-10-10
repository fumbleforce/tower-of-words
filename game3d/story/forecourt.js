// The short walk from station security into the separate head-office building; after work, the way home starts here.
export default {
  speakers: {
    kuro: { name: 'Receptionist' },
  },
  start: 'outside',
  on: {
    'talk:campus':'to_campus','zone:campus_exit':'to_campus',
    'talk:shop_lane': 'to_shotengai', 'zone:shop_exit': 'to_shotengai',
    // Kuro greets arrivals at reception and people heading home after work.
    'talk:garden_bench': { if: 'going_home', node: 'garden_bench' },
    'talk:fallen_bicycle': { if: 'going_home && !evening_bikes_upright', node: 'fallen_bicycle' },
    'talk:kuro': [{ if: '!going_home && !kuro_reception_seen', node: 'kuro_intro' }, 'kuro'],
    'say:ohayo:kuro': [{ if: '!going_home && !kuro_reception_seen', node: 'kuro_intro_ohayo' }, 'ohayo_kuro'],
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
    to_campus:[{do:'trip',to:'campus'}],
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
    // Day 1 at the counter. In English he gets the visitor treatment; she warms only once he greets her in Japanese.
    kuro_intro: [
      { do: 'face', who: 'kuro', to: 'eric' },
      { do: 'cam', on: 'kuro', zoom: 1.2 },
      { say: 'kuro', face: 'polite', overheard: true, emo: 'polite', text: '{ohayo}。どうぞ。' },
      { say: 'eric', emo: 'polite', text: 'Hi. Sorry, which way is B2?' },
      { wait: 700 },
      { do: 'face', who: 'kuro', to: 'lift' },
      { do: 'gesture', who: 'kuro', kind: 'point', to: 'lift' },
      { say: 'kuro', face: 'polite', emo: 'curt', text: 'Lift, there.' },
      { do: 'face', who: 'kuro', to: 'label_printer' },
      { say: 'eric', emo: 'polite', text: 'Thanks.' },
      { do: 'cam', back: true },
      { set: 'kuro_reception_seen' },
      { do: 'save' },
    ],
    kuro_intro_ohayo: [
      { do: 'face', who: 'kuro', to: 'eric' },
      { do: 'cam', on: 'kuro', zoom: 1.2 },
      { say: 'kuro', overheard: true, emo: 'warm', text: 'あ、{ohayo}。' },
      { do: 'gesture', who: 'kuro', kind: 'nod', to: 'eric' },
      { say: 'eric', emo: 'polite', text: 'B2, please.' },
      { do: 'face', who: 'kuro', to: 'lift' },
      { do: 'gesture', who: 'kuro', kind: 'point', to: 'lift' },
      { say: 'kuro', overheard: true, emo: 'warm', text: 'B2は、あちらのエレベーターです。', clear: ['B2', { ja: 'エレベーター', ro: 'erebētā', en: 'lift' }] },
      { do: 'face', who: 'kuro', to: 'eric' },
      { wait: 600 },
      { say: 'kuro', overheard: true, emo: 'warm', text: 'いってらっしゃい。' },
      { do: 'bow', who: 'kuro', depth: 'small' },
      { do: 'cam', back: true },
      { set: 'kuro_reception_seen' },
      { do: 'save' },
    ],
    kuro: [
      { do: 'face', who: 'kuro', to: 'eric' },
      { if: 'going_home', then: [
        { say: 'kuro', face: 'polite', voice: 'kuro-otsukare', overheard: true, emo: 'polite', text: 'お疲れさまです。' },
        { do: 'bow', who: 'kuro' },
      ], else: [
        { say: 'kuro', face: 'polite', overheard: true, emo: 'polite', text: '{ohayo}。どうぞ。' },
        { do: 'face', who: 'kuro', to: 'lift' },
        { do: 'gesture', who: 'kuro', kind: 'point' },
        { do: 'face', who: 'kuro', to: 'eric' },
      ] },
    ],
    ohayo_kuro: [
      { do: 'face', who: 'kuro', to: 'eric' },
      { if: 'going_home', then: [
        { say: 'kuro', face: 'polite', voice: 'kuro-otsukare', overheard: true, emo: 'polite', text: 'お疲れさまです。' },
      ], else: [
        { say: 'kuro', overheard: true, emo: 'warm', text: 'あ、{ohayo}。' },
        { do: 'gesture', who: 'kuro', kind: 'nod', to: 'eric' },
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
