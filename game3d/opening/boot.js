// The opening page's entry: the rendered film (film.js) or the live player (op.js). Inside the game (?embed) it is
// always the film, whatever the launcher asked for: a browser holding an older launcher (modules cached for 10
// minutes on Pages) must still get the film, not the live build (Jørgen 2026-10-10). The live player: opened on its
// own, or ?live.
const q = new URLSearchParams(location.search);
import(
  (q.has("film") || q.has("embed")) && !q.has("live") ? "./film.js" : "./op.js"
);
