// Exact pre-pool-correction checkpoints. Never rewrite an unrelated gym scene or infer completion from attendance.
import revisions from './swimming-revisions.js';
import CLUBS from '../../story/clubs.js';
import POOL from '../../story/day3/pool.js';
import ONGOING from '../../story/ongoing/pool.js';
import { nodeFingerprint } from '../narrative/checkpoint.js';
const oldPool = revisions.pool;
const firstNodes = { ...CLUBS.nodes, ...POOL.nodes };
const laterNodes = { ...CLUBS.nodes, ...ONGOING.nodes };
function indexFor(node, index) {
  if (node === 'd3_pool_begin') return index + 1;
  if (node === 'club_swimming_pool') return index < 1 ? index : Math.max(1, index - 2);
  if (node === 'club_swimming_sit') return index < 4 ? index : Math.max(4, index - 2);
  if (node === 'club_swimming_length') {
    const mapped = index < 2 ? index : Math.max(2, index - 2);
    return mapped;
  }
  return index;
}
function removed(node, index) {
  return (
    (node === 'club_swimming_pool' && [1, 2].includes(index)) ||
    (node === 'club_swimming_sit' && [4, 5].includes(index)) ||
    (node === 'club_swimming_length' && [2, 3].includes(index))
  );
}
function migrateFrame(frame, later) {
  const mapPath = (path) => [indexFor(frame.node, path[0]), ...path.slice(1)];
  const pathOf = (key) => {
    const path = JSON.parse(key.slice(0, key.lastIndexOf(']') + 1));
    if (!Array.isArray(path) || path.length % 2 !== 1 || !Number.isInteger(path[0]))
      throw new Error('Invalid checkpoint marker');
    return path;
  };
  const mapKey = (key) => JSON.stringify(mapPath(pathOf(key))) + key.slice(key.lastIndexOf(']') + 1);
  const entries = (values) =>
    Object.fromEntries(
      Object.entries(values || {})
        .filter(([key]) => !removed(frame.node, pathOf(key)[0]))
        .map(([key, value]) => [mapKey(key), value]),
    );
  return {
    ...frame,
    fingerprint: nodeFingerprint((later ? laterNodes : firstNodes)[frame.node]),
    done: frame.done.filter((key) => !removed(frame.node, pathOf(key)[0])).map(mapKey),
    cursors: frame.cursors.map((cursor) =>
      cursor.path.length
        ? { ...cursor, path: mapPath(cursor.path) }
        : { ...cursor, index: indexFor(frame.node, cursor.index) },
    ),
    branches: entries(frame.branches),
    choices: entries(frame.choices),
    worldAfter: entries(frame.worldAfter),
  };
}
function safeFrame(frame, later) {
  try {
    return migrateFrame(frame, later);
  } catch {
    return frame;
  } // Leave damaged checkpoints to the normal Runner recovery screen.
}
export function migrateSwimmingSave(saved) {
  const execution = saved.runner?.execution;
  const legacyFrame = (frame) =>
    typeof frame?.node === 'string' &&
    (frame.node.startsWith('ongoing_winter') ||
      frame.node.startsWith('club_swimming_winter') ||
      frame.node === 'd3_winter_setup' ||
      ['club_swimming_1', 'club_swimming_2'].includes(frame.node));
  const gymScene =
    saved.place === 'gym' &&
    (saved.world?.winterClub?.active ||
      (Array.isArray(execution?.frames) ? execution.frames : []).some(
        (frame) => legacyFrame(frame) && revisions.gym[frame.node] === frame.fingerprint,
      ));
  const originalQueue = saved.runner?.queued;
  const queued = Array.isArray(originalQueue)
    ? originalQueue.filter((frame) => !(saved.place === 'gym' && legacyFrame(frame)))
    : originalQueue;
  let flags = saved.flags;
  // These old completed gym evenings already paid the introductory/shared award.
  if ((flags?.d3_winter_intro_done || flags?.winter_practice_done) && !flags?.d3_swimming_shared)
    flags = { ...flags, d3_swimming_shared: true };
  const finishQueuedWork = gymScene && queued?.length;
  if (gymScene)
    return {
      ...saved,
      flags: { ...flags, place: finishQueuedWork ? 'gym' : 'pool' },
      place: finishQueuedWork ? 'gym' : 'pool',
      pendingStart: finishQueuedWork ? 'gym' : 'pool',
      world: finishQueuedWork ? { ...saved.world, winterClub: undefined } : null,
      zones: null,
      surface: null,
      transition: null,
      runner: { ...saved.runner, execution: null, queued },
      visited: [...new Set([...(saved.visited || []), ...(finishQueuedWork ? [] : ['pool'])])],
      ui: { ...saved.ui, hold: null, goal: '' },
    };
  let runner = saved.runner;
  if (execution?.v === 3 && execution.place === 'pool' && saved.place === 'pool' && Array.isArray(execution.frames)) {
    const frames = execution.frames.map((frame) =>
      oldPool[frame?.node] === frame?.fingerprint && frame?.fingerprint ? safeFrame(frame, saved.day > 5) : frame,
    );
    if (frames.some((frame, i) => frame !== execution.frames[i]))
      runner = { ...runner, execution: { ...execution, frames } };
  }
  if (queued?.length !== originalQueue?.length) runner = { ...runner, queued };
  return flags !== saved.flags || runner !== saved.runner ? { ...saved, flags, runner } : saved;
}
