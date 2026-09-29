// Checkpoints address existing story arrays; they never contain executable code or story text.
export function nodeFingerprint(steps) {
  const source = JSON.stringify(steps, (_key, value) => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);
  let a = 2166136261, b = 5381;
  for (let i = 0; i < source.length; i++) {
    a = Math.imul(a ^ source.charCodeAt(i), 16777619) >>> 0;
    b = (Math.imul(b, 33) ^ source.charCodeAt(i)) >>> 0;
  }
  return `${source.length}:${a.toString(16)}:${b.toString(16)}`;
}

export function newFrame(node, steps, trigger = null) {
  return { node, fingerprint: nodeFingerprint(steps), trigger, cursors: [], done: [], branches: {}, choices: {}, staging: null, worldAfter: {} };
}

export function listAt(story, node, path) {
  let list = story.nodes[node];
  for (let i = 0; i < path.length; i += 2) {
    if (!Number.isInteger(path[i]) || !['then', 'else'].includes(path[i + 1])) return null;
    list = list?.[path[i]]?.[path[i + 1]];
  }
  return Array.isArray(list) ? list : null;
}

function stepAt(story, node, key) {
  try {
    const path = JSON.parse(key);
    if (!Array.isArray(path) || path.length % 2 !== 1) return null;
    const index = path.pop();
    if (!Number.isInteger(index) || index < 0) return null;
    return listAt(story, node, path)?.[index];
  } catch { return null; }
}

export function readCheckpoint(data, place, story) {
  if (!data || data.v !== 3 || data.place !== place || !Array.isArray(data.frames)
    || !data.frames.length || data.frames.length > 32) return null;
  for (const [i, frame] of data.frames.entries()) {
    if (!frame || !Array.isArray(story.nodes[frame.node])
      || frame.fingerprint !== nodeFingerprint(story.nodes[frame.node])
      || (frame.trigger !== null && typeof frame.trigger !== 'string')
      || !Array.isArray(frame.done) || !frame.done.every(k => typeof k === 'string')
      || !frame.branches || typeof frame.branches !== 'object' || Array.isArray(frame.branches)
      || !frame.choices || typeof frame.choices !== 'object' || Array.isArray(frame.choices)
      || (frame.staging !== null && (!frame.staging || typeof frame.staging !== 'object' || Array.isArray(frame.staging)))
      || !frame.worldAfter || typeof frame.worldAfter !== 'object' || Array.isArray(frame.worldAfter)
      || !Array.isArray(frame.cursors)) return null;
    for (const [key, value] of Object.entries(frame.branches)) {
      const step = stepAt(story, frame.node, key);
      if (typeof value !== 'boolean' || !step || step.if === undefined || !(step.then || step.else)) return null;
    }
    for (const [key, value] of Object.entries(frame.choices)) {
      const step = stepAt(story, frame.node, key);
      if (!Number.isInteger(value) || value < 0 || !step?.choice?.[value]) return null;
    }
    for (const [depth, cursor] of frame.cursors.entries()) {
      if (!cursor || !Array.isArray(cursor.path) || cursor.path.length % 2) return null;
      const list = listAt(story, frame.node, cursor.path);
      if (!list || !Number.isInteger(cursor.index) || cursor.index < 0 || cursor.index >= list.length
        || !['step', 'branch', 'call', 'choice-call'].includes(cursor.phase)) return null;
      const parent = frame.cursors[depth - 1];
      if (!parent && cursor.path.length) return null;
      if (parent && (parent.phase !== 'branch' || cursor.path.length !== parent.path.length + 2
        || JSON.stringify(cursor.path.slice(0, -2)) !== JSON.stringify(parent.path)
        || cursor.path.at(-2) !== parent.index)) return null;
      const step = list[cursor.index];
      if (cursor.phase === 'call' && !step?.call) return null;
      if (cursor.phase === 'choice-call' && !step?.choice?.[frame.choices[JSON.stringify([...cursor.path, cursor.index])]]?.call) return null;
    }
    // Every suspended caller must be waiting on its child, possibly inside a branch.
    if (i < data.frames.length - 1 && !['call', 'choice-call'].includes(frame.cursors.at(-1)?.phase)) return null;
  }
  return structuredClone(data.frames);
}
