// The sports ground, walked up the north street from the east lane, west along the gym's front, up the pool walk
// and east along the courts walk to the onsen path (docs/game/places.md). The gym and the pool are shut for now and
// say so. South down the north street goes back to the east lane; east along the courts walk goes on to the onsen
// path and the east coast.
export default {
  start: 'arrive',
  on: {
    'talk:north_street': 'to_east_lane',
    'zone:north_exit': 'to_east_lane',
    'talk:onsen_path': 'to_coast',
    'zone:east_exit': 'to_coast',
    'talk:gym': 'shut',
    'talk:pool': 'shut',
  },
  goal: { north_street: 'true' },
  nodes: {
    arrive: [
      { if: 'going_home', then: [{ do: 'goal', text: 'The dorms are back down the north street, east of the park.' }],
        else: [{ do: 'goal', text: 'Head office is back west past the plaza. Take its lift down to B2.' }] },
    ],
    shut: ['> The door is shut. A card on the glass says 準備中: not open yet.'],
    to_east_lane: [{ do: 'trip', to: 'east_lane' }],
    to_coast: [{ do: 'trip', to: 'east_coast' }],
  },
};
