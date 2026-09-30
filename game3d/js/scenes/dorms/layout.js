// The plan of Eric's flat (docs/game/places.md, Eric's dorm room), in the room's own units (about 1.6 m each).
// The camera looks north. The room is at the back (z BACK to PART), the entry strip in front (PART to NEAR), the
// open-air corridor in front of that, and the next block's end wall behind the window, OUT.
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
export const DOORWAY = [-0.4, 0.34]; // the opening from the strip into the room
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
