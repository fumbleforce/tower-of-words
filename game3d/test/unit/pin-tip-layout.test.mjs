import assert from 'node:assert/strict';
import test from 'node:test';
import { pinTipPosition } from '../../js/ui/pin-tip-layout.js';

const box = (x0, y0, x1, y1) => ({ x0, y0, x1, y1 });
const overlaps = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
function place(pin, width, height, viewport, avoid) {
  const p = pinTipPosition(pin, width, height, viewport, avoid);
  const result = box(p.x, p.y, p.x + width, p.y + height);
  assert(result.x0 >= viewport.x0 + 8 && result.x1 <= viewport.x1 - 8);
  assert(result.y0 >= viewport.y0 + 8 && result.y1 <= viewport.y1 - 8);
  return result;
}

test('a clear tooltip retains its familiar position above the pin', () => {
  assert.deepEqual(pinTipPosition(box(200, 200, 230, 230), 180, 40, box(0, 0, 800, 600)), { x: 125, y: 152 });
});

test('the post-conversation tooltip clears Eric, the passenger and the E prompt', () => {
  // Attempt 05: the old above-pin label crossed Eric at x1353..1436, y755..800.
  const pin = box(1458, 809, 1488, 839);
  const keep = [box(1353, 665, 1436, 855), box(1410, 801, 1550, 940), box(1495, 808, 1535, 850)];
  const original = structuredClone(keep);
  const result = place(pin, 314, 48, box(0, 0, 2560, 1440), keep);
  for (const obstacle of [pin, ...keep]) assert(!overlaps(result, obstacle));
  assert(result.x0 - pin.x1 < 100, 'the label remains beside the passenger pin');
  assert.deepEqual(keep, original, 'shared screen bounds are not mutated');
});

test('phone and desktop edges retain a readable label without covering bodies', () => {
  for (const width of [390, 1366]) {
    for (const [x, y] of [[2, 5], [width - 32, 5], [2, 600], [width - 32, 600]]) {
      const pin = box(x, y, x + 30, y + 30);
      const target = box(x - 15, y + 30, x + 45, y + 110);
      const result = place(pin, 230, 42, box(0, 0, width, 844), [target]);
      assert(!overlaps(result, target));
      assert(!overlaps(result, pin));
    }
  }
});

test('wrapped HUD and goal boxes stay clear when there is room below them', () => {
  const pin = box(300, 125, 330, 155);
  const keep = [box(10, 10, 380, 102), box(10, 110, 230, 154), box(290, 154, 355, 280)];
  const result = place(pin, 250, 44, box(0, 0, 390, 844), keep);
  for (const obstacle of [pin, ...keep]) assert(!overlaps(result, obstacle));
});

test('a crowded viewport keeps the tooltip on screen instead of suppressing it', () => {
  const pin = box(175, 200, 205, 230);
  const viewport = box(0, 0, 390, 320);
  const result = place(pin, 280, 44, viewport, [box(0, 0, 390, 320)]);
  assert.equal(result.x1 - result.x0, 280);
});

test('a long label stays beside its pin instead of floating above the player', () => {
  // Reconstructed from attempt07 originals, not an exact DOM geometry capture.
  // The report retained the 314.47 x 48.02 label; the pin/body boxes are estimates.
  const pin = box(1458, 807, 1488, 837);
  const keep = [box(1353, 652, 1436, 855), box(1410, 801, 1550, 1100), box(1495, 808, 1535, 850)];
  const result = place(pin, 314.46875, 48.015625, box(0, 0, 2560, 1440), keep);
  for (const obstacle of [pin, ...keep]) assert(!overlaps(result, obstacle));
  assert(result.x0 > pin.x1 && result.x0 - pin.x1 < 80, 'label is beside the target, not above Eric');
  assert(result.y0 <= (pin.y0 + pin.y1) / 2 && result.y1 >= (pin.y0 + pin.y1) / 2);
});
