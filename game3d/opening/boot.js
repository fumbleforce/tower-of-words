// The opening page's entry: the rendered film (?film, what the game plays: film.js) or the live player (op.js).
import(new URLSearchParams(location.search).has('film') ? './film.js' : './op.js');
