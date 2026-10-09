// The world kit's registry (notes/architecture/world-kit.md): every piece declared with kit/core/piece.js, for the
// places to use and for the bible's Asset library to list (tools/assets/kit-pieces.mjs reads PIECES: each piece's
// id, family, label, variants, variation, detail levels and fidelity, and renders every variant).
// Before building a world piece, look here (GUIDE, Art: World pieces).
export { piece, kitBag } from './core/piece.js';
export { buildKit, GLASS } from './core/build.js';
export { LEVELS, FIDELITY, levelFor } from './core/detail.js';

export const PIECES = [];

export const pieceById = (id) => PIECES.find((p) => p.id === id) || null;
