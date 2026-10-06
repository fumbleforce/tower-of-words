import { place } from './shared.js';
export default place(
  { gate: ['talk:station_exit', 'zone:station_exit'], office: ['talk:office_entrance', 'zone:lift_front'],
    plaza: ['talk:plaza_lane', 'zone:plaza_lane'] },
  { on: { 'talk:kuroda': 'd4_hamada_return' }, nodes: {
    d4_hamada_return: [{ say: 'kuroda', overheard: true, emo: 'polite', text: '{ohayo}。買いすぎてしまいました。' }, { do: 'day4Setup', state: 'bags' }, { say: 'eric', emo: 'warm', text: 'Don’t put those down just to bow to me.' }],
  } },
);
