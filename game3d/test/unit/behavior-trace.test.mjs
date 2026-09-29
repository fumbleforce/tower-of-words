import assert from 'node:assert/strict';
import vm from 'node:vm';
import { test } from 'node:test';
import { installBehaviorTrace } from '../support/behavior-trace.mjs';

function fixture() {
  const context = vm.createContext({});
  vm.runInContext(`
    class Storage {
      setItem(key, value) {
        if (key === 'fail') throw new Error('storage denied');
        this[key] = String(value);
        return 'written';
      }
    }
    const localStorage = new Storage();
    const window = {};
    (${installBehaviorTrace.toString()})({ seed: 20260929 });
  `, context);
  return code => vm.runInContext(code, context);
}

test('trace observers preserve callbacks, actual resolution count and once peeks', () => {
  const run = fixture();
  run(`
    let calls = 0, callbackThis, callbackArgs;
    const game = { place: null, runner: null, flagsRef: { x: 1 },
      onNode(...args) { callbackThis = this; callbackArgs = args; return 42; } };
    window.__game = game;
    game.place = { name: 'train' };
    game.runner = { entry(key, options) {
      if (this !== game.runner) throw new Error('wrong receiver');
      calls++;
      return options?.peek ? null : { node: key };
    } };
  `);
  assert.equal(run(`game.onNode('start', 'start')`), 42);
  assert.equal(run('callbackThis === game'), true);
  assert.equal(run(`callbackArgs.join(',')`), 'start,start');
  assert.equal(run(`game.runner.entry('talk:mio', { peek: true })`), null);
  assert.equal(run(`game.runner.entry('talk:mio').node`), 'talk:mio');
  assert.equal(run('calls'), 2);
  assert.equal(run(`window.__behaviorTrace.events.filter(e => e.kind === 'resolution').length`), 1);
  assert.equal(run(`Object.getOwnPropertyDescriptor(window, '__game').value === game`), true);
});

test('successful autosaves and events share an ordered timeline with immutable flags', () => {
  const run = fixture();
  run(`window.__game = { place: null, runner: null, flagsRef: { x: 1 } }`);
  assert.equal(run(`localStorage.setItem('amakawa-day1-save', '{"v":1}')`), 'written');
  run(`window.__game.onNode('opening', 'start'); window.__game.flagsRef.x = 2`);
  assert.equal(run('window.__behaviorTrace.events[0].flags.x'), 1);
  assert.equal(run('window.__behaviorTrace.events[0].sequence'), 1);
  assert.equal(run('window.__behaviorTrace.saves[0].sequence'), 0);
  assert.equal(run('window.__behaviorTrace.saves[0].json'), '{"v":1}');
  assert.throws(() => run(`localStorage.setItem('fail', 'value')`), /storage denied/);
  run(`new Storage().setItem('amakawa-day1-save', '{}')`);
  assert.equal(run('window.__behaviorTrace.saves.length'), 1);
});

test('the same seed supplies the same random stream without fixing time', () => {
  const a = fixture(), b = fixture();
  for (let i = 0; i < 20; i++) assert.equal(a('Math.random()'), b('Math.random()'));
  assert.equal(a('Date.now() > 0'), true);
});

test('presentation observes rendered text while preserving the original promise and exceptions', () => {
  const run = fixture();
  run(`
    const panel = { hidden: true, textContent: '' };
    const document = { querySelector: () => panel };
    const pending = new Promise(() => {});
    const ui = { say(speaker, text) {
      if (this !== ui) throw new Error('wrong receiver');
      if (text === 'fail') throw new Error('UI failed');
      panel.hidden = false; panel.textContent = speaker.name + ': ' + text;
      return pending;
    } };
    window.__game = { place: { name: 'train' }, runner: null, flagsRef: {}, ui };
  `);
  assert.equal(run(`ui.say({name: 'Mio'}, 'Morning.') === pending`), true);
  assert.equal(run(`window.__behaviorTrace.events[0].text`), 'Mio: Morning.');
  assert.equal(run(`window.__behaviorTrace.events[0].hidden`), false);
  assert.throws(() => run(`ui.say(null, 'fail')`), /UI failed/);
  assert.equal(run(`window.__behaviorTrace.events.length`), 1);
});
