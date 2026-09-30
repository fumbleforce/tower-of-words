// The fountain plaza, east of the forecourt. In the morning a side trip (the goal points back to the lift); after
// work it is on the way home, and the lane's east end goes on to the dorm courtyard.
export default {
  speakers: { canteen_worker: { name: 'Canteen worker' } },
  start: 'arrive',
  on: {
    'idle:canteen_worker': [
      { if: 'going_home && evening_canteen_helped', node: 'canteen_goodbye' },
      { if: 'going_home', node: 'canteen_closing' },
    ],
    'talk:canteen_table': { if: 'going_home && !evening_canteen_helped', node: 'canteen_table' },
    'talk:office_lane': 'to_forecourt',
    'zone:office_lane': 'to_forecourt',
    'talk:fountain': 'fountain',
    'talk:dorm_lane': [{ if: 'going_home', node: 'to_dorms' }, 'dorms_later'],
    'zone:dorm_exit': [{ if: 'going_home', node: 'to_dorms' }, 'dorms_later'],
  },
  show: { canteen_table: 'going_home && !evening_canteen_helped' },
  goal: { office_lane: '!going_home', dorm_lane: 'going_home' },
  nodes: {
    canteen_closing: [
      { do: 'look', who: 'canteen_worker', at: 'canteen_table' },
      { say: 'canteen_worker', overheard: true, emo: 'polite', text: '{sumimasen}、今日はもう終わりなんです。' },
    ],
    canteen_goodbye: [
      { say: 'canteen_worker', overheard: true, emo: 'polite', text: 'お疲れさまです。', voice: 'evening-canteen-worker' },
      { do: 'bow', who: 'canteen_worker', depth: 'small' },
    ],
    canteen_table: [
      { do: 'cam', on: 'canteen_table', zoom: 1.8 },
      { do: 'canteenChair', state: 'take' },
      { say: 'eric', emo: 'polite', text: '{sumimasen}。', voice: 'eric-sumimasen' },
      { do: 'canteenChair', state: 'stack' },
      { do: 'bow', who: 'canteen_worker', depth: 'small' },
      { say: 'canteen_worker', overheard: true, emo: 'polite', text: 'お疲れさまです。', voice: 'evening-canteen-worker' },
      { do: 'bow', who: 'eric', depth: 'small' },
      { set: 'evening_canteen_helped' },
      { do: 'canteenChair', state: 'leave' },
      { do: 'cam', back: true },
    ],
    arrive: [
      { if: 'going_home', then: [{ do: 'goal', text: 'Keep going east along the lane to the dorms.' }],
        else: [{ do: 'goal', text: 'Head office is back west. Take its lift down to B2.' }] },
    ],
    fountain: ['> A sign on the rim asks people not to throw coins. The bottom is covered in coins.'],
    dorms_later: ["> The dorms are further down this lane. That's for after work."],
    to_forecourt: [{ do: 'trip', to: 'forecourt' }],
    to_dorms: [{ do: 'trip', to: 'dorm_court' }],
  },
};
