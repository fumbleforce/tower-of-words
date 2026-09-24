// Day-one backgrounds: modern MAPPA anime, widescreen, empty of people.
import { run, spent } from './rep.mjs';
const A = 'art/company/bg/';
const STYLE = 'Anime background art, modern MAPPA anime film still, detailed, cinematic lighting, no people.';
const B = {
  arrival: 'A driverless monorail gliding across Tokyo Bay toward a gleaming company city built on a man-made island: office towers, dorm blocks, a factory district, early morning sun and haze.',
  gate: 'The main security gate of a giant corporate campus: glass turnstiles, a small guard booth with a coffee mug and a newspaper, the company towers behind, bright morning.',
  dorm: 'The lobby of a company employee dormitory: rows of shoe lockers, a notice board covered in flyers, vending machines, a worn sofa, warm afternoon light through tall windows.',
  office: 'A cluttered basement office for a small misfit team: mismatched desks, stacks of files, monitors, a whiteboard full of scribbles, a coffee machine, plants under a high narrow window, cosy lamp light.',
  canteen: 'A huge busy-looking staff canteen at lunchtime, empty of people: long tables, a serving counter with steaming pots, menu boards, big windows onto the bay.',
  bar: 'A small, quiet bar inside the company city at night: dark wood counter, backlit shelves of bottles, a few stools, warm amber lighting, rain on the window.',
  rooftop: 'A rooftop vegetable garden on top of a corporate tower at golden hour: raised beds, tomato plants, a small shed, a bench, the company city skyline and the bay behind.',
};
const jobs = Object.entries(B).map(([k, d]) => run('black-forest-labs/flux-2-pro', { prompt: `${STYLE} ${d}`, aspect_ratio: '16:9', safety_tolerance: 5, seed: 5 }, `${A}${k}.webp`)
  .then(() => console.log('ok', k), e => console.log('FAIL', k, e.message.slice(0, 120))));
await Promise.all(jobs);
console.log('spent', spent());
