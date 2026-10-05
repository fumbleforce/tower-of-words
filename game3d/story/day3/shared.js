// Plain FORMAT data. Pending place hooks and placement are declared in index.js / README.md.
export const speakers = {
  miotext: { name: 'Mio', role: 'message', phone: true },
  attendant: { name: 'Attendant' },
  member: { name: 'Club member' },
  guard: { name: 'Guard' },
  kuro: { name: 'Receptionist' },
  aoi: { name: 'Woman from the train' },
  rei: { name: 'Tennis player' },
};
// Talk marks people met before their first line. Preserve an unmet Emi on arrival until she says her name.
export const emiHello = [{ if: '!met_emi || d3_emi_needs_intro', then: [
  { say: 'emi', emo: 'bright', text: 'You must be {mc.name}. I’m Emi, your team lead. We’ve managed to miss each other at the office.' },
  { do: 'meet', who: 'emi' }, { unset: 'd3_emi_needs_intro' },
] }];
export const repairQueue = [
  { do: 'ticket', add: 'T-0003' },
  { do: 'ticket', add: 'T-0004' },
];
export const goal = (at) => [{
  if: "period == 'evening'",
  then: [{
    if: 'club_swimming && !d3_swim_done',
    then: [{ do: 'goal', text: 'The swimming club meets at the outdoor pool tonight. Or head home to sleep.' }],
    else: [{ do: 'goal', text: 'Explore this evening, or choose Sleep at the bed in room 203.' }],
  }],
  else: [{
    if: '!d3_board_read',
    then: [{ do: 'goal', text: 'Read the club posters in the fountain plaza.', ...(at ? { at } : {}) }],
    else: [{ do: 'goal', text: 'Your time is free. Rest at the chair in room 203 when you want evening.' }],
  }],
}];
export function place(ways, { closed = [], on = {}, nodes = {}, at, show = {}, labels = {} } = {}) {
  const o = {}, n = {
    d3_arrive: [{ do: 'day3Setup' }, ...goal(at)],
    d3_closed: [{ say: 'eric', emo: 'tired', text: 'I can get back through the plaza.' }],
  };
  for (const [to, keys] of Object.entries(ways)) {
    n['d3_to_' + to] = [{ do: 'trip', to }];
    for (const k of keys) o[k] = 'd3_to_' + to;
  }
  for (const k of closed) o[k] = 'd3_closed';
  const combined = { ...n, ...nodes };
  combined.d3_arrive = [
    { if: '!met_emi', then: [{ set: 'd3_emi_needs_intro' }] }, ...combined.d3_arrive,
  ];
  return { speakers, start: 'd3_arrive', on: { ...o, ...on }, show, labels, nodes: combined };
}
