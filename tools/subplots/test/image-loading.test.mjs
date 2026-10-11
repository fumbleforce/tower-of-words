import test from 'node:test';
import assert from 'node:assert/strict';
import {blockData, directionText, localBlockHtml} from '../web/image-block-words.js';
import {placeKey} from '../web/block-examples.js';

const composition = {environment:'room',light:'day',style:'paint',framing:'wide',negatives:['clean'],blockOverrides:{
  location:{room:{text:'a sunny terrace'}},style:{paint:{quality:'ink drawing',anchors:''}},negative:{clean:{text:''}},
}};
test('saved shot words and preview keys work before presets load, including explicit null', () => {
  const before = JSON.stringify(composition);
  for (const presets of [null, undefined, {}]) {
    assert.deepEqual(blockData(composition, presets, 'style', 'paint'), {quality:'ink drawing',anchors:''});
    assert.deepEqual(blockData(composition, presets, 'framing', 'wide'), {});
    assert.equal(directionText(composition, presets, 'location', 'room'), 'a sunny terrace');
    assert.match(localBlockHtml(composition, presets, 'style', 'paint'), /ink drawing/);
    assert.match(placeKey('room', 'day', composition, presets), /^place:room\|day\|/);
  }
  assert.equal(JSON.stringify(composition), before);
});
