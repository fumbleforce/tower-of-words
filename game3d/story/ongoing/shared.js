import { speakers } from '../day3/shared.js';
import { ROUTES } from './routes.js';
import { continuingGoals } from './goals.js';

// Keep only the requested authored interactions and the nodes they call.
// This allows unfinished jobs to survive without replaying a date-specific opening.
export function interactions(source, keys) {
  const on = {}, nodes = {};
  function node(id) {
    if (!id || nodes[id] || !source.nodes?.[id]) return;
    nodes[id] = structuredClone(source.nodes[id]);
    visit(nodes[id]);
  }
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    node(value.go);
    node(value.call);
    Object.values(value).forEach(visit);
  }
  for (const key of keys) {
    if (!source.on?.[key]) throw new Error(`Missing continuing interaction: ${key}`);
    on[key] = structuredClone(source.on[key]);
    for (const entry of [].concat(on[key])) node(typeof entry === 'string' ? entry : entry.node);
  }
  return { on, nodes, speakers: structuredClone(source.speakers || {}) };
}
export function place(name, { on = {}, nodes = {}, arrive = [], show = {}, labels = {}, speakers: voices = {} } = {}) {
  const routes = {}, ways = {};
  for (const [to, keys] of Object.entries(ROUTES[name] || {})) {
    const id = `ongoing_to_${to}`;
    routes[id] = [{ do: 'trip', to }];
    for (const key of keys) ways[key] = id;
  }
  return {
    speakers: { ...speakers, ...voices }, start: 'ongoing_arrive', on: { ...ways, ...on }, show, labels,
    nodes: {
      ongoing_arrive: [{ do: 'ongoingSetup' }, ...arrive, { do: 'ongoingGoal' }],
      ...routes, ...continuingGoals(nodes),
    },
  };
}
