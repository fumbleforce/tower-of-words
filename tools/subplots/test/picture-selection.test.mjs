import test from 'node:test';
import assert from 'node:assert/strict';
import {clearPendingPicture, picturePick, picturePath} from '../web/picture-selection.js';
import {draftPictureUrl, fullUrl, thumbUrl, lightboxHtml} from '../../imagegen/web/gallery.js';

const url = '/api/subplots/draft-picture?' + new URLSearchParams({id: 'studio:public:' + 'a'.repeat(32), asset: 'b'.repeat(64)});
const saved = {slot: 'image:0', id: 'saved', url, applied: true};

test('discarding a pending studio picture restores an independent copy of the saved pick', () => {
  const doc = {studioDraft: true, images: [{id: 'image:0', savedPick: saved}], metadata: {images: {'image:0': {id: 'pending'}}}};
  clearPendingPicture(doc, 'image:0');
  assert.deepEqual(doc.metadata.images['image:0'], saved);
  doc.metadata.images['image:0'].id = 'changed';
  assert.equal(saved.id, 'saved');
});

test('discarding an ordinary or never-saved picture still removes its pending pick', () => {
  for (const studioDraft of [false, true]) {
    const doc = {studioDraft, images: [], metadata: {images: {'new:1': {id: 'pending'}}, image: {slot: 'new:1'}}};
    clearPendingPicture(doc, 'new:1');
    assert.deepEqual(doc.metadata, {images: {}});
  }
  const doc = {metadata: {images: {'image:0': {id: 'pending'}}}, images: [{id: 'image:0', savedPick: saved}]};
  clearPendingPicture(doc, 'image:0');
  assert.deepEqual(doc.metadata.images, {});
});

test('only an exact draft ID and asset hash permit an API picture source', () => {
  assert.equal(draftPictureUrl(url), url);
  assert.equal(picturePath({url, chosen: saved}), url);
  for (const invalid of [url + '&extra=1', url + '#x', url.replace('asset=', 'slot='),
    url.replace('public', 'other'), url.replace('b'.repeat(64), '../picture'),
    url.replace('b'.repeat(64), 'b'.repeat(63)), url.replace('a'.repeat(32), 'a'.repeat(31)),
    'https://example.org' + url, '/api/subplots/image/out/one.png']) {
    assert.equal(draftPictureUrl(invalid), '', invalid);
    if (invalid.startsWith('/api/')) assert.equal(picturePath({url: invalid}), '', invalid);
  }
  assert.equal(picturePath({url: '/art/approved/test%20image.png'}), 'art/approved/test image.png');
  assert.equal(picturePath({url: '/api/subplots/image/out/new.png', chosen: {file: 'new.png'}}), 'island/private/imagegen/outputs/new.png');
});

test('copied pictures use their durable URL for gallery, lightbox, selection and repaint', () => {
  const render = {id: 'saved', file: 'deleted.png', thumb: 'deleted-thumb.webp', url, seed: 42};
  assert.equal(fullUrl(render, '/api/subplots/image'), url);
  assert.equal(thumbUrl(render, '/api/subplots/image'), url);
  assert.match(lightboxHtml(render, {i: 0, n: 1}), /draft-picture/);
  assert.doesNotMatch(lightboxHtml(render, {i: 0, n: 1}), /deleted\.png/);
  const chosen = picturePick('image:0', render);
  assert.equal(chosen.file, undefined);
  assert.equal(picturePath({url: chosen.url, chosen}), url);
  assert.equal(fullUrl({...render, url: 'https://untrusted/image'}, '/api/subplots/image'), '/api/subplots/image/out/deleted.png');
});
