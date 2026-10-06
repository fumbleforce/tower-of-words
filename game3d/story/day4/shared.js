// Story data only; placement and physical actions are the README build contract.
export { speakers, emiHello } from '../day3/shared.js';
import { speakers } from '../day3/shared.js';
export const repairQueue = [
  { do: 'ticket', add: 'T-0003' }, { do: 'ticket', add: 'T-0004' },
  { do: 'ticket', add: 'T-0005' }, { do: 'ticket', add: 'T-0006' },
];
export const goal = (at) => [{ if: "period == 'evening'", then: [
  { if: 'club_tennis && !d4_tennis_done', then: [
    { do: 'goal', text: 'The tennis club meets at the courts. Or head home to sleep.' },
  ], else: [{ do: 'goal', text: 'Explore this evening, or sleep in room 203.' }] },
], else: [{ do: 'goal', text: 'Sunday is yours. Check the plaza board or rest at your room’s desk.', ...(at ? { at } : {}) }] }];
export function place(ways, { closed = [], on = {}, nodes = {}, at, show = {}, labels = {} } = {}) {
  const triggers = {}, routes = {};
  for (const [to, keys] of Object.entries(ways)) {
    routes['d4_to_' + to] = [{ do: 'trip', to }];
    for (const key of keys) triggers[key] = 'd4_to_' + to;
  }
  for (const key of closed) triggers[key] = 'd4_closed';
  return { speakers, start: 'd4_arrive', on: { ...triggers, ...on }, show, labels, nodes: {
    d4_arrive: [{ if: '!met_emi', then: [{ set: 'd3_emi_needs_intro' }] }, { do: 'day4Setup' }, ...goal(at)],
    d4_closed: [{ say: 'eric', emo: 'casual', text: 'I can go round through the plaza.' }],
    ...routes, ...nodes,
  } };
}
