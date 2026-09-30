// Eric's dorm room, reached from the dorm courtyard (docs/game/places.md); it also loads directly with ?place=dorms.
export default {
  // on the walk home the day ends here: a moment in the room, then the day's summary
  start: 'home',
  on: {
    'talk:window': 'window',
    'talk:boxes': 'boxes',
    'talk:bed': 'bed',
  },
  nodes: {
    home: [{ if: 'going_home', then: [{ wait: 1200 }, { do: 'save' }, { do: 'end' }] }],
    window: [{ say: 'eric', text: "I was hoping I'd at least be able to see the sky." }],
    boxes: [{ say: 'eric', text: "I can't remember which one I put the clean shirts in." }],
    bed: [{ say: 'eric', text: "If I lie down now, I'm not getting up again." }],
  },
};
