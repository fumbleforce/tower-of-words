import { flagKeys } from '../../narrative/engine-flags.js';
const KEYS = flagKeys('game3d/js/places/ongoing/art-progress.js');
// This date records a completed activity, never simply entering the room.
export function completeFirstPage(flags, day) {
  if (!Number.isSafeInteger(day) || day < 1) throw new Error('Invalid art visit day');
  if (!flags[KEYS.art_first_day]) flags[KEYS.art_first_day] = day;
}
