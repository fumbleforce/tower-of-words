// Keep the phone's doorway lesson above the portraits. Derive the view from
// story state so Continue and completion need no extra camera state to restore.
export function frameTrainArrival(target, player, phone, arrived, flags) {
  if (phone && arrived && flags.arriving && !flags.alighted) target.x = player.x - 1.8;
  return target;
}
