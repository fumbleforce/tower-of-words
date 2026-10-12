// A sight line from the player toward the camera crosses a station part.
// Expand downward by the actor's height when testing an overhang above their head.
export function stationSight(view) {
  return ([bx, by, bz], tall = 0) =>
    (p) => {
      let t0 = 0,
        t1 = Infinity;
      const o = [p.x, 0.05, p.z],
        d = [view.x, view.y, view.z],
        box = [bx, [by[0] - tall, by[1]], bz];
      for (let i = 0; i < 3; i++) {
        const [lo, hi] = box[i];
        if (Math.abs(d[i]) < 1e-6) {
          if (o[i] < lo || o[i] > hi) return false;
          continue;
        }
        let a = (lo - o[i]) / d[i],
          b = (hi - o[i]) / d[i];
        if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a);
        t1 = Math.min(t1, b);
        if (t0 > t1) return false;
      }
      return true;
    };
}
