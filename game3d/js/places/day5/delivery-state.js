// Only these three fields cross from the minigame into the world.
export function deliveryReturn(flags, mode, event, recipient) {
  if (mode === 'first') {
    if (flags.d5_delivery_seen) return null;
    if (event === 'kotodama_first') {
      flags.d5_delivery_seen = true;
      return 'kotodama_first';
    }
    return event === 'kotodama_cancel' ? 'kotodama_cancel' : null;
  }
  if (mode !== 'rounds' || !flags.d5_team_witnessed || event !== 'kotodama_exit') return null;
  flags.d5_last_recipient = ['kenji', 'mori', 'mio'].includes(recipient) ? recipient : '';
  return 'kotodama_exit';
}
