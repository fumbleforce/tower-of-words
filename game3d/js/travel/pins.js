// Where each place sits on the island map (docs/game/places.md, "On the map"; `node tools/facts/check.mjs` compares
// the two). An outdoor place has a pin at an island point (scenes/island-layout.js frame: x east, z south); an
// interior has none of its own and is listed under the place its door is in. Names come from PLACE_NAMES.
import { PLACE_NAMES } from '../places/definitions.js';

export const PINS = {
  train: { at: [-28.6, -3.9] },
  gate: { at: [-14.45, 6.5] },
  print_shop: { in: 'campus' },
  ferry_terminal: { in: 'harbour' },
  campus: { at: [-19.25, -33] },
  forecourt: { at: [-6, -1] },
  office: { in: 'forecourt' },
  plaza: { at: [37.29, -2.75] },
  canteen: { in: 'plaza' },
  dorm_court: { at: [79.84, -1.3] },
  dorms: { in: 'dorm_court' },
  shotengai: { at: [30.3, 20.1] },
  izakaya: { in: 'shotengai' },
  bakery: { in: 'shotengai' },
  konbini: { in: 'shotengai' },
  karaoke: { in: 'shotengai' },
  karaoke_booth: { in: 'karaoke' },
  east_lane: { at: [67.5, -6.5] },
  east_coast: { at: [126.5, 10.5] },
  dorm_commons: { in: 'east_coast' },
  sports: { at: [58.2, -57.5] },
  pool: { in: 'sports' },
  gym: { in: 'sports' },
  office_quarter: { at: [4.5, -54] },
  harbour: { at: [-85, -75] },
  works: { at: [-66, -106] },
};

// the outdoor place an interior is in (itself for an outdoor place), and its island point
export function pinOf(name) {
  let n = name;
  for (let i = 0; i < 4 && PINS[n]?.in; i++) n = PINS[n].in;
  return { name: n, at: PINS[n]?.at || null };
}
// the places listed under a pin: its interiors, and theirs
export const insideOf = (name) => Object.keys(PINS).filter((n) => n !== name && PINS[n].in && pinOf(n).name === name);
export const nameOf = (name) => PLACE_NAMES[name] || name;
