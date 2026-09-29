import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fastResult } from '../support/fast-result.mjs';
import { waitForGame } from '../support/wait-ready.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const complete = { done: true, ended: true, errors: [] };
test('late movement failures are included in the final verdict', () => {
  const result = fastResult({ ...complete, move: { overlaps: ['collision'] } });
  assert.equal(result.verdict, 'FAIL');
  assert.match(result.errors.join(), /1 overlaps/);
});
test('missing completion, page errors and warnings cannot look like a full pass', () => {
  assert.equal(fastResult({ ended: true }).pass, false);
  assert.equal(fastResult({ done: true, ended: false }).pass, false);
  assert.equal(fastResult(complete, ['SyntaxError']).pass, false);
  const result = fastResult({ ...complete, move: { spins: [1] } }, [], { MOVE_WARN: true, SKIP_CHECKS: true });
  assert.equal(result.verdict, 'PASS WITH OVERRIDES');
  assert.deepEqual(result.activeOverrides, ['MOVE_WARN', 'SKIP_CHECKS']);
  assert.equal(fastResult(complete).verdict, 'PASS');
});
test('startup failure reports the actual script error and removes its listener', async () => {
  const page = new EventEmitter();
  page.waitForFunction = () => new Promise(() => {});
  const boot = waitForGame(page);
  page.emit('pageerror', new Error('Unexpected token at main.js:12'));
  await assert.rejects(boot, /Game startup failed: Unexpected token at main.js:12/);
  assert.equal(page.listenerCount('pageerror'), 0);
});
test('missing startup modules fail with their URL instead of waiting for readiness', async () => {
  const page = new EventEmitter();
  page.waitForFunction = () => new Promise(() => {});
  const boot = waitForGame(page);
  page.emit('response', { status: () => 404, request: () => ({ resourceType: () => 'script' }), url: () => 'http://local/main.js' });
  await assert.rejects(boot, /Script HTTP 404: http:\/\/local\/main.js/);
  for (const event of ['pageerror', 'response', 'requestfailed']) assert.equal(page.listenerCount(event), 0);
});
test('caught asynchronous boot failures report the visible startup error', async () => {
  const page = new EventEmitter();
  page.waitForFunction = async (predicate, mode) => {
    const oldWindow = globalThis.window, oldDocument = globalThis.document;
    try {
      globalThis.window = { __game: {} };
      globalThis.document = { querySelector: () => null };
      assert.ok(!predicate(mode), 'an early __game object is not ready');
      globalThis.window.__game = { place: {}, walker: {} };
      assert.ok(!predicate(mode), 'fast mode also waits for the test driver');
      globalThis.document = { querySelector: () => ({ textContent: 'Could not load Mio: HTTP 404' }) };
      assert.ok(predicate(mode), 'caught boot failure resolves the startup wait');
    } finally { globalThis.window = oldWindow; globalThis.document = oldDocument; }
  };
  page.evaluate = async () => 'Could not load Mio: HTTP 404';
  await assert.rejects(waitForGame(page), /Game startup failed: Could not load Mio: HTTP 404/);
  assert.equal(page.listenerCount('pageerror'), 0);
});
test('normal play readiness waits for title departure to finish', async () => {
  const page = new EventEmitter();
  page.waitForFunction = async (predicate, mode) => {
    const oldWindow = globalThis.window, oldDocument = globalThis.document;
    const classes = new Set(['title-leaving']);
    try {
      globalThis.window = { __game: { place: {}, walker: {} } };
      globalThis.document = { querySelector: () => null, body: { classList: { contains: name => classes.has(name) } } };
      assert.equal(predicate(mode), false);
      classes.delete('title-leaving');
      assert.equal(predicate(mode), true);
    } finally { globalThis.window = oldWindow; globalThis.document = oldDocument; }
  };
  page.evaluate = async () => null;
  await waitForGame(page, 1000, async () => {}, 'play');
});
test('default syntax discovery includes browser and story JavaScript', () => {
  const result = spawnSync(process.execPath, [path.join(root, 'tools/check/syntax.mjs'), '--list'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const files = new Set(JSON.parse(result.stdout));
  for (const required of ['game3d/js/main.js', 'game3d/story/train.js', 'bible/app.js', 'tools/check/syntax.mjs']) assert.ok(files.has(required), required);
});
test('real syntax checker rejects malformed JavaScript without running it', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'syntax-negative-'));
  try {
    const fixture = path.join(temp, 'bad.mjs');
    fs.writeFileSync(fixture, 'export const broken = ;');
    const result = spawnSync(process.execPath, [path.join(root, 'tools/check/syntax.mjs'), fixture], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /SYNTAX FAIL/);
  } finally { fs.rmSync(temp, { recursive: true }); }
});
test('real story checker rejects a missing destination in an isolated copy', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'story-negative-'));
  try {
    for (const folder of ['js', 'story']) fs.cpSync(path.join(root, 'game3d', folder), path.join(temp, folder), { recursive: true });
    fs.mkdirSync(path.join(temp, 'tools'));
    fs.copyFileSync(path.join(root, 'game3d/tools/story-check.mjs'), path.join(temp, 'tools/story-check.mjs'));
    const story = path.join(temp, 'story/train.js');
    const source = fs.readFileSync(story, 'utf8');
    assert.match(source, /nodes:\s*\{/);
    fs.writeFileSync(story, source.replace(/nodes:\s*\{/, "nodes: { gate_negative_fixture: [{ go: '__missing_gate_fixture__' }],"));
    const result = spawnSync(process.execPath, [path.join(temp, 'tools/story-check.mjs')], { encoding: 'utf8' });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /__missing_gate_fixture__/);
  } finally { fs.rmSync(temp, { recursive: true }); }
});
