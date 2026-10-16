// The height a walkable doorway must clear, one rule for every place. The player's body is a vertical capsule
// (movement/traversal.js) whose head stands at feet + CAPSULE_HEIGHT × character scale. Every doorway the nav routes
// him through has its aperture, and every frame, lintel and sign above it, at least doorHeight(scale) high: the head
// plus DOOR_MARGIN, rounded up to 5 cm. Builders take their heights from here. The unit test
// game3d/test/unit/doorway-clearance.test.mjs walks every listed doorway and fails when one is lower.
export const CAPSULE_HEIGHT = 1.2; // m of head per unit of character scale
export const DOOR_MARGIN = 0.05; // m clear above the head
// the character scale of every place's people (each place's charScale; the train's car is 1)
export const PEOPLE_SCALE = 1.18;

export const capsuleHeight = (scale) => CAPSULE_HEIGHT * scale;

// the least clear height of a walkable doorway at this scale, in metres, a multiple of 5 cm
export function doorHeight(scale) {
  return (Math.ceil(Math.round((capsuleHeight(scale) + DOOR_MARGIN) * 1000) / 50) * 5) / 100;
}
