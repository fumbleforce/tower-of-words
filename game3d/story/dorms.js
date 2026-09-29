// Eric's dorm room. Not on the day's route yet (the trip in from the dorm courtyard is planned in
// docs/game/places.md); load it directly with ?place=dorms.
export default {
  on: {
    'talk:window': 'window',
    'talk:boxes': 'boxes',
    'talk:bed': 'bed',
  },
  nodes: {
    window: [{ say: 'eric', text: "I was hoping I'd at least be able to see the sky." }],
    boxes: [{ say: 'eric', text: "I can't remember which one I put the clean shirts in." }],
    bed: [{ say: 'eric', text: "If I lie down now, I'm not getting up again." }],
  },
};
