// Keep the next frame deadline across display refreshes so rounding does not change the chosen frame rate.
export function createFramePacer() {
  let previousCap = null,
    next = 0;
  return (now, fps) => {
    if (!fps) {
      previousCap = null;
      return true;
    }
    const period = 1000 / fps,
      slack = Math.min(3, period / 4);
    if (fps !== previousCap) {
      previousCap = fps;
      next = now + period;
      return true;
    }
    if (now + slack < next) return false;
    next += period;
    // A resumed tab draws one frame, without a burst trying to catch up to deadlines missed while hidden.
    if (next <= now + slack) next = now + period;
    return true;
  };
}
