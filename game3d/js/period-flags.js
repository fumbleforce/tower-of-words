// The clock's period flags, kept by sim.js: period_<p> is true for the period the clock is in and false for the
// others, so only one is true at a time (period_early, period_morning, period_lunch, period_afternoon,
// period_evening). Its own file because sim.js's `period` flag and the `period_` prefix share a key name in
// narrative/engine-flags.js. docs/game/systems.md, "Day clock".
import { flags } from './narrative/state.js';
import { flagKeys } from './narrative/engine-flags.js';
const ENGINE_KEYS = flagKeys('game3d/js/period-flags.js');

export function markPeriod(p, periods) {
  for (const q of periods) flags[ENGINE_KEYS.period + q] = q === p;
}
