import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diningActions } from '../../js/places/izakaya/actions.js';
test('leaving cancels nested dining awaits without applying their later actor or food changes', async () => {
  const a = diningActions();
  let finishOld,
    touches = 0,
    cleaned = 0;
  const old = a.run(async (job) => {
    try {
      await job.wait(new Promise((r) => (finishOld = r)));
      touches++;
    } finally {
      if (job.live()) cleaned++;
    }
  });
  a.cancel();
  await old;
  assert.equal(touches, 0);
  assert.equal(cleaned, 0);
  await a.run(async (job) => {
    await job.wait(Promise.resolve());
    touches++;
  });
  finishOld();
  await Promise.resolve();
  assert.equal(touches, 1);
  assert.equal(cleaned, 0);
});
test('cancelling parallel toast hands leaves no continuation, while real errors remain visible', async () => {
  const a = diningActions();
  let touches = 0;
  const old = a.run((job) =>
    Promise.all(
      Array.from({ length: 5 }, async () => {
        await job.wait(new Promise(() => {}));
        touches++;
      }),
    ),
  );
  a.cancel();
  await old;
  assert.equal(touches, 0);
  await assert.rejects(
    a.run(async () => {
      throw new Error('missing cup');
    }),
    /missing cup/,
  );
});
