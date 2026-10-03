// Flat things laid on a surface (light pools, printed plates and signs): they stand a few millimetres off it and
// are pulled toward the camera in the depth test, so the two never swap as the camera moves (the flicker Jørgen
// saw at the entrances and on the dorm's room numbers, issues #100 and #112). game3d/tools/flicker-check.mjs finds
// any that still do.
export const DECAL = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 };
