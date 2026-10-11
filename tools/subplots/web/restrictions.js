// When a scene plays, as parts an author picks (day, time of day, first time only, who plays, private mode, Skimpy,
// what must have happened) and one English sentence made of them. Read from the game's condition text and written
// back to it: a part that isn't changed keeps its exact text, so an edit touches only what the author changed.
// A part this model can't read (an "or" of unrelated things) stays as it is, shown in words and removable.
import { parseCondition, writeCondition } from './conditions.js';

export const PERIODS = [
  { id: 'early', label: 'Early morning', phrase: 'early in the morning' },
  { id: 'morning', label: 'Morning', phrase: 'in the morning' },
  { id: 'lunch', label: 'Lunch', phrase: 'at lunch' },
  { id: 'afternoon', label: 'Afternoon', phrase: 'in the afternoon' },
  { id: 'evening', label: 'After work', phrase: 'after work' },
];
const PERIOD_IDS = PERIODS.map(p => p.id);

// Split a condition at its top-level "&&", keeping each part's own text.
export function splitAnd(source) {
  const text = String(source || '').trim();
  if (!text) return [];
  const out = [];
  let depth = 0, quote = '', start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 0 && text.startsWith('&&', i)) { out.push(text.slice(start, i).trim()); start = i + 2; i++; }
  }
  out.push(text.slice(start).trim());
  return out.filter(Boolean).map(unwrap);
}
// "(a || b)" -> "a || b" when the brackets hold the whole part
function unwrap(text) {
  if (!text.startsWith('(') || !text.endsWith(')')) return text;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    if (text[i] === ')') depth--;
    if (depth === 0 && i < text.length - 1) return text;
  }
  return unwrap(text.slice(1, -1).trim());
}

// A simple requirement: one flag or one comparison, with "!flag" as {op: 'false'}.
function leaf(tree) {
  if (tree.not && tree.not.op === 'true') return { field: tree.not.field, op: 'false' };
  if (tree.field && !tree.all && !tree.any && !tree.not) return tree;
  return null;
}
const anyOf = tree => (tree.any ? tree.any.map(leaf) : [leaf(tree)]).every(Boolean) ? (tree.any || [tree]).map(leaf) : null;

function classify(text, seenFlag) {
  const tree = parseCondition(text);
  if (tree.preserved !== undefined) return { kind: 'custom', text };
  const one = leaf(tree);
  if (one) {
    const { field, op, value } = one;
    if (field === 'day' && ['==', '>=', '<=', '>', '<'].includes(op) && typeof value === 'number') return { kind: 'day', op, value, text };
    if (field === 'period' && (op === '==' || op === '!=') && PERIOD_IDS.includes(value))
      return { kind: 'period', periods: op === '==' ? [value] : PERIOD_IDS.filter(p => p !== value), style: 'compare', text };
    const flagPeriod = /^period_(\w+)$/.exec(field)?.[1];
    if (flagPeriod && op === 'true' && PERIOD_IDS.includes(flagPeriod)) return { kind: 'period', periods: [flagPeriod], style: 'flag', text };
    if (seenFlag && field === seenFlag && op === 'false') return { kind: 'once', text };
    if (field === 'private_mode' && op === 'true') return { kind: 'private', text };
    if (field === 'skimpy_mode' && op === 'true') return { kind: 'skimpy', text };
    if (field === 'mc_carina' && (op === 'true' || op === 'false')) return { kind: 'who', who: op === 'true' ? 'carina' : 'eric', text };
    if (field === 'mc_eric' && (op === 'true' || op === 'false')) return { kind: 'who', who: op === 'true' ? 'eric' : 'carina', text };
    return { kind: 'need', need: one, text };
  }
  const list = anyOf(tree);
  if (list && list.every(l => l.field === 'day' && l.op === '==' && typeof l.value === 'number')) return { kind: 'days', list: list.map(l => l.value), text };
  if (list && list.every(l => (l.field === 'period' && l.op === '==' && PERIOD_IDS.includes(l.value)) || (/^period_(\w+)$/.test(l.field) && l.op === 'true' && PERIOD_IDS.includes(l.field.slice(7)))))
    return { kind: 'period', periods: list.map(l => (l.field === 'period' ? l.value : l.field.slice(7))), style: list[0].field === 'period' ? 'compare' : 'flag', text };
  return { kind: 'custom', text };
}

// The model: the parts in their written order, and whether the scene plays only the first time.
// `seen` is the flag a private scene sets once it has played (<scene id>_seen); a public way in has its own `once`.
export function readRestrictions(condition, { once = false, seen = '' } = {}) {
  const parts = splitAnd(condition).map(text => classify(text, seen));
  return { parts, once: !!once || parts.some(p => p.kind === 'once'), seen };
}
export function writeRestrictions(model) {
  return model.parts.map(p => (model.parts.length > 1 && topLevelOr(p.text) ? `(${p.text})` : p.text)).join(' && ');
}
function topLevelOr(text) {
  let depth = 0, quote = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 0 && text.startsWith('||', i)) return true;
  }
  return false;
}

// Replace every part of these kinds with `next` (the new parts' texts), where the first of them was.
function replaceKinds(model, kinds, next) {
  const at = model.parts.findIndex(p => kinds.includes(p.kind));
  const rest = model.parts.filter(p => !kinds.includes(p.kind));
  const parts = next.map(text => classify(unwrap(text), model.seen));
  rest.splice(at < 0 ? rest.length : Math.min(at, rest.length), 0, ...parts);
  return { ...model, parts: rest, once: model.once };
}

// ---------- day ----------
// {only: n} | {from: n} | {from: a, to: b} | {list: [..]} | null (any day)
export function daysOf(model) {
  const days = model.parts.find(p => p.kind === 'days');
  if (days) return { list: days.list };
  let from = null, to = null;
  for (const p of model.parts.filter(x => x.kind === 'day')) {
    if (p.op === '==') { from = p.value; to = p.value; }
    if (p.op === '>=') from = Math.max(from ?? -Infinity, p.value);
    if (p.op === '>') from = Math.max(from ?? -Infinity, p.value + 1);
    if (p.op === '<=') to = Math.min(to ?? Infinity, p.value);
    if (p.op === '<') to = Math.min(to ?? Infinity, p.value - 1);
  }
  if (from === null && to === null) return null;
  from ??= 1;
  if (from === to) return { only: from };
  return to === null ? { from } : { from, to };
}
export function setDays(model, spec) {
  let texts = [];
  if (spec?.only) texts = [`day == ${spec.only}`];
  else if (spec?.list?.length) texts = [spec.list.map(d => `day == ${d}`).join(' || ')];
  else if (spec?.from && spec.to) texts = spec.from <= 1 ? [`day <= ${spec.to}`] : [`day >= ${spec.from}`, `day <= ${spec.to}`];
  else if (spec?.from) texts = [`day >= ${spec.from}`];
  return replaceKinds(model, ['day', 'days'], texts);
}

// ---------- time of day ----------
export function periodsOf(model) {
  const lists = model.parts.filter(p => p.kind === 'period').map(p => p.periods);
  if (!lists.length) return [];
  return PERIOD_IDS.filter(id => lists.every(l => l.includes(id)));
}
export function setPeriods(model, list) {
  const flagStyle = model.parts.some(p => p.kind === 'period' && p.style === 'flag');
  const ids = PERIOD_IDS.filter(id => list.includes(id));
  const one = id => (flagStyle ? `period_${id}` : `period == '${id}'`);
  const texts = !ids.length || ids.length === PERIOD_IDS.length ? [] : [ids.map(one).join(' || ')];
  return replaceKinds(model, ['period'], texts);
}

// ---------- first time only (private scenes write it into the condition) ----------
export function setOnce(model, once) {
  const next = model.seen ? replaceKinds(model, ['once'], once ? [`!${model.seen}`] : []) : { ...model };
  return { ...next, once };
}

// ---------- who plays, private mode, Skimpy ----------
export const whoOf = model => model.parts.find(p => p.kind === 'who')?.who || '';
export const setWho = (model, who) => replaceKinds(model, ['who'], who === 'carina' ? ['mc_carina'] : who === 'eric' ? ['!mc_carina'] : []);
export const hasMode = (model, kind) => model.parts.some(p => p.kind === kind);
export const setMode = (model, kind, on) => replaceKinds(model, [kind], on ? [kind === 'private' ? 'private_mode' : 'skimpy_mode'] : []);

// ---------- what must have happened ----------
export const needsOf = model => model.parts.map((p, i) => ({ ...p, index: i })).filter(p => p.kind === 'need' || p.kind === 'custom');
export function addNeed(model, need) {
  const text = need.op === 'false' ? `!${need.field}` : writeCondition(need);
  return { ...model, parts: [...model.parts, classify(text, model.seen)] };
}
export function removePart(model, index) {
  return { ...model, parts: model.parts.filter((_, i) => i !== index) };
}

// ---------- in words ----------
const list = xs => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs.at(-1));
const orList = xs => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' or ' + xs.at(-1));
export function daysPhrase(spec) {
  if (!spec) return 'on any day';
  if (spec.only) return `on day ${spec.only}`;
  if (spec.list) return `on days ${list(spec.list.map(String))}`;
  if (spec.to !== undefined && spec.to !== null) return spec.from <= 1 ? `up to day ${spec.to}` : `from day ${spec.from} to day ${spec.to}`;
  return `from day ${spec.from} on`;
}
export function periodsPhrase(ids) {
  if (!ids.length) return 'at any time of day';
  return orList(ids.map(id => PERIODS.find(p => p.id === id).phrase));
}

// One requirement in words, with the word that joins it to the sentence ("if you have met Mio", "after ..."). `names`
// gives the bible's names: person(id), word(id) -> {ja, en}, variable(id) -> {label, options}, scene(id) -> title,
// humanize(id).
export function needPhrase(need, names) {
  const { field, op, value } = need;
  const yes = op !== 'false';
  const who = id => names.person(id) || names.humanize(id);
  // "d4_tennis" -> "tennis on day 4"
  const event = id => {
    const d = /^d(\d+)_(.+)$/.exec(id);
    return d ? `${names.humanize(d[2]).toLowerCase()} on day ${d[1]}` : names.humanize(id).toLowerCase();
  };
  let m;
  if (field === 'going_home') return yes ? 'on the way home' : 'before the way home';
  if ((m = /^met_(\w+)$/.exec(field))) return yes ? `if you have met ${who(m[1])}` : `if you haven’t met ${who(m[1])} yet`;
  if ((m = /^know_(\w+)$/.exec(field))) {
    const w = names.word(m[1]);
    const word = w ? `${w.ja} (${w.en})` : names.humanize(m[1]);
    return yes ? `if you know ${word}` : `if you don’t know ${word} yet`;
  }
  if ((m = /^bond(\d)_(\w+)$/.exec(field))) return yes ? `if you’ve reached step ${m[1]} with ${who(m[2])}` : `if you haven’t reached step ${m[1]} with ${who(m[2])}`;
  if ((m = /^step_(\w+)$/.exec(field)) && typeof value === 'number') return `if you’re at step ${op === '>=' ? value + ' or more' : op === '>' ? 'more than ' + value : value} with ${who(m[1])}`;
  if ((m = /^(\w+)_seen$/.exec(field))) return yes ? `after ${names.scene(m[1])}` : `before ${names.scene(m[1])}`;
  if ((m = /^(\w+)_done$/.exec(field))) return yes ? `after the ${event(m[1])}` : `before the ${event(m[1])}`;
  const v = names.variable(field);
  const label = (v?.label || event(field)).replace(/^./, c => c.toLowerCase());
  if (op === 'true') return `if ${label}`;
  if (op === 'false') return `unless ${label}`;
  const shown = v?.options?.find(o => String(o.value) === String(value))?.label ?? value;
  const ops = { '==': 'is', '!=': 'is not', '>=': 'is at least', '<=': 'is at most', '>': 'is more than', '<': 'is less than' };
  return `if ${label} ${ops[op] || op} ${typeof shown === 'string' ? shown.replace(/^./, c => c.toLowerCase()) : shown}`;
}
export function partPhrase(part, names, conditionSentence) {
  if (part.kind === 'need') return needPhrase(part.need, names);
  return 'if ' + (conditionSentence ? conditionSentence(part.text).replace(/^./, c => c.toLowerCase()) : part.text);
}

// The sentence as pieces: plain text, and the pieces an author can click to change ({chip: kind, text}).
// `scene` says what is fixed for this scene: {way: 'talk to Mio' | null, place: name | null, placeFixed, day: n | null}
export function sentence(model, scene, names, conditionSentence) {
  const out = [];
  const say = text => out.push({ text });
  const chip = (kind, text, extra = {}) => out.push({ chip: kind, text, ...extra });
  say('Plays ');
  if (scene.way !== undefined) { say('when '); chip('way', scene.way || 'nothing starts it yet'); }
  if (scene.place !== undefined) {
    say(scene.way !== undefined ? ' at ' : 'at ');
    if (scene.placeFixed) say(scene.place || 'any place'); else chip('place', scene.place || 'no place yet');
  }
  say(', ');
  if (scene.day) say(`on day ${scene.day}`);
  else chip('day', daysPhrase(daysOf(model)));
  say(', ');
  chip('time', periodsPhrase(periodsOf(model)));
  say(', ');
  chip('once', model.once ? 'only the first time' : 'every time');
  const who = whoOf(model);
  if (who || scene.showWho) { say(', '); chip('who', who === 'carina' ? 'only when Carina plays' : who === 'eric' ? 'only when Eric plays' : 'whoever plays'); }
  const modes = [hasMode(model, 'private') && 'in private mode', hasMode(model, 'skimpy') && 'with Skimpy on'].filter(Boolean);
  if (modes.length || scene.showModes) { say(', '); chip('mode', modes.length ? list(modes) : 'in any mode'); }
  const needs = needsOf(model);
  if (needs.length) {
    say(', ');
    needs.forEach((p, i) => {
      if (i) say(i === needs.length - 1 ? ' and ' : ', ');
      chip('need', partPhrase(p, names, conditionSentence), { index: p.index, custom: p.kind === 'custom' });
    });
  }
  say('.');
  return out;
}
export const sentenceText = pieces => pieces.map(p => p.text).join('');

// A short summary for the scene list and the map's cards: the time, the days and first-time-only, when set.
export function summary(model, names, { day = true } = {}) {
  const bits = [];
  const d = daysOf(model);
  if (day && d) bits.push(daysPhrase(d).replace(/^on /, ''));
  const p = periodsOf(model);
  if (p.length) bits.push(periodsPhrase(p));
  if (model.once) bits.push('first time only');
  const who = whoOf(model);
  if (who) bits.push(who === 'carina' ? 'Carina only' : 'Eric only');
  return bits.join(' · ');
}
