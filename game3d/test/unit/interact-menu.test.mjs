// Interact, the one E action (gameplay/interact-menu.js): which story beat, topics and added options it offers, and
// what runs.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addInteractOptions, planInteract, progresses, runInteract } from '../../js/gameplay/interact-menu.js';
import { flags } from '../../js/narrative/state.js';

const nodes = {
  ticket_done: [{ say: 'eric', text: "The copier's fixed." }, { set: 'ticket_closed' }],
  mio_busy: [{ say: 'mio', text: "Mm, sorry, I'm in the middle of something." }],
  kenji_again: [{ if: '!kenji_talked', then: [{ set: 'kenji_talked' }, { say: 'kenji', text: 'Tape.' }] }],
  hop: [{ choice: [{ text: 'a', go: 'sets_goal' }] }],
  sets_goal: [{ do: 'goal', text: 'Go home.' }],
  machine_door: [{ say: 'mio', text: 'Mm, one minute!' }],
};
const TOPIC = { label: 'Chat with Mio', trigger: 'ask:mio' };
function fakeGame({ on, topic = null, goal = false, goalText = '', id = 'mio' }) {
  const triggered = [];
  const game = {
    story: { nodes, on },
    ui: { goalText },
    topicFor: () => topic,
    runner: {
      entry: (key) => {
        const e = on[key];
        return e === undefined ? null : typeof e === 'string' ? { node: e } : e;
      },
      speaker: (who) => ({ name: who === 'mio' ? 'Mio' : who }),
      trigger: (key) => (triggered.push(key), true),
    },
    beat: (fn) => fn(),
  };
  return { game, item: { id, label: id, goal: () => goal }, triggered };
}
const person = { person: true };

test('a beat that sets a flag or a goal moves the story on; a plain repeat line does not', () => {
  for (const k of Object.keys(flags)) delete flags[k];
  assert.equal(progresses(nodes, 'ticket_done'), true);
  assert.equal(progresses(nodes, 'mio_busy'), false);
  assert.equal(progresses(nodes, 'kenji_again'), true);
  flags.kenji_talked = true;
  assert.equal(progresses(nodes, 'kenji_again'), false);
  assert.equal(progresses(nodes, 'hop'), true);
});

test('the goal person gets the story row in the goal’s words, and the topic below it', () => {
  const { game, item } = fakeGame({
    on: { 'talk:mio': { node: 'ticket_done', if: 'copier_done' } },
    topic: TOPIC,
    goal: true,
    goalText: 'Tell Mio the copier is fixed.',
  });
  const plan = planInteract(game, item, person);
  assert.deepEqual(plan.story, { node: 'ticket_done', label: 'Tell Mio the copier is fixed.' });
  assert.equal(plan.topics.length, 1);
  assert.equal(plan.plain, null);
});

test('the story row’s words: the entry’s label, else Eric’s opening line, else "Talk to"', () => {
  const a = fakeGame({ on: { 'talk:mio': { node: 'ticket_done', if: 'x' } } });
  assert.equal(planInteract(a.game, a.item, person).story.label, "The copier's fixed.");
  const b = fakeGame({ on: { 'talk:mio': { node: 'mio_busy', if: 'x' } } });
  assert.equal(planInteract(b.game, b.item, person).story.label, 'Talk to Mio');
  const c = fakeGame({ on: { 'talk:door': { node: 'machine_door', if: 'x', label: 'Knock' } }, id: 'door' });
  assert.equal(planInteract(c.game, c.item).story.label, 'Knock');
});

test('only topics: the topic runs straight away; only a story: the usual use runs; both: the menu', async () => {
  const t = fakeGame({ on: { 'talk:mio': 'mio_busy' }, topic: TOPIC });
  const plan = planInteract(t.game, t.item, person);
  assert.equal(plan.story, null);
  assert.equal(runInteract(t.game, t.item, plan), true);
  assert.deepEqual(t.triggered, ['ask:mio']);

  const s = fakeGame({ on: { 'talk:mio': { node: 'ticket_done', if: 'x' } } });
  assert.equal(runInteract(s.game, s.item, planInteract(s.game, s.item, person)), false);

  const m = fakeGame({ on: { 'talk:mio': { node: 'ticket_done', if: 'x' } }, topic: TOPIC });
  let shown;
  m.game.ui.choose = async (who, text, chips, opts) => ((shown = { chips, opts }), 1);
  assert.equal(runInteract(m.game, m.item, planInteract(m.game, m.item, person)), true);
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(
    shown.chips.map((r) => r.cls),
    ['story', 'topic', 'leave'],
  );
  assert.equal(shown.opts.glow, 0);
  assert.equal(shown.opts.focus, 0);
  await m.game.after();
  assert.deepEqual(m.triggered, ['ask:mio']);
});

test('added options join the menu; a heart row shows only in private mode', async () => {
  const remove = addInteractOptions((item) =>
    item.id === 'door' ? [{ label: 'Open the door', icon: 'heart-soft', run: () => {} }, { label: 'Wave', run: () => {} }] : null,
  );
  try {
    const d = fakeGame({ on: { 'talk:door': { node: 'machine_door', if: 'x', label: 'Knock' } }, id: 'door' });
    globalThis.__settings = { privateMode: false };
    assert.deepEqual(
      planInteract(d.game, d.item).extra.map((o) => o.label),
      ['Wave'],
    );
    globalThis.__settings = { privateMode: true };
    const plan = planInteract(d.game, d.item);
    assert.deepEqual(
      plan.extra.map((o) => o.label),
      ['Open the door', 'Wave'],
    );
    let shown;
    d.game.ui.choose = async (who, text, chips) => ((shown = chips), 0);
    assert.equal(runInteract(d.game, d.item, plan), true);
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(
      shown.map((c) => c.cls),
      ['story', 'extra', 'extra', 'leave'],
    );
    assert.match(shown[1].html, /heart-mark heart-soft/);
  } finally {
    remove();
    delete globalThis.__settings;
  }
});
