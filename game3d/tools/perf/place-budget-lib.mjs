// The place budget check's rules, apart from the browser so they can be unit tested (test/unit/place-budget.test.mjs).
// place-budgets.json holds one budget per quality tier and, per place, tier and number, the known exceptions: a higher
// ceiling (max) with the issue that will bring it down. An exception is a ratchet: the place may not get worse than it.

export const METRICS = {
  calls: { label: 'draw calls', show: v => String(Math.round(v)) },
  tris: { label: 'triangles', show: v => `${Math.round(v / 1000)}k` },
  geoMB: { label: 'geometry MB', show: v => v.toFixed(1) },
  texMB: { label: 'texture MB', show: v => v.toFixed(1) },
  loadMs: { label: 'load ms', show: v => String(Math.round(v)) },
};

// The limit for one number: the place's exception if it has one, else the tier's budget.
export function limitFor(budgets, tier, place, metric) {
  const own = budgets.places?.[place]?.[tier]?.[metric];
  if (own) return { limit: own.max, issue: own.issue, exception: true };
  const limit = budgets.budgets?.[tier]?.[metric];
  return limit == null ? null : { limit, exception: false };
}

// Every number over its limit, as { tier, place, metric, value, limit, issue, exception }. A place that didn't open
// is a failure of its own ({ error }).
export function overBudget(budgets, results) {
  const over = [];
  for (const [tier, places] of Object.entries(results)) {
    for (const [place, r] of Object.entries(places)) {
      if (r.error) { over.push({ tier, place, error: r.error }); continue; }
      for (const metric of Object.keys(METRICS)) {
        const value = r[metric], rule = limitFor(budgets, tier, place, metric);
        if (value == null || !rule) continue;
        const allowance = budgets.allowance?.[metric] || 0;
        if (value > rule.limit * (1 + allowance)) over.push({ tier, place, metric, value, allowance, ...rule });
      }
    }
  }
  return over;
}

// Exceptions that are no longer needed (the place is back under the tier budget) or name no issue.
export function staleExceptions(budgets, results) {
  const notes = [];
  for (const [place, tiers] of Object.entries(budgets.places || {})) {
    for (const [tier, own] of Object.entries(tiers)) {
      for (const [metric, e] of Object.entries(own)) {
        const m = METRICS[metric], budget = budgets.budgets?.[tier]?.[metric], r = results[tier]?.[place];
        if (!e.issue) notes.push(`${place} (${tier}): the ${m.label} exception names no issue`);
        if (r && !r.error && budget != null && r[metric] <= budget * (1 + (budgets.allowance?.[metric] || 0)))
          notes.push(`${place} (${tier}): ${m.label} ${m.show(r[metric])} is back under the budget ${m.show(budget)}; remove its exception`);
      }
    }
  }
  return notes;
}

export function describe(o) {
  if (o.error) return `${o.place} (${o.tier}) did not open: ${o.error}`;
  const m = METRICS[o.metric];
  const rule = o.exception ? `its known-exception ceiling ${m.show(o.limit)} (#${o.issue})` : `the ${o.tier} budget ${m.show(o.limit)}`;
  const allowance = o.allowance ? ` and its ${Math.round(o.allowance * 100)}% allowance for run-to-run noise` : '';
  return `${o.place} (${o.tier}): ${m.show(o.value)} ${m.label}, over ${rule}${allowance}`;
}

// The lower of two runs, number by number: a retry only clears noise (moving crowds, a busy machine), it can't add.
export function lower(a, b) {
  if (!a || a.error) return b;
  if (!b || b.error) return a;
  const out = { ...a };
  for (const metric of Object.keys(METRICS)) if (a[metric] != null && b[metric] != null) out[metric] = Math.min(a[metric], b[metric]);
  return out;
}

// A fixed-width table of every place and tier, worst camera per number.
export function table(budgets, results) {
  const tiers = Object.keys(results);
  const places = [...new Set(tiers.flatMap(t => Object.keys(results[t])))];
  const head = ['place', ...tiers.flatMap(t => Object.keys(METRICS).map(m => `${t} ${m}`))];
  const rows = places.map(place => [place, ...tiers.flatMap(t => Object.keys(METRICS).map(metric => {
    const r = results[t][place];
    if (!r) return '';
    if (r.error) return 'ERR';
    if (r[metric] == null) return '-';
    const rule = limitFor(budgets, t, place, metric);
    const flag = rule && r[metric] > rule.limit * (1 + (budgets.allowance?.[metric] || 0)) ? '!' : rule?.exception ? '*' : '';
    return METRICS[metric].show(r[metric]) + flag;
  }))]);
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)));
  return [head, ...rows].map(r => r.map((c, i) => i ? c.padStart(widths[i]) : c.padEnd(widths[i])).join('  ')).join('\n');
}
