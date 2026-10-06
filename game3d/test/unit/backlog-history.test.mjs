import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

// Exercise the real save shape, backlog renderer and Japanese renderer. Only DOM/audio/portrait boundaries are stubbed.
registerHooks({
  load(url, context, next) {
    if (url.endsWith('/js/audio/core.js')) return { format: 'module', shortCircuit: true,
      source: 'export const paused=false; export function stopVoice(){} export const voice=()=>Promise.resolve();' };
    if (url.endsWith('/js/ui/portraits.js')) return { format: 'module', shortCircuit: true,
      source: 'export const thumbStyle=()=>"";' };
    if (url.endsWith('/js/ui/dom.js')) return { format: 'module', shortCircuit: true,
      source: 'export const el=()=>globalThis.__logPanel; export const $=()=>null;' };
    return next(url, context);
  },
});
const node = () => ({ innerHTML: '', textContent: '', hidden: true, children: {}, scrollHeight: 0,
  classList: { add() {}, remove() {} }, addEventListener() {}, focus() {},
  querySelector(s) { return this.children[s] ||= node(); }, querySelectorAll: () => [],
});
globalThis.__logPanel = node();
globalThis.window = { __game: { sim: { day: 1, period: 'morning' }, place: { name: 'gate' }, runner: { currentNode: 'guard_phone' } } };
globalThis.document = { body: { append() {}, classList: { contains: () => false } } };
globalThis.requestAnimationFrame = fn => fn();
const { logLine, logToJSON, logLoad, logSize, openLog, closeLog } = await import('../../js/ui/backlog.js');
const { known } = await import('../../js/lang.js');
const { nextDaySave } = await import('../../js/days.js');
const { LOG_LIMIT } = await import('../../js/ui/backlog-records.js');
const show = () => {
  openLog({ sayWord() {}, closed() {} });
  const html = globalThis.__logPanel.querySelector('.ls').innerHTML;
  closeLog();
  return html;
};
const readable = html => html.replace(/<span class="gx"[^>]*>[^<]*<\/span>/g, '').replace(/<[^>]+>/g, '');

test('an older-day raw line survives the real next-day save and becomes readable after learning', () => {
  logLoad(null, 1); known.clear();
  const text = 'アマカワ{honsha}です。';
  logLine({ k: 'line', who: 'guard', name: 'Guard', text, ov: true, clear: [], vk: 'old-line' });
  assert.doesNotMatch(readable(show()), /本社|honsha/);
  const next = nextDaySave({ day: 1, flags: {}, log: JSON.parse(JSON.stringify(logToJSON())) });
  globalThis.window.__game.sim.day = next.day;
  logLoad(next.log, next.day);
  assert.equal(logSize(), 1);
  known.add('honsha');
  assert.match(show(), /<span class="jp clear">本社<\/span>/);
  const [entry] = logToJSON().items;
  assert.equal(entry.text, text);
  assert.deepEqual(entry.knownAtTime, []);
  assert.deepEqual([entry.day, entry.period, entry.place, entry.node], [1, 'morning', 'gate', 'guard_phone']);
  assert.match(show(), /Day 1/);
});

test('legacy history keeps its original day without inventing historical knowledge or source', () => {
  logLoad({ day: 2, items: [{ k: 'line', who: 'mio', text: 'Hello.' }, { k: 'pick', html: 'Stay.' }] }, 3);
  const entries = logToJSON().items;
  assert.equal(entries.length, 2);
  assert(entries.every(e => e.day === 2 && e.knownAtTime === null));
  assert.equal(entries[0].place, undefined);
  assert.equal(entries[1].html, 'Stay.');
});

test('duplicate suppression is scoped to the encounter and never drops the same line on a later day', () => {
  logLoad(null, 1); globalThis.window.__game.sim.day = 1;
  const line = { k: 'line', who: 'mio', text: 'Good morning.' };
  logLine(line); logLine(line); assert.equal(logSize(), 1);
  globalThis.window.__game.sim.day = 2;
  logLine(line); assert.equal(logSize(), 2);
  globalThis.window.__game.runner.currentNode = 'another_greeting';
  logLine(line); assert.equal(logSize(), 3);
});

test('history stays bounded and loading another slot replaces rather than merges its conversations', () => {
  logLoad(null, 1);
  for (let i = 0; i < LOG_LIMIT + 3; i++) logLine({ k: 'line', text: `Line ${i}` });
  assert.equal(logSize(), LOG_LIMIT);
  assert.equal(logToJSON().items[0].text, 'Line 3');
  logLoad({ day: 1, items: [{ k: 'line', text: 'Other save.' }] }, 1);
  assert.equal(logSize(), 1);
  assert.equal(logToJSON().items[0].text, 'Other save.');
  logLoad(null, 1); assert.equal(logSize(), 0);
});

test('new entries snapshot mutable clear data and vocabulary instead of keeping live references', () => {
  logLoad(null, 1); known.clear(); known.add('matte');
  const clear = [{ ja: 'テスト', ro: 'tesuto', en: 'test' }];
  logLine({ k: 'line', text: 'テスト。', ov: true, clear });
  clear[0].en = 'changed'; known.add('ugoite');
  const [entry] = logToJSON().items;
  assert.deepEqual(entry.knownAtTime, ['matte']);
  assert.equal(entry.clear[0].en, 'test');
});
