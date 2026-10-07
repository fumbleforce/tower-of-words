import { loadSender, senderAction, partialDelivery, hasDelivery } from './model.js';
// The queue travels with the save, including when the player saves outside B2.
export function senderState(flags, persist = () => {}) {
  let state = loadSender(flags.sender_state);
  function sync() {
    if (!flags.sender_state && !state.offered) return;
    flags.sender_state = state;
    flags.sender_offered = state.offered;
    flags.sender_partial = partialDelivery(state);
    flags.sender_delivered = hasDelivery(state);
    flags.sender_compared = !!state.pinned;
  }
  sync();
  return {
    read: () => state,
    reload() {
      state = loadSender(flags.sender_state);
      sync();
    },
    act(action) {
      state = senderAction(state, action);
      sync();
      persist();
      return state;
    },
  };
}
