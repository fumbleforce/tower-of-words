// #292: a Day 2 jump preserves its selected history and renders actual authored Japanese accordingly.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

registerHooks({ resolve(specifier, context, next) {
  let source;
  if (context.parentURL?.endsWith('/js/continue.js')) {
    if (specifier === './sim.js') source = 'export const sim = {}; export const restore = () => {}; export const save = () => {}; export const loadSave = () => globalThis.dayTwoPriorSave;';
    if (specifier === './places/definitions.js') source = 'export const canTravel = () => false;';
    if (specifier === './end.js') source = 'export const showEnd = () => {};';
  }
  if (context.parentURL?.endsWith('/ui/dialogue-text.js') && specifier === '../audio/core.js') source = 'export const paused = false;';
  return source === undefined ? next(specifier, context) : { url: 'data:text/javascript,' + encodeURIComponent(source), shortCircuit: true };
} });
const { dayStartSave } = await import('../../js/continue.js');
const { sampleDayOneEnd } = await import('../../js/days.js');
const { known } = await import('../../js/lang.js');
const { heardHTML } = await import('../../js/ui/dialogue-text.js');
const { default: izakaya } = await import('../../story/day2/izakaya.js');
const welcome = izakaya.nodes.d2_supper.find(s => s.say === 'mori');
const render = save => {
  known.clear();
  for (const id of save.known) known.add(id);
  assert.equal(welcome.overheard, true, 'actual dinner line must use unknown-language rendering');
  assert.equal(welcome.en, undefined, 'English subtitles bypass unknown-language rendering');
  return heardHTML(welcome.text, welcome.clear);
};

test('a fresh Day 2 jump keeps sample knowledge and blurs the unlearned dinner greeting', () => {
  globalThis.dayTwoPriorSave = null;
  const opening = dayStartSave(2);
  assert.deepEqual(opening.known, sampleDayOneEnd().known);
  assert.equal(opening.known.includes('otsukare'), false);
  const html = render(opening);
  assert.match(html, /class="gx"/);
  assert.doesNotMatch(html, /jp clear|the everyday hello at work/);
});

test('a completed own save keeps its words and choices without adding sample knowledge', () => {
  const saved = { ...sampleDayOneEnd('mori'), known: ['otsukare', 'sumimasen'], yen: 3720 };
  globalThis.dayTwoPriorSave = structuredClone(saved);
  const opening = dayStartSave(2, 'mio');
  assert.deepEqual(opening.known, saved.known);
  assert.equal(opening.flags.lunch_mori, true);
  assert.equal(opening.flags.lunch_mio, undefined);
  assert.equal(opening.yen, 3720);
  assert.deepEqual(globalThis.dayTwoPriorSave, saved, 'starting a day must not mutate its source save');
  const html = render(opening);
  assert.match(html, /class="jp clear">お疲れさまです<\/span>/);
  assert.match(html, /otsukaresama desu, the everyday hello at work/);
  assert.match(html, /class="gx"/, 'the rest of Mori’s sentence remains unknown');
});

test('an unfinished earlier save uses the documented sample without leaking its vocabulary', () => {
  globalThis.dayTwoPriorSave = { ...sampleDayOneEnd('mori'), ended: false, known: ['otsukare'] };
  const opening = dayStartSave(2, 'cold');
  assert.deepEqual(opening.known, sampleDayOneEnd('cold').known);
  assert.equal(opening.flags.lunch_mori, undefined);
  assert.equal(opening.flags.lunch_mio, undefined);
  assert.doesNotMatch(render(opening), /jp clear/);
});
