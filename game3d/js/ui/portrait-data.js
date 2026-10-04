// Shared runtime declaration; tooling imports this without DOM or renderer side effects.
export const PORTRAITS = {
  mio: ['neutral', 'smile', 'deadpan', 'surprised', 'embarrassed', 'tired', 'phone'],
  aoi: ['neutral'],
  kuro: ['neutral'],
  eric: ['neutral', 'surprised', 'tired'],
  mori: ['neutral', 'smile', 'flustered'],
  kenji: ['neutral', 'grin', 'sheepish'],
  kuroda: ['neutral', 'sleepy', 'panicked'],
  guard: ['neutral', 'stern', 'amused'],
  emi: ['neutral'],
  rei: ['neutral'],
};
// Text messages on Eric's phone (speakers with `phone: true`) show the sender's portrait, as spoken lines do, with
// this face unless the line names one of theirs (Jørgen, 2026-10-04: "when showing mios message, should have her
// portrait too")
export const TEXT_PORTRAITS = {
  miotext: ['mio', 'phone'],
  reitext: ['rei', 'neutral'],
};
