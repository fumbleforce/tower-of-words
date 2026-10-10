// Dev mode: what the public release hides (the title's Days, and whatever else is gated here later). On on this
// machine (localhost, 127.0.0.1) and anywhere with ?debug=1 (Jørgen 2026-10-10: "we will use that marker to enter
// dev mode for the public release").
const q = new URLSearchParams(globalThis.location?.search || '');
const local =
  /^(localhost|127\.0\.0\.1|\[?::1\]?)$/.test(globalThis.location?.hostname || '') ||
  globalThis.location?.protocol === 'file:';
export const DEV = q.get('debug') === '1' || local;
