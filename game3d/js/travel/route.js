// The shortest walk from one place to another over the ways open now (travel/ways.js), using only ways that are a
// plain walk, and its walking time from the map pins' distances. Pure.
import { pinOf } from './pins.js';

const METRES = 1.5; // island units to metres (scenes/island-layout.js UNIT)
const PER_MIN = 75; // metres walked a minute
const STEP = 6; // the units a step through a door into an interior counts for

// the walking distance of one leg, in island units: along the grid between the two pins
function legUnits(a, b) {
  const A = pinOf(a),
    B = pinOf(b);
  if (!A.at || !B.at || A.name === B.name) return STEP;
  return Math.abs(A.at[0] - B.at[0]) + Math.abs(A.at[1] - B.at[1]);
}

// graph: { place: [{ to, scene }] } (ways.js waysGraph). Returns { path: [from, ..., to], via, units, minutes } or
// null when no walk gets there. via is the last place before `to`: he arrives as he would on foot from it.
export function findRoute(graph, from, to) {
  if (from === to) return { path: [from], via: null, units: 0, minutes: 0 };
  const dist = new Map([[from, 0]]),
    prev = new Map(),
    open = new Set([from]);
  while (open.size) {
    let cur = null;
    for (const p of open) if (cur === null || dist.get(p) < dist.get(cur)) cur = p;
    open.delete(cur);
    if (cur === to) break;
    for (const w of graph[cur] || []) {
      if (w.scene) continue;
      const d = dist.get(cur) + legUnits(cur, w.to);
      if (d < (dist.get(w.to) ?? Infinity)) {
        dist.set(w.to, d);
        prev.set(w.to, cur);
        open.add(w.to);
      }
    }
  }
  if (!dist.has(to)) return null;
  const path = [to];
  while (path[0] !== from) path.unshift(prev.get(path[0]));
  const units = dist.get(to);
  return { path, via: path[path.length - 2], units, minutes: walkMinutes(units) };
}

export const walkMinutes = (units) => Math.max(1, Math.round((units * METRES) / PER_MIN));

// every place reachable from `from` with plain walks: { place: route }
export function routesFrom(graph, from) {
  const out = {};
  for (const p of Object.keys(graph)) {
    const r = findRoute(graph, from, p);
    if (r) out[p] = r;
  }
  return out;
}
