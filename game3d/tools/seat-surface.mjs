// Pick the physical surface closest to a named seat's declared cushion height.
// Unknown seats keep the highest surface below the hips, allowing 3 cm of sinking.
export function seatSurface(best, hit, { expectedTop, hipY }) {
  if (expectedTop !== undefined) {
    return !best || Math.abs(hit.top - expectedTop) < Math.abs(best.top - expectedTop) ? hit : best;
  }
  if (hit.top >= hipY + 0.03) return best;
  return !best || hit.top > best.top ? hit : best;
}
