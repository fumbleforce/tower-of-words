// Story data helpers, evaluated when the files load. The engine still receives ordinary FORMAT objects.
export const speakers = { miotext: { name: 'Mio', role: 'message', phone: true } };
export function direction(station, office, party, home) {
  return [{ if: '!d2_ticket_done', then: [{ do: 'goal', text: 'Check the train doors at Honsha station.', at: station }], else: [
    { if: '!d2_shift_done', then: [
      { if: 'd2_brief_done', then: [{ do: 'goal', text: 'Back to your desk on B2 when you’re ready to work.', at: office }],
        else: [{ do: 'goal', text: 'Tell Emi on B2 what the check found.', at: office }] },
    ], else: [
      { if: '!d2_party_done', then: [
        { if: 'd2_met_kenji || d2_ate', then: [{ do: 'goal', text: 'The others are at the sea-facing bench by the shop street.', at: party }],
          else: [{ do: 'goal', text: 'Meet Kenji by the izakaya’s blue curtain.', at: party }] },
      ],
        else: [{ do: 'goal', text: 'Head home when you’re ready. Your room is 203.', at: home }] },
    ] },
  ] }];
}
export const shut = [{ if: 'd2_shift_done', then: ['> The card on the door says “Closed for today.”'],
  else: ['> The door is shut. 準備中 (junbi-chū): not open yet.'] }];
export const northClosed = ['> The sign on the barrier reads: “North road and pool approach closed for resurfacing.”'];
export const sayFallbacks = {
  'say:tabetai:*': 'd2_food_away',
  'say:nomitai:*': 'd2_drink_away',
  'say:mitai:*': 'd2_see_away',
  'say:ikitai:*': 'd2_go_away',
};
export const fallbackNodes = {
  d2_food_away: [{ say: 'eric', emo: 'tired', text: "I'll find something to eat." }],
  d2_see_away: [{ say: 'eric', emo: 'curious', text: 'I’d like to have a look around.' }],
  d2_go_away: [{ say: 'eric', emo: 'tired', text: 'I should decide where I’m going first.' }],
  d2_drink_away: [{ say: 'eric', emo: 'tired', text: "I could do with a drink." }],
};
