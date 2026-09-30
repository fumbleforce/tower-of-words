// The fast test's performance numbers: writes perf.json to the run's folder, prints one summary line, and warns
// (never fails) when a place is more than the tolerance over its baseline in game3d/tools/perf/budgets.json.
// PERF_BASELINE=1 makes a passing run's numbers the baseline for its layout (desktop or phone), quality tier and GL
// (gpu or software). Tier 0 baselines are under the layout's name, others under `<layout>-q<tier>` (phone-q1).
// How to read it: notes/PERF.md, "Performance metrics".
import fs from 'node:fs';
import path from 'node:path';

export const BUDGETS = new URL('../../tools/perf/budgets.json', import.meta.url);
export const budgetKey = (report) => (report.quality ? `${report.layout}-q${report.quality}` : report.layout);
const K = n => n >= 10000 ? `${Math.round(n / 1000)}k` : String(n);

// Numbers over their baseline by more than the tolerance. Draw calls and triangles are compared for every GL;
// frame times only against the baseline taken with the same GL (software rendering is 10x slower).
export function perfWarnings(report, budgets) {
  const warnings = [];
  const tol = budgets?.tolerance ?? 0.2;
  if (!report) return warnings;
  const layout = budgets?.[budgetKey(report)];
  if (!layout) {
    if (report.quality && budgets?.[report.layout]) warnings.push(`no baseline for ${budgetKey(report)}; not compared`);
    return warnings;
  }
  if (layout.quality != null && report.quality != null && layout.quality !== report.quality) {
    warnings.push(`baseline is for quality ${layout.quality}, this run is ${report.quality}; not compared`);
    return warnings;
  }
  for (const [name, now] of Object.entries(report.places || {})) {
    const base = layout.places?.[name];
    if (!base) continue;
    const check = (label, value, limit, unit = '') => {
      if (limit > 0 && value > limit * (1 + tol))
        warnings.push(`${name} ${label} ${value}${unit} is ${Math.round((value / limit - 1) * 100)}% over the baseline ${limit}${unit}`);
    };
    check('draw calls', now.calls, base.calls);
    check('triangles', now.tris, base.tris);
    const ms = base[report.gl];
    if (ms) {
      check('median frame', now.medianMs, ms.medianMs, ' ms');
      check('1% low frame', now.p99Ms, ms.p99Ms, ' ms');
    }
  }
  return warnings;
}

export function perfSummary(report) {
  if (!report || !Object.keys(report.places || {}).length) return 'perf: no numbers (the recorder did not run)';
  const parts = Object.entries(report.places).map(([name, p]) =>
    `${name} ${p.medianMs}/${p.worstMs} ms, ${p.calls} calls, ${K(p.tris)} tris`);
  const peaks = Object.entries(report.places).filter(([, p]) => p.callsMaxAt).map(([name, p]) => {
    const a = p.callsMaxAt;
    return `${name} ${p.callsMax} (visit ${a.visit}, ${(a.ms / 1000).toFixed(1)} s in, Eric ${a.x},${a.z}${a.trip ? ', in a trip' : ''})`;
  });
  return `perf (${report.layout}, ${report.gl}, q${report.quality}; median/worst frame, median calls and tris): ${parts.join(' | ')}` +
    (peaks.length ? `\nperf peaks (max sampled calls, when): ${peaks.join(' | ')}` : '');
}

export function baselineFrom(report, budgets = {}, build = '') {
  const out = { tolerance: 0.2, ...budgets };
  const key = budgetKey(report);
  const layout = out[key] = { ...(out[key] || {}) };
  layout.viewport = report.viewport;
  layout.quality = report.quality;
  layout.places = { ...(layout.places || {}) };
  for (const [name, p] of Object.entries(report.places)) {
    layout.places[name] = { ...(layout.places[name] || {}), calls: p.calls, tris: p.tris,
      [report.gl]: { medianMs: p.medianMs, p99Ms: p.p99Ms, build } };
  }
  return out;
}

// Called by fast.mjs after the route. Returns the lines it printed, for callers that want them.
export function writePerf(output, report, { build = '', pass = true, baseline = !!process.env.PERF_BASELINE } = {}) {
  const lines = [];
  if (report) fs.writeFileSync(path.join(output, 'perf.json'), JSON.stringify(report, null, 2));
  lines.push(perfSummary(report));
  let budgets = null;
  try { budgets = JSON.parse(fs.readFileSync(BUDGETS, 'utf8')); } catch { /* no baseline yet */ }
  if (baseline && !pass) lines.push('perf: the run failed, so the baseline was not changed');
  else if (report && baseline && Object.keys(report.places || {}).length) {
    fs.writeFileSync(BUDGETS, JSON.stringify(baselineFrom(report, budgets || {}, build), null, 2) + '\n');
    lines.push(`perf: baseline for ${budgetKey(report)} (${report.gl}) written to game3d/tools/perf/budgets.json`);
  } else for (const w of perfWarnings(report, budgets)) lines.push('PERF WARN ' + w);
  for (const line of lines) console.log(line);
  return lines;
}
