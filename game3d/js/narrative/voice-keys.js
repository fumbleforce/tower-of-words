// Voice clip keys: a line's clip is ln-<hash of speaker|text>, an overheard one oh-<hash of the text> (made by
// tools/voices.py); audioKeys lists the clips that exist.
import { MC, PLAYER_ID, isPlayer, ownClip } from '../mc.js';

export function lineKey(who, text = '') {
  return 'ln-' + heardKey(who + '|' + text).slice(3);
}
export function heardKey(text = '') {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return 'oh-' + h.toString(36);
}
export const audioKeys = new Set();
fetch(new URL('../../audio/index.json?v=' + (window.BUILD || ''), import.meta.url))
  .then((r) => (r.ok ? r.json() : []))
  .then((l) => l.forEach((k) => audioKeys.add(k)))
  .catch(() => {});
// The clip a spoken line plays (null if none exists): the protagonist's own (mc.js ownClip) when there is one; else
// the shared clip, and for the player's lines the stand-in voice's (data/mc/<id>.json voice.lines)
export function lineClip(who, text, overheard = false) {
  const player = isPlayer(who);
  const key = overheard ? heardKey(text) : lineKey(player ? PLAYER_ID : who, text);
  const own = ownClip(key);
  const k = audioKeys.has(own) ? own : player && !overheard ? lineKey(MC.voice.lines, text) : key;
  return audioKeys.has(k) ? k : null;
}
