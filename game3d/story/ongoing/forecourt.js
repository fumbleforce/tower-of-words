import { receptionNodes } from '../day5/reception.js';
import { place } from './shared.js';
export default place('forecourt', {
  labels: { kuro: ['Kuro', 'd3_kuro_intro'] },
  on: { 'talk:kuro': 'ongoing_reception' },
  nodes: {
    ...receptionNodes,
    ongoing_reception: [
      { if: '!ongoing_workday', then: [
        { say: 'eric', emo: 'warm', text: 'I’ll catch reception on a weekday, when they can check a label with me.' },
        { end: true },
      ] },
      { go: 'd5_label' },
    ],
  },
});
