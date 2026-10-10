// The karaoke box's front desk, through its door off the arcade (docs/game/places.md). Out to the shop street, or up
// the stairs to the booth.
export default {
  start: 'arrive',
  on: {
    'talk:karaoke_door': 'to_street',
    'talk:karaoke_stairs': 'to_booth',
  },
  goal: { karaoke_door: 'true' },
  nodes: {
    arrive: [
      { if: 'going_home', then: [{ do: 'goal', text: 'The dorms are up the street, east of the arcade.' }],
        else: [{ do: 'goal', text: 'Head office is back past the plaza. Take its lift down to B2.' }] },
    ],
    to_street: [{ do: 'trip', to: 'shotengai' }],
    to_booth: [{ do: 'trip', to: 'karaoke_booth' }],
  },
};
