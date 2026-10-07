import { flags } from '../../narrative/state.js';
export function terminalAction(game, place, act) {
  let request = 0;
  return async (args) => {
    const owned = ++request;
    flags.ferry_action_complete = false;
    const complete = await act(args);
    if (game.place === place && owned === request) flags.ferry_action_complete = complete === true;
  };
}
