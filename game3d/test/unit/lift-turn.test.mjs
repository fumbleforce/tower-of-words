import assert from 'node:assert/strict';
import { test } from 'node:test';
import { turnInLift } from '../../js/places/lift-turn.js';

async function sample(from, to, player = true) {
  const root = { rotation: { y: from } }, samples = [];
  let synced = 0, duration = 0;
  const walker = { facing: -7, sync() { synced++; assert.equal(this.facing, root.rotation.y); } };
  const game = { player: { root: player ? root : {} }, walker };
  await turnInLift(game, root, to, async (_, seconds, draw) => {
    duration = seconds;
    for (let i = 0; i <= 240; i++) {
      const k = i / 240;
      draw(k * k * (3 - 2 * k));
      samples.push({ time: k * seconds, angle: root.rotation.y });
    }
  });
  return { root, samples, duration, synced, walker };
}

test('a scripted half-turn is monotonic and stays below the stationary-spin speed', async () => {
  const { root, samples, duration, synced } = await sample(Math.PI, 0);
  assert.ok(duration > 1 && duration < 2.5);
  assert.ok(Math.abs(root.rotation.y) < 1e-10);
  assert.equal(synced, 1);
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    assert.ok(b.angle <= a.angle);
    assert.ok(Math.abs((b.angle - a.angle) / (b.time - a.time)) < 3);
  }
});

test('crossing the angle wrap takes the short turn and does not slow tiny adjustments', async () => {
  const from = Math.PI - 0.02, to = -Math.PI + 0.02;
  const result = await sample(from, to);
  assert.ok(Math.abs(result.root.rotation.y - from - 0.04) < 1e-10);
  assert.ok(result.duration <= 0.5);
});

test('turning another lift rider cannot alter the player walker', async () => {
  const { walker, synced, root } = await sample(0, 0.5, false);
  assert.equal(root.rotation.y, 0.5);
  assert.equal(walker.facing, -7);
  assert.equal(synced, 0);
});
