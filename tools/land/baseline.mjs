// A place that is over its budget on main must not block every land that re-measures it. When a place measures over
// its ceiling on the batch's tip, the runner measures the same place on the batch's base (main) and refuses the land
// only if the tip is worse than main beyond the noise margin below; a place no worse than main lands with a loud
// warning that names the overage and its issue. The overages come from the candidate's own place-budget-lib.mjs
// (overBudget), and its METRICS name and format the numbers. Tested in game3d/test/unit/land-queue.test.mjs.

// How much worse than main a number may measure and still count as the same (run-to-run noise: crowds, a busy machine).
export const NOISE = { calls: 0.02, tris: 0.02, geoMB: 0.02, texMB: 0.02, loadMs: 0.15 };

// over: what overBudget() found on the tip ({ tier, place, metric, value, limit, issue, exception } or { error });
// base: main's numbers for those places ({ tier: { place: result } }). Splits them into worse (refuse) and held (no
// worse than main: land, with a warning). A place that didn't open, or has no number on main to compare with, is worse.
export function judgeOverages(over, base, noise = NOISE) {
  const worse = [], held = [];
  for (const o of over) {
    if (o.error) { worse.push(o); continue; }
    const r = base?.[o.tier]?.[o.place], was = r && !r.error ? r[o.metric] : null;
    if (was == null) { worse.push({ ...o, base: null }); continue; }
    (o.value > was * (1 + (noise[o.metric] ?? 0)) ? worse : held).push({ ...o, base: was });
  }
  return { worse, held };
}

const ceiling = (o, metrics) => `${o.exception ? 'its known-exception ceiling' : `the ${o.tier} budget`} ${metrics[o.metric].show(o.limit)}${o.issue ? ` (#${o.issue})` : ''}`;

export function heldWarning(o, metrics) {
  const m = metrics[o.metric];
  return `WARNING: ${o.place} (${o.tier}) is over ${ceiling(o, metrics)} with ${m.show(o.value)} ${m.label}, `
    + `but main measures ${m.show(o.base)}, so this land doesn't make it worse and goes through. The overage stays open${o.issue ? ` in #${o.issue}` : ''}.`;
}

export function worseLine(o, metrics) {
  if (o.error) return `${o.place} (${o.tier}) did not open: ${o.error}`;
  const m = metrics[o.metric];
  const was = o.base == null ? 'no number on main to compare with' : `main measures ${m.show(o.base)}`;
  return `${o.place} (${o.tier}): ${m.show(o.value)} ${m.label}, over ${ceiling(o, metrics)}, and ${was}`;
}
