// Sender records are durable evidence. Moving an item never copies or deletes it.
export const ITEMS = Object.freeze([24, 25, 26, 27]);
const record = (id, rows) => ({
  id,
  rows: rows.map(([item, status], i) => ({ id: `${id}:${i}`, item, status })),
});

export function createSender() {
  return {
    v: 1,
    offered: false,
    awake: false,
    acknowledged: [24],
    held: null,
    attempts: [
      record(1, [
        [24, 'acknowledged'],
        [25, 'started'],
        [null, 'restart'],
      ]),
      record(2, [
        [25, 'started'],
        [null, 'restart'],
      ]),
    ],
    selected: [],
    pinned: null,
    active: null,
    failures: 0,
  };
}

export const pendingItems = (state) => ITEMS.filter((id) => id !== state.held && !state.acknowledged.includes(id));
export const hasDelivery = (state) => [26, 27].every((id) => state.acknowledged.includes(id));
export const partialDelivery = (state) => state.held === 25 && [26, 27].every((id) => state.acknowledged.includes(id));
export const selectedRows = (state) =>
  state.selected.map((id) => state.attempts.flatMap((run) => run.rows).find((row) => row.id === id)).filter(Boolean);

function addRow(state, item, status) {
  const run = state.attempts.at(-1);
  run.rows.push({ id: `${run.id}:${run.rows.length}`, item, status });
}

function selectRow(state, id) {
  const run = state.attempts.find((attempt) => attempt.rows.some((row) => row.id === id && row.item !== null));
  if (!run) return;
  if (state.selected.includes(id)) state.selected = state.selected.filter((selected) => selected !== id);
  else {
    state.selected = state.selected.filter((selected) => !run.rows.some((row) => row.id === selected));
    state.selected = [...state.selected.slice(-1), id];
  }
  const rows = selectedRows(state);
  if (rows.length === 2 && rows.every((row) => row.item === 25 && row.status === 'started'))
    state.pinned = { item: 25, rows: rows.map((row) => row.id) };
}

function advance(state) {
  if (!state.active) return;
  const item = state.active.item;
  if (state.active.phase === 'start') {
    addRow(state, item, 'started');
    state.active.phase = item === 25 ? 'restart' : 'acknowledge';
  } else if (state.active.phase === 'restart') {
    addRow(state, null, 'restart');
    state.active = null;
    state.failures++;
  } else {
    addRow(state, item, 'acknowledged');
    if (!state.acknowledged.includes(item)) state.acknowledged.push(item);
    const next = pendingItems(state)[0];
    state.active = next === undefined ? null : { item: next, phase: 'start' };
  }
}

// Retry starts one delivery. Every resulting output is an atomic saveable transition.
export function senderAction(previous, action) {
  const state = structuredClone(previous);
  if (action.type === 'offer') state.offered = true;
  if (action.type === 'wake' && state.offered) state.awake = true;
  if (!state.awake) return state;
  if (action.type === 'select') selectRow(state, action.row);
  if (
    action.type === 'hold' &&
    state.pinned &&
    !state.active &&
    ITEMS.includes(action.item) &&
    !state.acknowledged.includes(action.item)
  )
    state.held = action.item;
  if (action.type === 'release' && !state.active) state.held = null;
  if (action.type === 'retry' && state.pinned && !state.active && pendingItems(state).length) {
    state.attempts.push(record(state.attempts.at(-1).id + 1, []));
    state.active = { item: pendingItems(state)[0], phase: 'start' };
  }
  if (action.type === 'advance') advance(state);
  return state;
}

export function loadSender(saved) {
  if (!saved || saved.v !== 1) return createSender();
  try {
    const state = structuredClone(saved);
    if (
      typeof state.offered !== 'boolean' ||
      typeof state.awake !== 'boolean' ||
      (state.awake && !state.offered) ||
      !Number.isInteger(state.failures) ||
      state.failures < 0
    )
      return createSender();
    if (!Array.isArray(state.acknowledged) || !state.acknowledged.includes(24) || state.acknowledged.includes(25))
      return createSender();
    if (
      new Set(state.acknowledged).size !== state.acknowledged.length ||
      state.acknowledged.some((id) => !ITEMS.includes(id))
    )
      return createSender();
    if (state.held !== null && (!ITEMS.includes(state.held) || state.acknowledged.includes(state.held)))
      return createSender();
    if (!Array.isArray(state.attempts) || state.attempts.length < 2) return createSender();
    const ids = new Set();
    let previousRun = 0;
    for (const run of state.attempts) {
      if (!Number.isInteger(run.id) || run.id <= previousRun || !Array.isArray(run.rows)) return createSender();
      previousRun = run.id;
      for (const row of run.rows) {
        if (
          ids.has(row.id) ||
          typeof row.id !== 'string' ||
          !['started', 'acknowledged', 'restart'].includes(row.status)
        )
          return createSender();
        if (row.status === 'restart' ? row.item !== null : !ITEMS.includes(row.item)) return createSender();
        ids.add(row.id);
      }
    }
    state.selected = Array.isArray(state.selected) ? state.selected.filter((id) => ids.has(id)).slice(-2) : [];
    if (
      state.pinned &&
      (state.pinned.item !== 25 ||
        state.pinned.rows?.length !== 2 ||
        new Set(state.pinned.rows.map((id) => state.attempts.findIndex((run) => run.rows.some((row) => row.id === id))))
          .size !== 2 ||
        !state.pinned.rows.every((id) =>
          state.attempts.some((run) =>
            run.rows.some((row) => row.id === id && row.item === 25 && row.status === 'started'),
          ),
        ))
    )
      return createSender();
    if (
      state.active &&
      (!state.offered ||
        !state.awake ||
        !state.pinned ||
        !pendingItems(state).includes(state.active.item) ||
        (state.active.phase === 'restart' && state.active.item !== 25) ||
        (state.active.phase === 'acknowledge' && state.active.item === 25) ||
        !['start', 'restart', 'acknowledge'].includes(state.active.phase))
    )
      return createSender();
    return state;
  } catch {
    return createSender();
  }
}
