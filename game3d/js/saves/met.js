import { flagKeys } from '../narrative/engine-flags.js';
const KEYS = flagKeys('game3d/js/saves/met.js');
// People history is authoritative; older/sample saves may omit its derived story flags.
export function restoreMet(save, flags) {
  const met = new Set(save.met || []);
  Object.assign(flags, save.flags || {});
  for (const key of Object.keys(flags)) if (key.startsWith(KEYS.met)) delete flags[key];
  for (const id of met) flags[KEYS.met + id] = true;
  return met;
}
