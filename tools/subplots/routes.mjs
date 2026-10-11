// A scene's ways in (its `on` triggers) written back with the smallest change: only the triggers that name this
// scene and changed are touched, every other trigger keeps its exact text, order and comments, and a changed entry
// keeps its own properties in their order (only `if` and `once` change). New entries are written in house style
// ({ if: '...', node: '...' }, unquoted keys, single quotes), like encode.mjs writes steps.
import { staticValue } from '../lib/source-data.mjs';
import { encodeValue, quote, writeList } from './encode.mjs';

const nameOf = p => (p?.type === 'Property' && !p.computed ? p.key.name ?? p.key.value : null);
const literal = n => { try { return staticValue(n); } catch { return undefined; } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const names = (v, node) => v === node || v?.node === node;

// Which trigger entries name `node`: [{event, condition, once}] in the order the file lists them.
export function entriesOf(on, node) {
  const out = [];
  for (const [event, value] of Object.entries(on || {}))
    for (const v of Array.isArray(value) ? value : [value])
      if (names(v, node)) out.push({ event, condition: v?.if || '', once: !!v?.once });
  return out;
}

// The triggers after giving `node` the ways in `rows`. Other scenes' entries, and their priority, stay as they are.
// An edited entry keeps its other properties; a new one is { if, node, once } and goes first in its trigger's list.
export function routeChanges(on, node, rows) {
  const next = structuredClone(on || {});
  for (const [event, value] of Object.entries(next)) {
    const list = Array.isArray(value) ? value : [value];
    if (!list.some(v => names(v, node))) continue;
    const previous = list.filter(v => names(v, node));
    const replacements = rows.filter(r => r.event === event).map((r, i) => entryValue(previous[i], node, r));
    let at = 0;
    const kept = list.flatMap(v => (names(v, node) ? (at < replacements.length ? [replacements[at++]] : []) : [v]));
    kept.push(...replacements.slice(at));
    if (!kept.length) delete next[event];
    else next[event] = kept.length === 1 && !Array.isArray(value) ? kept[0] : kept;
  }
  for (const event of new Set(rows.map(r => r.event))) {
    if (entriesOf(next, node).some(e => e.event === event)) continue;
    const values = rows.filter(r => r.event === event).map(r => entryValue(undefined, node, r));
    const existing = Object.hasOwn(next, event) ? (Array.isArray(next[event]) ? next[event] : [next[event]]) : [];
    const combined = [...values, ...existing];
    next[event] = combined.length === 1 ? combined[0] : combined;
  }
  return next;
}
// One entry as the game reads it: the plain name when nothing else is needed, else { if, node, once } with any
// other properties the old entry had (keep, ...) where they were.
function entryValue(previous, node, row) {
  const old = typeof previous === 'object' && previous ? previous : null;
  if (!old && !row.condition && !row.once) return node;
  const out = {};
  if (!old || !('if' in old)) { if (row.condition) out.if = row.condition; }
  for (const [k, v] of Object.entries(old || { node })) {
    if (k === 'if') { if (row.condition) out.if = row.condition; continue; }
    if (k === 'once') { if (row.once) out.once = true; continue; }
    out[k] = v;
  }
  out.node ??= node;
  if (row.once && !out.once) out.once = true;
  return out;
}

// The text of one trigger entry: the original when it is unchanged, the original object with only its changed
// properties rewritten, or a new one in house style.
function entryText(elNode, value, source) {
  if (elNode && same(literal(elNode), value)) return source.slice(...elNode.range);
  if (elNode?.type === 'ObjectExpression' && value && typeof value === 'object') {
    const props = elNode.properties.map((p, i) => ({ p, i, k: nameOf(p) }));
    const rows = [];
    for (const k of Object.keys(value)) {
      const old = props.find(x => x.k === k);
      if (old && same(literal(old.p.value), value[k])) rows.push({ from: old.i, text: source.slice(...old.p.range) });
      else if (old) rows.push({ from: old.i, text: source.slice(old.p.range[0], old.p.value.range[0]) + encodeValue(value[k]) });
      else rows.push({ text: `${k}: ${encodeValue(value[k])}` });
    }
    const own = source.slice(...elNode.range);
    // the same properties in the same order: only the changed values are replaced
    if (rows.length === props.length && rows.every((r, i) => r.from === i)) {
      let text = own;
      for (const r of [...rows].reverse()) {
        const p = props[r.from].p, was = source.slice(...p.range);
        if (r.text !== was) text = text.slice(0, p.range[0] - elNode.range[0]) + r.text + text.slice(p.range[1] - elNode.range[0]);
      }
      return text;
    }
    if (own.includes('\n')) return writeList(elNode, source, rows);
    // on one line: its kept properties as written, in the spacing the file uses for objects
    const pad = /^\{\s/.test(own) || !elNode.properties.length ? ' ' : '';
    return `{${pad}${rows.map(r => r.text).join(', ')}${pad}}`;
  }
  return encodeValue(value);
}

// A trigger's value text: an unchanged value as it was, a list whose kept entries keep their text.
function valueText(valueNode, value, source) {
  if (valueNode && same(literal(valueNode), value)) return source.slice(...valueNode.range);
  const oldEls = !valueNode ? [] : valueNode.type === 'ArrayExpression' ? valueNode.elements : [valueNode];
  const used = new Set();
  // an entry is matched to the old one it equals, else to the old entry for the same node, so its own text stays
  const match = v => {
    let i = oldEls.findIndex((el, k) => !used.has(k) && same(literal(el), v));
    if (i < 0) i = oldEls.findIndex((el, k) => !used.has(k) && (literal(el)?.node ?? literal(el)) === (v?.node ?? v));
    if (i >= 0) used.add(i);
    return i;
  };
  const list = Array.isArray(value) ? value : [value];
  const rows = list.map(v => { const i = match(v); return i >= 0 ? { from: i, text: entryText(oldEls[i], v, source) } : { text: entryText(null, v, source) }; });
  if (!Array.isArray(value)) return rows[0].text;
  if (valueNode?.type === 'ArrayExpression') return writeList(valueNode, source, rows);
  return '[' + rows.map(r => r.text).join(', ') + ']';
}

// The new text of the `on` object for `node`'s ways in, or null when nothing changes.
export function encodeRoutes(onNode, source, node, rows) {
  const old = literal(onNode);
  if (old === undefined) throw Error('These routes use code. Edit their source instead.');
  if (same(entriesOf(old, node), rows)) return null;
  const next = routeChanges(old, node, rows);
  const props = onNode.properties.map((p, i) => ({ p, i, k: nameOf(p) }));
  const out = [];
  for (const [event, value] of Object.entries(next)) {
    const at = props.find(x => x.k === event);
    if (!at) { out.push({ text: `${quote(event)}: ${valueText(null, value, source)}` }); continue; }
    const p = at.p;
    out.push({ from: at.i, text: source.slice(p.range[0], p.value.range[0]) + valueText(p.value, value, source) + source.slice(p.value.range[1], p.range[1]) });
  }
  const own = source.slice(...onNode.range);
  const kept = out.filter(r => r.from !== undefined), added = out.filter(r => r.from === undefined);
  // every trigger still there, in its order (only changed or added ones): splice them into the text as it is, so a
  // file that writes several triggers on a line keeps its layout
  if (kept.length === props.length && kept.every((r, i) => r.from === i)) {
    const last = props.at(-1)?.p;
    if (!last) return `{ ${added.map(r => r.text).join(', ')} }`;
    const edits = kept.filter(r => r.text !== source.slice(...props[r.from].p.range)).map(r => ({ range: props[r.from].p.range, text: r.text }));
    if (added.length) {
      const multiline = own.includes('\n');
      const indent = multiline ? /^[ \t]*/.exec(source.slice(source.lastIndexOf('\n', last.range[0]) + 1))[0] : '';
      const sep = multiline ? `,\n${indent}` : ', ';
      edits.push({ range: [last.range[1], last.range[1]], text: sep + added.map(r => r.text).join(sep) });
    }
    const at = onNode.range[0];
    let text = own;
    for (const e of edits.sort((a, b) => b.range[0] - a.range[0])) text = text.slice(0, e.range[0] - at) + e.text + text.slice(e.range[1] - at);
    return text;
  }
  return writeList(onNode, source, out);
}
