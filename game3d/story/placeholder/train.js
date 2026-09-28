// Placeholder until the writer's story/train.js lands. Engine test lines only.
export default {
  start: 'intro',
  on: {
    'talk:aoi': 'aoi',
    'talk:kuroda': 'kuroda',
    'event:arrived': 'arrived',
    'zone:door_zone': { node: 'leave', if: 'doorsHeld' },
  },
  nodes: {
    intro: [{ do: 'goal', text: 'Ride to {honsha}.' }, '> Placeholder. The train crosses the bay.', { wait: 800 }, { do: 'announce', text: '{tsugiwa} {honsha}' }, { wait: 2500 }, { do: 'announce', text: '' }, { do: 'arrive' }],
    aoi: ['aoi: Placeholder line.'],
    kuroda: ['> He is asleep.'],
    arrived: [{ do: 'goal', text: 'Get off the train.' }, { wait: 1500 }, { do: 'chime' }, { offer: 'matte', line: 'aoi: Placeholder: hold the doors! {matte}!' }, { do: 'doorsHold' }, { set: 'doorsHeld' }, { do: 'wake', who: 'kuroda' }, 'aoi: Placeholder: they stopped.'],
    leave: [{ do: 'next' }],
  },
};
