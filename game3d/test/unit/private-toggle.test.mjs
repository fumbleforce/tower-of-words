// Private mode switched off and on mid-day at a place with a plugin (#604): a running plugin scene ends without its
// flag, nothing of it starts while off, it plays again when on, and a save made in one mode resumes in the other.
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register(new URL('../support/private-toggle-loader.mjs', import.meta.url));
const storage = new Map();
globalThis.localStorage = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) };
globalThis.window = globalThis;
globalThis.location = { hostname: 'example.test', origin: 'http://example.test', search: '', pathname: '/' };
globalThis.fetch = async () => ({ ok: false });
const { Runner, flags } = await import('../../js/runner.js');
const S = await import('../../js/sim.js');
const { known, seen } = await import('../../js/lang.js');
const { settings, setSetting } = await import('../../js/settings.js');
const { applyPlugin, watchPlacePlugins, portraitSource, setPortraitSource } = await import('../../js/plugins.js');

// The public story as its module has it, and a plugin for the place: a scene of its own on a pin, and a scene called
// from inside a public node (an inline step between B and C).
const publicStory = () => ({ on: {}, nodes: { bench: ['A', 'B', 'C', { inc: 'count' }, 'STOP', 'D'] } });
const plugin = {
  install({ story }) {
    story.nodes.enc = ['E1', 'ESTOP', { set: 'enc_seen' }];
    story.on['talk:enc'] = { if: 'private_mode && !enc_seen', node: 'enc' };
    story.nodes.inl = ['I1', 'ISTOP', { set: 'inl_done' }];
    story.nodes.bench.splice(2, 0, { if: 'private_mode && !inl_done', then: [{ call: 'inl' }] });
  },
};

let lines = [], stops = new Set(), atStop = null, closed = 0;
function ui(stopAt) {
  stops = new Set(stopAt);
  lines = [];
  let reached;
  atStop = new Promise((r) => (reached = r));
  globalThis.__saveTestUI = {
    say: (_who, line) => {
      lines.push(line);
      if (stops.has(line)) {
        stops.delete(line);
        reached(line);
        return new Promise(() => {});
      }
    },
    closeTalk: () => closed++,
  };
}

async function gameFor({ on, installed, saved }) {
  for (const key of Object.keys(flags)) delete flags[key];
  known.clear();
  seen.clear();
  settings.privateMode = on;
  const story = publicStory();
  const place = { name: 'plaza', people: {}, hooks: {} };
  const game = { hooks: {}, place, story, found: new Set(), sim: S.sim, queue: [], wait: async () => {},
    beat(fn) { this.running = fn(); return this.running; } };
  game.runner = new Runner(game);
  S.restore(game, saved || { v: 1, day: 1, period: 'lunch', flags: {}, rel: {} });
  if (installed) await applyPlugin(plugin, 'plaza', { game, story, place });
  game.runner.use(place, story);
  S.installSim(game);
  S.absorb({ people: {}, moments: {}, ...story });
  watchPlacePlugins(game);
  return game;
}

test('off mid-scene ends the plugin scene without its flag; on again it plays to the end', async () => {
  const game = await gameFor({ on: true, installed: true });
  ui(['ESTOP']);
  assert.equal(game.runner.trigger('talk:enc'), true);
  await atStop;
  closed = 0;
  setSetting('privateMode', false);
  await game.running;
  assert.equal(game.runner.frames.length, 0);
  assert.equal(flags.enc_seen, undefined, 'progress is not invented');
  assert.ok(closed > 0, 'the dialogue box closes');
  assert.equal(game.runner.trigger('talk:enc'), false, 'nothing of it starts while off');
  await game.runner.run('enc');
  assert.equal(flags.enc_seen, undefined, 'a direct run is refused while off');
  setSetting('privateMode', true);
  ui([]);
  assert.equal(game.runner.trigger('talk:enc'), true);
  await game.running;
  assert.deepEqual(lines, ['E1', 'ESTOP']);
  assert.equal(flags.enc_seen, true);
});

test('off inside a scene called from a public node: the public node carries on after the call', async () => {
  const game = await gameFor({ on: true, installed: true });
  ui(['ISTOP', 'STOP']);
  const running = game.runner.run('bench');
  await atStop;
  setSetting('privateMode', false);
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(lines, ['A', 'B', 'I1', 'ISTOP', 'C', 'STOP']);
  assert.equal(flags.count, 1);
  assert.equal(flags.inl_done, undefined);
  assert.deepEqual(game.runner.frames.map((f) => f.node), ['bench']);
  void running;
});

async function saveAt(opts, stopAt, node) {
  const game = await gameFor(opts);
  ui([stopAt]);
  if (node.startsWith('talk:')) game.runner.trigger(node);
  else void game.runner.run(node);
  await atStop;
  S.save(game);
  return S.loadSave();
}
async function resumeIn(opts, saved) {
  const game = await gameFor({ ...opts, saved });
  game.runner.restore(saved.runner);
  ui([]);
  const resumed = await game.runner.resume();
  return { game, resumed };
}

test('a save made on, mid public node after the inline step, resumes off with its done steps kept', async () => {
  const saved = await saveAt({ on: true, installed: true }, 'STOP', 'bench');
  assert.deepEqual(saved.runner.execution.frames[0].inserted, [2]);
  assert.ok(saved.runner.execution.frames[0].done.includes('[4]:inc'));
  const { game } = await resumeIn({ on: false, installed: false }, saved);
  assert.equal(game.runner.recoveryError, null);
  // an unfinished scene restarts its lines (checkpoint.test.mjs), and its done steps stay done
  assert.deepEqual(lines, ['A', 'B', 'C', 'STOP', 'D']);
  assert.equal(flags.count, 1);
});

test('a save made off resumes on with its done steps kept', async () => {
  const saved = await saveAt({ on: false, installed: false }, 'STOP', 'bench');
  assert.ok(saved.runner.execution.frames[0].done.includes('[3]:inc'));
  const { game } = await resumeIn({ on: true, installed: true }, saved);
  assert.equal(game.runner.recoveryError, null);
  // the restarted lines now pass the inline step, which plays, being on
  assert.deepEqual(lines, ['A', 'B', 'I1', 'ISTOP', 'C', 'STOP', 'D']);
  assert.equal(flags.count, 1);
  assert.equal(flags.inl_done, true);
});

test('a save made on inside the inline scene resumes off at the public step after it', async () => {
  const saved = await saveAt({ on: true, installed: true }, 'ISTOP', 'bench');
  assert.deepEqual(saved.runner.execution.frames.map((f) => !!f.optional), [false, true]);
  const { game } = await resumeIn({ on: false, installed: false }, saved);
  assert.equal(game.runner.recoveryError, null);
  assert.deepEqual(lines, ['A', 'B', 'C', 'STOP', 'D']);
  assert.equal(flags.count, 1);
});

test('a save made on in a plugin scene resumes off with no scene and no error, and on again in the scene', async () => {
  const saved = await saveAt({ on: true, installed: true }, 'ESTOP', 'talk:enc');
  const off = await resumeIn({ on: false, installed: false }, saved);
  assert.equal(off.resumed, false);
  assert.equal(off.game.runner.recoveryError, null);
  assert.deepEqual(lines, []);
  const on = await resumeIn({ on: true, installed: true }, saved);
  assert.equal(on.game.runner.recoveryError, null);
  assert.deepEqual(lines, ['E1', 'ESTOP']);
  assert.equal(flags.enc_seen, true);
});

test('a plugin portrait shows only while private mode is on', () => {
  setPortraitSource((who) => `private/${who}.webp`);
  settings.privateMode = true;
  assert.equal(portraitSource('mio', 'neutral'), 'private/mio.webp');
  settings.privateMode = false;
  assert.equal(portraitSource('mio', 'neutral'), null);
  setPortraitSource(null);
});
