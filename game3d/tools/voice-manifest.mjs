// Writes audio/manifest.json: every voice clip the game plays, generated from the story files, so a rewrite
// only needs this script and the TTS run again. Entry: { key, speaker, text (Japanese or English, {id}
// resolved), lang, overheard, words: [[wordId, surface]] for known-word spans, clear: [surface] }.
// Keys: <voice>-<word> for the player's phrases and commands (eric-ohayo), word-<word> for Mio's slow word,
// ln-<hash> for spoken lines, oh-<hash> for overheard lines. Every protagonist in data/mc/ gets its own: the default's
// (Eric's) keys are as they always were; another's are mc.js ownClip of them (docs/game/systems.md, Protagonists).
// node voice-manifest.mjs [--day N] [--mc <id>] [--check [--voiced]]
//   --day N: only that day's lines (and the words); --mc: only what that protagonist plays
//   --check: write nothing; list each line with no clip in audio/ (NO CLIP) or with escape leftovers (ESCAPE), exit 1
//   if any. Without --mc it checks every protagonist; --voiced only those with a voice (voice.ref), as the file holds.
// The file holds the default protagonist's lines plus those of every protagonist with a voice reference (voice.ref
// in its config), so the voice run never meets a speaker it has no voice for.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const imp = (f) => import(pathToFileURL(path.join(root, f)).href);
const { default: CONVERSATIONS } = await imp('story/conversations/index.js');
const { WORDS } = await imp('js/lang.js');
const { heardKey, lineKey } = await imp('tools/heardkey.mjs');
// every story file the game loads (the same list story-check and lang-audit use), so a new place is voiced too
const { STORY_FILES } = await imp('js/places/definitions.js');
// the story as each protagonist sees it: {mc.name} and the other tokens filled in (js/mc.js)
const { expandMc, isPlayer, ownClip, PROTAGONISTS, DEFAULT_MC } = await imp('js/mc.js');
const { DAYS, CONTINUING_DAY } = await imp('js/days.js');
const { NODES: FLAVOR_NODES, FINDS: FLAVOR_FINDS } = await imp('story/days3-5-finds.js');
// day 2's new phrases (story/day2/words.js), until their clips exist and lang.js gives them a voice field
const { WORDS: DAY2_WORDS } = await imp('story/day2/words.js');
const { WORDS: DAY3_WORDS } = await imp('story/day3/words.js');
const { KOTODAMA } = await imp('story/day5/index.js');
const { WORDS: DAY4_WORDS } = await imp('story/day4/words.js');
const jaRe = /[぀-ヿ一-龯]/;
const resolve = (t) => t.replace(/\{(\w+)\}/g, (_, id) => (WORDS[id] ? WORDS[id].ja : id));

// Each protagonist expands a private copy; nested imports can share cached story objects.
export const storySets = () =>
  Object.entries({ ...DAYS, 6: CONTINUING_DAY }).map(([day, d]) => ({
    day: +day,
    files: (d.files || STORY_FILES).map((n) => {
      const f = path.join(root, 'story', d.dir + n + '.js');
      return { name: n, load: fs.existsSync(f) ? () => import(pathToFileURL(f).href + '?' + Math.random()).then((m) => m.default) : null };
    }),
  }))
    .concat([{ day: 0, files: [{ name: 'conversations', load: async () => CONVERSATIONS }] }])
    // Optional in-place finds keep their first-day grouping for focused production.
    .concat([3, 4, 5].map(day => ({ day, files: [{ name: 'flavor-finds', load: async () => ({ nodes: Object.fromEntries(FLAVOR_FINDS.filter(f => f.from === day).map(f => [f.node, FLAVOR_NODES[f.node]])) }) }] })))
    // the clubs' session nodes (story/clubs.js), played in their club's place from day 3 on (clubs/index.js withClubs)
    .concat([{ day: 5, files: [{ name: 'kotodama-bridge', load: async () => ({ nodes: { bridge: structuredClone([KOTODAMA.first.requestLine, KOTODAMA.text.launchedMio]) } }) }] }])
    .concat([{ day: 3, files: [{ name: 'clubs', load: () => import(pathToFileURL(path.join(root, 'story/clubs.js')).href + '?' + Math.random()).then((m) => m.default) }] }]);

// The lines one protagonist hears and says, keyed as for the default protagonist: { out: Map key -> entry, dayOfKey }
async function collect(mc, sets) {
  const out = new Map(), dayOfKey = new Map(), PHONE = new Set();
  let storyKeys = null;
  function add(who, text, s = {}) {
    if (!who || !/^\w+$/.test(who) || !text) return;
    if (/text$/.test(who) || PHONE.has(who)) return; // chat messages on a phone (miotext, phone: true speakers): read, not spoken
    const spoken = resolve(text);
    const lang = s.overheard || (jaRe.test(spoken) && !/[a-zA-Z]{3,}/.test(spoken.replace(/\([^)]*\)/g, ''))) ? 'ja' : 'en';
    const key = s.voice || (s.overheard ? heardKey(text) : lineKey(who, text));
    const previous = out.get(key);
    if (previous && previous.speaker !== who)
      throw new Error(`Voice key ${key} is shared by ${previous.speaker} and ${who}; give each speaker an explicit voice key`);
    storyKeys?.add(key);
    const words = [];
    for (const [id, w] of Object.entries(WORDS)) for (const ja of [w.ja, ...(w.alias || [])]) if (spoken.includes(ja) && !words.some(([, x]) => x.includes(ja))) words.push([id, ja]);
    const clear = (s.clear || []).map((c) => (typeof c === 'string' ? c : c.ja));
    // spoken text: drop the English glosses a line may carry in brackets
    out.set(key, { key, speaker: who, text: spoken.replace(/\s*\([^)]*\)/g, ''), lang, overheard: !!s.overheard, words, clear, ...(s.emo ? { emo: s.emo } : {}), ...(s.slow || s.emo === 'slow' ? { slow: true } : {}) });
  }
  function walk(list) {
    for (const s of list || []) {
      if (typeof s === 'string') { const i = s.indexOf(': '); if (!s.startsWith('>') && i > 0 && /^\w+$/.test(s.slice(0, i))) add(s.slice(0, i), s.slice(i + 2)); continue; }
      if (!s || typeof s !== 'object') continue;
      if (s.say && s.text) add(s.say, s.text, s);
      if (s.offer && s.line) { const i = s.line.indexOf(': '); if (i > 0) add(s.line.slice(0, i), s.line.slice(i + 2), s); }
      for (const k of ['then', 'else']) if (s[k]) walk(s[k]);
      if (s.choice) for (const o of s.choice) if (o.say) walk(o.say);
    }
  }
  // each word Mio teaches, said slowly on its own in her voice: the shell plays audio/word-<id>.mp3 when the player taps
  // the word to hear it again
  for (const [id, w] of Object.entries(WORDS)) if (w.voice) out.set('word-' + id, { key: 'word-' + id, speaker: 'mio', text: w.ja + '。', lang: 'ja', overheard: false, words: [[id, w.ja]], clear: [], emo: 'slow', slow: true });
  // and the player saying it (eric-<word>), for the words they say; a word only heard (外人) replays Mio's word clip instead
  for (const [id, w] of Object.entries(WORDS)) if (w.voice && w.voice !== 'word-' + id) out.set(w.voice, { key: w.voice, speaker: 'eric', text: w.ja + '。', lang: 'ja', overheard: false, words: [], clear: [] });
  // and each later day's own set (js/days.js): day 2 is story/day2/
  for (const { day, files } of sets) for (const { name, load } of files) {
    if (!load) continue;
    const st = expandMc(structuredClone(await load()), mc);
    storyKeys = new Set();
    for (const [id, sp] of Object.entries(st.speakers || {})) if (sp && sp.phone) PHONE.add(id);
    if (name === 'transitions') for (const v of Object.values(st)) { walk(v.walk); walk(v.ride); walk(v.arrive); }
    else for (const nodes of Object.values(st.nodes || {})) walk(nodes);
    // Shared topics can replay a line first authored on a particular day.
    for (const k of storyKeys) if (day === 0 || !dayOfKey.has(k)) dayOfKey.set(k, day);
  }
  // day 2's and day 3's new phrases: the player saying each, and Mio's slow replay of it (the shell's word-<id>)
  for (const [id, w, day] of [...Object.entries(DAY2_WORDS).map(([k, v]) => [k, v, 2]), ...Object.entries(DAY3_WORDS).map(([k, v]) => [k, v, 3]), ...Object.entries(DAY4_WORDS).map(([k, v]) => [k, v, 4])]) {
    if (WORDS[id]?.voice) continue;
    out.set('eric-' + id, { key: 'eric-' + id, speaker: 'eric', text: w.ja + '。', lang: 'ja', overheard: false, words: [], clear: [] });
    out.set('word-' + id, { key: 'word-' + id, speaker: 'mio', text: w.ja + '。', lang: 'ja', overheard: false, words: [[id, w.ja]], clear: [], emo: 'slow', slow: true });
    dayOfKey.set('eric-' + id, day);
    dayOfKey.set('word-' + id, day);
  }
  return { out, dayOfKey };
}

// What each protagonist plays: { [mcId]: [{ ...entry, day, own }] }. The default protagonist's entries are exactly
// the old manifest. Another's: the default's shared lines (the same key, so the same clip), and its own: the player's
// lines and words under its voice (speaker = its id), and every other line whose text it sees differently (a {mc.*}
// token) under ownClip, spoken by the same person.
export async function voiceLines({ mcs = Object.keys(PROTAGONISTS), sets = storySets() } = {}) {
  const base = await collect(PROTAGONISTS[DEFAULT_MC], sets);
  const tag = (o, dayOfKey, own) => ({ ...o, day: dayOfKey.get(o.key) || 0, own });
  const res = { [DEFAULT_MC]: [...base.out.values()].map((o) => tag(o, base.dayOfKey, false)) };
  for (const id of mcs) {
    if (id === DEFAULT_MC) continue;
    const mc = PROTAGONISTS[id], { out, dayOfKey } = await collect(mc, sets), list = [];
    for (const o of out.values()) {
      const player = isPlayer(o.speaker);
      if (!player && base.out.has(o.key)) { list.push(tag(o, dayOfKey, false)); continue; }
      list.push({ ...tag(o, dayOfKey, true), key: ownClip(o.key, mc), ...(player ? { speaker: mc.id } : {}) });
    }
    res[id] = list;
  }
  return res;
}

// one list: the default's entries, then each other protagonist's own; `day` and `own` dropped
export function manifestOf(byMc, day = 0) {
  const seen = new Set(), list = [];
  for (const entries of Object.values(byMc))
    for (const e of entries) {
      if (seen.has(e.key) || (day && e.day && e.day !== day)) continue;
      const o = { ...e };
      delete o.day;
      delete o.own;
      seen.add(o.key);
      list.push(o);
    }
  return list;
}

// The unvoiced protagonist currently shares the default line voice. Keep the original
// hash, including authored word tokens and overheard keys; manifest text is already resolved.
export function standInKey(entry, mc) {
  if (entry.key.startsWith(mc.id + '-')) return mc.voice.words + entry.key.slice(mc.id.length);
  return entry.key.replace(new RegExp('-' + mc.id + '$'), '');
}

// Monday's new named introductions must also play for protagonists using an approved stand-in.
// Unchanged lines keep their existing shared fallback; this never creates a new protagonist voice.
export function mondayStandIns(byMc, list) {
  const seen = new Set(list.map(e => e.key)), extra = [];
  for (const [id, entries] of Object.entries(byMc)) {
    const mc = PROTAGONISTS[id];
    if (id === DEFAULT_MC || mc.voice.ref) continue;
    for (const entry of entries) {
      if (entry.day !== 5 || !entry.own || !entry.key.startsWith('ln-')) continue;
      const player = entry.speaker === id;
      const speaker = player ? mc.voice.lines : entry.speaker;
      const key = player ? standInKey(entry, mc) : entry.key;
      if (seen.has(key)) continue;
      const line = { ...entry };
      delete line.day;
      delete line.own;
      extra.push({ ...line, key, speaker });
      seen.add(key);
    }
  }
  return extra;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
  const onlyDay = +arg('--day') || 0, onlyMc = arg('--mc'), check = process.argv.includes('--check');
  if (onlyMc && !PROTAGONISTS[onlyMc]) { console.log(`--mc ${onlyMc}: no such protagonist (${Object.keys(PROTAGONISTS).join(', ')})`); process.exit(2); }
  const voiced = (id) => id === DEFAULT_MC || !!PROTAGONISTS[id].voice.ref;
  const mcs = onlyMc ? [onlyMc] : Object.keys(PROTAGONISTS).filter((id) => (check && !process.argv.includes('--voiced')) || voiced(id));
  const all = await voiceLines();
  const byMc = Object.fromEntries(Object.entries(all).filter(([id]) => mcs.includes(id) || id === DEFAULT_MC));
  if (onlyMc && onlyMc !== DEFAULT_MC) delete byMc[DEFAULT_MC];
  const list = manifestOf(byMc, onlyDay);
  if (!onlyMc && (!onlyDay || onlyDay === 5)) list.push(...mondayStandIns(all, list));
  if (check) {
    const bad = [];
    for (const o of list) {
      const exists = key => fs.existsSync(path.join(root, 'audio', key + '.mp3'));
      let playable = o.key;
      // A selected protagonist without a reference uses the same fallback as runtime voice-keys.js.
      if (onlyMc && !voiced(onlyMc) && !exists(playable)) {
        playable = standInKey(o, PROTAGONISTS[onlyMc]);
      }
      if (!exists(playable)) bad.push(`NO CLIP ${playable} ${o.speaker}: ${o.text}`);
      if (/[\\]|\\[nt"']|&quot;|&amp;/.test(o.text)) bad.push(`ESCAPE ${o.key} ${o.speaker}: ${o.text}`);
    }
    console.log(bad.length ? bad.join('\n') : `voices ok: ${list.length} lines, all with clips, no escapes`);
    process.exit(bad.length ? 1 : 0);
  }
  fs.writeFileSync(path.join(root, 'audio/manifest.json'), JSON.stringify(list, null, 1));
  const by = {}; for (const o of list) by[o.speaker] = (by[o.speaker] || 0) + 1;
  console.log(list.length, 'clips', JSON.stringify(by), 'overheard', list.filter((x) => x.overheard).length, 'en', list.filter((x) => x.lang === 'en').length);
}
