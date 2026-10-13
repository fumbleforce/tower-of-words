import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';
register(new URL('../support/save-loader.mjs', import.meta.url));
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.window = {};
globalThis.fetch = async () => ({ ok: false });
const { Runner, flags } = await import('../../js/runner.js');
const { known } = await import('../../js/lang.js');
const stories = {
  mio: (await import('../../story/conversations/mio.js')).default,
  emi: (await import('../../story/conversations/emi.js')).default,
};

async function play(who, node, { state = {}, words = [], picks = [], restore, memories = [] } = {}) {
  for (const key of Object.keys(flags)) delete flags[key];
  Object.assign(flags, { day: 12, period_afternoon: true }, state);
  known.clear(); words.forEach(word => known.add(word));
  const lines = [], menus = [], hooks = [], checkpoints = [];
  const memory = structuredClone(memories);
  const choices = [...picks];
  const place = { name: 'office', people: {}, hooks: {} };
  const game = { place, queue: [], wait: async () => {},
    captureStaging: () => ({ place: 'office' }), restoreStaging() {}, hooks: {} };
  for (const name of ['face', 'cam', 'sender', 'save', 'gesture']) game.hooks[name] = value => hooks.push(value);
  game.hooks.type = ({ word }) => { known.add(word); hooks.push({ do: 'type', word }); };
  game.hooks.remember = value => {
    if (!memory.some(item => item.who === value.who && item.id === value.id)) memory.push(value);
  };
  globalThis.__saveTestUI = {
    say: (_who, text, meta) => lines.push({ text, who: meta.whoId }),
    choose: (_who, _prompt, options) => {
      menus.push(options.map(option => option.html));
      checkpoints.push({ frames: structuredClone(game.runner.frames), state: structuredClone(flags) });
      const choice = choices.shift();
      if (choice === undefined) return options.length - 1;
      const index = typeof choice === 'number' ? choice : options.findIndex(option => option.html.includes(choice));
      assert.ok(index >= 0 && index < options.length, `Missing choice ${choice}: ${options.map(o => o.html)}`);
      return index;
    },
  };
  const runner = game.runner = new Runner(game);
  runner.use(place, stories[who]);
  await runner.run(node, restore ? { restored: restore } : undefined);
  assert.equal(runner.recoveryError, undefined);
  assert.equal(runner.frames.length, 0);
  assert.equal(choices.length, 0, 'every requested choice was reached');
  assert.equal(hooks.filter(hook => hook.do === 'save').length, 1, 'one safe completion checkpoint');
  assert.ok(hooks.some(hook => hook.do === 'cam' && hook.back), 'camera released');
  return { lines, menus, hooks, checkpoints, memory, state: structuredClone(flags), words: [...known] };
}

test('Mio asks back, accepts each preference, and recalls saved choices without assigning player history', async () => {
  const variants = [
    ['time to myself', [], 'quiet', 'time for yourself'],
    ['talk more', ['moment to get it out'], 'try', 'I remember'],
    ['talk more', ['It’s fine.'], 'english', 'we can just talk'],
  ];
  for (const [first, rest, value, recall] of variants) {
    const start = await play('mio', 'chat_mio_mainland', { picks: ['That sounds nice', first, ...rest] });
    assert.equal(start.state.chat_mio_evenings, value);
    assert.ok(start.lines.some(line => line.text.includes('What do you do after work')));
    const saved = JSON.parse(JSON.stringify(start.state));
    const again = await play('mio', 'chat_mio', { state: saved, picks: ['About settling', 'Just saying hello'] });
    assert.ok(again.lines.some(line => line.text.includes(recall)));
    assert.deepEqual(again.words, []);
    assert.ok(!again.hooks.some(hook => ['type', 'bond', 'bondStep', 'period', 'ticket'].includes(hook.do)));
  }
});

test('Mio deferral leaves existing preference intact and legacy mother-topic saves get their first check-in', async () => {
  const legacy = await play('mio', 'chat_mio', { state: { chat_mio_home: true }, picks: ['About settling'] });
  assert.ok(legacy.lines.some(line => line.text.includes('What do you do after work')));
  assert.equal(legacy.state.chat_mio_evenings, undefined);
  assert.deepEqual(legacy.memory, []);
  const decline = await play('mio', 'chat_mio_settling_again', {
    state: { chat_mio_checkin_offered: true, chat_mio_evenings: 'quiet' },
    picks: ['feel differently', 'working that out'],
  });
  assert.equal(decline.state.chat_mio_evenings, 'quiet');
});

test('Mio remembered Japanese clue cannot be bypassed by the personal follow-up', async () => {
  for (const understood of [false, true]) for (const learned of [false, true]) {
    const result = await play('mio', 'chat_mio_settling_again', {
      state: { chat_mio_checkin_offered: true, chat_mio_break_understood: understood },
      words: learned ? ['yasumi'] : [],
    });
    assert.equal(result.menus[0].some(label => label.includes('take her own advice')), understood && learned);
    assert.ok(result.menus[0].some(label => label.includes('ask how you’re doing')));
  }
  const understood = await play('mio', 'chat_mio_settling_again', {
    state: { chat_mio_checkin_offered: true, chat_mio_break_understood: true }, words: ['yasumi'], picks: ['take her own advice'],
  });
  assert.ok(understood.lines.some(line => line.text.includes('packing food')));
  assert.deepEqual(understood.words, ['yasumi']);
});

test('Emi remembers practical help choices; revising them keeps the first historical memory truthful', async () => {
  const first = await play('emi', 'chat_emi_team', { picks: ['bring you the result'] });
  assert.equal(first.state.chat_emi_work_help, 'results');
  const again = await play('emi', 'chat_emi', { state: first.state, picks: ['how work is going', 'different sort', 'still learning'], memories: first.memory });
  assert.equal(again.state.chat_emi_work_help, 'request');
  assert.equal(again.memory.length, 1);
  assert.equal(again.memory[0].text, 'Talked about what each of you needs when handling requests.');
  const next = await play('emi', 'chat_emi_team_again', { state: again.state });
  assert.ok(next.lines.some(line => line.text.includes('trouble understanding the requests')));
  assert.deepEqual(next.words, []);
});

test('Emi can hear a worry without treating it as consent to advice; her next hello acknowledges it', async () => {
  const worry = await play('emi', 'chat_emi_team_again', {
    state: { chat_emi_work_talked: true, chat_emi_work_help: 'request' },
    picks: ['won’t you think I can’t do this', 'hear me out', 'just wanted you to know'],
  });
  assert.equal(worry.state.chat_emi_ask_first, true);
  assert.ok(worry.memory.some(item => item.id === 'ask_first'));
  const again = await play('emi', 'chat_emi_team_again', { state: worry.state, picks: ['just came to say hello', 'How are you doing'] });
  assert.ok(again.lines.some(line => line.text.includes('caught me in time')));
  assert.ok(again.lines.some(line => line.who === 'eric' && line.text === 'How are you doing?'));
  assert.ok(!again.lines.some(line => line.text.includes('got a turn this time')));
});

test('known Japanese can express the work agreement; learning remains a separate requested action', async () => {
  const ordinary = await play('emi', 'chat_emi_work_choice', { words: ['daijoubu'], picks: ['I’ll tell you if I’m stuck'] });
  assert.equal(ordinary.state.chat_emi_work_help, 'results');
  assert.deepEqual(ordinary.words, ['daijoubu']);
  const lesson = await play('emi', 'chat_emi_language', { picks: ['say it again'] });
  assert.deepEqual(lesson.words, ['mouichido']);
  const knownLesson = await play('emi', 'chat_emi_language', { words: ['mouichido'] });
  assert.equal(knownLesson.menus.length, 0);
  assert.ok(!knownLesson.hooks.some(hook => hook.do === 'type'));
});

test('Continue from a preference choice restores the actual Runner frames and honours the revised answer', async () => {
  const first = await play('mio', 'chat_mio_settling', { picks: ['time to myself'] });
  const checkpoint = first.checkpoints[0];
  const restored = await play('mio', 'chat_mio_settling', {
    state: checkpoint.state, restore: checkpoint.frames, picks: ['talk more', 'It’s fine.'],
  });
  assert.equal(restored.state.chat_mio_evenings, 'english');
  assert.equal(restored.memory.length, 1);
});

test('new conversational nodes declare no unseen physical actions, subtitle bypass or progression reward', () => {
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (value.say) { assert.ok(value.emo); assert.equal(value.en, undefined); }
    if (value.do) assert.ok(['face', 'cam', 'sender', 'save', 'remember', 'type'].includes(value.do), value.do);
    for (const child of Object.values(value)) if (typeof child === 'object') visit(child);
  };
  visit(stories);
});


test('both remembered work agreements check the arrangement and accept a direct unchanged answer', async () => {
  for (const preference of ['request', 'results']) {
    const result = await play('emi', 'chat_emi_team_again', {
      state: { chat_emi_work_talked: true, chat_emi_work_help: preference }, picks: ['we still agree'],
    });
    assert.ok(result.lines[0].text.includes(preference === 'request' ? 'time to ask' : 'made that difficult'));
    assert.ok(result.lines.some(line => line.who === 'eric' && line.text.includes('we still agree')));
    assert.ok(result.lines.some(line => line.who === 'emi' && line.text.startsWith('Yes, we do.')));
    assert.equal(result.state.chat_emi_work_help, preference);
    assert.deepEqual(result.memory, []);
    assert.ok(!result.hooks.some(hook => ['ticket', 'bond', 'type'].includes(hook.do)));
  }
});

test('Emi hears the same worry differently after the saved boundary, and answers only when asked', async () => {
  const first = await play('emi', 'chat_emi_team_again', {
    state: { chat_emi_work_talked: true, chat_emi_work_help: 'results' },
    picks: ['won’t you think I can’t do this', 'hear me out', 'just wanted you to know'],
  });
  const saved = JSON.parse(JSON.stringify({ state: first.state, memories: first.memory }));
  for (const advice of [false, true]) {
    const again = await play('emi', 'chat_emi', {
      ...saved, picks: ['how work is going', 'won’t you think I can’t do this', advice ? 'what do you think' : 'just needed to say it'],
    });
    assert.ok(again.lines.some(line => line.text.includes('hear you out first')));
    assert.ok(!again.lines.some(line => line.text.includes('You can tell me you didn’t understand')));
    assert.ok(!again.lines.some(line => line.text.startsWith('Yes. Sorry,')));
    assert.ok(!again.menus.some(menu => menu.some(label => label.includes('hear me out'))));
    assert.equal(again.lines.some(line => line.text.includes('Japanese is holding things up')), advice);
    assert.equal(again.state.chat_emi_work_help, 'results');
    assert.deepEqual(again.memory, first.memory);
  }
});

test('a deferred Mio answer can become a first preference without pretending it changed', async () => {
  const deferred = await play('mio', 'chat_mio_settling');
  assert.equal(deferred.state.chat_mio_evenings, undefined);
  const again = await play('mio', 'chat_mio_settling_again', {
    state: JSON.parse(JSON.stringify(deferred.state)), picks: ['what I’d like now', 'time to myself'],
  });
  assert.ok(!again.menus[0].some(label => label.includes('feel differently')));
  assert.equal(again.state.chat_mio_evenings, 'quiet');
  const next = await play('mio', 'chat_mio_settling_again', { state: again.state });
  assert.ok(next.menus[0].some(label => label.includes('feel differently')));
  assert.ok(!next.menus[0].some(label => label.includes('what I’d like now')));
});

test('Emi first and repeat work conversations remain unavailable before day three', async () => {
  for (const day of [1, 2, 3]) for (const talked of [false, true]) {
    const result = await play('emi', 'chat_emi', { state: { day, chat_emi_work_talked: talked } });
    assert.equal(result.menus[0].some(label => /easier for you at work|how work is going/.test(label)), day >= 3);
  }
});

test('the existing personal-topic knowledge prerequisites survive recovery', () => {
  const emiMenu = stories.emi.nodes.chat_emi.find(step => step.choice).choice;
  for (const go of ['chat_emi_club', 'chat_emi_turn']) {
    assert.deepEqual(emiMenu.find(option => option.go === go).needs, ['emi.swimming_club']);
  }
  const mioMenu = stories.mio.nodes.chat_mio.find(step => step.choice).choice;
  assert.deepEqual(mioMenu.find(option => option.go === 'chat_mio_lunch').needs, ['mio.lunch_spot']);
});
