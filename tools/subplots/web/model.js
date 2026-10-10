// What a step is, in the author's words, and how to read and change its text.
// Pure functions over the step objects the adapters return (game3d/story/FORMAT.md for public scenes,
// the recipe adapter's decoded helpers for private ones). No DOM here, so the tests can import it.

const JAPANESE = /[぀-ヿ㐀-鿿]/;
export const hasJapanese = text => JAPANESE.test(text || '');

export function kindOf(step) {
  if (typeof step === 'string') {
    if (/^>\s?/.test(step)) return 'narration';
    if (/^\w+: /.test(step)) return 'line';
    return 'narration';
  }
  if (!step || typeof step !== 'object') return 'other';
  if (step.shot) return 'picture';
  if (typeof step.say === 'string') return 'line';
  if (step.narration !== undefined) return 'narration';
  if (Array.isArray(step.choice)) return 'choice';
  if (step.if !== undefined && (step.then || step.else)) return 'branch';
  if (Array.isArray(step.sequence)) return 'group';
  if (step.go || step.action === 'go' || step.call) return 'jump';
  if (step.offer || step.learn) return 'word';
  if (step.set || step.unset || step.inc) return 'flag';
  return 'direction';
}

export const KIND_LABEL = {
  line: 'Line', narration: 'Narration', picture: 'Picture', choice: 'Choice', branch: 'Branch', group: 'Sequence',
  jump: 'Jump', word: 'Word', flag: 'Progress', direction: 'Direction', other: 'Direction',
};

// Who speaks a line ('' for narration).
export function speakerOf(step) {
  if (typeof step === 'string') return /^(\w+): /.exec(step)?.[1] || '';
  return step?.say || '';
}

// The text a line or narration shows, and its second language when there is one.
// Recipe lines keep English and Japanese side by side (en, ja); public lines keep `text`, plus `en`
// as the subtitle under Japanese (FORMAT.md, Subtitled Japanese).
export function textsOf(step, recipe) {
  const kind = kindOf(step);
  if (typeof step === 'string') {
    const m = /^(?:>\s?|\w+: )?([\s\S]*)$/.exec(step);
    return { main: m[1], second: undefined };
  }
  if (kind === 'narration' || kind === 'picture') return { main: step.narration ?? '', second: undefined };
  if (kind !== 'line') return { main: '', second: undefined };
  if (recipe) return { main: step.en || (!step.ja ? step.text : '') || '', second: step.ja ?? '', recipe: true };
  return { main: step.text ?? '', second: step.en };
}

// A copy of the step with new text. `which` is 'main' or 'second'.
export function withText(step, which, value, recipe) {
  const kind = kindOf(step);
  if (typeof step === 'string') {
    if (which !== 'main') return withText(stringToObject(step, recipe), which, value, recipe);
    if (kind === 'line') return `${speakerOf(step)}: ${value}`;
    return step.startsWith('>') ? `> ${value}` : value;
  }
  const next = { ...step };
  if (kind === 'narration' || kind === 'picture') next.narration = value;
  else if (recipe) {
    if (which === 'main') next.en = value; else next.ja = value;
    next.text = next.ja || next.en || '';
  } else if (which === 'main') next.text = value;
  else if (value) next.en = value;
  else delete next.en;
  return next;
}

function stringToObject(step, recipe) {
  const kind = kindOf(step), { main } = textsOf(step);
  if (kind === 'line') return recipe ? { say: speakerOf(step), text: main, en: main, ja: '' } : { say: speakerOf(step), text: main };
  return recipe ? { narration: main } : `> ${main}`;
}

// Change who says a line. '' turns a public line into narration.
export function withSpeaker(step, who, recipe) {
  const kind = kindOf(step);
  if (typeof step === 'string') {
    const { main } = textsOf(step);
    if (!who) return `> ${main}`;
    return `${who}: ${main}`;
  }
  if (kind === 'narration' && who) {
    const text = step.narration ?? '';
    return recipe ? { say: who, text, en: text, ja: '' } : { say: who, text };
  }
  if (kind === 'line' && !who && !recipe) {
    const { main } = textsOf(step, recipe);
    return `> ${main}`;
  }
  return { ...step, say: who };
}

// New steps, in the shape each adapter writes cleanly.
export function newStep(kind, recipe, who = 'eric') {
  if (kind === 'line') return recipe ? { say: who, text: '', en: '', ja: '' } : { say: who, text: '' };
  if (kind === 'narration') return recipe ? { narration: '' } : '> ';
  if (kind === 'choice') return { choice: [{ text: '' }, { text: '' }] };
  throw new Error('Unknown beat kind ' + kind);
}

// Address of a beat: [index] or [index, 'then', index, ...].
export function listAt(steps, path) {
  let list = steps;
  for (let i = 0; i < path.length - 1; i += 2) list = list[path[i]][path[i + 1]];
  return list;
}
export const stepAt = (steps, path) => listAt(steps, path)[path.at(-1)];
export const samePath = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x === b[i]);
export const isInside = (path, parent) => parent.length < path.length && parent.every((x, i) => x === path[i]);

// Move the beat at `from` to sit before index `to` in the list at `toList` (a path to a list, [] for the top).
// Returns the beat's new path. Refuses to drop a branch into itself.
export function moveStep(steps, from, toList, to) {
  if (isInside([...toList, 0], from)) return from; // a branch can't go inside itself
  const dest = listAt(steps, [...toList, 0]), source = listAt(steps, from), index = from.at(-1);
  const [step] = source.splice(index, 1);
  const at = dest === source && index < to ? to - 1 : to;
  dest.splice(at, 0, step);
  return [...pathOfList(steps, dest), at];
}

// The address of a list (by identity) inside the step tree.
export function pathOfList(steps, list, base = []) {
  if (steps === list) return base;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (!s || typeof s !== 'object') continue;
    for (const key of ['then', 'else', 'sequence']) {
      if (!Array.isArray(s[key])) continue;
      const found = pathOfList(s[key], list, [...base, i, key]);
      if (found) return found;
    }
  }
  return null;
}

// Plain words for a step the editor shows but does not edit in place.
export function describe(step, name = id => id, nodeTitle = id => id) {
  if (typeof step !== 'object' || !step) return String(step ?? '');
  if (step.summary && step.$expression) return 'Scene action, kept as written';
  if (step.$expression) return 'Scene action, kept as written';
  const who = id => (id === 'eric' || id === 'player' ? 'Eric' : name(id));
  const at = v => (Array.isArray(v) ? 'a spot' : name(v));
  if (step.go) return `Goes on to “${nodeTitle(step.go)}”`;
  if (step.call) return `Plays “${nodeTitle(step.call)}”, then carries on`;
  if (step.action === 'go') return `Goes on to “${nodeTitle(step.destination)}”`;
  if (step.action === 'end' || step.end) return 'The scene ends here';
  if (step.action === 'fin') return 'The encounter ends';
  if (step.action === 'hide') return 'The picture fades out';
  if (step.action === 'bye') return 'Back to the game';
  if (step.action === 'game' && step.details) return describe(step.details, name, nodeTitle);
  if (step.offer) return `Eric is offered the word “${step.offer}”`;
  if (step.learn) return `Eric picks up the word “${step.learn}”`;
  if (step.set) return 'Remembers: ' + flags(step.set);
  if (step.unset) return 'Forgets: ' + flags(step.unset);
  if (step.inc) return 'Counts up: ' + flags(step.inc);
  if (step.wait) return `A pause of ${(step.wait / 1000).toFixed(1)} s`;
  const d = step.do;
  if (!d) return 'Scene action';
  const map = {
    goal: () => (step.text ? `Goal: ${step.text}` : 'Clears the goal'),
    hint: () => `Hint: ${step.text}`,
    walk: () => `${who(step.who)} walks to ${at(step.to)}`,
    face: () => `${who(step.who)} turns to ${at(step.to)}`,
    sit: () => `${who(step.who)} sits down`,
    stand: () => `${who(step.who)} stands up`,
    look: () => `${who(step.who)} looks at ${at(step.at)}`,
    cam: () => (step.back ? 'Camera goes back to normal' : `Camera moves in on ${at(step.on)}`),
    sound: () => `Sound: ${step.name}`,
    voice: () => 'Plays a recorded voice clip',
    emote: () => `${who(step.who)} shows ${step.kind}`,
    expression: () => `${who(step.who)} looks ${step.face}`,
    show: () => `${name(step.id)} appears`,
    hide: () => `${name(step.id)} is hidden`,
    hold: () => (step.who ? `Eric stays with ${who(step.who)}` : 'Eric is free to walk again'),
    bow: () => `${who(step.who)} bows`,
    gesture: () => `${who(step.who)}: ${step.kind}`,
    phone: () => `${who(step.who)}'s phone: ${step.state}`,
    type: () => `Eric types the word “${step.word}”`,
    kotodama: () => `The word takes effect on ${at(step.target)}`,
    next: () => 'Moves on to the next place',
    trip: () => `Eric walks to ${name(step.to)}`,
    end: () => 'The day ends',
    find: () => `Eric finds “${step.id}”`,
    ticket: () => `Ticket ${step.add || step.start || step.close} is ${step.add ? 'added' : step.start ? 'started' : 'closed'}`,
    period: () => `Time moves to ${step.to}`,
    bond: () => `${who(step.who)} warms to Eric`,
    meet: () => `Eric meets ${who(step.who)}`,
  };
  return (map[d] || (() => `Scene action: ${d}`))();
}
const flags = v => (typeof v === 'string' ? v : Object.entries(v).map(([k, x]) => (x === true ? k : `${k} = ${x}`)).join(', ')).replaceAll('_', ' ');

// A key from a beat's content, for things that point at a beat (comments): the same beat gives the same key wherever
// it moves. The adapters' bookkeeping ($recipe, $staging) is left out.
export function beatKey(step) {
  const text = JSON.stringify(step, (k, v) => (k.startsWith('$') ? undefined : v)) || '';
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}
