// Live sources for the world bible. Everything here is read from the repo when the page loads, so it can't go
// stale: the game facts docs (docs/game/), the story files, the word list, the portrait table, GUIDE.md, the
// approved-art list, the design notes, folder listings (python's http.server lists folders) and the build ids.
// Served from the repo root by ./start. Nothing here reads island/private/.

import { STORY_FILES } from '../game3d/js/places/definitions.js';

export const SOURCES = [
  ['reviews/', 'The review queue: each item\'s review.json and Jørgen\'s feedback.json'],
  ['GUIDE.md', 'Rules and decisions: every quote on these pages'],
  ['game3d/story/train.js', 'Who speaks on the train, their lines, the words taught there'],
  ['game3d/story/gate.js', 'Who speaks at the gate, their lines, the words taught there'],
  ['game3d/story/office.js', 'Who speaks on B2, their lines, the words taught there'],
  ['game3d/story/transitions.js', 'Lines on the walk and in the lift'],
  ['docs/game/README.md', 'The storyline list and each storyline\'s status'],
  ['docs/game/cast.md', 'Every person: who they are, their day, their look; the faces each has'],
  ['docs/game/places.md', 'Every place: what is there, who is there when, how you get between them'],
  ['docs/game/stories/', 'One file per storyline: premise, cast, beats, words taught'],
  ['docs/game/words.md', 'Every Japanese word the game knows, and when a word counts as known'],
  ['docs/game/art-and-sound.md', 'Which portraits are approved, provisional or under review'],
  ['docs/game/setting.md', 'The island, Eric\'s job, kotodama, what kind of game this is'],
  ['game3d/story/VOICE.md', 'How each person talks'],
  ['game3d/js/lang.js', 'Every Japanese word and command in the game'],
  ['game3d/js/ui/portrait-data.js', 'The portrait table (PORTRAITS): which faces the game shows'],
  ['game3d/js/ui.js', 'Portrait face framing (FACE)'],
  ['game3d/js/cast.js', 'Which 3D models load (CAST3D, CAST3D_ON)'],
  ['game3d/assets/portraits/', 'The portrait files'],
  ['art/approved/README.md', 'Approved art, per bible id'],
  ['notes/RELATIONSHIPS.md', 'Arcs and open questions (design, not approved)'],
  ['notes/ISLAND.md', 'The island beyond B2 (design, not approved)'],
  ['notes/walkthrough/', 'Walkthroughs per character (design, not approved)'],
  ['game3d/build.json', 'The local build id'],
  ['https://fumbleforce.github.io/tower-of-words/game3d/build.json', 'The pushed build id'],
  ['tools/voice-refs/', 'Voice reference clips'],
  ['game3d/shots/', 'The latest critic round of screenshots'],
];
const PUSHED = 'https://fumbleforce.github.io/tower-of-words/game3d/build.json';
const PLACES = STORY_FILES;
const GAME_DOCS = ['docs/game/README.md', 'docs/game/cast.md', 'docs/game/places.md', 'docs/game/words.md', 'docs/game/art-and-sound.md', 'docs/game/setting.md'];

export async function loadLive(ROOT, snapshot, extraFiles = []) {
  const base = new URL(ROOT, location.href);
  const abs = (p) => /^https?:/.test(p) ? p : new URL(p, base).href;
  const L = { ok: {}, errors: [], files: {}, abs };
  const text = async (p) => {
    try {
      const r = await fetch(abs(p), { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status);
      const t = await r.text(); L.files[p] = t; L.ok[p] = true; return t;
    } catch (e) { L.ok[p] = false; L.errors.push(`${p}: ${e.message || e}`); return null; }
  };
  const listDir = async (p) => {
    // python's http.server answers a folder with an HTML list of links; fall back to the build's snapshot
    try {
      const r = await fetch(abs(p), { cache: 'no-cache' });
      const t = r.ok ? await r.text() : '';
      const names = [...t.matchAll(/<a href="([^"?#]+)"/g)].map((m) => decodeURIComponent(m[1])).filter((n) => !n.startsWith('/') && !n.startsWith('..'));
      if (names.length) { L.ok[p] = true; return names; }
    } catch (_) { /* fall through */ }
    L.ok[p] = (snapshot && snapshot[p]) ? 'snapshot' : false;
    return (snapshot && snapshot[p]) || [];
  };

  const loadReviews = async () => {
    const dirs = (await listDir('reviews/')).filter((f) => /^[a-z0-9][a-z0-9-]*\/$/.test(f)).map((f) => f.slice(0, -1));
    const get = async (p) => { try { const r = await fetch(abs(p), { cache: 'no-cache' }); return r.ok ? await r.json() : null; } catch (_) { return null; } };
    const out = await Promise.all(dirs.map(async (id) => ({ id, ...(await get(`reviews/${id}/review.json`) || { broken: true }), feedback: await get(`reviews/${id}/feedback.json`) })));
    return out.filter((r) => !r.broken).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || a.id.localeCompare(b.id));
  };
  L.reloadReviews = async () => { L.reviews = await loadReviews(); return L.reviews; };

  const mods = {};
  const tasks = [
    (async () => {
      const p = 'game3d/js/ui/portrait-data.js';
      try { L.portraits = (await import(abs(p) + '?t=' + Date.now())).PORTRAITS; L.ok[p] = true; }
      catch (e) { L.portraits = {}; L.ok[p] = false; L.errors.push(`${p}: ${e.message}`); }
    })(),
    ...PLACES.map(async (pl) => {
      const p = `game3d/story/${pl}.js`;
      try { mods[pl] = (await import(abs(p) + '?t=' + Date.now())).default; L.ok[p] = true; }
      catch (e) { L.ok[p] = false; L.errors.push(`${p}: ${e.message}`); }
    }),
    (async () => {
      const p = 'game3d/js/lang.js';
      try { const m = await import(abs(p) + '?t=' + Date.now()); L.words = m.WORDS; L.commands = m.COMMANDS; L.phrases = m.PHRASES; L.ok[p] = true; }
      catch (e) { L.ok[p] = false; L.errors.push(`${p}: ${e.message}`); L.words = {}; L.commands = []; L.phrases = []; }
    })(),
    ...[...new Set(['GUIDE.md', ...GAME_DOCS, 'game3d/story/VOICE.md', 'game3d/js/ui.js', 'game3d/js/cast.js',
      'art/approved/README.md', 'notes/RELATIONSHIPS.md', 'notes/ISLAND.md', 'game3d/build.json', ...extraFiles])].map(text),
    (async () => { L.storyFiles = (await listDir('docs/game/stories/')).filter((f) => /^[a-z0-9-]+\.md$/.test(f)); })(),
    (async () => { try { const r = await fetch(PUSHED, { cache: 'no-cache' }); L.pushed = await r.json(); L.ok[PUSHED] = true; } catch (e) { L.ok[PUSHED] = false; L.pushed = null; } })(),
    (async () => { L.portraitFiles = await listDir('game3d/assets/portraits/'); })(),
    (async () => { L.voiceRefs = (await listDir('tools/voice-refs/')).filter((f) => /\.(wav|mp3)$/.test(f)); })(),
    (async () => { L.walkthroughs = (await listDir('notes/walkthrough/')).filter((f) => f.endsWith('.md')); })(),
    (async () => { L.shotDirs = (await listDir('game3d/shots/')).filter((f) => f.endsWith('/')); })(),
    (async () => { L.reviews = await loadReviews(); })(),
  ];
  await Promise.all(tasks);

  // ---------------- build ids
  try { L.build = JSON.parse(L.files['game3d/build.json'] || 'null'); } catch (_) { L.build = null; }

  // ---------------- the portrait table and the 3D cast, straight from the game's source
  L.face = evalConst(L.files['game3d/js/ui.js'], 'FACE') || {};
  L.cast3d = evalConst(L.files['game3d/js/cast.js'], 'CAST3D') || {};
  L.cast3dOn = evalConst(L.files['game3d/js/cast.js'], 'CAST3D_ON') || [];
  L.portraitStatus = portraitStatus(L.files['docs/game/art-and-sound.md'] || '', L.files['docs/game/cast.md'] || '');

  // ---------------- the story files
  L.story = walkStory(mods);

  // ---------------- the game facts docs (docs/game/): people, places, words, storylines
  const cast = L.files['docs/game/cast.md'] || '';
  L.castPeople = idSections(section(cast, 'People'), '###');
  L.castRows = Object.fromEntries(table(section(cast, 'Everyone')).map((r) => [r[0], { name: r[1], who: r[2] }]));
  L.places = idSections(L.files['docs/game/places.md'] || '', '##');
  L.docWords = table(section((L.files['docs/game/words.md'] || '').replace(/^# .*\n/, ''), 'Words')).map(([id, ja, ro, en, kind]) => ({ id, ja, ro, en, kind }));
  await loadStories(L, text);
  L.voicePeople = boldBlurbs(section(L.files['game3d/story/VOICE.md'] || '', 'Speakers'));

  // ---------------- approved art per folder
  L.approved = {};
  for (const m of (L.files['art/approved/README.md'] || '').matchAll(/^- ([a-z0-9-]+)\/([^:]+):\s*(.*)$/gm)) {
    (L.approved[m[1]] = L.approved[m[1]] || []).push({ path: `art/approved/${m[1]}/${m[2].trim()}`, file: m[2].trim(), desc: m[3] });
  }

  // ---------------- latest critic round
  const rounds = (L.shotDirs || []).map((d) => [d, +(d.match(/^round-(\d+)\/$/) || [, -1])[1]]).filter((x) => x[1] >= 0).sort((a, b) => b[1] - a[1]);
  L.latestRound = rounds.length ? rounds[0][0].replace(/\/$/, '') : null;
  return L;
}

// ------------------------------------------------------------------ helpers

// Evaluate one `export const NAME = <literal>;` from a JS source file (object or array literals only).
function evalConst(src, name) {
  if (!src) return null;
  const m = src.match(new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=\\s*`));
  if (!m) return null;
  let i = m.index + m[0].length;
  const open = src[i], close = open === '{' ? '}' : open === '[' ? ']' : null;
  if (!close) return null;
  let depth = 0, j = i, q = null;
  for (; j < src.length; j++) {
    const c = src[j];
    if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') q = c;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) break;
  }
  try { return Function(`"use strict"; return (${src.slice(i, j + 1)});`)(); } catch (_) { return null; }
}

export function section(md, heading) {
  const lines = md.split('\n');
  const i = lines.findIndex((l) => /^#{1,4} /.test(l) && l.replace(/^#+\s*/, '').startsWith(heading));
  if (i < 0) return '';
  const lvl = lines[i].match(/^#+/)[0].length;
  const out = [];
  for (const l of lines.slice(i + 1)) { const h = l.match(/^(#+) /); if (h && h[1].length <= lvl) break; out.push(l); }
  return out.join('\n').trim();
}

// "- **Mio** (25): text" and "**Mio** (25, programmer). text" -> { 'Mio': 'full paragraph' }
function boldBlurbs(md) {
  const out = {};
  const paras = md.split(/\n(?=- \*\*|\*\*)/);
  for (const p of paras) {
    const m = p.match(/^-?\s*\*\*([^*]+)\*\*/);
    if (!m) continue;
    const key = m[1].split(',')[0].trim();
    out[key] = p.replace(/^-\s*/, '').trim();
  }
  return out;
}

// A markdown table's body rows as arrays of cells, backticks stripped from the first cell (the id).
export function table(md) {
  const rows = String(md || '').split('\n').filter((l) => /^\|/.test(l.trim())).map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  return rows.slice(2).map((r) => [r[0].replace(/`/g, ''), ...r.slice(1)]);
}

// "## Monorail (`train`)" or "### Mio (`mio`)" sections -> [{ id, title, body }] in file order.
function idSections(md, hashes) {
  const out = [];
  const re = new RegExp(`^${hashes} (.+?) \\(\`([a-z0-9_]+)\`\\)\\s*$`);
  let cur = null;
  for (const l of md.split('\n')) {
    const h = l.match(/^(#+) /);
    if (h && h[1].length <= hashes.length) {
      const m = l.match(re);
      cur = m ? { id: m[2], title: m[1], body: '' } : null;
      if (cur) out.push(cur);
      continue;
    }
    if (cur) cur.body += l + '\n';
  }
  out.forEach((o) => { o.body = o.body.trim(); });
  return out;
}

// docs/game/art-and-sound.md "## Portraits" (Id | Status) with the faces from cast.md "## Portraits" (Id | Faces).
// A face marked "(to build)" in cast.md has no approved file yet.
function portraitStatus(art, cast) {
  const faces = Object.fromEntries(table(section(cast, 'Portraits')).map(([id, f]) => [id, f.split(',').map((x) => x.trim()).filter((x) => x && !/to build/.test(x))]));
  const st = {};
  for (const [id, text] of table(section(art, 'Portraits'))) {
    const s = /^approved/i.test(text) ? 'approved' : /^under review/i.test(text) ? 'review' : /^rejected/i.test(text) ? 'rejected' : 'draft';
    st[id] = { s, line: text, faces: faces[id] || [] };
  }
  return st;
}

// The storylines: the list and statuses in docs/game/README.md, each file in docs/game/stories/ (a file the list
// misses still shows, with its own first paragraph as the premise).
async function loadStories(L, text) {
  const listed = table(section(L.files['docs/game/README.md'] || '', 'Storylines')).map(([cell, title, status]) => {
    const m = cell.match(/\[([a-z0-9-]+)\]\(([^)]+)\)/);
    return { id: m ? m[1] : cell, file: m ? 'docs/game/' + m[2] : `docs/game/stories/${cell}.md`, blurb: title, status };
  });
  const files = (L.storyFiles || []).map((f) => `docs/game/stories/${f}`);
  for (const f of files) if (!listed.some((s) => s.file === f)) listed.push({ id: f.replace(/^.*\/|\.md$/g, ''), file: f, blurb: '', status: '', unlisted: true });
  await Promise.all(listed.map(async (s) => {
    const t = await text(s.file) || '';
    s.title = (t.match(/^# (.+)$/m) || [, s.id])[1];
    s.premise = (t.replace(/^# .*\n/, '').trim().split(/\n\n/)[0] || '').trim();
    s.cast = [...section(t, 'Cast').matchAll(/`([a-z0-9_]+)`/g)].map((m) => m[1]);
    s.words = table(section(t, 'Words taught')).map(([word, by, node]) => ({ word, by: by.replace(/`/g, ''), node: node.replace(/`/g, '') }));
  }));
  L.stories = listed;
}

// Walk every story module: who speaks where and how much, which words appear, and who teaches which word.
function walkStory(mods) {
  const S = { speakers: {}, lines: {}, samples: {}, taught: [], used: {}, people: {}, places: PLACES.filter((p) => mods[p]) };
  const addLine = (who, place, text, over) => {
    if (!who) return;
    const l = (S.lines[who] = S.lines[who] || {});
    l[place] = (l[place] || 0) + 1;
    const s = (S.samples[who] = S.samples[who] || []);
    if (s.length < 40) s.push({ place, text, over: !!over });
  };
  const words = (place, t) => { for (const m of String(t).matchAll(/\{([a-z_]+)\}/g)) (S.used[m[1]] = S.used[m[1]] || new Set()).add(place); };
  const speakerOf = (line) => { const m = typeof line === 'string' && line.match(/^([a-z0-9_]+): /); return m ? m[1] : (line && line.say) || null; };
  const teach = (word, by, place, how) => S.taught.push({ word, by, place, how });
  for (const place of PLACES) {
    const mod = mods[place];
    if (!mod) continue;
    for (const [id, sp] of Object.entries(mod.speakers || {})) {
      const o = (S.speakers[id] = S.speakers[id] || { names: {}, roles: {} });
      if (sp.name) o.names[place] = sp.name;
      if (sp.role) o.roles[place] = sp.role;
    }
    for (const [id, p] of Object.entries(mod.people || {})) S.people[id] = { ...(S.people[id] || {}), ...p, place };
    const seen = new WeakSet();
    const visit = (v) => {
      if (typeof v === 'string') {
        const m = v.match(/^([a-z0-9_]+): (.*)$/s);
        if (m) addLine(m[1], place, m[2]);
        words(place, v);
        return;
      }
      if (!v || typeof v !== 'object' || seen.has(v)) return;
      seen.add(v);
      if (Array.isArray(v)) { v.forEach(visit); return; }
      if (typeof v.say === 'string' && typeof v.text === 'string') { addLine(v.say, place, v.text, v.overheard); words(place, v.text); }
      if (v.do === 'type' && v.word) teach(v.word, v.from || speakerOf(v.prompt) || null, place, 'typed');
      if (typeof v.offer === 'string') teach(v.offer, v.from || speakerOf(v.line), place, 'offered');
      if (typeof v.learn === 'string') teach(v.learn, v.from || null, place, 'learned');
      for (const [k, x] of Object.entries(v)) if (k !== 'speakers' && k !== 'people') visit(x);
    };
    for (const [k, x] of Object.entries(mod)) if (k !== 'speakers' && k !== 'people') visit(x);
  }
  return S;
}

// ------------------------------------------------------------------ live quotes

const TOPIC = /^["“]?[A-Z0-9][^.:]{0,70}?\((?:Jørgen|\d{4}-\d\d-\d\d)[^)]*\)\s*:/;
// The sentence(s) that start at `phrase` in a file: from the start of the sentence holding the phrase, on until the
// next topic ("Something (Jørgen, date): ...") or about 520 characters.
export function quoteText(files, path, phrase, n = 0) {
  const t = files[path]; if (!t || !phrase) return null;
  const lines = t.split('\n');
  let i = lines.findIndex((l) => l.includes(phrase));
  if (i < 0) { const low = phrase.toLowerCase(); i = lines.findIndex((l) => l.toLowerCase().includes(low)); }
  if (i < 0) return null;
  let line = lines[i].replace(/^\s*(?:[-*]|\d+\.)\s+/, '').replace(/^\|\s*/, '');
  const at = Math.max(0, line.toLowerCase().indexOf(phrase.toLowerCase()));
  let start = 0;
  for (const m of line.matchAll(/[.!?]["”)]?\s+(?=["“(]?[A-Z0-9Ø])/g)) { if (m.index + m[0].length > at) break; start = m.index + m[0].length; }
  if (/[.!?;]["”)]?\s+$/.test(line.slice(0, at))) start = at;   // the phrase starts its own sentence (maybe lower case)
  const rest = line.slice(start);
  const sentences = rest.split(/(?<=[.!?]["”)]?)\s+(?=["“(]?[A-Z0-9Ø])/);
  let out = '', k = 0;
  for (const s of sentences) {
    if (n && k >= n) break;
    if (out && !n && TOPIC.test(s)) break;
    if (out && out.length + s.length > 520) { out += ' …'; break; }
    out += (out ? ' ' : '') + s; k++;
  }
  // a heading line ending in ':' followed by an indented list (GUIDE's 3D workflow): bring the list along
  if (/:\s*$/.test(out)) {
    for (const l of lines.slice(i + 1)) {
      if (!/^\s+(?:\d+\.|-)\s/.test(l) || out.length > 900) break;
      out += ' ' + l.trim();
    }
  }
  return { text: out.trim(), line: i + 1 };
}
