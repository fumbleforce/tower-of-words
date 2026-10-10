// Shared runtime declaration; tooling imports this without DOM or renderer side effects.
import { MC } from '../mc.js';

export const PORTRAITS = {
  mio: ['neutral', 'smile', 'deadpan', 'surprised', 'embarrassed', 'tired', 'phone', 'annoyed'],
  aoi: ['neutral'],
  kuro: ['neutral', 'flirtatious', 'teasing', 'pleased', 'polite'],
  [MC.portrait.set]: MC.portrait.faces, // the protagonist's (data/mc/<id>.json)
  mori: ['neutral', 'smile', 'flustered'],
  kenji: ['neutral', 'grin', 'sheepish'],
  kuroda: ['neutral', 'sleepy', 'panicked'],
  guard: ['neutral', 'stern', 'amused'],
  emi: ['neutral'],
  rei: ['neutral', 'scolding', 'cold', 'smug', 'offguard'],
};
// Text messages on Eric's phone (speakers with `phone: true`) show the sender's portrait, as spoken lines do, with
// this face unless the line names one of theirs (Jørgen, 2026-10-04: "when showing mios message, should have her
// portrait too")
export const TEXT_PORTRAITS = {
  miotext: ['mio', 'phone'],
  reitext: ['rei', 'neutral'],
};
// Which way each portrait set faces in its source pictures: 'left' or 'right' (the viewer's) or 'front'. In a
// conversation the protagonist stands on the left facing right and the other speaker on the right facing left, both
// turned towards the text (Jørgen, 2026-10-09: "put MC on the left, facing towards the chat, with opposing character
// on the right facing left to the chat"), so a portrait facing away from the text is shown mirrored (ui/portraits.js).
// Every set here mirrors cleanly: no lettering on the clothes (the guard's plate and patch are blank) and nothing
// one-sided that the cast notes depend on. A missing entry counts as 'front' and is never mirrored.
export const FACING = {
  eric: 'left',
  carina: 'left',
  mio: 'left',
  aoi: 'left',
  kenji: 'left',
  rei: 'left',
  kuro: 'right',
  guard: 'right',
  mori: 'front',
  kuroda: 'front',
  emi: 'front',
};
