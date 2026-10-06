import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { characterRoutes, calendarStories, storyCast } from '../../bible/story-timeline-model.js';
import { SCENES } from '../../game3d/story/milestones/index.js';
const cast = fs.readFileSync(new URL('../../docs/game/cast.md', import.meta.url), 'utf8');
test('every authored character plan has six ordered stages; scripts do not imply playable', () => {
  const routes = characterRoutes(cast, SCENES);
  assert.equal(routes.length, 10);
  assert.deepEqual(routes.find(r => r.id === 'guard').steps.map(s => s.column), [0,1,2,3,4,5]);
  for (const route of routes) for (const step of route.steps) {
    assert.ok(step.text.length > 10);
    assert.notEqual(step.status, 'built');
    assert.equal(step.status === 'written', SCENES.some(s => s.who === route.id && s.step === step.column));
  }
});
test('calendar links only documented cast to the stated day, with no implied dependencies', () => {
  const routes = characterRoutes(cast);
  const stories = [{ id:'shared', title:'Lunch', day:2, cast:['mio','mori'], file:'lunch.md', status:'built' }, { id:'unknown', day:8, cast:['mio'], file:'x.md' }];
  const rows = calendarStories(stories, { 'lunch.md':'## Beats\n\nA shared meal.' }, routes);
  assert.equal(rows.find(r=>r.id==='kenji').steps.length,0);
  for (const id of ['mio','mori']) {
    const steps=rows.find(r=>r.id===id).steps;
    assert.equal(steps.length,1); assert.equal(steps[0].column,1); assert.equal(steps[0].source,'lunch.md');
  }
});

import { STORIES as day3 } from '../../game3d/story/day3/index.js';
test('day three cast comes from authored actors when its summary has no Cast section', () => {
  const ids = storyCast(day3);
  for (const id of ['mio', 'aoi', 'guard', 'emi', 'kuro', 'kenji']) assert.ok(ids.includes(id), id);
});
