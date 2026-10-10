import { senderReady } from './hook.js';
import * as THREE from 'three';
import { flags } from '../../narrative/state.js';
import { known } from '../../lang.js';
import { conversationMemory } from '../../conversations/state.js';
import { save } from '../../sim.js';
import { senderState } from './state.js';
import { senderProps } from './props.js';
import { senderStage, SENDER_SPOTS } from './stage.js';
import { senderView } from './view.js';

export function attachSender(game, P, world) {
  const state = senderState(flags, () => save(game));
  const props = senderProps(world),
    stage = senderStage(game, P, props);
  let view = null,
    finishView = null,
    generation = 0,
    running = null;
  const ready = () => senderReady(P, flags, conversationMemory.has('mio_sender_complaint'));
  const canInterpret = () =>
    !flags.sender_interpreted && conversationMemory.ready('mori_sender_retained', known) && !!stage.present('mori');
  function sync(derive = false) {
    if (derive) {
      flags.sender_available = ready();
      flags.sender_complaint_heard = conversationMemory.has('mio_sender_complaint');
      flags.sender_remark_heard = conversationMemory.has('mori_sender_retained');
      flags.sender_failed = state.read().failures > 0;
    }
    props.paint(state.read(), !!flags.sender_note_kept);
  }
  function close(reason = '') {
    generation++;
    view?.close();
    view = null;
    const resolve = finishView;
    finishView = null;
    if (resolve) flags.sender_wants_mori = reason === 'mori';
    resolve?.();
  }
  async function runQueue() {
    if (running === generation || !state.read().active) return;
    const owner = generation;
    running = owner;
    try {
      while (state.read().active && game.place === P && owner === generation) {
        state.act({ type: 'advance' });
        sync();
        view?.render();
        await game.wait(420);
      }
    } finally {
      if (running === owner) running = null;
    }
  }
  function inspect(liveOnly = false) {
    flags.sender_wants_mori = false;
    return new Promise((resolve) => {
      finishView = resolve;
      view = senderView({
        read: state.read,
        liveOnly,
        act(action) {
          const pinned = !!state.read().pinned;
          state.act(action);
          sync();
          if (!pinned && state.read().pinned && !flags.sender_comparison_shown && stage.present('mio')) close();
          else if (action.type === 'retry') void runQueue();
        },
        leave: () => close(),
        interpret: () => close('mori'),
        canInterpret,
      });
      void runQueue();
    });
  }
  const act = async ({ action }) => {
    flags.sender_action_ok = false;
    if (game.place !== P) return;
    if (action === 'available') {
      sync(true);
      flags.sender_action_ok = ready();
      return;
    }
    if (action === 'memory') sync(true);
    else if (action === 'offer') state.act({ type: 'offer' });
    else if (action === 'hold25') state.act({ type: 'hold', item: 25 });
    else if (action === 'releaseHold') state.act({ type: 'release' });
    else if (action === 'retry') state.act({ type: 'retry' });
    else if (action === 'inspect') await inspect();
    else if (action === 'live') await inspect(true);
    else if (action === 'showComparison') props.paint(state.read());
    else {
      if (action === 'wake' && !state.read().offered) return;
      const success = await stage.act({ action });
      if (!success || game.place !== P) return;
      if (action === 'wake') state.act({ type: 'wake' });
    }
    if (game.place !== P) return;
    flags.sender_action_ok = true;
    sync(true);
  };
  Object.assign(P.things.sender_console, {
    anchor: (v) => world.senderMonitor.getWorldPosition(v).add(new THREE.Vector3(0, 0.25, 0)),
    spot: () => SENDER_SPOTS.sender_console,
    face: () => [4.2, -1.3],
    enabled: () => state.read().offered,
  });
  Object.assign(P.things.sender_live, {
    anchor: (v) => props.deskMonitor.getWorldPosition(v).add(new THREE.Vector3(0, 0.25, 0)),
    spot: () => SENDER_SPOTS.sender_desk,
    face: () => [-2, -3],
    enabled: () => state.read().offered,
  });
  const update = P.update,
    leave = P.leave,
    snapshot = P.snapshotState,
    restore = P.restoreState,
    onDay = P.onDay;
  P.update = (dt, t) => {
    update(dt, t);
    stage.update();
    if (game.place === P) sync();
  };
  P.leave = () => {
    close();
    stage.cancel();
    leave?.();
  };
  P.snapshotState = () => ({ ...snapshot(), sender: stage.snapshot() });
  P.restoreState = (saved) => {
    close();
    stage.cancel();
    restore(saved);
    state.reload();
    stage.restore(saved.world?.sender);
    sync();
  };
  P.onDay = (day) => {
    onDay?.(day);
    state.reload();
    sync();
  };
  P.sender = {
    act,
    state,
    props,
    stage,
    canInterpret,
    ready,
    inspect,
    snapshot: () => ({ queue: state.read(), contacts: stage.contacts }),
  };
  sync();
  return P.sender;
}
