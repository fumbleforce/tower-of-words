import { mioLunchOffer } from './eligibility.js';
import { flagKeys } from '../../narrative/engine-flags.js';
const KEYS = flagKeys('game3d/js/places/mio-lunch/state.js');

const PHASES = {
  2: ['offered', 'accepted', 'seated', 'ate', 'settled'],
  3: ['offered', 'accepted', 'held', 'away', 'inspected', 'marked', 'returned', 'settled'],
};

// Physical progress belongs to the place snapshot, not to durable quest flags.
export function mioLunchState(saved = null) {
  let state = null;
  function restore(value) {
    if (value === null || value === undefined) {
      state = null;
      return;
    }
    const { step, day, phase } = value;
    if (![2, 3].includes(step) || !PHASES[step].includes(phase) || !Number.isInteger(day) || day < 5)
      throw new Error('Invalid Mio lunch staging snapshot');
    state = { step, day, phase };
  }
  function offer(context) {
    const step = mioLunchOffer(context);
    if (!step) throw new Error('Mio lunch is unavailable');
    state = { step, day: context.day, phase: 'offered' };
    return step;
  }
  function advance(phase) {
    const order = PHASES[state?.step];
    if (!order || order[order.indexOf(state.phase) + 1] !== phase)
      throw new Error(`Invalid Mio lunch transition: ${state?.phase || 'idle'} to ${phase}`);
    state.phase = phase;
  }
  function completion(context) {
    if (!state || state.phase !== 'settled') throw new Error('Mio lunch has not physically finished');
    if (context.day !== state.day || context.period !== 'lunch' || context.place !== 'office')
      throw new Error('Mio lunch completion is outside its accepted period');
    if (mioLunchOffer(context) !== state.step) throw new Error('Mio lunch completion is no longer eligible');
    return state.step;
  }
  restore(saved);
  return {
    offer,
    advance,
    completion,
    restore,
    clear: () => {
      state = null;
    },
    snapshot: () => state && { ...state },
    get phase() {
      return state?.phase || 'idle';
    },
    get step() {
      return state?.step || null;
    },
  };
}

// Runner owns the synchronous effect boundary. Every rejecting condition is checked before flags change.
export function completeMioLunch(state, context, { step, text }, hooks) {
  if (![2, 3].includes(step) || typeof text !== 'string' || !text.trim())
    throw new Error('Invalid Mio lunch completion');
  const key = step === 2 ? KEYS.ms2_mio : KEYS.ms3_mio;
  const { flags } = context;
  if (flags[key]) return false;
  if (state.completion(context) !== step) throw new Error('Mio lunch completion does not match the accepted scene');
  for (const name of ['release', 'remember', 'bondStep', 'period'])
    if (typeof hooks[name] !== 'function') throw new Error('Missing Mio lunch completion service: ' + name);
  hooks.release();
  if (step === 2) flags[KEYS.ms2_mio] = true;
  else flags[KEYS.ms3_mio] = true;
  if (step === 3) hooks.bondStep({ who: 'mio', to: 3 });
  hooks.remember({ who: 'mio', id: `milestone${step}`, text });
  state.clear();
  hooks.period({ to: 'afternoon' });
  return true;
}
