// The world kit's registry (notes/architecture/world-kit.md): every piece declared with kit/core/piece.js, for the
// places to use and for the bible's Asset library (tools/assets/kit-source.mjs reads each declaration,
// kit-costs.mjs builds every variant at every detail level for its cost, and render3d.mjs draws them).
// Before building a world piece, look here (GUIDE, Art: World pieces).
import { windowBay } from './building/window.js';
import { doorway } from './building/door.js';
import { fence } from './street/fence.js';
import { lamp } from './street/lamp.js';
import { bin } from './street/bin.js';
import { bollard } from './street/bollard.js';
import { bikeRack } from './street/bike-rack.js';
import { sign } from './street/sign.js';
import { planter } from './planting/planter.js';
import { treePit } from './planting/tree-pit.js';

export { piece, kitBag } from './core/piece.js';
export { buildKit, GLASS } from './core/build.js';
export { LEVELS, LEVEL_ABOUT, FIDELITY, levelFor } from './core/detail.js';
export { windowBay, doorway, fence, lamp, bin, bollard, bikeRack, sign, planter, treePit };

export const PIECES = [windowBay, doorway, fence, lamp, bin, bollard, bikeRack, sign, planter, treePit];

export const pieceById = (id) => PIECES.find((p) => p.id === id) || null;
