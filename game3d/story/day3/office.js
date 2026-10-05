import { place, repairQueue } from './shared.js';
export default place(
  { forecourt: ['talk:lift'] },
  {
    on: { 'talk:my_desk': 'd3_desk', 'talk:my_chair': 'd3_desk', 'talk:copier': 'd3_copier' },
    nodes: {
      d3_desk: [
        { do: 'sitDown' }, ...repairQueue, { do: 'tickets' },
        { do: 'stand', who: 'eric' }, { do: 'save' },
      ],
      d3_copier: [{ say: 'eric', emo: 'dry', text: 'I’m going to leave you alone while you’re working.' }],
    },
  },
);
