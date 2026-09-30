// The short walk from station security into the separate head-office building; after work, the way home starts here.
export default {
  speakers: {
    kuro: { name: 'Receptionist' },
  },
  start: 'outside',
  on: {
    // Kuro greets arrivals at reception and people heading home after work.
    'talk:kuro': 'kuro',
    'say:ohayo:kuro': 'ohayo_kuro',
    'say:yoroshiku:kuro': 'yoroshiku_kuro',
    'talk:office_entrance': { if: '!going_home', node: 'head_office' },
    'talk:lift': { if: '!going_home', node: 'to_b2' },
    'zone:lift_front': { if: '!going_home', node: 'to_b2', once: true },
    'talk:plaza_lane': 'to_plaza',
    'zone:plaza_lane': 'to_plaza',
  },
  show: { office_entrance: '!going_home', lift: '!going_home' },
  goal: { lift: '!going_home', plaza_lane: 'going_home' },
  labels: { kuro: 'Receptionist' },
  nodes: {
    outside: [
      { if: 'going_home', then: [{ do: 'goal', text: 'Head home: walk east along the lane to the dorms.' }],
        else: [{ do: 'goal', text: 'Cross the forecourt and take the head-office lift to B2.' }] },
    ],
    head_office: [{ do: 'goal', text: 'Take the lift inside head office down to B2.' }],
    to_b2: [{ do: 'next' }],
    to_plaza: [{ do: 'trip', to: 'plaza' }],
    kuro: [
      { do: 'face', who: 'kuro', to: 'eric' },
      { if: 'going_home', then: [
        { say: 'kuro', overheard: true, emo: 'polite', text: 'お疲れさまです。' },
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
        { say: 'kuro', overheard: true, emo: 'polite', text: 'お疲れさまです。' },
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
