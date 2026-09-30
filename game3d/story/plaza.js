// The fountain plaza, east of the forecourt. In the morning a side trip (the goal points back to the lift); after
// work it is on the way home, and the lane's east end goes on to the dorm courtyard.
export default {
  start: 'arrive',
  on: {
    'talk:office_lane': 'to_forecourt',
    'zone:office_lane': 'to_forecourt',
    'talk:fountain': 'fountain',
    'talk:dorm_lane': [{ if: 'going_home', node: 'to_dorms' }, 'dorms_later'],
    'zone:dorm_exit': [{ if: 'going_home', node: 'to_dorms' }, 'dorms_later'],
  },
  goal: { office_lane: '!going_home', dorm_lane: 'going_home' },
  nodes: {
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
