// Interact: the one E action on people and things, and the options it opens. Jørgen, 2026-10-10: "We must combine the
// Chat / talk, conusing difference, both should be Talk, and bound to E when interacting with people. If there is story
// to progress, that is the primary chat option, but you get the other options as well, like a regular RPG. the story
// related option gets a highlight."; "We want most normal interactions to go though the E / talk option, which gives
// you the options from there"; "Maybe call it interact, rather than talk, since you wouldnt talk to the door for
// example".
//
// What Interact offers a target now, in this order:
//   1. the story beat its talk: trigger has now (highlighted, focused, tagged Story): an entry with its own condition
//      or `once`, one that would set a flag or a goal, or any while the target is the goal
//   2. a person's conversation topics (conversations/index.js topicFor, gated by what Eric knows: needs.js)
//   3. options other code adds (addInteractOptions below), such as a private scene's choice at a door
//   4. the target's plain use (a thing's talk node, act or look when no story beat matches; a person's repeat line
//      when they have neither a story beat nor topics), under its own verb
//   5. Give, for a person, while the bag holds something to give (game.canGive; the gift is run by interactions.js)
// None of them: Interact does what it always did. One: it is done straight away, no menu. Two or more: a menu in the
// dialogue box with Leave at the end. The rules: docs/game/controls-and-ui.md, Interact and its options.
import { flags, cond } from '../narrative/state.js';
import { choiceIcon, optionalOn } from '../ui/pin-tip.js';

// --- the API for other code -------------------------------------------------------------------------------------
// addInteractOptions(provider) registers a function (item, game) => option | option[] | null, asked each time Interact
// is used on a target. It returns a function that removes it again. An option:
//   { label: 'Knock',                      the row's words, plain text
//     trigger: 'knock:machine_door',        a story trigger to fire; or
//     node: 'machine_knock',                a story node to run; or
//     run: async (game, item) => {},        anything else, run inside a beat (walking locked, the box closes after)
//     story: true,                          optional: a story row (first, highlighted, focused)
//     icon: 'heart-soft' | 'heart-hard',    optional: the private scene's heart on the row; private mode only, and a
//                                           row with an icon is left out entirely while private mode is off
//     order: 0 }                            optional: rows with a lower order come first among the added ones
const providers = [];
export function addInteractOptions(provider) {
  providers.push(provider);
  return () => {
    const i = providers.indexOf(provider);
    if (i >= 0) providers.splice(i, 1);
  };
}
// the added options for a target now (public play drops private rows)
export function extraOptions(game, item) {
  const out = [];
  for (const p of providers) {
    let r;
    try {
      r = p(item, game);
    } catch (e) {
      console.error(e);
      continue;
    }
    for (const o of [r].flat()) if (o && o.label && (!o.icon || optionalOn())) out.push(o);
  }
  return out.sort((a, b) => (a.order || 0) - (b.order || 0));
}

// whether running a node would move the story on: it sets a flag to a new value or sets a goal, on any branch that can
// run now (if/then/else read against the flags as they are; every choice open now; call: followed once). The steps
// run in Runner.step's order. A go or end stops the node, also inside a branch, so the steps after it never run. A
// choice whose open options all jump away stops the node the same way. A call returns to the node that made it.
export function progresses(nodes, node, seen = new Set()) {
  if (!node || seen.has(node)) return false;
  seen.add(node);
  const changes = (set) =>
    Object.entries(typeof set === 'string' ? { [set]: true } : set).some(([k, v]) => flags[k] !== v);
  // what a list of steps comes to: 'progress' (a step moves the story on), 'stop' (the path ends or jumps away, so
  // no later step runs) or 'next' (the steps ran out, or a call came back, and the caller carries on)
  const choice = (opts) => {
    let open = false;
    for (const o of opts || []) {
      if (o.if !== undefined && !cond(o.if)) continue;
      if (o.set !== undefined && changes(o.set)) return 'progress';
      if (o.call && progresses(nodes, o.call, seen)) return 'progress';
      if (!o.go) open = true;
      else if (progresses(nodes, o.go, seen)) return 'progress';
    }
    return open ? 'next' : 'stop';
  };
  const walk = (steps) => {
    for (const s of steps || []) {
      if (!s || typeof s !== 'object') continue;
      // a say, offer or learn step runs nothing else in its object (Runner.step returns there)
      if (s.say || s.offer || s.learn) continue;
      if (s.choice) {
        const r = choice(s.choice);
        if (r !== 'next') return r;
        continue;
      }
      if (s.set !== undefined && changes(s.set)) return 'progress';
      if (s.if !== undefined && (s.then || s.else)) {
        const r = walk(cond(s.if) ? s.then : s.else);
        if (r !== 'next') return r;
      }
      if (s.go) return progresses(nodes, s.go, seen) ? 'progress' : 'stop';
      if (s.call && progresses(nodes, s.call, seen)) return 'progress';
      if (s.do === 'goal' && s.text) return 'progress';
      if (s.end) return 'stop';
    }
    return 'next';
  };
  return walk(nodes?.[node]) === 'progress';
}

// speaker() always answers, with the bare id for a thing that has no name of its own, so the label wins over an id
const nameOf = (game, item) => {
  const n = game.runner.speaker?.(item.id)?.name;
  return (n && n !== item.id ? n : '') || item.label || n || item.id;
};
// a thing's verb now (Tama: Return the chair while the chair is to bring back, else Pet)
function verbOf(item) {
  const vi = item.verbIf;
  return (vi && flags[vi.set] && !flags[vi.unset] && vi.verb) || item.verb || '';
}
// The story row's words: the talk: entry's own `label` ({ node: 'machine_door', if: '...', label: 'Knock' }), the goal
// when this target is it ("Tell Mio the copier is fixed."), a thing's story verb
// ("Return the chair"), Eric's opening line when the beat starts with him, else "Talk to Mio" or the thing's verb.
function storyLabel(game, item, entry, steps, person) {
  if (entry.label) return entry.label;
  const goal = game.ui?.goalText;
  if (item.goal?.() && goal) return goal;
  if (!person && item.verbIf && verbOf(item) === item.verbIf.verb) return item.verbIf.verb;
  const first = (steps || []).find((s) => s && (s.say || s.choice || s.if !== undefined));
  if (first?.say === 'eric' && first.text && !/[{぀-ヿ一-鿿]/.test(first.text)) return first.text;
  return person ? `Talk to ${nameOf(game, item)}` : `${item.verb || 'Look'}: ${nameOf(game, item)}`;
}

// What Interact offers this target now: { story, topics, extra, plain, gift }. Called before meet(), so a first meeting
// (no topics yet) runs the story directly.
export function planInteract(game, item, { person = false } = {}) {
  const key = 'talk:' + item.id;
  const entry = game.runner.entry?.(key, { peek: true });
  const node = entry?.node;
  const steps = node && game.story.nodes?.[node];
  const isStory =
    !!steps?.length && (item.goal?.() || entry.if !== undefined || !!entry.once || progresses(game.story.nodes, node));
  const story = isStory ? { node, label: storyLabel(game, item, entry, steps, person) } : null;
  const topic = person ? game.topicFor?.(item.id) : null;
  const topics = topic ? [topic] : [];
  const extra = extraOptions(game, item);
  const verb = verbOf(item);
  const plainLabel = game.place?.seating?.sittingAt(item.id) && /^Sit$/i.test(verb) ? 'At this seat' : verb;
  // the plain use, when no story beat matches (a talk: list's later entries assume the earlier conditions failed, so
  // it is never offered beside the beat); a person's only when they have no topics either
  const plain =
    story || (person && topics.length) || (item.seatAction && extra.length)
      ? null
      : { label: person ? 'Talk' : plainLabel || 'Look', use: true };
  // Give, last before Leave: a person, while the bag holds something to give (interactions.js sets game.canGive)
  const gift = person && game.canGive?.() ? { label: 'Give', gift: true } : null;
  return { person, story, topics, extra, plain, gift };
}

// Interact on a target, after planInteract. Returns true when it handled it (a menu, or a single option that isn't
// the target's usual use); false leaves the usual use (talk: trigger, act, look, idle line) to run.
export function runInteract(game, item, plan) {
  const { person, story, topics, extra, plain, gift } = plan;
  const talkKey = 'talk:' + item.id;
  const rows = [
    ...(story ? [{ label: story.label, story: true, trigger: talkKey, cls: 'story' }] : []),
    ...topics.map((t) => ({
      label: t.label,
      trigger: t.trigger,
      cls: 'topic',
    })),
    ...extra.map((o) => ({ ...o, cls: o.story ? 'story' : 'extra' })),
    ...(plain ? [{ ...plain, cls: 'plain' }] : []),
    ...(gift ? [{ ...gift, cls: 'gift' }] : []),
  ];
  // the added story rows join the first one at the top
  rows.sort((a, b) => (b.story ? 1 : 0) - (a.story ? 1 : 0));
  if (!rows.length) return false;
  if (rows.length === 1) {
    const only = rows[0];
    // the story beat alone, or the plain use alone: the usual use runs
    if (only.use || only.trigger === talkKey) return false;
    perform(game, item, only);
    return true;
  }
  const chips = [
    ...rows.map((r) => ({
      html: choiceIcon(r.icon) + esc(r.label) + (r.story ? '<span class="tag">Story</span>' : ''),
      cls: r.cls,
    })),
    { html: 'Leave', cls: 'leave' },
  ];
  const glow = rows[0].story ? 0 : -1;
  game.beat(async () => {
    if (item.face && !(game.player.seated && game.place.seating?.seatFor(item.id))) game.walker.faceTo(...item.face());
    const speaker = person ? game.runner.speaker(item.id) : { name: nameOf(game, item) };
    const pick = await game.ui.choose(speaker, '', chips, {
      whoId: person ? item.id : null,
      glow,
      focus: 0,
      log: false,
    });
    const row = rows[pick];
    if (!row) return;
    const before = game.after;
    game.after = async () => {
      if (before) await before();
      perform(game, item, row);
    };
  });
  return true;
}

function perform(game, item, row) {
  if (row.use) return game.useDefault?.(item);
  if (row.gift) return void game.giveTo?.(item);
  if (row.trigger) return void game.runner.trigger(row.trigger);
  if (row.node) return void game.beat(() => game.runner.run(row.node, { trigger: 'talk:' + item.id }));
  if (row.run) return void game.beat(() => row.run(game, item));
}

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
