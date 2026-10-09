// Detail levels and fidelity (Jørgen, 2026-10-09: "include some metadata on the fidelity level here, maybe even
// retain multiple levels depending on use-case, performance settings etc, if the higher quality version is harder to
// render"). notes/architecture/world-kit.md, Detail levels and fidelity.
//
// A detail level is how much of a piece gets built: every kit piece builds at each of LEVELS, and the Asset library
// shows each level's triangles and draws. A place asks levelFor() once, from what it already knows (perf/phone.js
// phoneLighter(), the quality tier in perf/view.js, whether it is over its place budget), and may ask one level lower
// for what stands far from the walks.
//
// Fidelity is how much love a piece has had, for the library to sort by and show what still needs work.

export const LEVELS = ['phone', 'standard', 'high'];

export const LEVEL_ABOUT = {
  phone: 'The phone and the low quality tier: the shape and the colours, no small detail, fewer round segments.',
  standard: 'Desktop at medium quality and the default: the piece as designed.',
  high: 'Desktop at high quality, close to the camera: rounder curves and the small fittings.',
};

export const FIDELITY = [
  ['placeholder', 'Placeholder', 'Stands in for something better: plain boxes, no detail, wrong in some way.'],
  ['basic', 'Basic', 'Reads as what it is but plainly: the older faceted pieces, simple geometry, one look.'],
  ['finished', 'Finished', 'Built to the street style with care: designed shape, variants, seeded variation.'],
  ['hero', 'Hero', 'A close-up piece worth looking at: modelled in Blender or detailed by hand, checked up close.'],
];

const ORDER = new Map(LEVELS.map((l, i) => [l, i]));
const down = (level, n = 1) => LEVELS[Math.max(0, (ORDER.get(level) ?? 1) - n)];

// phone: the phone's lighter build; tier: 0 low, 1 medium, 2 high (perf/view.js); tight: the place is over its
// budget (game3d/tools/perf/place-budgets.json); far: the piece stands far from where the camera goes
export function levelFor({ phone = false, tier = 1, tight = false, far = false } = {}) {
  let level = phone || tier <= 0 ? 'phone' : tier >= 2 ? 'high' : 'standard';
  if (tight) level = down(level);
  if (far) level = down(level);
  return level;
}

// a count of round segments at a level: half on the phone (never under `min`), half again more at high
export const segments = (n, level, min = 4) =>
  level === 'phone' ? Math.max(min, Math.round(n / 2)) : level === 'high' ? Math.round(n * 1.5) : n;
