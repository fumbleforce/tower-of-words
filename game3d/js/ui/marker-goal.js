// Opening goals stay quiet until the goal line has appeared. A passenger's
// explicit seat destination takes precedence over the train's generic Mio goal.
// Other places keep all their authored goal markers.
export function markerGoal(item, { opening = false, held = false, text = '', destination = null } = {}) {
  if (opening && (held || !text || (destination && item !== destination))) return false;
  return !!item.goal?.();
}
