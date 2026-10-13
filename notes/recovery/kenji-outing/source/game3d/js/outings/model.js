const STOPS = new Set(['arcade', 'drink', 'coast']);
const PERIODS = new Set(['early', 'morning', 'lunch', 'afternoon', 'evening']);
const STATUSES = new Set(['idle', 'active', 'paused', 'ended']);

// Save data only. The controller supplies observed completions and schedule availability.
export function readOuting(value) {
  const saved = value && typeof value === 'object' ? value : {};
  const stops = [...new Set(Array.isArray(saved.stops) ? saved.stops.filter((stop) => STOPS.has(stop)) : [])];
  return {
    status: STATUSES.has(saved.status) ? saved.status : 'idle',
    day: Number.isInteger(saved.day) && saved.day >= 2 ? saved.day : null,
    period: PERIODS.has(saved.period) ? saved.period : null,
    stops,
    pending: STOPS.has(saved.pending) && !stops.includes(saved.pending) ? saved.pending : null,
    callback: STOPS.has(saved.callback) ? saved.callback : null,
  };
}

export function canInvite({ day, period, weekend, met, visible, available } = {}) {
  return !!(
    Number.isInteger(day) &&
    day >= 2 &&
    met &&
    visible &&
    available &&
    PERIODS.has(period) &&
    (weekend ? period !== 'early' : period === 'evening')
  );
}

export function inviteOuting(value, context) {
  const state = readOuting(value);
  if (!canInvite(context) || !['idle', 'ended'].includes(state.status)) return state;
  return {
    status: 'active',
    day: context.day,
    period: context.period,
    stops: [],
    pending: null,
    callback: state.callback,
  };
}

export function pauseOuting(value) {
  const state = readOuting(value);
  return state.status === 'active' ? { ...state, status: 'paused' } : state;
}

export function resumeOuting(value, context) {
  const state = readOuting(value);
  if (state.status !== 'paused' || !canInvite(context)) return state;
  return { ...state, status: 'active', day: context.day, period: context.period };
}

export function finishOuting(value) {
  const state = readOuting(value);
  if (!['active', 'paused'].includes(state.status)) return state;
  return { ...state, status: 'ended', pending: null, callback: state.stops.at(-1) || state.callback };
}

export function beginStop(value, stop) {
  const state = readOuting(value);
  if (state.status !== 'active' || state.pending || !STOPS.has(stop) || state.stops.includes(stop)) return state;
  return { ...state, pending: stop };
}

// Call only after the existing activity reports success; choosing a destination cannot complete a stop.
export function completeStop(value, stop) {
  const state = readOuting(value);
  if (state.status !== 'active' || state.pending !== stop || !STOPS.has(stop)) return state;
  return { ...state, stops: [...state.stops, stop], pending: null };
}

export function cancelStop(value) {
  return { ...readOuting(value), pending: null };
}
