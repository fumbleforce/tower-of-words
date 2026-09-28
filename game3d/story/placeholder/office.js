export default {
  start: 'intro',
  on: {
    'talk:emi': 'emi',
    'talk:my_desk': 'desk',
    'talk:copier': { node: 'copier', if: '!copies' },
  },
  nodes: {
    intro: [{ learn: 'kite' }, 'emi: Placeholder: {kite}, this way.', { do: 'goal', text: 'Find your desk.' }],
    emi: ['emi: Placeholder.'],
    copier: [{ offer: 'ugoite', line: 'mori: Placeholder: {ugoite}.' }, { do: 'copier', state: 'run' }, { set: 'copies' }],
    desk: [{ do: 'sitDown' }, 'emi: Placeholder: welcome.', { do: 'end' }],
  },
};
