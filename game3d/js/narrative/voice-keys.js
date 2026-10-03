// Voice clip keys: a line's clip is ln-<hash of speaker|text>, an overheard one oh-<hash of the text> (made by
// tools/voices.py); audioKeys lists the clips that exist.
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
