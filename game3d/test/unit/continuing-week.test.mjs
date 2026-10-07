import assert from 'node:assert/strict';
import { test } from 'node:test';
import { weekdayOf, isWeekend, isContinuing } from '../../js/places/ongoing/calendar.js';
import { registerHooks } from 'node:module';
const hook = registerHooks({ resolve(id, context, next) {
  return next(id === 'three' ? new URL('../../vendor/three/three.module.js', import.meta.url).href : id, context);
} });
const { weeklyPlan } = await import('../../js/places/ongoing/plan.js');
hook.deregister();

const periods = ['morning', 'lunch', 'afternoon', 'evening'];
function active(spec, period, signoff, selectorDone, mioLunchDone = false) {
  if (!spec) return false;
  if (Array.isArray(spec)) return spec.some(s => active(s, period, signoff, selectorDone, mioLunchDone));
  if (spec.if === 'ms3_mio') return mioLunchDone;
  if (spec.if === '!ms3_mio') return !mioLunchDone;
  if (spec.if === "period != 'evening'") return period !== 'evening';
  if (spec.if === '!d3_signoff_walk') return !signoff;
  if (spec.if === 'd3_signoff_walk') return signoff;
  if (spec.if === "ticket_T0008 == 'done'") return selectorDone;
  if (spec.if === "ticket_T0008 != 'done'") return !selectorDone;
  return true;
}
test('continuing calendar keeps actual weekdays across weeks and months', () => {
  assert.equal(weekdayOf(1), 4);
  assert.equal(weekdayOf(6), 2);
  assert.equal(weekdayOf(13), 2);
  assert.equal(weekdayOf(32), 0);
  assert.equal(isWeekend(10), true);
  assert.equal(isWeekend(12), false);
  assert.equal(isContinuing(5), false);
  assert.equal(isContinuing(6), true);
  assert.equal(isContinuing(6.5), false);
});
test('a recurring resident has one location in each period, including deferred station checks', () => {
  for (let day = 6; day <= 40; day++) for (const period of periods) for (const signoff of [false, true]) for (const selectorDone of [false, true]) for (const mioLunchDone of [false, true]) {
    const here = new Map();
    for (const [place, residents] of Object.entries(weeklyPlan(day)))
      for (const [who, per] of Object.entries(residents)) {
        if (!active(per[period] ?? per['*'], period, signoff, selectorDone, mioLunchDone)) continue;
        assert.equal(here.has(who), false, `day ${day} ${period}: ${who} at ${here.get(who)} and ${place}`);
        here.set(who, place);
      }
  }
});
test('club hosts return on their weekday without the introductory date', () => {
  for (const day of [6, 13, 34]) assert.ok(weeklyPlan(day).dorm_commons.mori.evening);
  for (const day of [7, 14, 35]) {
    assert.ok(weeklyPlan(day).karaoke_booth.kenji.evening);
    assert.ok(weeklyPlan(day).karaoke_booth.kuroda.evening);
  }
  for (const day of [10, 17, 38]) {
    assert.ok(weeklyPlan(day).gym.emi.evening);
    assert.ok(weeklyPlan(day).gym.kuro.evening);
    assert.deepEqual(weeklyPlan(day).pool.emi, {});
  }
  for (const day of [11, 18, 39]) {
    assert.ok(weeklyPlan(day).sports.rei.evening);
    assert.ok(weeklyPlan(day).sports.aoi.evening);
  }
});

test('all continuing destinations connect to home, including the western island and B2', async () => {
  const { TRIPS } = await import('../../story/ongoing/routes.js');
  for (const start of Object.keys(TRIPS)) {
    const reached = new Set([start]);
    for (const place of reached) for (const to of TRIPS[place]) {
      assert.ok(TRIPS[to], `Unknown destination ${to}`);
      reached.add(to);
    }
    assert.equal(reached.size, Object.keys(TRIPS).length, `Disconnected destination from ${start}`);
  }
});

test('art progress respects completed milestone saves and separates consecutive meetings', async () => {
  const { artNodes } = await import('../../story/ongoing/art.js');
  const { compileCondition } = await import('../../js/narrative/conditions.js');
  const { completeFirstPage } = await import('../../js/places/ongoing/art-progress.js');
  const route = (flags) => {
    for (const step of artNodes.ongoing_art) {
      if (step.go) return step.go;
      if (step.if && compileCondition(step.if).evaluate(key => flags[key] ?? false)) {
        const target = step.then.find(x => x.go);
        if (target) return target.go;
      }
    }
  };
  assert.equal(route({ day: 6, met_mori: true, bondready_mori: 3 }), 'ongoing_art_photo');
  assert.equal(route({ day: 13, ms3_mori: true }), 'ongoing_art_return');
  assert.equal(route({ day: 13, ms2_mori: true, bondready_mori: 3 }), 'ongoing_art_tea');
  const save = { day: 6, art_photo_seen: true, art_first_page: true, bondready_mori: 3 };
  completeFirstPage(save, 6);
  assert.equal(route(save), 'ongoing_art_practice');
  const continued = JSON.parse(JSON.stringify(save));
  assert.equal(route(continued), 'ongoing_art_practice');
  continued.day = 13;
  completeFirstPage(continued, 13);
  assert.equal(continued.art_first_day, 6);
  assert.equal(route(continued), 'ongoing_art_tea');
  const steps = artNodes.ongoing_art_first_page;
  assert.ok(steps.findIndex(x => x.do === 'bond') < steps.findIndex(x => x.if === 'step_mori >= 2'));
});

test('Mori stops promising a missing photograph once the player has actually seen it', async () => {
  const { default: story } = await import('../../story/conversations/mori.js');
  const { compileCondition } = await import('../../js/narrative/conditions.js');
  const choices = story.nodes.conversation_mori.find(x => x.choice).choice;
  for (const evidence of ['art_photo_seen', 'ms2_mori', 'ms3_mori']) {
    const flags = { [evidence]: true, mori_photos_requested: true, mori_return_asked: true, know_mitai: true };
    const visible = choices.filter(x => !x.if || compileCondition(x.if).evaluate(key => flags[key] ?? false));
    assert.ok(visible.some(x => x.go === 'conversation_mori_drawing'));
    assert.ok(!visible.some(x => /photos|return|see_word/.test(x.go)));
  }
});

test('sleep carries personal progress into the next week without replaying the opening day', async () => {
  const { nextDaySave, dayOf, storyPath, LAST_DAY, canStartNextDay } = await import('../../js/days.js');
  const { canTravel } = await import('../../js/places/definitions.js');
  assert.equal(LAST_DAY, 5, 'title day picker stays finite');
  const prev = { day: 5, flags: { ticket_T0004: 'progress', art_first_day: 6 }, known: ['mitai'],
    bonds: { p: { mori: { pts: 12 } } }, ended: true, world: { previous: true }, runner: { execution: {} } };
  const next = nextDaySave(prev);
  assert.equal(next.day, 6);
  assert.equal(next.place, 'dorms');
  assert.equal(next.period, 'morning');
  assert.equal(next.flags.ticket_T0004, 'progress');
  assert.deepEqual(next.known, prev.known);
  assert.deepEqual(next.bonds, prev.bonds);
  assert.equal(next.ended, false);
  assert.equal(next.runner.execution, undefined);
  assert.equal(next.world.previous, undefined);
  for (const day of [6, 13, 32, 100]) {
    assert.equal(dayOf(day).dir, 'ongoing/');
    assert.equal(storyPath('dorms', day), '../story/ongoing/dorms.js');
    assert.equal(canTravel('sports', 'office_quarter', day), true);
    assert.equal(canTravel('works', 'office', day), false);
    assert.equal(canStartNextDay(day), true);
  }
});


test('later-week map includes every public route and next morning clears one-time preview selectors', async () => {
  const { openToday, openEver } = await import('../../js/travel/rules.js');
  const { ROUTES } = await import('../../story/ongoing/routes.js');
  const { dayExitUrl } = await import('../../js/days.js');
  for (const day of [6, 13, 100]) {
    assert.deepEqual(new Set(openToday(day)), new Set(Object.keys(ROUTES)));
    for (const place of Object.keys(ROUTES)) assert.ok(openEver(day).has(place));
  }
  const next = new URL(dayExitUrl('http://localhost/game3d/?day=6&place=office&history=cold&skip=1&test=fast&route=first&cap=1&mc=carina&q=0'));
  assert.equal(next.search, '?mc=carina&q=0');
});


test('reused repair endings use the current calendar while keeping specific next steps', async () => {
  const { continuingGoals } = await import('../../story/ongoing/goals.js');
  const { goal: sunday } = await import('../../story/day4/shared.js');
  const { goal: saturday } = await import('../../story/day3/shared.js');
  const specific = { do: 'goal', text: 'Print today’s bookings on the printer behind the counter.', at: 'gym_printer' };
  const source = [...saturday('gym_door'), ...sunday('gym_door'), specific];
  const replaced = continuingGoals(source), steps = [];
  const visit = value => { if (!value || typeof value !== 'object') return; if (value.do) steps.push(value); Object.values(value).forEach(visit); };
  visit(replaced);
  assert.equal(steps.filter(step => step.do === 'goal').length, 1);
  assert.deepEqual(steps.find(step => step.do === 'goal'), specific);
  assert.ok(steps.filter(step => step.do === 'ongoingGoal').length >= 4);
  assert.ok(JSON.stringify(source).includes('Sunday is yours'));
  assert.ok(!JSON.stringify(replaced).includes('outdoor pool tonight'));
});
