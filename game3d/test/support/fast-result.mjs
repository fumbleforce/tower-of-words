// Aggregate every failure before callers print a verdict; warning overrides remain visible.
export function fastResult(run = {}, pageErrors = [], overrides = {}) {
  const errors = [...pageErrors, ...(run.errors || [])];
  const count = value => Array.isArray(value) ? value.length : Number(value || 0);
  const overlaps = count(run.move?.overlaps), spins = count(run.move?.spins);
  if (!run.done) errors.push('route did not finish before the deadline');
  if (!run.ended) errors.push('day-end checkpoint was not reached');
  if ((overlaps || spins) && !overrides.MOVE_WARN) errors.push(`movement: ${overlaps} overlaps, ${spins} spins`);
  // the gait check (js/movement/gait-watch.js): someone stepping on the spot or sliding for 2.4 s or more
  const gait = count(run.gait?.long);
  if (gait && !overrides.MOVE_WARN) errors.push(`gait: ${gait} people stepping on the spot or sliding`);
  const activeOverrides = Object.keys(overrides).filter(key => overrides[key]);
  const pass = errors.length === 0;
  return { pass, verdict: pass ? (activeOverrides.length ? 'PASS WITH OVERRIDES' : 'PASS') : 'FAIL', errors, overlaps, spins, gait, activeOverrides };
}
