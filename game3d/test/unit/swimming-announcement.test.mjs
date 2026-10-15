import assert from 'node:assert/strict';
import { test } from 'node:test';
import PLAZA from '../../story/day3/plaza.js';
import { poolMeeting } from '../../js/places/day3/pool-meeting.js';

test('Aoi announces tonight’s recurring pool meeting and keeps the poster and time lesson', () => {
  const scene = PLAZA.nodes.d3_aoi_name;
  const at = scene.findIndex(step => step?.say === 'aoi' && step.text?.includes('プール'));
  assert.ok(at >= 0);
  const announcement = scene[at];
  assert.match(announcement.text, /今夜/);
  assert.doesNotMatch(announcement.text, /最後|冬|夏|季節|閉ま|終わ/);
  assert.equal(announcement.overheard, true);
  assert.equal(announcement.emo, 'bright');
  assert.deepEqual(announcement.clear, ['プール']);
  assert.equal(scene[at + 1].say, 'eric');
  assert.match(scene[at + 1].text, /poster/);
  const lesson = scene[at + 2];
  assert.equal(lesson.if, '!know_rokuji');
  assert.ok(lesson.then.some(step => step.do === 'type' && step.word === 'rokuji'));
  for (const day of [3, 10, 17]) assert.equal(poolMeeting(day, 'evening'), true);
});
