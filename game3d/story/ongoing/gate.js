import source from '../day3/gate.js';
import { interactions, place } from './shared.js';
const familiar = interactions(source, ['talk:guard', 'talk:guard_monitor', 'talk:reader_l', 'talk:reader_r', 'talk:tama', 'talk:bowl']);
export default place('gate', {
  ...familiar,
  arrive: [{ do: 'cardOk' }, { do: 'gate', state: 'open' }],
  nodes: {
    ...familiar.nodes,
    ongoing_arrive: [
      { unset: 'd3_signoff_walk' }, { do: 'ongoingSetup' },
      { do: 'cardOk' }, { do: 'gate', state: 'open' }, { do: 'ongoingGoal' },
    ],
    d3_guard_hello: [
      { say: 'eric', emo: 'warm', text: '{ohayo}.' },
      { say: 'guard', voice: 'guard-greeting-ohayo', overheard: true, emo: 'polite', text: '{ohayo}。' },
      { do: 'bow', who: 'guard' },
    ],
  },
});
