// The fountain plaza, a side trip east of the forecourt. No story beat yet: the goal points back to the lift.
export default {
  start: 'arrive',
  on: {
    'talk:office_lane': 'to_forecourt',
    'zone:office_lane': 'to_forecourt',
    'talk:fountain': 'fountain',
    'talk:dorm_lane': 'dorms_later',
    'zone:dorm_exit': 'dorms_later',
  },
  goal: { office_lane: true },
  nodes: {
    arrive: [{ do: 'goal', text: 'Head office is back west. Take its lift down to B2.' }],
    fountain: ['> A sign on the rim asks people not to throw coins. The bottom is covered in coins.'],
    dorms_later: ["> The dorms are further down this lane. That's for after work."],
    to_forecourt: [{ do: 'trip', to: 'forecourt' }],
  },
};
