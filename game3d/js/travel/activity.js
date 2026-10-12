// Why travel or waiting cannot start. A map/time window pauses the underlying action;
// its reason must tell the player how to return to that action instead of waiting here.
export const ACTIVITY_REASON = {
  talking: 'Close this window to finish the conversation.',
  noticeboard: 'Close this window, then close the notice board.',
  find: 'Close this window, then put down the item you are looking at.',
  panel: 'Close the open panel first.',
  transition: 'Close this window to finish arriving.',
  starting: 'Close this window to finish entering the area.',
  recovery: 'Close this window to read the scene recovery message.',
  ended: 'This day has ended.',
  busy: 'Close this window to let the current action finish.',
};

export function busyReason(game, doc = document) {
  const visible = (id) => {
    const el = doc.getElementById(id);
    return el && !el.hidden;
  };
  if (visible('boardView')) return 'noticeboard';
  if (visible('findView')) return 'find';
  if (doc.querySelector('.panel:not([hidden])')) return 'panel';
  if (visible('talk') || game.saying) return 'talking';
  if (game.runner?.recoveryError) return 'recovery';
  if (game.ended) return 'ended';
  if (game.transition || doc.body.classList.contains('trip')) return 'transition';
  if (game.pendingStart) return 'starting';
  if (game.busy || game.queue?.length || game.walker?.locked) return 'busy';
  return '';
}
