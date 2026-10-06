// The gym's ground floor plan (scenes/rooms/gym.js builds it, gym-hall.js the hall's part; docs/game/places.md
// "Gym"): the room, the lobby's and the hall's pieces, and where the day's people stand. In the room's own frame: x
// east, z toward the camera, the origin the middle of the south wall, inside (the main doors' middle). Plain data, so
// places/day3/plan.js reads the posts without the scene.
export const C = {
  maple: '#c4a882',
  seam: '#b39673',
  lobby: '#c9c7c0',
  tiles: '#8d9196',
  wall: '#d9d6cc',
  wainscot: '#a9875a',
  green: '#3f8f6a',
  red: '#b5463c',
  counter: '#d8d9d5',
  counterFront: '#6f8d9a',
  locker: '#b7bcc2',
  slot: '#3e434d',
  bench: '#b48c58',
  steel: '#8b919b',
  frame: '#3f4650',
  glass: '#cfe2ec',
  sky: '#cfe2ec',
  roof: '#b9b6ad',
  dark: '#2a2f36',
  blue: '#3e6aa8',
};
// the room inside its walls; the walls' height, the front wall's, their thickness
export const R = { x0: -9.4, x1: 9.4, z0: -13.0, z1: 0, h: 2.1, near: 0.26, t: 0.18 };
export const DOOR = [-0.85, 0.85]; // the main doors in the south wall
export const TILES = [-2.6, 2.6, -1.5, 0]; // the entrance's tiles; the step up at their north edge
export const GLASS_Z = -4.9; // the hall's glass wall across the lobby's north side
export const HALL_DOOR = [-1.0, 1.0]; // its double doors, open
export const PIER = [2.6, 4.0]; // the solid pier at its east end, the club board on it
// the changing block: its front on the glass wall's line, its walls back into the hall; the doors in its front
export const BLOCK = { x0: 4.0, x1: R.x1, z0: -8.3, z1: GLASS_Z };
export const CHANGING = { men: 5.0, women: 6.65, pool: 8.45, w: 0.8, h: 1.35 };
// the reception counter along z, its front facing east into the lobby; the back counter along the west wall
export const COUNTER = { x: -5.0, d: 0.55, h: 0.52, z0: -3.6, z1: -0.3 };
export const BACK = { x0: R.x0, x1: R.x0 + 0.5, z0: -3.6, z1: -0.5 };
export const FRONT = COUNTER.x + COUNTER.d / 2; // the counter's front face
// the hall's furniture
export const STORE = { x0: R.x0, x1: -6.6, z0: R.z0, z1: -10.6, door: [-8.7, -7.2] }; // door in its south wall
export const BENCHES = [-6.2, -8.6].map((z) => [R.x0 + 0.42, z]); // their middles; seats along z, facing east
export const BENCH_LEN = 2.2;
export const COURT = { x: -1.1, z: -10.75, L: 8.9, W: 3.8 }; // badminton, its length along x
export const MEETING = { x0: 4.5, x1: 8.6, rows: [-10.3, -11.2], board: [6.55, -12.55] };
// where the day's people stand (places/day3/plan.js): the attendant behind the counter at the terminal, Mori at the
// counter beside its front, Emi at the store's door
export const TERM_Z = -2.3;
export const POSTS = {
  attendant: { at: [COUNTER.x - 0.8, TERM_Z], face: [FRONT + 0.4, TERM_Z] },
  mori: { at: [FRONT + 0.68, TERM_Z + 0.95], face: [COUNTER.x, TERM_Z + 0.95] },
  emi: { at: [-7.95, STORE.z1 + 0.6], face: [-7.95, STORE.z1 - 0.8] },
};
