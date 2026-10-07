import { flags } from '../../narrative/state.js';
import { flagKeys } from '../../narrative/engine-flags.js';
import { isWeekend } from '../ongoing/calendar.js';
import { mioLunchOffer } from './eligibility.js';
import { mioLunchState, completeMioLunch } from './state.js';
import { mioLunchStage } from './stage.js';

const KEYS = flagKeys('game3d/js/places/mio-lunch/index.js');

export function attachMioLunch(game, P) {
  const state = mioLunchState(),
    stage = mioLunchStage(game, P, state);
  function sync() {
    flags[KEYS.mio_lunch_offer] = mioLunchOffer(stage.context()) || 0;
    stage.routine(game.sim.day >= 5 && !isWeekend(game.sim.day) && game.sim.period === 'lunch' && !flags.ms3_mio);
  }
  const update = P.update,
    snapshot = P.snapshotState,
    restore = P.restoreState,
    leave = P.leave;
  P.update = function (...args) {
    update?.apply(this, args);
    sync();
    stage.update();
  };
  P.snapshotState = function (...args) {
    return { ...snapshot?.apply(this, args), mioLunch: stage.snapshot() };
  };
  P.restoreState = function (saved, ...args) {
    restore?.call(this, saved, ...args);
    stage.restore(saved.world?.mioLunch);
    sync();
  };
  P.leave = function (...args) {
    stage.cancel();
    return leave?.apply(this, args);
  };
  P.mioLunch = {
    state,
    stage,
    sync,
    complete: (args) => completeMioLunch(state, stage.context(), args, { ...game.hooks, release: stage.release }),
  };
  sync();
}
