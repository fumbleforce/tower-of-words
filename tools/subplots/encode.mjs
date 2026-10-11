// Write an edited step list back into a story module with the smallest change.
// A step that is unchanged keeps its exact source text and its comments, wherever it moved to.
// New or edited steps are written in the house style of game3d/story (FORMAT.md): 'who: text' for a
// plain line, '> text' for plain narration, unquoted keys, single quotes, one step per line.

const IDENT = /^[A-Za-z_$][\w$]*$/;
const WIDTH = 116;

// Single quotes, or double quotes when that needs fewer escapes (what prettier does with singleQuote).
export function quote(text) {
  const s = String(text).replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
  const q = s.includes("'") && !s.includes('"') ? '"' : "'";
  return q + s.replaceAll(q, '\\' + q) + q;
}

const keyText = key => (IDENT.test(key) ? key : quote(key));

// One value in house style. `indent` is the column the value starts at, for wrapping long objects.
export function encodeValue(value, indent = '') {
  if (value && typeof value === 'object' && typeof value.$expression === 'string') return value.$expression;
  if (typeof value === 'string') return quote(value);
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  const inner = indent + '  ';
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    const flat = '[' + value.map(v => encodeValue(v, inner)).join(', ') + ']';
    if (!flat.includes('\n') && flat.length + indent.length <= WIDTH) return flat;
    return '[\n' + value.map(v => inner + encodeValue(v, inner)).join(',\n') + ',\n' + indent + ']';
  }
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  if (!entries.length) return '{}';
  const flat = '{ ' + entries.map(([k, v]) => keyText(k) + ': ' + encodeValue(v, inner)).join(', ') + ' }';
  if (!flat.includes('\n') && flat.length + indent.length <= WIDTH) return flat;
  return '{\n' + entries.map(([k, v]) => inner + keyText(k) + ': ' + encodeValue(v, inner)).join(',\n') + ',\n' + indent + '}';
}

// A step in its shortest form: plain lines and narration as strings, as the story files write them.
export function encodeStep(step, indent = '') {
  if (step && typeof step === 'object' && !Array.isArray(step) && !step.$expression) {
    const keys = Object.keys(step).filter(k => step[k] !== undefined);
    if (keys.length === 2 && typeof step.say === 'string' && typeof step.text === 'string' && /^\w+$/.test(step.say)
      && !step.text.includes('\n')) return quote(`${step.say}: ${step.text}`);
  }
  return encodeValue(step, indent);
}

const lineOf = (source, at) => source.slice(0, at).split('\n').length;
const columnIndent = (source, at) => {
  const start = source.lastIndexOf('\n', at - 1) + 1;
  return /^[ \t]*/.exec(source.slice(start))[0];
};

// Skip whitespace and comments from `at`; `line` stops at the end of the line.
function skip(source, at, line = false) {
  for (;;) {
    const ws = (line ? /[ \t]*/y : /\s*/y);
    ws.lastIndex = at; ws.exec(source); at = ws.lastIndex;
    if (source.startsWith('//', at)) { const end = source.indexOf('\n', at); at = end < 0 ? source.length : end; continue; }
    if (source.startsWith('/*', at)) {
      const end = source.indexOf('*/', at) + 2;
      if (end < 2 || (line && source.slice(at, end).includes('\n'))) return at;
      at = end; continue;
    }
    return at;
  }
}
const pastNewline = (source, at) => source.startsWith('\r\n', at) ? at + 2 : source[at] === '\n' ? at + 1 : at;

// An array or object literal cut into its items. Each item is its leading text (indentation and the comment lines
// above it), the element or property, and what follows it on its line (the comma and a same-line comment), so items
// can be dropped, moved and replaced while every other byte stays as it was.
export function listItems(arrayNode, source) {
  const open = arrayNode.range[0] + 1, close = arrayNode.range[1] - 1, els = (arrayNode.elements ?? arrayNode.properties).filter(Boolean);
  const multiline = els.length > 0 && lineOf(source, els[0].range[0]) !== lineOf(source, arrayNode.range[0]);
  let at = open;
  if (multiline) { const end = skip(source, open, true); if (source[end] === '\n' || source.startsWith('\r\n', end)) at = pastNewline(source, end); }
  const head = source.slice(open, at), items = [];
  els.forEach((node, i) => {
    const limit = i < els.length - 1 ? els[i + 1].range[0] : close;
    const elEnd = node.range[1], comma = skip(source, elEnd);
    const hasComma = comma < limit && source[comma] === ',';
    const end = pastNewline(source, skip(source, hasComma ? comma + 1 : elEnd, true));
    const post = source.slice(elEnd, end);
    items.push({ node, pre: source.slice(at, node.range[0]), text: source.slice(...node.range), hasComma,
      commaAt: hasComma ? comma - elEnd : 0, post: hasComma ? post.slice(0, comma - elEnd) + post.slice(comma - elEnd + 1) : post });
    at = end;
  });
  const indent = els.length ? (multiline ? columnIndent(source, els[0].range[0]) : '') : columnIndent(source, arrayNode.range[0]) + '  ';
  return { head, items, tail: source.slice(at, close), multiline, indent, trailingComma: !!items.at(-1)?.hasComma };
}

// Write an array or object literal again from rows: {from, text} keeps original item `from` (its comments and
// spacing) with `text` as its element, {text} is a new one. Comment lines above a dropped item stay, above the next
// kept one.
export function writeList(arrayNode, source, rows) {
  const { head, items, tail, multiline, indent, trailingComma } = listItems(arrayNode, source);
  const [open, close] = [source[arrayNode.range[0]], source[arrayNode.range[1] - 1]];
  if (rows.length === items.length && rows.every((r, i) => r.from === i && r.text === items[i].text)) return source.slice(...arrayNode.range);
  if (!items.length) {
    if (!rows.length) return source.slice(...arrayNode.range);
    return open + '\n' + rows.map(r => indent + r.text + ',\n').join('') + columnIndent(source, arrayNode.range[0]) + close;
  }
  const used = new Set(rows.map(r => r.from).filter(i => i !== undefined));
  const carried = new Map();
  let tailCarry = '';
  items.forEach((item, i) => {
    if (used.has(i) || !/\/\/|\/\*/.test(item.pre)) return;
    const lines = multiline ? item.pre.slice(0, item.pre.lastIndexOf('\n') + 1) : item.pre.trim() + ' ';
    const next = items.findIndex((_, k) => k > i && used.has(k));
    if (next < 0) tailCarry += lines; else carried.set(next, (carried.get(next) || '') + lines);
  });
  const out = rows.map((r, j) => {
    const last = j === rows.length - 1, item = r.from !== undefined ? items[r.from] : null;
    const pre = item ? (carried.get(r.from) || '') + item.pre : multiline ? indent : '';
    const sep = items.length > 1 ? items[0].post : ' ';
    let post = item ? item.post : multiline ? '\n' : last ? '' : sep;
    const commaAt = item ? item.commaAt : 0;
    if (!last && multiline && !post.endsWith('\n')) post += '\n';
    if (!last && !multiline && item && !item.hasComma) post = sep + post;
    return pre + r.text + post.slice(0, commaAt) + (!last || trailingComma ? ',' : '') + post.slice(commaAt);
  });
  return open + head + out.join('') + tailCarry + tail + close;
}

// Which original step each edited step comes from: first the same step, then by each `keys` function (a stable
// identity such as a recipe call's source text). With `alike`, an edited step that sits where an original of the
// same kind is gone takes that original's place (and its comments). Returns {from, exact} per step; from is -1 for new.
export function alignSteps(steps, original = [], { keys = [], alike = null } = {}) {
  const used = new Set(), out = steps.map(() => ({ from: -1, exact: false }));
  [s => JSON.stringify(s), ...keys].forEach((key, k) => {
    const index = new Map();
    original.forEach((s, i) => { const v = key(s); if (v !== undefined && !used.has(i)) index.set(v, [...(index.get(v) || []), i]); });
    steps.forEach((s, j) => {
      if (out[j].from >= 0) return;
      const v = key(s), i = v === undefined ? undefined : index.get(v)?.find(n => !used.has(n));
      if (i !== undefined) { used.add(i); out[j] = { from: i, exact: k === 0 }; }
    });
  });
  if (alike) steps.forEach((s, j) => {
    if (out[j].from >= 0) return;
    const before = out.slice(0, j).findLast(o => o.from >= 0), i = before ? before.from + 1 : 0;
    if (i < original.length && !used.has(i) && alike(s, original[i])) { used.add(i); out[j] = { from: i, exact: false }; }
  });
  return out;
}
// What a step is, for pairing an edited step with the original in its place: a line by its speaker, narration,
// or an action by the field that says what it does.
const ACTS = ['say', 'if', 'choice', 'do', 'narration', 'shot', 'go', 'call', '$expression'];
const kind = s => typeof s === 'string' ? 's:' + (/^(\w+):/.exec(s)?.[1] || (s.startsWith('>') ? '>' : ''))
  : s && typeof s === 'object' ? 'o:' + (Array.isArray(s) ? '[]' : ACTS.find(k => s[k] !== undefined) || Object.keys(s).sort().join(',')) : typeof s;
const keyName = p => p.key?.name ?? p.key?.value;

// An edited object step written property by property: unchanged properties keep their text, a changed list is
// written with encodeSteps (so beats in an if's branches keep their comments), other changed values in house style.
function encodeObject(step, original, node, source) {
  const props = node.properties;
  if (!props.every(p => p.type === 'Property' && !p.computed && !p.shorthand && !p.method && p.kind === 'init')) return null;
  const indent = props.length ? columnIndent(source, props[0].range[0]) : columnIndent(source, node.range[0]) + '  ';
  const rows = [];
  props.forEach((p, i) => {
    const k = keyName(p), v = step[k], before = original[k];
    if (v === undefined) return;
    const value = JSON.stringify(v) === JSON.stringify(before) ? source.slice(...p.value.range)
      : Array.isArray(v) && Array.isArray(before) && p.value.type === 'ArrayExpression' ? encodeSteps(v, before, p.value, source)
        : encodeValue(v, indent);
    rows.push({ from: i, text: source.slice(p.range[0], p.value.range[0]) + value + source.slice(p.value.range[1], p.range[1]) });
  });
  for (const [k, v] of Object.entries(step)) if (v !== undefined && !props.some(p => keyName(p) === k)) rows.push({ text: keyText(k) + ': ' + encodeValue(v, indent) });
  return writeList(node, source, rows);
}

// steps: the edited list. original: the decoded steps as read. arrayNode: the node's ArrayExpression.
export function encodeSteps(steps, original, arrayNode, source) {
  if (JSON.stringify(steps) === JSON.stringify(original)) return source.slice(...arrayNode.range);
  const { indent } = listItems(arrayNode, source), els = arrayNode.elements.filter(Boolean);
  const edited = (step, from) => {
    const node = els[from], before = original[from];
    const inPlace = node.type === 'ObjectExpression' && step && typeof step === 'object' && !Array.isArray(step) && !step.$expression
      && before && typeof before === 'object' && !Array.isArray(before) ? encodeObject(step, before, node, source) : null;
    return inPlace ?? encodeStep(step, indent);
  };
  const rows = alignSteps(steps, original, { alike: (a, b) => kind(a) === kind(b) }).map(({ from, exact }, j) => from < 0 ? { text: encodeStep(steps[j], indent) }
    : { from, text: exact ? source.slice(...els[from].range) : edited(steps[j], from) });
  return writeList(arrayNode, source, rows);
}
