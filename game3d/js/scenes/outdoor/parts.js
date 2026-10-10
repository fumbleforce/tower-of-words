// The outdoor kit's plumbing now lives in the world kit's core (game3d/js/kit/core/, notes/architecture/world-kit.md):
// the Parts collector and the layout helpers (kit/core/parts.js), the seeded random (kit/core/rng.js) and the light
// pools (kit/core/pool.js). This path stays for the builders that import it.
export { Parts, along, pair } from '../../kit/core/parts.js';
export { rng, hash2 } from '../../kit/core/rng.js';
export { pools, POOL_Y } from '../../kit/core/pool.js';
