// Eric's floor and his room, reached up the stairs from the dorm courtyard (docs/game/places.md); it also loads
// directly with ?place=dorms, on the landing.
export default {
  start: 'landing',
  on: {
    'talk:door_203': 'go_in',
    'zone:door_203': { node: 'go_in', once: true },
    'talk:window': 'window',
    'talk:boxes': 'boxes',
    'talk:bed': 'bed',
    'talk:computer': 'computer',
  },
  nodes: {
    landing: [{ unset: 'home_203' }, { do: 'goal', text: 'Room 203.', at: 'door_203' }],
    // at his door: in over the genkan, once, whichever of the door or the doorstep started it
    go_in: [
      { if: 'home_203', then: [{ end: true }] },
      { set: 'home_203' },
      { do: 'goal', text: '' },
      { do: 'enterRoom' },
      { call: 'home' },
    ],
    // on the walk home the day ends here: a moment in the room, then the day's summary
    home: [{ if: 'going_home', then: [{ wait: 1200 }, { do: 'save' }, { do: 'end' }] }],
    window: [{ say: 'eric', text: "I was hoping I'd at least be able to see the sky." }],
    boxes: [{ say: 'eric', text: "I can't remember which one I put the clean shirts in." }],
    bed: [{ say: 'eric', text: "If I lie down now, I'm not getting up again." }],
    computer: ['> A company computer, already set up and switched on. Someone has stuck a welcome note on the screen.'],
  },
};
