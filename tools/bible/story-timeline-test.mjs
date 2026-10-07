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

import { recurringWeek } from '../../bible/story-timeline-model.js';
import { WEEK_REQUIREMENTS } from '../../bible/story-timeline-week.js';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'three') return next(new URL('../../game3d/vendor/three/three.module.js', import.meta.url).href, context);
  return next(specifier, context);
} });
const planURL = new URL('../../game3d/js/places/ongoing/plan.js', import.meta.url);
test('recurring adapter keeps conditional places, resolved club roles and seasonal meeting limits', () => {
  const rows = recurringWeek([{ id:'mio' }], { weeklyPlan: () => ({ office: { mio: { morning:{}, lunch:{if:'ticket_done'} } }, pool: { mio:{evening:{}} } }), roles: { engineer:{default:'mio'} }, clubs: {
    old: { members:['mio'], meets:[{weekday:'Mon',period:'evening',place:'pool',until:3}] },
    work: { name:'Shared lunch', members:['role:engineer'], meets:[{weekday:'Mon',period:'lunch',place:'office'}] },
  } });
  const monday = rows[0].steps.filter(s => s.column === 0);
  assert.deepEqual(monday.map(s => s.period), ['morning','lunch','evening']);
  assert.equal(monday[1].condition,'ticket_done'); assert.equal(monday[1].meetings[0].id,'work');
  assert.deepEqual(monday[2].meetings,[]); assert.equal(monday[1].status,'conditional');
  assert.ok(rows[0].steps.every(s => !['playable','built'].includes(s.status)));
  assert.deepEqual(recurringWeek([{id:'mio'}],{}),[{id:'mio',steps:[]}]);
});
test('actual recurring week resolves Tuesday art, Wednesday hosts, Saturday gym and Sunday tennis', { skip: !fs.existsSync(planURL) && 'Continuing-week source is not part of this build yet' }, async () => {
  const { weeklyPlan } = await import(planURL);
  const { default: data } = await import('../../game3d/story/clubs.js');
  const roles = JSON.parse(fs.readFileSync(new URL('../../game3d/data/cast/roles.json', import.meta.url))).roles;
  const requirements = Object.fromEntries(Object.entries(WEEK_REQUIREMENTS).map(([id, r]) => [id,{...r,reviewStatus:'open'}]));
  const rows = recurringWeek(characterRoutes(cast),{weeklyPlan,clubs:data.clubs,roles,requirements});
  const steps = id => rows.find(r => r.id===id).steps;
  assert.equal(steps('mori').find(s=>s.column===1&&s.period==='evening').status,'pending');
  for (const id of ['kenji','kuroda']) {
    const wednesday = steps(id).filter(s=>s.column===2&&s.period==='evening');
    assert.equal(wednesday.length,1); assert.equal(wednesday[0].place,'karaoke_booth');
    assert.equal(wednesday[0].meetings[0].id,'karaoke'); assert.equal(wednesday[0].status,'pending');
  }
  for (const id of ['emi','kuro']) assert.equal(steps(id).find(s=>s.column===5&&s.period==='evening').place,'gym');
  for (const id of ['aoi','rei']) assert.equal(steps(id).find(s=>s.column===6&&s.period==='evening').meetings[0].id,'tennis');
  assert.equal(steps('kenji').filter(s=>s.column===2&&s.period==='lunch').length,2,'both mutually exclusive ticket conditions remain visible');
  assert.ok(rows.flatMap(r=>r.steps).every(s=>!['built','playable'].includes(s.status)));
});
