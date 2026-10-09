import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captionTop } from '../../js/ui/caption-layout.js';

const caption = { left: 60, right: 330, height: 60 };
const player = (y0, y1, x0 = 100, x1 = 220) => ({ x0, x1, y0, y1 });

test('close interior framing cannot lift captions off screen', () => {
  for (const head of [-250, -1, 0, 40, 71]) {
    const top = captionTop(caption, 300, 844, [player(head, 600)]);
    assert.equal(top, 228, `head at ${head}: retain the dialogue-safe row when no clear row fits`);
    assert(top >= 12 && top + caption.height <= 288);
  }
});

test('a clear row above the player is used when the whole caption fits', () => {
  assert.equal(captionTop(caption, 300, 844, [player(84, 600)]), 12);
  assert.equal(captionTop(caption, 600, 844, [player(420, 580)]), 348);
  assert.equal(captionTop(caption, 600, 844, [player(-300, 450)]), 528, 'room below an offscreen head');
});

test('multiple projected characters reserve space without mutating their shared bounds', () => {
  const boxes = [player(300, 430), player(420, 580)];
  assert.equal(captionTop(caption, 600, 844, boxes), 228);
  assert.equal(boxes[0].y0, 300);
  assert.equal(captionTop(caption, 600, 844, [player(-300, 600, 340, 400)]), 528, 'outside caption width');
});

test('portrait and viewport edges keep captions readable even when UI leaves no clear row', () => {
  assert.equal(captionTop(caption, -100, 844, []), 12);
  assert.equal(captionTop(caption, 65, 844, []), 12);
  assert.equal(captionTop(caption, 1000, 844, []), 772);
  assert.equal(captionTop({ ...caption, height: 140 }, 200, 844, [player(-200, 600)]), 48);
});
