// How people sit on the train's benches (#601). The benches are 40 cm deep, and the bodies are short in the leg: with the
// hips on the seat point, the sit clip folded the shins back under the cushion and sank the feet into it. So a seated
// body's hips go `fwd` toward the aisle from the seat point, past the cushion's front lip where the knees and thighs
// clear it, and its shins turn about the knees so the feet hang in front of the bench (movement/sit-legs.js; `legs` is
// where the feet point, `ahead` from the hips and `height` above the floor). Used by every seated person on the train:
// the passengers (crowd/passengers.js, cast3d.js inSeat), Mio and Eric (places/train.js).
export const SEAT_FIT = { fwd: 0.07, legs: { ahead: 0.2, height: 0.075 } };
// Aoi: the sit clip leans her back, and her bob reaches about 28 cm behind her hips, 8 cm into the bench back. She sits
// 5 cm further forward and up from the waist, her chin lifted back part of the way (`lean`: [waist, head], radians
// forward; cast3d.js sitLean), which clears it (#672).
export const AOI_FIT = { ...SEAT_FIT, fwd: 0.12, lean: [0.3, -0.15] };

// the hips' offset from the seat point for a body facing `ry`
export function seatOffset(ry, fwd = SEAT_FIT.fwd) {
  return [Math.sin(ry) * fwd, Math.cos(ry) * fwd];
}

// a body sits on a seat point (x, top, z) facing ry, fitted to the bench (the seat's own fit, if it has one)
export function sitFitted(body, x, top, z, ry, fit = SEAT_FIT) {
  const [dx, dz] = seatOffset(ry, fit.fwd);
  body.sitAt(x + dx, top, z + dz, ry, fit.legs);
}
