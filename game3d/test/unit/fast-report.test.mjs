import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { fastResult } from '../support/fast-result.mjs';

// Exercise the real CLI reporting path with a controlled browser lifecycle.
const url = new URL('../../tools/fast.mjs', import.meta.url);
const source = fs.readFileSync(url, 'utf8');
const reporting = source.slice(source.indexOf("const [W = '1366'"))
  .replaceAll('import.meta.url', JSON.stringify(url.href));
async function report({ lateError, lifecycleError, deferred = false } = {}) {
  const pageErrors = [], writes = [], logs = [];
  const process = { argv: ['node', 'fast.mjs'], env: {}, pid: 42 };
  const page = {
    waitForFunction: async () => {},
    evaluate: async () => ({ done: true, ended: true, places: ['train', 'gate', 'office'] }),
    screenshot: async () => { if (lateError) pageErrors.push(lateError); },
  };
  await vm.runInNewContext(`(async () => { ${reporting} })()`, {
    process, Date, URL, path, fileURLToPath, fastResult, writePerf: () => [],
    fs: { mkdirSync() {}, writeFileSync: (file, data) => writes.push(JSON.parse(data)) },
    console: { log: (...args) => logs.push(args.join(' ')) },
    openGame: async () => ({ page, errors: pageErrors }),
    withBrowserJob: async (_name, callback) => {
      if (deferred) throw Object.assign(new Error('machine busy'), { code: 'LOAD_DEFERRED' });
      await callback({});
      if (lifecycleError) throw new Error(lifecycleError);
    },
  });
  assert.equal(writes.length, 1, 'exactly one final artifact');
  assert.equal(logs.filter(line => /^(PASS|FAIL|DEFERRED)\b/.test(line)).length, 1, 'exactly one verdict');
  return { result: writes[0], exit: process.exitCode };
}
test('late page errors during capture fail the otherwise complete route', async () => {
  const { result, exit } = await report({ lateError: 'late script failure' });
  assert.equal(exit, 1);
  assert.equal(result.verdict, 'FAIL');
  assert.ok(result.errors.includes('late script failure'));
});
test('lifecycle deadline after route completion produces only FAIL and keeps route evidence', async () => {
  const { result, exit } = await report({ lifecycleError: 'deadline expired' });
  assert.equal(exit, 1);
  assert.equal(result.verdict, 'FAIL');
  assert.equal(result.run.ended, true);
  assert.ok(result.errors.includes('deadline expired'));
});
test('load admission is reported as deferred with its own exit status', async () => {
  const { result, exit } = await report({ deferred: true });
  assert.equal(exit, 75);
  assert.equal(result.verdict, 'DEFERRED');
});
test('completed lifecycle reports one passing result', async () => {
  const { result, exit } = await report();
  assert.equal(exit, 0);
  assert.equal(result.verdict, 'PASS');
});
