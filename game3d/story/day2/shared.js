// Story data helpers, evaluated when the files load. The engine still receives ordinary FORMAT objects.
export const speakers = { miotext: { name: 'Mio', role: 'message', phone: true } };
export function direction(station, office, party, home) {
  return [{ if: '!d2_ticket_done', then: [{ do: 'goal', text: 'Check the train doors at Honsha station.', at: station }], else: [
    { if: '!d2_shift_done', then: [{ do: 'goal', text: 'Take the station report to B2.', at: office }], else: [
      { if: '!d2_party_done', then: [{ do: 'goal', text: 'Meet Kenji by the izakaya’s blue curtain.', at: party }],
        else: [{ do: 'goal', text: 'Head home when you’re ready. Your room is 203.', at: home }] },
    ] },
  ] }];
}
export const shut = ['> The door is shut. 準備中 (junbi-chū): not open yet.'];
export const northClosed = ['> The sign on the barrier reads: “North road and pool approach closed for resurfacing.”'];
export const sayFallbacks = {
  'say:tabetai:*': 'd2_food_away',
  'say:nomitai:*': 'd2_drink_away',
};
export const fallbackNodes = {
  d2_food_away: [{ say: 'eric', emo: 'tired', text: "I'll find something to eat." }],
  d2_drink_away: [{ say: 'eric', emo: 'tired', text: "I could do with a drink." }],
};
