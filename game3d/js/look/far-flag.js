// The far view (#365, notes/research/world-chunking.md): every outdoor place gets a sky and haze that follow the time
// of day (look/sky.js), one low-detail model of the whole island past its own buildings (scenes/far-model.js) and the
// skyline's cut-down buildings at full height for the follow camera. On by default; `?far=0` in the URL switches it
// off, to compare with the flat grey background it replaced.
export const FAR_VIEW = new URLSearchParams(globalThis.location?.search || '').get('far') !== '0';
// the far model and the skyline's full-height buildings are for the follow camera only, which a touch screen never
// has (camera/policy.js): a phone gets the sky and haze without them and keeps their memory
export const farFollow = () => FAR_VIEW && !globalThis.matchMedia?.('(pointer: coarse)').matches;
