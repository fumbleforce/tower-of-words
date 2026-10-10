import source from '../day3/train.js';
import initial from '../day2/train.js';
import { interactions, place } from './shared.js';
const finalCheck = interactions(source, ['talk:door_test', 'talk:guard']);
const firstCheck = interactions(initial, ['talk:door_test']);
export default place('train', {
  on: {
    'talk:door_test': [{ if: '!d2_ticket_done', node: 'd2_check' }, 'ongoing_station_check'],
    'talk:guard': 'ongoing_station_check',
  },
  arrive: [
    { do: 'stationSetup', companion: false }, { unset: 'd2_mio_here' },
    { if: 'd3_signoff_walk', then: [{ call: 'd3_signoff' }] },
  ],
  nodes: {
    ...firstCheck.nodes, ...finalCheck.nodes,
    d2_check: firstCheck.nodes.d2_check.map(step => step.then ? { ...step, then: step.then.map(beat => beat.text === 'Twice. It only stopped when I spoke yesterday.' ? { ...beat, text: 'Twice. It only stopped when I spoke.' } : beat) } : step),
    ongoing_station_check: [
      { if: "ticket_T0002 != 'done' && !d3_signoff_walk", then: [
        { say: 'eric', emo: 'warm', text: 'I need the guard to witness this. I’ll ask him at his desk.' },
        { do: 'goal', text: 'Ask the guard at station security to witness the check.', at: 'station_exit' },
        { end: true },
      ] },
      { go: 'd3_signoff' },
    ],
  },
});
