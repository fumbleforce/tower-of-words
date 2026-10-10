export function installSenderHook(game, flags) {
  game.hooks.sender = async (args) => {
    flags.sender_action_ok = false;
    if (game.place?.sender) await game.place.sender.act(args);
    else flags.sender_available = false;
  };
}

export function senderReady(place, flags, heardComplaint) {
  const present = (id) => {
    const rig = place.people[id];
    return rig?.root.visible && rig.root.parent === place.space && !rig._walk;
  };
  return !!(present('mio') && present('mori') && (flags.d2_ticket_done || heardComplaint));
}
