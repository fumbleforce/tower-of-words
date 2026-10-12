// A fall Eric doesn't walk away from (jumping off the dorm walkway, say) ends in the clinic: the screen fades to
// black, and he comes to on the clinic's examination bed (places/clinic.js), where the nurse checks on him
// (story/clinic.js, the `wake` node).
//   await sendToClinic(game, from)   from: the place he fell in ('dorms'); sets the story flags `fell_from` (that
//                                    place, cleared once the wake-up has played) and `falls` (how many times so far),
//                                    fades to black (ui.fade), and travels to the clinic as fast travel from the plaza.
//                                    The clinic fades back in itself. Resolves false if the clinic could not be
//                                    reached; he is then left where he was, the screen faded back in.
import { flags } from '../narrative/state.js';

export async function sendToClinic(game, from = game.place?.name) {
  flags.fell_from = from || 'outside';
  flags.falls = (flags.falls || 0) + 1;
  await game.ui.fade('', '', 300);
  const went = await game.travel('clinic', { fast: true, via: 'plaza' });
  if (went !== false) return true;
  flags.fell_from = false;
  await game.ui.unfade();
  return false;
}
