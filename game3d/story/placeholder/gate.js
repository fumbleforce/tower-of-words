export default {
  start: 'intro',
  on: {
    'talk:guard': 'guard',
    'event:card_red': 'red',
    'zone:lift_front': { node: 'lift', if: 'gateOpen' },
    'talk:lift': { node: 'lift', if: 'gateOpen' },
  },
  nodes: {
    intro: [{ do: 'goal', text: 'Get through the gate.' }, '> Placeholder lobby.'],
    red: ['guard: Placeholder: your card is not live. One moment.', { do: 'type', ms: 2500 }, { do: 'enter', who: 'kuroda' }, { do: 'gate', state: 'jam' }, { offer: 'akete', line: 'kuroda: Placeholder: {akete}, please...' }, { do: 'gate', state: 'slam' }, { do: 'cardOk' }, 'guard: Placeholder: you are in.'],
    guard: ['guard: Placeholder.'],
    lift: [{ do: 'next' }],
  },
};
