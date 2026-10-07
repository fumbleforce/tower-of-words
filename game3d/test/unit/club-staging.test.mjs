import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clubStageReady } from '../../js/clubs/staging.js';

test('missing or unapproved ongoing stages cannot consume a club visit', () => {
  for (const [club, key] of Object.entries({ art: 'artClub', karaoke: 'karaokeClub', swimming: 'winterClub' })) {
    assert.equal(clubStageReady(10, club, {}), false);
    assert.equal(clubStageReady(10, club, { [key]: { performanceReady: true, ready: () => false } }), false);
    assert.equal(clubStageReady(10, club, { [key]: { performanceReady: true, ready: () => true } }), true);
    assert.equal(clubStageReady(10, club, { [key]: { performanceReady: true, ready: false } }), false);
    assert.equal(clubStageReady(10, club, { [key]: { performanceReady: true, ready: true } }), true);
  }
});
test('the original swim and tennis sessions retain their existing eligibility', () => {
  assert.equal(clubStageReady(3, 'swimming', {}), true);
  assert.equal(clubStageReady(11, 'tennis', {}), true);
});

test('physical karaoke staging alone cannot start an unheard performance', () => {
  assert.equal(clubStageReady(7, 'karaoke', { karaokeClub: { ready: true } }), false);
  assert.equal(clubStageReady(7, 'karaoke', { karaokeClub: { ready: true, performanceReady: false } }), false);
});
