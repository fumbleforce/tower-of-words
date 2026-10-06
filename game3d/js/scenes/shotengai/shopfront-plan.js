// Fitted display bays beside the existing central doors; island/local builders share these dimensions.
export const FRONT_IDS = ['bike_shop', 'store', 'bakery'];
export const DISPLAY = { offset: 1.38, width: 1.22, bottom: 0.38, top: 1.78, recess: 0.68, projection: 0.28 };
export const displayCenters = (u) => [-1, 1].map((side) => u + side * DISPLAY.offset);
export function displayKeep(doors) {
  return doors
    .filter(({ id }) => FRONT_IDS.includes(id))
    .flatMap(({ at: [u, z], out }) =>
      displayCenters(u).map((x) => [
        x - DISPLAY.width / 2,
        Math.min(z, z + out * (DISPLAY.projection + 0.08)),
        x + DISPLAY.width / 2,
        Math.max(z, z + out * (DISPLAY.projection + 0.08)),
      ]),
    );
}
