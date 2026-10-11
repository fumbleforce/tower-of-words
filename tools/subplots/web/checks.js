// What the checks on a public save found, in plain words on the beats they concern (api.py: story_check refuses the
// save and lists its findings; unvoiced_lines lists the lines with no voice clip yet). Findings stay until the next
// save of the same part. Pure matching, no DOM, so the tests can import it.
import { speakerOf, textsOf } from './model.js';

const found = new Map(); // scene id -> {problems: [{node, text, match(step)}], unvoiced: [{speaker, text}]}

// The story check's words, 'node: what it found', as the author would say them, and how to find the beat.
const RULES = [
  [/unknown speaker (\w+)/, m => [`Nobody called “${m[1]}” is in the cast. Pick the speaker again.`, s => speakerOf(s) === m[1]]],
  [/(?:go to|call to|choice goes to|choice calls) missing node (\S+)/, m => [`This goes on to a part of the scene that doesn't exist (“${m[1]}”).`,
    s => s?.go === m[1] || s?.call === m[1] || (s?.choice || []).some(o => o.go === m[1] || o.call === m[1])]],
  [/unknown word \{(\w+)\}/, m => [`{${m[1]}} is not a word the game knows. Check the spelling, or pick it from the word list.`, s => JSON.stringify(s ?? '').includes('{' + m[1] + '}')]],
  [/condition (?:doesn't parse|has odd characters): (.*)$/, m => [`The game can't read this condition: ${m[1]}`, s => s?.if === m[1] || (s?.choice || []).some(o => o.if === m[1])]],
  [/no audio\/(\S+)\.mp3/, m => [`The voice clip this line names (${m[1]}) doesn't exist.`, s => s?.voice === m[1]]],
  [/offer of unknown command (\S+)/, m => [`“${m[1]}” is not a phrase the player can say.`, s => s?.offer === m[1]]],
  [/unknown hook (\S+)/, m => [`“${m[1]}” is not something the game can do here.`, s => s?.do === m[1]]],
  [/(\w+) (who|to|on|at|id) '([^']+)' is not a person, object or spot here/, m => [`“${m[3]}” is not a person, thing or spot in this place.`, s => s?.[m[2]] === m[3]]],
  [/no seat '([^']+)'|missing seat (\S+)/, m => [`There is no seat “${m[1] || m[2]}” here.`, s => s?.at === (m[1] || m[2])]],
  // the day checks' own words (game3d/tools/day*-story-check.mjs)
  [/^missing (\S+)$/, m => [`This goes on to a part of the scene that doesn't exist (“${m[1]}”).`, s => s?.go === m[1] || s?.call === m[1]]],
  [/missing choice destination/, () => ['An option of this choice goes on to a part of the scene that doesn\'t exist.', s => Array.isArray(s?.choice)]],
  [/undeclared hook (\S+)/, m => [`“${m[1]}” is not something the game can do here.`, s => s?.do === m[1]]],
  [/undeclared (who|at|on|to) (\S+)/, m => [`“${m[2]}” is not a person, thing or spot in this place.`, s => s?.[m[1]] === m[2]]],
  // a day's lines all need a delivery: the line without one is the one to fix
  [/unvoiced direction for (\w+)|spoken lines need emo/, m => ['Pick a delivery: on this day every line says how it is spoken.', s => !!speakerOf(s) && (!m[1] || speakerOf(s) === m[1]) && !s?.emo]],
  [/unknown word (\w+)$/, m => [`{${m[1]}} is not a word the game knows. Check the spelling, or pick it from the word list.`, s => JSON.stringify(s ?? '').includes('{' + m[1] + '}')]],
];

export function plain(problem) {
  const [, node = '', what = problem] = /^([^:]*): (.*)$/.exec(problem) || [];
  for (const [re, make] of RULES) {
    const m = re.exec(what);
    if (m) { const [text, match] = make(m); return { node, text, match }; }
  }
  return { node, text: what, match: () => false };
}

export function setProblems(id, problems) { found.set(id, { ...found.get(id), problems: problems.map(plain) }); }
export function setUnvoiced(id, lines) { found.set(id, { problems: [], unvoiced: lines }); }
export function clear(id) { found.delete(id); }

// The notes for one beat of a scene part: [{kind: 'problem' | 'voice', text}]
export function notesFor(id, node, step) {
  const f = found.get(id);
  if (!f) return [];
  const out = (f.problems || []).filter(p => (!p.node || p.node === node) && p.match(step)).map(p => ({ kind: 'problem', text: p.text }));
  const said = textsOf(step, false).main?.trim();
  if (said && (f.unvoiced || []).some(l => l.text.trim() === said && (!speakerOf(step) || l.speaker === speakerOf(step))))
    out.push({ kind: 'voice', text: 'No voice clip yet. It plays without a voice until the voice run makes one.' });
  return out;
}

// Findings no beat of the part matches, for the status line.
export function unplaced(id, node, steps) {
  const f = found.get(id);
  const all = [];
  const walk = xs => (xs || []).forEach(s => { all.push(s); if (s && typeof s === 'object') for (const k of ['then', 'else', 'sequence']) walk(s[k]); });
  walk(steps);
  return (f?.problems || []).filter(p => !all.some(s => (!p.node || p.node === node) && p.match(s))).map(p => p.text);
}
