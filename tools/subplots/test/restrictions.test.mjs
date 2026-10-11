// When a scene plays, read from its condition and written back (web/restrictions.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../web/restrictions.js';

const names = {
  person: id => ({ mio: 'Mio', rei: 'Rei', kuro: 'Kuro' })[id],
  word: id => (id === 'matte' ? { ja: '待って', en: 'wait' } : null),
  variable: () => null,
  scene: id => id.replace(/^enc_/, '').replaceAll('_', ' '),
  humanize: id => id.replaceAll('_', ' '),
};
const words = (model, scene = {}) => R.sentenceText(R.sentence(model, scene, names));

test('a private show condition reads as day, time, first time only, modes and needs', () => {
  const src = 'private_mode && skimpy_mode && day >= 4 && day < 5 && period_evening && d4_tennis_done && bond2_rei && !enc_d4_blister_seen';
  const m = R.readRestrictions(src, { seen: 'enc_d4_blister_seen' });
  assert.deepEqual(R.daysOf(m), { only: 4 });
  assert.deepEqual(R.periodsOf(m), ['evening']);
  assert.equal(m.once, true);
  assert.equal(R.writeRestrictions(m), src, 'nothing changed, the same text');
  assert.equal(words(m, { place: 'East coast' }),
    'Plays at East coast, on day 4, after work, only the first time, in private mode and with Skimpy on, after the tennis on day 4 and if you’ve reached step 2 with Rei.');
});

test('changing one part keeps the others exactly as written', () => {
  const src = 'private_mode && day >= 2 && day < 3 && period_morning && !enc_d2_scope_seen';
  let m = R.readRestrictions(src, { seen: 'enc_d2_scope_seen' });
  m = R.setPeriods(m, ['lunch', 'afternoon']);
  assert.equal(R.writeRestrictions(m), 'private_mode && day >= 2 && day < 3 && (period_lunch || period_afternoon) && !enc_d2_scope_seen');
  m = R.setDays(m, { only: 3 });
  assert.equal(R.writeRestrictions(m), 'private_mode && day == 3 && (period_lunch || period_afternoon) && !enc_d2_scope_seen');
  m = R.setOnce(m, false);
  assert.equal(R.writeRestrictions(m), 'private_mode && day == 3 && (period_lunch || period_afternoon)');
  assert.equal(m.once, false);
});

test('a public way in: time of day as a comparison, any day, first time from the entry', () => {
  let m = R.readRestrictions("!greeted_guard && period == 'lunch'", { once: true });
  assert.deepEqual(R.periodsOf(m), ['lunch']);
  assert.equal(m.once, true);
  m = R.setPeriods(m, []);
  assert.equal(R.writeRestrictions(m), '!greeted_guard');
  m = R.setPeriods(m, ['evening']);
  assert.equal(R.writeRestrictions(m), "!greeted_guard && period == 'evening'");
  assert.equal(words(m, { way: 'talk to the guard', place: 'Station security', placeFixed: true, day: 1 }),
    'Plays when talk to the guard at Station security, on day 1, after work, only the first time, unless greeted guard.');
});

test('days as a list, from a day on, and up to a day', () => {
  assert.deepEqual(R.daysOf(R.readRestrictions('(day == 7 || day == 14) && x')), { list: [7, 14] });
  assert.deepEqual(R.daysOf(R.readRestrictions('day >= 6 && ongoing_workday')), { from: 6 });
  assert.deepEqual(R.daysOf(R.readRestrictions('day <= 1 && going_home')), { only: 1 });
  assert.equal(R.daysPhrase({ from: 6 }), 'from day 6 on');
  assert.equal(R.daysPhrase({ list: [7, 14, 21] }), 'on days 7, 14 and 21');
  const m = R.setDays(R.readRestrictions('x'), { from: 2, to: 4 });
  assert.equal(R.writeRestrictions(m), 'x && day >= 2 && day <= 4');
});

test('needs in words, an unreadable part kept and removable', () => {
  const m = R.readRestrictions("met_mio && know_matte && step_kuro >= 4 && (a || b == 'x' && c)");
  const needs = R.needsOf(m);
  assert.deepEqual(needs.map(n => n.kind), ['need', 'need', 'need', 'custom']);
  assert.deepEqual(needs.slice(0, 3).map(n => R.needPhrase(n.need, names)), ['if you have met Mio', 'if you know 待って (wait)', 'if you’re at step 4 or more with Kuro']);
  const less = R.removePart(m, needs[3].index);
  assert.equal(R.writeRestrictions(less), 'met_mio && know_matte && step_kuro >= 4');
  const more = R.addNeed(less, { field: 'met_rei', op: 'false' });
  assert.equal(R.writeRestrictions(more), 'met_mio && know_matte && step_kuro >= 4 && !met_rei');
});

test('who plays', () => {
  let m = R.readRestrictions('mc_carina && day >= 6');
  assert.equal(R.whoOf(m), 'carina');
  m = R.setWho(m, '');
  assert.equal(R.writeRestrictions(m), 'day >= 6');
  m = R.setWho(m, 'eric');
  assert.equal(R.writeRestrictions(m), 'day >= 6 && !mc_carina');
});
