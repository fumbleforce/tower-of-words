import { place, repairQueue } from './shared.js';
export default place({ forecourt: ['talk:lift'] }, { on: { 'talk:my_desk': 'd4_desk', 'talk:my_chair': 'd4_desk', 'talk:copier': 'd4_copier' }, nodes: {
  d4_desk: [{ do: 'sitDown' }, ...repairQueue, { do: 'tickets' }, { do: 'stand', who: 'eric' }, { do: 'save' }],
  d4_copier: [{ say: 'eric', emo: 'dry', text: 'It’s much easier to hear the fridge when nobody’s here.' }],
} });
