// Sound for the minigames: the game's own interface sounds (game3d/audio/sfx) and Mio's word clips
// (game3d/audio/word-<id>.mp3), which exist only for the words day 1 teaches.

const AUDIO = new URL('../../audio/', import.meta.url);
const KEY = 'mg-muted';
export const WORD_CLIPS = new Set(['akete', 'dashite', 'gaijin', 'irete', 'kite', 'matte', 'ohayo', 'sumimasen', 'tomatte', 'ugoite', 'yoroshiku']);

export const muted = () => localStorage.getItem(KEY) === '1';
export const setMuted = on => localStorage.setItem(KEY, on ? '1' : '0');

function play(path, volume) {
  if (muted()) return;
  const a = new Audio(new URL(path, AUDIO).href);
  a.volume = volume;
  a.play().catch(() => {});
}

/** ok, no, tap, bond, chime, vending: the same files the game plays. */
export const sfx = (name, volume = 0.5) => play(`sfx/${name}.mp3`, volume);

/** Mio saying a taught word slowly, if there is a clip for it. Returns whether one played. */
export function word(id) {
  if (!WORD_CLIPS.has(id)) return false;
  play(`word-${id}.mp3`, 0.9);
  return true;
}
