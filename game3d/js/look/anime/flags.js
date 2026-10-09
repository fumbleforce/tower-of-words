// The anime look (#383; reference art/refs/style/anime-fountain-reference.png), the game's default since Jørgen's
// pick on review anime-look-1 (2026-10-10: rollout, "just fix the fountain"). Four parts:
//   toon     the sun's light in three tones with a soft edge, cool shade and a warm lit side (look/anime/shade.js)
//   outline  screen-space edges from depth, a darker shade of the surface (look/anime/edges.js)
//   paint    lighter tops and darker feet on walls and stone, a low-contrast colour drift (look/anime/shade.js)
//   water    the plaza fountain's stylised water, its jets as continuous arcs (look/anime/water.js)
// ?anime=0 turns them all off (the look before, for comparison); a list keeps only those: ?anime=toon,outline
export const TRICKS = ['toon', 'outline', 'paint', 'water'];
const q = new URLSearchParams(globalThis.location?.search || '').get('anime');
// the old style study (?style=, style/) patches the same light code: with it, the anime look stays off
const study = +(new URLSearchParams(globalThis.location?.search || '').get('style') || 0) > 0;
const list = study || q === '0' ? [] : q == null || q === '1' || q === 'all' ? TRICKS : q.split(',');
export const ANIME = Object.fromEntries(TRICKS.map((t) => [t, list.includes(t)]));
ANIME.on = TRICKS.some((t) => ANIME[t]);
