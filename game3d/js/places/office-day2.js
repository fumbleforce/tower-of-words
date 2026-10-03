// B2 on day 2 (story/day2/office.js, docs/game/places.md "Who's there when"): before the shift ends Emi waits by the
// lift lobby, Mori is at the chief's desk, Kenji at his and Mio at hers beside Eric's; after work Emi is upstairs and the other
// three have gone ahead to the gathering, so nobody from the party is left here. Applied on entering (before the lift
// doors open, so nobody moves in view) and again by the story's officeDay2 hook (office.js registers hook and calls
// install(P) once its place is made).
import { flags } from '../narrative/state.js';
import { sit, armsLap } from '../cast.js';
import { K } from '../scenes/office.js';

export function officeDay2(game, { people, blobs }) {
  let P = null;
  const show = (id, on) => {
    const r = id === 'mio' ? game.mioNpc : people[id];
    if (!r?.root) return;
    r.root.visible = on;
    if (r.blob) r.blob.visible = on;
    if (blobs[id]) blobs[id].visible = on;
  };
  function atDesks() {
    const mori = people.mori;
    if (!mori.seated) {
      sit(mori);
      mori.root.position.set(2.16, 0.03 * K, -3.36);
      mori.root.rotation.y = -Math.PI / 2;
      armsLap(mori);
      mori.seated = true;
      blobs.mori?.position.set(2.2, 0.004, -3.36);
    }
    // Mio at her own desk beside his; on the warm history she is at the station until his report is in
    const promised = flags.lunch_mio || (flags.mio_warm || 0) >= 2;
    const mio = !promised || flags.d2_ticket_done;
    if (mio) P.placeSeated('mio', 'mio_seat');
    for (const id of ['emi', 'kenji', 'mori']) show(id, true);
    show('mio', mio);
  }
  function apply(state) {
    if (state === 'afterWork' || flags.d2_shift_done) for (const id of ['emi', 'kenji', 'mori', 'mio']) show(id, false);
    else atDesks();
    for (const id of ['aoi', 'rei']) show(id, false);
  }
  return {
    hook: ({ state = 'arrive' } = {}) => apply(state),
    install(place) {
      P = place;
      const day = P.onDay;
      P.onDay = (d) => {
        day?.(d);
        if (d > 1) apply('arrive');
      };
    },
  };
}
