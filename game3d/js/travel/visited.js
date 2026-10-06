// The places Eric has been to, across days (docs/game/systems.md, Saving: `visited`). Added when he enters a place
// (places/lifecycle.js enter), saved and loaded with the game (sim.js). The map draws a place he hasn't been to yet
// with a dashed ring. No DOM, so the unit tests import it in Node.
export const visited = new Set();

export const noteVisit = (name) => name && visited.add(name);
export const visitedList = () => [...visited];

// day 1's places in the order the story walks them
const DAY1 = ['train', 'gate', 'forecourt', 'office'];
const HOME = ['plaza', 'dorm_court', 'dorms'];

// A save from before `visited`: the places its day has certainly passed through, and the saved place. Day 1 walks
// the train, the gate and the forecourt to B2, and home after work by the plaza; a later day began after all of it.
export function seedVisited(d) {
  const day = d.day || 1,
    f = d.flags || {},
    at = d.place;
  const out = new Set();
  if (day > 1) [...DAY1, ...HOME].forEach((p) => out.add(p));
  else {
    const i = DAY1.indexOf(at);
    if (i >= 0) DAY1.slice(0, i + 1).forEach((p) => out.add(p));
    else DAY1.slice(0, 3).forEach((p) => out.add(p));
    if (f.going_home) ['office', 'forecourt'].forEach((p) => out.add(p));
  }
  if (at) out.add(at);
  return [...out];
}

export function loadVisited(d) {
  visited.clear();
  for (const p of Array.isArray(d?.visited) ? d.visited : seedVisited(d || {})) visited.add(p);
}
