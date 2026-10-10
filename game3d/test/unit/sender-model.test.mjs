import test from "node:test";
import assert from "node:assert/strict";
import {
  createSender,
  senderAction,
  pendingItems,
  partialDelivery,
  loadSender,
  ITEMS,
} from "../../js/investigations/sender/model.js";
const act = (state, type, extra = {}) =>
  senderAction(state, { type, ...extra });
function inspect(order = ["1:1", "2:0"]) {
  let state = act(act(createSender(), "offer"), "wake");
  for (const row of order) state = act(state, "select", { row });
  return state;
}
function retry(state) {
  state = act(state, "retry");
  for (let n = 0; state.active && n < 20; n++) {
    state = loadSender(JSON.parse(JSON.stringify(act(state, "advance"))));
    conserved(state);
  }
  assert.equal(state.active, null);
  return state;
}
function conserved(state) {
  const all = [
    ...pendingItems(state),
    ...state.acknowledged,
    ...(state.held === null ? [] : [state.held]),
  ];
  assert.deepEqual(all.sort(), [...ITEMS]);
  assert.equal(new Set(all).size, ITEMS.length);
}

test("inspection requires actual matching occurrences in distinct records, in either order", () => {
  for (const order of [
    ["1:1", "2:0"],
    ["2:0", "1:1"],
  ])
    assert.equal(inspect(order).pinned.item, 25);
  assert.equal(inspect(["1:0", "2:0"]).pinned, null);
  assert.equal(inspect(["1:1", "1:1"]).pinned, null);
  assert.equal(inspect(["1:1", "1:0"]).pinned, null);
  assert.equal(act(createSender(), "hold", { item: 25 }).held, null);
});

test("wrong hold, replacement, successful retry, release and failure conserve all items across every Continue", () => {
  let state = inspect();
  state = retry(state);
  assert.equal(state.failures, 1);
  state = retry(act(state, "hold", { item: 26 }));
  assert.equal(state.held, 26);
  assert.deepEqual(state.acknowledged, [24]);
  state = act(state, "hold", { item: 25 });
  assert.deepEqual(pendingItems(state), [26, 27]);
  state = retry(state);
  assert.equal(partialDelivery(state), true);
  assert.deepEqual(state.acknowledged, [24, 26, 27]);
  assert.equal(state.held, 25);
  assert.equal(
    state.attempts.flatMap((run) => run.rows).filter((row) => row.item === 24)
      .length,
    1,
  );
  assert.deepEqual(act(state, "hold", { item: 24 }), state);
  assert.deepEqual(act(state, "retry"), state);
  state = retry(act(state, "release"));
  assert.deepEqual(state.acknowledged, [24, 26, 27]);
  assert.deepEqual(pendingItems(state), [25]);
  conserved(state);
});

test("retry is single-flight and cannot change held item midway through delivery", () => {
  let state = act(act(inspect(), "hold", { item: 25 }), "retry");
  const original = structuredClone(state);
  assert.deepEqual(act(state, "retry"), original);
  assert.deepEqual(act(state, "hold", { item: 26 }), original);
  assert.deepEqual(act(state, "release"), original);
  state = act(state, "advance");
  state = act(state, "advance");
  assert.deepEqual(state.acknowledged, [24, 26]);
  assert.deepEqual(loadSender(state), state);
});

test("actions leave previous snapshots untouched and corrupt imports reset safely", () => {
  const old = inspect();
  const copy = structuredClone(old);
  act(old, "retry");
  assert.deepEqual(old, copy);
  assert.deepEqual(
    loadSender({ ...old, acknowledged: [24, 25] }),
    createSender(),
  );
  assert.deepEqual(loadSender({ ...old, held: 24 }), createSender());
});
