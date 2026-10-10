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
// Talk records a new person before their first line. Capture that case on arrival, but an earlier
// conversation or a completed introduction always takes precedence over an old saved capture flag.
export const emiNeedsIntro = '!d3_emi_introduced && !d2_brief_done && !fact_emi_ten_years && (!met_emi || d3_emi_needs_intro)';
export const emiIntroduction = [
  { say: 'emi', emo: 'bright', text: 'Oh, you must be {mc.name}. I’m Emi, from B2. It’s good to meet you at last.' },
  { do: 'meet', who: 'emi' }, { set: 'd3_emi_introduced' }, { unset: 'd3_emi_needs_intro' },
];
export const emiHello = [{ if: emiNeedsIntro, then: emiIntroduction,
  else: [{ unset: 'd3_emi_needs_intro' }] }];
// Emi's swimming club, learned wherever she says it (her Chat about the club needs it: conversations/needs.js)
export const emiClubFact = { do: 'fact', who: 'emi', id: 'swimming_club', text: 'In the swimming club. It meets on Saturday evenings.' };
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
    { if: '!met_emi && !d2_brief_done && !fact_emi_ten_years && !d3_emi_introduced',
      then: [{ set: 'd3_emi_needs_intro' }], else: [{ unset: 'd3_emi_needs_intro' }] }, ...combined.d3_arrive,
  ];
  return { speakers, start: 'd3_arrive', on: { ...o, ...on }, show, labels, nodes: combined };
}
