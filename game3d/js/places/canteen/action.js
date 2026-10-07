import { flags } from '../../narrative/state.js';
export function diningAction(game, place, act) {
  let request = 0;
  return async (args) => {
    const owned = ++request;
    flags.canteen_dining_complete = false;
    const complete = await act(args);
    if (game.place === place && owned === request) flags.canteen_dining_complete = complete === true;
  };
}
