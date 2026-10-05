// The protagonist (docs/game/systems.md, Protagonists): who the player is, from game3d/data/mc/<id>.json (name, the
// Japanese name, pronouns, how people address them, portrait set, body, voice). Eric is the default.
// Which one plays is decided once per page load: ?mc=<id> for one visit (a new game started then saves it), else the
// autosave's own `mc` (so Continue and a loaded slot play who they were saved with), else Eric.
// No DOM and no game imports, so tools and the unit tests import it in Node.
import eric from '../data/mc/eric.json' with { type: 'json' };
import carina from '../data/mc/carina.json' with { type: 'json' };
import { KEYS } from './saves/store.js';
import { defaultCast } from './roles.js';

export const PROTAGONISTS = { eric, carina };
export const DEFAULT_MC = 'eric';
// The id that means "the player", whoever plays: the story's `say: 'eric'`, hooks' `who: 'eric'`, saves and the
// line clips' keys all use it, so it stays 'eric' for every protagonist. 'player' is an older second name for it.
export const PLAYER_ID = 'eric';
export const isPlayer = (id) => id === PLAYER_ID || id === 'player';

const query = () => (typeof location !== 'undefined' ? new URLSearchParams(location.search).get('mc') : null);
function savedMc() {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(KEYS.SAVE) || 'null')?.mc || null;
  } catch {
    return null;
  }
}
export function pickMc(q = query(), saved = savedMc()) {
  for (const id of [q, saved]) if (id && PROTAGONISTS[id]) return id;
  return DEFAULT_MC;
}
export const MC = PROTAGONISTS[pickMc()];

// ---------- story tokens: {mc.<key>} in any story string ----------
// name, name_jp, name_ro, possessive, they/them/their/theirs/themself, called (the default Japanese address),
// called.<personId> (that person's, else called), voice (the word-clip prefix), and every key under the config's `text`
export function tokens(mc = MC) {
  const t = {
    name: mc.name,
    name_jp: mc.name_jp,
    name_ro: mc.name_ro,
    possessive: mc.possessive,
    ...mc.pronouns,
    called: mc.address.default,
    voice: mc.voice.words,
    ...mc.text,
  };
  for (const [who, called] of Object.entries(mc.address.by || {})) t['called.' + who] = called;
  return t;
}
const TOKEN = /\{mc\.([\w.]+)\}/g;
export function expandText(s, mc = MC) {
  if (!s.includes('{mc.')) return s;
  const t = tokens(mc);
  return s.replace(TOKEN, (m, k) => t[k] ?? (k.startsWith('called.') ? t.called : m));
}
// every string in a story file's export, in place (a file is expanded once, when it is first used)
export function expandMc(v, mc = MC, seen = new Set()) {
  if (!v || typeof v !== 'object' || seen.has(v)) return v;
  seen.add(v);
  for (const k of Object.keys(v)) {
    if (typeof v[k] === 'string') {
      if (v[k].includes('{mc.')) v[k] = expandText(v[k], mc);
    } else expandMc(v[k], mc, seen);
  }
  return v;
}

// ---------- voice clips (docs/game/systems.md, Protagonists) ----------
// The default protagonist's clips keep the keys they always had. Another protagonist's own clip of a line: for a
// word clip eric-<word>, <id>-<word>; for any other line, <key>-<id> (the player's lines, and a line whose text a
// {mc.*} token changes). tools/voice-manifest.mjs lists them; the game plays one when it exists.
const ERIC_CLIP = PROTAGONISTS[DEFAULT_MC].voice.words + '-';
export const ownClip = (key, mc = MC) =>
  mc.id === DEFAULT_MC
    ? key
    : key.startsWith(ERIC_CLIP)
      ? mc.id + '-' + key.slice(ERIC_CLIP.length)
      : key + '-' + mc.id;
// The player's word clips (lang.js and story `voice: 'eric-<word>'`): the protagonist's own when `has` says it exists,
// else the stand-in voice.words-<word> (Eric's while a protagonist has no voice of their own)
export function playerClip(key, mc = MC, has = () => false) {
  if (!key.startsWith(ERIC_CLIP) || mc.id === DEFAULT_MC) return key;
  const own = ownClip(key, mc);
  return has(own) ? own : mc.voice.words + '-' + key.slice(ERIC_CLIP.length);
}

// ---------- the save ----------
// a save from before protagonists played Eric with the default cast
export function migrateMc(d) {
  if (!d) return d;
  if (!d.mc || !PROTAGONISTS[d.mc]) d.mc = DEFAULT_MC;
  if (!d.cast) d.cast = defaultCast();
  return d;
}
// Continue into a save of another protagonist than this page's (?mc= asked for one): drop ?mc and load the page
// again, where the autosave decides (menu.js continues it). True when the page is going.
export function reloadForMc(saved, { CONTINUE } = KEYS) {
  if (!saved || (saved.mc || DEFAULT_MC) === MC.id) return false;
  const u = new URL(location.href);
  u.searchParams.delete('mc');
  try {
    sessionStorage.setItem(CONTINUE, '1');
  } catch {
    /* */
  }
  location.replace(u.href);
  return true;
}
