// The far view trial (#365, notes/research/world-chunking.md): with ?far=1 in the URL, the outdoor places listed here
// get a sky and haze that follow the time of day (look/sky.js), one low-detail model of the whole island past their
// own buildings (scenes/far-model.js) and the skyline's cut-down buildings at full height, all for the follow camera.
// Without the flag nothing changes. Rolling it out is adding a place to FAR_PLACES (or every outdoor place); nothing
// in the place itself needs to change.
const Q = new URLSearchParams(globalThis.location?.search || '');
export const FAR_PLACES = new Set(['works', 'shotengai', 'harbour']);
const on = Q.get('far') === '1';
export const farWanted = (name) => on && FAR_PLACES.has(name);
