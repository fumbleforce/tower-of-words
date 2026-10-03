import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { boundedCommand } from '../../../tools/lib/bounded-command.mjs';

test('deadlines and successful parent exit both stop grandchildren', async t => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-command-fixture-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  for (const hang of [true, false]) {
    const output = path.join(cwd, String(hang));
    const grandchild = `setTimeout(() => require('node:fs').writeFileSync(${JSON.stringify(output)}, 'leaked'), 700)`;
    const source = `require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(grandchild)}], {stdio: 'ignore'}).unref();` +
      (hang ? 'setInterval(() => {}, 1000);' : '');
    const job = boundedCommand(process.execPath, ['-e', source], { cwd, env: process.env, timeoutMs: 200, stdio: 'ignore' });
    if (hang) await assert.rejects(job, /exceeded/);
    else await job;
    await delay(800);
    assert(!fs.existsSync(output), 'grandchild survived the owning command');
  }
});

test('abort, spawn failure and nonzero exit fail explicitly', async () => {
  const controller = new AbortController();
  const options = { cwd: process.cwd(), env: process.env, timeoutMs: 1000, stdio: 'ignore' };
  const timer = setTimeout(() => controller.abort(new Error('fixture cancellation')), 100);
  try {
    await assert.rejects(boundedCommand(process.execPath, ['-e', 'setInterval(() => {}, 1000)'],
      { ...options, signal: controller.signal }), /fixture cancellation/);
  } finally { clearTimeout(timer); }
  await assert.rejects(boundedCommand('/nonexistent/codex-fixture-command', [], options), /ENOENT/);
  await assert.rejects(boundedCommand(process.execPath, ['-e', 'process.exit(7)'], options), /failed \(7\)/);
});
