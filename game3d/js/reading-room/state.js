import { loadReading, readingAction } from './model.js';
export function readingState(flags, persist = () => {}) {
  let state = loadReading(flags.research_state);
  return {
    read: () => structuredClone(state),
    reload() {
      state = loadReading(flags.research_state);
    },
    act(action) {
      state = readingAction(state, action);
      flags.research_state = structuredClone(state);
      persist();
      return structuredClone(state);
    },
  };
}
