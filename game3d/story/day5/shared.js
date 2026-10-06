// Story data only; placement and physical actions are the README build contract.
export { speakers, emiHello } from '../day3/shared.js';
import { speakers } from '../day3/shared.js';
export const repairQueue = [
  { do: 'ticket', add: 'T-0003' }, { do: 'ticket', add: 'T-0004' },
  { do: 'ticket', add: 'T-0005' }, { do: 'ticket', add: 'T-0006' },
  { do: 'ticket', add: 'T-0007' }, { do: 'ticket', add: 'T-0008' },
];
export const goal = (at) => [{ if: "period == 'evening'", then: [
  { do: 'goal', text: 'Kenji is at B2 for drinks. Or head home to sleep.' },
], else: [{ do: 'goal', text: 'Visit B2 or check your repair requests. Rest at your room’s desk to move the day on.', ...(at ? { at } : {}) }] }];
export function place(ways, { closed = [], on = {}, nodes = {}, at, show = {}, labels = {} } = {}) {
  const triggers = {}, routes = {};
  for (const [to, keys] of Object.entries(ways)) {
    routes['d5_to_' + to] = [{ do: 'trip', to }];
    for (const key of keys) triggers[key] = 'd5_to_' + to;
  }
  for (const key of closed) triggers[key] = 'd5_closed';
  return { speakers, start: 'd5_arrive', on: { ...triggers, ...on }, show, labels, nodes: {
    d5_arrive: [{ if: '!met_kenji', then: [{ set: 'd5_kenji_needs_intro' }] }, { if: '!met_mori', then: [{ set: 'd5_mori_needs_intro' }] }, { if: '!met_emi', then: [{ set: 'd3_emi_needs_intro' }] }, { do: 'day5Setup' }, ...goal(at)],
    d5_closed: [{ say: 'eric', emo: 'casual', text: 'I can go round through the plaza.' }],
    ...routes, ...nodes,
  } };
}
