// The blur rule as a check (game3d/js/narrative/heard-line.js is the runtime side; docs/game/systems.md says how it
// looks). Given a spoken step, what would the text box show, and does any of it let the player read Japanese he
// hasn't been taught or its English meaning? Used by game3d/tools/blur-check.mjs (the public story) and the private
// scenes' own check (island/private/rewards/tools/blur-check.mjs).
import { presentLine } from '../../game3d/js/narrative/heard-line.js';
import { NAMES } from '../../game3d/js/lang.js';
import { parseSource, visitSource, staticValue } from './source-data.mjs';

const PLAYER = new Set(['eric', 'player']);
const KATAKANA = /^[゠-ヿー・]+$/;

// a `clear` entry may stay readable in a blurred line only if the player can read it anyway: a name, a loanword
// (katakana), or something that isn't Japanese at all (B2; 1994年 glossed only as 1994, never "two months")
export function clearAllowed(ja, en = '') {
  if (NAMES.some((n) => n.ja === ja)) return true;
  if (!/[぀-ヿ㐀-鿿]/.test(ja)) return true;
  if (KATAKANA.test(ja)) return true;
  // arigatō is the one word he arrives with (docs/game/cast.md: "arigatō is about it")
  if (ja.startsWith('ありがとう')) return true;
  return /^[0-9０-９A-Za-z.]+年$/.test(ja) && !/[a-z]/i.test(en || '');
}

// Problems with one spoken line. who: the speaker id; s: the step ({ text, overheard, clear, en, slow });
// opts.ambient: a caption in a story's `ambient` list (its `en` is the design's one allowed subtitle);
// opts.strictEn: also fail on an `en` field the text box ignores (the public story keeps no dead subtitles).
export function spokenProblems(who, s, opts = {}) {
  const text = String(s.text ?? '');
  if (PLAYER.has(who)) return [];
  const out = [];
  if (s.en !== undefined && !opts.ambient && opts.strictEn)
    out.push(`has an English subtitle (en): the text box never shows it for anyone but the player; drop it (mark the line overheard)`);
  const { heard, mixed } = presentLine(who, text, s);
  if (opts.ambient && s.en !== undefined) return out; // the design's exception: an exchange between two other people
  if (s.slow) {
    if (/[^\s{}\w。、！？!?….,ー〜~]/.test(text.replace(/\{\w+\}/g, '')))
      out.push('a slow repeat (slow: true) shows glossed, so it may hold only the word being taught ({id}) and punctuation');
    return out;
  }
  // A blurred line, or the Japanese stretches of someone's English line (blurred in place by ui/dialogue-text.js
  // mixedHTML; the English around them reads as written), keeps only its `clear` entries readable, so those must
  // be things he can read anyway. Hand-glossed words in English ("おはよう (ohayō)") are an English speaker teaching.
  if (heard || mixed)
    for (const c of s.clear || []) {
      const ja = typeof c === 'string' ? c : c?.ja;
      if (ja && !clearAllowed(ja, c?.en))
        out.push(`clear entry ${ja} stays readable${typeof c === 'object' && c.en ? ` with its meaning "${c.en}"` : ''}, but it is neither a name nor a loanword`);
    }
  return out;
}

// Every spoken line under a value (a story file's default export, a scene list, a node): visit(who, step, path, opts).
// Steps are `{ say, text }` objects and 'who: text' strings; `ambient` lists are captions.
export function walkSpoken(value, visit, path = '', opts = {}) {
  if (typeof value === 'string') {
    const m = value.match(/^(\w+): ([\s\S]*)$/);
    if (m && opts.inSteps) visit(m[1], { text: m[2] }, path, opts);
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => walkSpoken(v, visit, `${path}[${i}]`, { ...opts, inSteps: true }));
    return;
  }
  if (typeof value.say === 'string' && typeof value.text === 'string') visit(value.say, value, path, opts);
  for (const [k, v] of Object.entries(value)) {
    if (k === 'text' || k === 'en' || k === 'clear') continue;
    // labels, names, notes and other prose maps are not lines; only arrays (step lists) hold 'who: text' strings
    walkSpoken(v, visit, path ? `${path}.${k}` : k, { ...opts, ambient: opts.ambient || k === 'ambient', inSteps: false });
  }
}

// The spoken lines written as literals in a JS source, without running it (the private plugins import the game's
// browser modules): `{ say: 'who', text: '...' }` objects and 'who: text' strings in arrays. visit(who, step, line).
export function sourceSpoken(source, visit) {
  const ast = parseSource(source);
  const lit = (n) => {
    try {
      return staticValue(n);
    } catch {
      return undefined;
    }
  };
  visitSource(ast, (node, ancestors) => {
    const ambient = ancestors.some((a) => a.type === 'Property' && (a.key?.name ?? a.key?.value) === 'ambient');
    if (node.type === 'ObjectExpression') {
      const props = {};
      for (const p of node.properties) if (p.type === 'Property' && !p.computed) props[p.key.name ?? p.key.value] = p.value;
      const who = lit(props.say), text = lit(props.text);
      if (typeof who !== 'string' || typeof text !== 'string') return;
      const s = { text };
      for (const k of ['overheard', 'clear', 'en', 'slow']) if (props[k]) s[k] = lit(props[k]);
      visit(who, s, node.loc.start.line, { ambient });
    } else if (node.type === 'Literal' && typeof node.value === 'string' && ancestors.at(-1)?.type === 'ArrayExpression') {
      const m = node.value.match(/^(\w+): ([\s\S]*)$/);
      if (m) visit(m[1], { text: m[2] }, node.loc.start.line, { ambient });
    }
  });
}
