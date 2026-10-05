// Day 3 TEST SKELETON (#228): the ways between the places the clubs use, and room 203's chair, so ?day=3 can play
// the notice board, joining a club and a club session (js/clubs/). It has no story. Codex's day 3 (#229,
// notes/days3-5-outline.md) replaces these files' contents; keep the ways and the chair's period choices.
//
// place(ways, extra): a place's story where talking to an exit (or walking into its zone) walks on to the next place.
//   ways: { to: ['talk:thing', 'zone:zone', ...] }; closed: triggers that lead somewhere this day doesn't open
export const goal = (at) => [
  {
    if: '!clubs_joined',
    then: [{ do: 'goal', text: 'Read the notice board in the fountain plaza.', ...(at ? { at } : {}) }],
    else: [{ do: 'goal', text: 'Your clubs and when they meet are under People.' }],
  },
];
export function place(ways, { closed = [], on = {}, nodes = {}, at } = {}) {
  const o = {},
    n = { d3_arrive: goal(at), d3_closed: ["> That way isn't open on this test day."] };
  for (const [to, keys] of Object.entries(ways)) {
    n['d3_to_' + to] = [{ do: 'trip', to }];
    for (const k of keys) o[k] = 'd3_to_' + to;
  }
  for (const k of closed) o[k] = 'd3_closed';
  return { start: 'd3_arrive', on: { ...o, ...on }, nodes: { ...n, ...nodes } };
}
