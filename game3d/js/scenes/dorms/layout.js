// The plan of Eric's flat (docs/game/places.md, Eric's dorm room), in the room's own units (about 1.6 m each).
// The camera looks north. The room is at the back (z BACK to PART), the entry strip in front (PART to NEAR), the
// open-air corridor in front of that, and the next block's end wall behind the window, OUT.
import * as PL from '../dorm-court/plan.js';

export const X0 = -1.05, // side walls (inner faces)
  X1 = 1.05,
  BACK = -2.7, // the back wall, with the window
  PART = 0, // the low wall between the room and the entry strip
  NEAR = 1.05, // the front wall, on the corridor, with the front door
  H = 1.55, // ceiling height: every wall is cut here, the front ones lower
  LOW = 0.45, // cut-away walls in front of the room
  T = 0.1, // wall thickness
  OUT = BACK - 1.25, // the next block's end wall, about two metres off
  BATH_X = 0.38, // the unit bath's west wall, with its door
  COUNTER_X = -0.69, // the kitchenette counter's front edge
  CORRIDOR = 0.75, // depth of the corridor outside the front door
  PITCH = X1 - X0 + 2 * T; // one flat's width, for the neighbours along the corridor
export const WIN = [-0.45, 0.3, 0.52, 1.24]; // window: x from, x to, sill, head
export const DOOR = [-0.44, 0.16]; // the front door, x from and to
export const DOORWAY = [-0.62, 0.34]; // the opening from the strip into the room
export const DOORWAY_H = 1.48; // clear headroom for the default-scale protagonists, below the 1.55 ceiling
export const GENKAN_Z = 0.5; // the step up from the genkan tiles to the floor
export const FRONT_LOW = 0.3; // the front wall and door, cut lower still so the genkan shows

// palette: cool greys, navy, one muted red, warm lamp light (docs/game/art-and-sound.md)
export const C = {
  wall: '#9da2aa',
  wallTop: '#b9bdc3',
  cut: '#31363e', // the building's cut, round the flat
  facade: '#8b9097',
  concrete: '#a2a5a7',
  tatami: ['#a3a383', '#9e9e7d', '#a8a889'],
  heri: '#2e3547',
  plank: '#81838a',
  plankSeam: '#72747b',
  genkan: '#7c818a',
  step: '#9a9ea5',
  steel: '#5a6a80', // the front doors
  frame: '#454b55',
  alu: '#4a515c',
  white: '#e3e4e1',
  navy: '#34406a',
  cushion: '#9a6468',
};

// Eric's floor, 2F, outside the flat: the open corridor from the far flats past 203 to its east end, where it runs
// into the block's return and the stairs (docs/game/places.md, Dorm building). The return's west face, the stair
// window and the storey height come from the dorm court's plan, turned into this frame (dorm-court/plan.js DORMS).
export const CORR = [NEAR + T, NEAR + T + CORRIDOR]; // the corridor's z: the flats' front face to the parapet
export const RETURN = PL.RETURN_X - PL.DORMS.x; // the return's west face, where the corridor ends
export const STOREY = PL.STOREY;
// the stair hall in the return: the flight up from the half landing along the west face (lane A, which Eric comes
// up), the flight down to 1F beside it (lane B), the landing at the top, level with the corridor
export const STAIR = {
  a: [RETURN + 0.1, RETURN + 0.9], // lane A's x
  b: [RETURN + 0.95, RETURN + 1.75], // lane B's x
  east: RETURN + 1.85, // the stair hall's east wall
  back: 0.35, // the landing's back wall, with the store's door and the 2F sign
  top: 2.2, // where the flights meet the landing
  tread: 0.25,
  treads: 5, // below the landing; then the half landing, half a storey down
  half: [2.2 + 5 * 0.25, 4.55], // the half landing's z
  window: PL.STAIR_WINDOW.map((z) => z - PL.DORMS.z), // on the west face, along lane A
};
export const LANDING = [STAIR.a[0] + 0.45, 1.6]; // where Eric stands at the top of the stairs
// The corridor floors run west past 206 to 207 and then the shared room, a flat's width at the block's west end
// (the kitchen on 2F, the laundry on 3F), to the block's end wall with the fire escape's door in it
export const SHARED_K = -4; // the shared room's place along the corridor, counted like the flats (Eric's is 0)
export const WEST_END = SHARED_K * PITCH + X0 - T; // the end wall's inner face: the shared room's west wall's outer one
// The floors Eric can walk, side by side in the one frame (places/dorms.js): 2F at the origin, 3F and the roof far
// enough east that no camera on one ever sees another. Each is built in its own frame and set down at its x.
export const LEVEL_DX = { '2f': 0, '3f': 40, roof: 80 };
