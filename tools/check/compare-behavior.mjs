// Strict first comparison: retain ordering and every saved field. Normalizations require measured evidence.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export function differences(a, b, at = '', out = []) {
  if (Object.is(a, b)) return out;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) {
    out.push({ path: at, before: a, after: b });
    return out;
  }
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) differences(a[key], b[key], `${at}/${key}`, out);
  return out;
}

export function compareTraces(before, after) {
  assert(before.result?.pass && after.result?.pass && !before.error && !after.error, 'Both captures must pass');
  const inputs = ['version', 'settings', 'manifest', 'build', 'browser', 'renderer', 'harness', 'randomAlgorithm'];
  for (const key of inputs) assert(before[key] !== undefined && after[key] !== undefined, `Missing capture input: ${key}`);
  for (const capture of [before, after]) {
    assert(capture.run?.done && capture.run.ended && capture.trace?.events?.length, 'Missing completed route evidence');
    assert(capture.trace.final?.save?.ended && capture.trace.final.save.runner?.execution === null, 'Missing final idle save');
    for (const [url, response] of Object.entries(capture.responses)) {
      const local = capture.sources[url.slice(1)] || capture.harness[url.slice(1)];
      if (local) assert.equal(response.hash, local, `Server served a different source: ${url}`);
    }
    for (const required of ['index.html', 'build.json', 'js/main.js', 'js/lang.js', 'js/runner.js', 'js/menu.js'])
      assert.equal(capture.responses[`/game3d/${required}`]?.status, 200, `Missing critical fingerprint: ${required}`);
  }
  const inputDifferences = inputs.flatMap(key => differences(before[key], after[key], key));
  const assets = data => Object.fromEntries(Object.entries(data.responses).filter(([url]) => !Object.hasOwn(data.sources, url.slice(1))));
  inputDifferences.push(...differences(assets(before), assets(after), 'responses'));
  const trace = data => ({ ...data.trace, saves: data.trace.saves.map(save => ({ ...save, json: JSON.parse(save.json) })) });
  return { inputDifferences, sourceDifferences: differences(before.sources, after.sources, 'sources'),
    behaviorDifferences: [...differences(trace(before), trace(after), 'trace'),
      ...differences(before.run, after.run, 'run')] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [a, b, output] = process.argv.slice(2);
  assert(a && b, 'Usage: compare-behavior.mjs before.json after.json [diff.json]');
  const report = compareTraces(JSON.parse(fs.readFileSync(a, 'utf8')), JSON.parse(fs.readFileSync(b, 'utf8')));
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  const pass = !report.inputDifferences.length && !report.behaviorDifferences.length;
  console.log(`${pass ? 'PASS' : 'FAIL'} behavior comparison: ${report.inputDifferences.length} input, ${report.behaviorDifferences.length} behavior differences; ${report.sourceDifferences.length} source files changed`);
  for (const difference of [...report.inputDifferences, ...report.behaviorDifferences].slice(0, 20)) console.log(JSON.stringify(difference));
  process.exitCode = pass ? 0 : 1;
}
