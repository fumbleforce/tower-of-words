// Eric's dorm room. Not on the day's route yet (the trip in from the dorm courtyard is planned in
// docs/game/places.md); load it directly with ?place=dorms.
// TODO(Codex): the three look-at lines below are plain stand-ins from the builder; write them.
export default {
  on: {
    'talk:window': 'window',
    'talk:boxes': 'boxes',
    'talk:bed': 'bed',
  },
  nodes: {
    window: [{ say: 'eric', text: 'A concrete wall. About two metres away.' }],
    boxes: [{ say: 'eric', text: 'My two boxes. They got here before me.' }],
    bed: [{ say: 'eric', text: 'A single bed. It will do.' }],
  },
};
