// The anime look trial (#383): shader and texture tricks toward the reference art/refs/style/anime-fountain-reference.png,
// behind a URL flag so the default look never changes. ?anime=1 turns every trick on; a list turns on only those:
//   ?anime=toon,outline,dapple,paint,water,crowns
//   toon     2-3 tone light with a soft terminator, cool shadows and warm highlights (look/anime/shade.js)
//   outline  screen-space edges from depth, a darker shade of the surface (look/anime/edges.js)
//   dapple   leaf shadow with light spots under the tree crowns (look/anime/canopy.js)
//   paint    lighter tops and darker feet on walls and stone, low-contrast colour noise (look/anime/shade.js)
//   water    the fountain's stylised water, ribbons and splash rings (look/anime/water.js)
//   crowns   tree crowns shaded as soft clumps (look/anime/crowns.js)
export const TRICKS = ['toon', 'outline', 'dapple', 'paint', 'water', 'crowns'];
const q = new URLSearchParams(globalThis.location?.search || '').get('anime');
const list = q == null || q === '0' ? [] : q === '1' || q === 'all' ? TRICKS : q.split(',');
export const ANIME = Object.fromEntries(TRICKS.map((t) => [t, list.includes(t)]));
ANIME.on = TRICKS.some((t) => ANIME[t]);
