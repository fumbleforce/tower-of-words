import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { idleExportOptions } from '../../tools/characters/idle-export-options.mjs';

test('approved idle export retains its existing default output and cast selection', () => {
  const config = idleExportOptions({}, []);
  assert.equal(config.output.href, new URL('../../game3d/assets/characters/', import.meta.url).href);
  assert.equal(config.onlyExtra, false);
  assert.equal(config.retargetArms, false);
  assert.deepEqual(config.extraIds, ['mori']);
  assert.deepEqual(['eric', 'mio', ...config.extraIds], ['eric', 'mio', 'mori']);
});

test('candidate export names only its explicit targets in its isolated directory', () => {
  const config = idleExportOptions({ IDLE_ONLY_EXTRA: '1', IDLE_OUTPUT: '/tmp/idle-candidate' }, ['swim-eric']);
  assert.equal(config.onlyExtra, true);
  assert.deepEqual(config.extraIds, ['swim-eric']);
  assert.equal(
    new URL('relaxed-idle-swim-eric.json', config.output).pathname,
    '/tmp/idle-candidate/relaxed-idle-swim-eric.json',
  );
  assert.throws(() => idleExportOptions({ IDLE_ONLY_EXTRA: '1' }, ['swim-eric']), /isolated/);
  assert.throws(() => idleExportOptions({ IDLE_ONLY_EXTRA: '1', IDLE_OUTPUT: '/tmp/idle-candidate' }, []), /explicit/);
  assert.throws(() => idleExportOptions({ IDLE_REST_ARMS: '1' }, ['eric']), /candidate-only/);
});

test('candidate export refuses built-in hosts and production outputs', () => {
  const candidate = { IDLE_ONLY_EXTRA: '1', IDLE_OUTPUT: '/tmp/idle-candidate' };
  for (const id of ['eric', 'mio']) assert.throws(() => idleExportOptions(candidate, [id]), /aliases/);
  const assets = new URL('../../game3d/assets/', import.meta.url).pathname;
  for (const output of [assets, assets + 'characters', assets + '../assets/characters/candidate'])
    assert.throws(() => idleExportOptions({ ...candidate, IDLE_OUTPUT: output }, ['swim-eric']), /outside/);
  const arms = idleExportOptions({ ...candidate, IDLE_REST_ARMS: '1' }, ['swim-eric']);
  assert.equal(arms.retargetArms, true);
});

test('candidate export cannot reach production output through a symlink', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'swim-idle-output-'));
  try {
    fs.symlinkSync(new URL('../../game3d/assets/', import.meta.url).pathname, path.join(temp, 'alias'));
    assert.throws(
      () =>
        idleExportOptions({ IDLE_ONLY_EXTRA: '1', IDLE_OUTPUT: path.join(temp, 'alias', 'characters', 'new') }, [
          'swim-eric',
        ]),
      /outside/,
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
