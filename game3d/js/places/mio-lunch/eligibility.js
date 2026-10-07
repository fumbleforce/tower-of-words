import { isWeekend } from '../ongoing/calendar.js';

// Only the two built weekday scenes can be offered. Step 2 is not a prerequisite for step 3.
export function mioLunchOffer({ day, period, place, flags, available = true }) {
  if (!Number.isInteger(day) || day < 5 || isWeekend(day) || period !== 'lunch' || place !== 'office') return null;
  if (!available || !flags.met_mio || flags.ms3_mio) return null;
  if (flags.bondready_mio === 3) return 3;
  return flags.step_mio >= 2 && !flags.ms2_mio ? 2 : null;
}
