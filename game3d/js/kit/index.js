// The world kit's registry (notes/architecture/world-kit.md): every piece declared with kit/core/piece.js, for the
// places to use and for the bible's Asset library (tools/assets/kit-source.mjs reads each declaration,
// kit-costs.mjs builds every variant at every detail level for its cost, and render3d.mjs draws them).
// Before building a world piece, look here (GUIDE, Art: World pieces).
export { piece, kitBag } from './core/piece.js';
export { buildKit, GLASS } from './core/build.js';
export { LEVELS, LEVEL_ABOUT, FIDELITY, levelFor } from './core/detail.js';

export const PIECES = [];

export const pieceById = (id) => PIECES.find((p) => p.id === id) || null;
