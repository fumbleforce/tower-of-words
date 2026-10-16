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
  // a taken branch that ends or jumps away: the set after it never runs
  early_end: [{ if: 'qc_stop', then: [{ end: true }] }, { set: 'qc_unreachable' }],
  early_go: [{ if: 'qc_stop', then: [{ go: 'mio_busy' }] }, { set: 'qc_unreachable' }],
  all_jump: [{ choice: [{ text: 'a', go: 'mio_busy' }, { text: 'b', go: 'mio_busy' }] }, { set: 'qc_unreachable' }],
  one_stays: [{ choice: [{ text: 'a', go: 'mio_busy' }, { text: 'b' }] }, { set: 'qc_after_choice' }],
  // a call comes back to its node; an end inside the called node only ends that node
  call_back: [{ call: 'mio_busy' }, { set: 'qc_after_call' }],
  call_ends: [{ call: 'ends_here' }, { set: 'qc_after_call' }],
  ends_here: [{ end: true }],
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
    assert.match(shown[1].html, /class="heart".*#c9a0ff/);
  } finally {
    remove();
    delete globalThis.__settings;
  }
});

test('a taken branch that ends or jumps away stops the node, as the Runner does', () => {
  for (const k of Object.keys(flags)) delete flags[k];
  flags.qc_stop = true;
  assert.equal(progresses(nodes, 'early_end'), false, 'an end in the taken branch stops the node');
  assert.equal(progresses(nodes, 'early_go'), false, 'a go in the taken branch stops it too');
  assert.equal(progresses(nodes, 'all_jump'), false, 'a choice whose open options all jump away stops it');
  flags.qc_stop = false;
  assert.equal(progresses(nodes, 'early_end'), true, 'the other branch runs on to its set');
  assert.equal(progresses(nodes, 'early_go'), true);
  assert.equal(progresses(nodes, 'one_stays'), true, 'a choice option that stays on the node runs on');
  delete flags.qc_stop;
});

test('a call returns to its node; an end inside a called node only ends that node', () => {
  for (const k of Object.keys(flags)) delete flags[k];
  assert.equal(progresses(nodes, 'call_back'), true);
  assert.equal(progresses(nodes, 'call_ends'), true);
});

test('a person gets a Give row while the bag can give, last before Leave; other targets and empty bags get none', async () => {
  const gave = [];
  const { game, item, triggered } = fakeGame({ on: { 'talk:mio': { node: 'ticket_done', if: 'x' } }, topic: TOPIC });
  game.canGive = () => true;
  game.giveTo = (target) => gave.push(target.id);
  assert.equal(planInteract(game, item, person).gift.label, 'Give');
  let shown;
  game.ui.choose = async (who, text, chips) => ((shown = chips), 2);
  assert.equal(runInteract(game, item, planInteract(game, item, person)), true);
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(
    shown.map((c) => c.cls),
    ['story', 'topic', 'gift', 'leave'],
  );
  assert.match(shown[2].html, /Give/);
  await game.after();
  assert.deepEqual(gave, ['mio'], 'picking Give hands the target to the gift');
  assert.deepEqual(triggered, [], 'the story row was not picked');

  const bare = fakeGame({ on: {} });
  bare.game.canGive = () => true;
  assert.deepEqual(
    planInteract(bare.game, bare.item, person).plain,
    { label: 'Talk', use: true },
    'a person with nothing else keeps Talk beside Give',
  );
  let bareShown;
  bare.game.ui.choose = async (who, text, chips) => ((bareShown = chips), 0);
  runInteract(bare.game, bare.item, planInteract(bare.game, bare.item, person));
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(
    bareShown.map((c) => c.cls),
    ['plain', 'gift', 'leave'],
  );

  const thing = fakeGame({ on: {}, id: 'door' });
  thing.game.canGive = () => true;
  assert.equal(planInteract(thing.game, thing.item).gift, null, 'a thing gets no Give');
  const empty = fakeGame({ on: {} });
  empty.game.canGive = () => false;
  assert.equal(planInteract(empty.game, empty.item, person).gift, null, 'nothing to give, no row');
});
