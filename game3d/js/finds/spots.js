// Where the finds are and how they look (js/finds/index.js). Photos lie on the ground off the day's main path, one
// in each of five places; the paper comes out of a scene (the `find` hook) and has no spot. Ids are the contract with
// story/finds.js (their titles and captions), so they never change once shipped. Plain data (story-check reads it).
// The plaza's lies by the north-west benches, where a leaflet used to be.
//   at: [x, z] in the place's frame; turn: its angle on the ground (Eric picks it up from the nearest free floor
//   a step toward the camera: finds/index.js)
//   print: the picture (finds/prints.js); title: the engine's fallback name until story/finds.js gives one

const LIST = [
  { id: 'photo_gate', kind: 'photo', place: 'gate', print: 'monorail', title: 'Monorail', at: [4.3, 4.1], turn: 0.3 },
  {
    id: 'photo_forecourt',
    kind: 'photo',
    place: 'forecourt',
    print: 'cherry',
    title: 'Cherry tree',
    at: [23.4, 5.2],
    turn: -0.5,
  },
  {
    id: 'photo_plaza',
    kind: 'photo',
    place: 'plaza',
    print: 'pigeons',
    title: 'Pigeons',
    at: [-8.48, -4.5],
    turn: 0.6,
  },
  { id: 'photo_office', kind: 'photo', place: 'office', print: 'cat', title: 'Cat', at: [-5.6, 5.9], turn: 0.9 },
  {
    id: 'photo_dorm',
    kind: 'photo',
    place: 'dorm_court',
    print: 'fireworks',
    title: 'Fireworks',
    at: [-4.5, -0.1],
    turn: -0.2,
  },
  { id: 'bakery_flyer', kind: 'paper', place: 'dorm_court', print: 'flyer', title: 'Bakery flyer' },
];
export const FINDS = Object.fromEntries(LIST.map((f) => [f.id, f]));
export const PHOTOS = LIST.filter((f) => f.kind === 'photo').map((f) => f.id);
