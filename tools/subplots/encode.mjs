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

// The original elements of an array literal with their text and the comments that belong to each.
function elements(arrayNode, source, comments) {
  const els = arrayNode.elements.filter(Boolean);
  const inside = comments.filter(c => c.range[0] > arrayNode.range[0] && c.range[1] < arrayNode.range[1]
    && !els.some(e => c.range[0] >= e.range[0] && c.range[1] <= e.range[1]));
  const out = els.map(e => ({ node: e, text: source.slice(...e.range), lead: [], trail: '' }));
  for (const c of inside) {
    const text = source.slice(...c.range);
    const before = [...out].reverse().find(e => e.node.range[1] <= c.range[0]);
    if (before && lineOf(source, before.node.range[1]) === lineOf(source, c.range[0])) {
      // keep the spacing before a same-line comment as it was
      before.trail = /[ \t]*$/.exec(source.slice(before.node.range[1], c.range[0]).replace(/^\s*,/, ''))[0] + text;
    }
    else {
      const after = out.find(e => e.node.range[0] >= c.range[1]);
      if (after) after.lead.push(text);
      else if (before) before.tail = [...(before.tail || []), text];
    }
  }
  return out;
}

// steps: the edited list. original: the decoded steps as read. arrayNode: the node's ArrayExpression.
export function encodeSteps(steps, original, arrayNode, source, comments = []) {
  const same = JSON.stringify(steps) === JSON.stringify(original);
  if (same) return source.slice(...arrayNode.range);
  const olds = elements(arrayNode, source, comments);
  const keys = (original || []).map(s => JSON.stringify(s));
  const used = new Set();
  const first = olds[0]?.node;
  const close = columnIndent(source, arrayNode.range[0]);
  const indent = first && lineOf(source, first.range[0]) !== lineOf(source, arrayNode.range[0])
    ? columnIndent(source, first.range[0]) : close + '  ';
  const rows = steps.map(step => {
    const key = JSON.stringify(step);
    const at = keys.findIndex((k, i) => k === key && !used.has(i) && olds[i]);
    if (at >= 0) {
      used.add(at);
      const o = olds[at];
      return { lead: o.lead, text: o.text, trail: o.trail, tail: o.tail };
    }
    return { lead: [], text: encodeStep(step, indent), trail: '' };
  });
  if (!rows.length) return '[]';
  const body = rows.map(r => [
    ...r.lead.map(c => indent + c),
    indent + r.text + ',' + (r.trail ? (/^\s/.test(r.trail) ? r.trail : ' ' + r.trail) : ''),
    ...(r.tail || []).map(c => indent + c),
  ].join('\n')).join('\n');
  return '[\n' + body + '\n' + close + ']';
}
