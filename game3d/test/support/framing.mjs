// Is the player in the shot? (GUIDE: the player always sees Eric.) Samples the player's feet and head on screen every
// frame for `ms` and resolves with the worst moment: { out, at, x, y }, where out is the larger of |x| and |y| in
// clip space (-1..1 is on screen, above 1 is out) and at the ms it happened. loop-check.mjs and mc-check.mjs use it.
export function worstFraming(page, ms) {
  return page.evaluate(
    (ms) =>
      new Promise((done) => {
        const g = window.__game,
          t0 = performance.now();
        let w = { out: 0, at: 0, x: 0, y: 0 };
        const look = () => {
          const t = performance.now() - t0,
            root = g.player.root,
            feet = root.getWorldPosition(root.position.clone());
          const head = feet.clone();
          head.y += 1.6 * (root.scale.y || 1);
          for (const v of [feet, head]) {
            v.project(g.place.camera);
            const out = Math.max(Math.abs(v.x), Math.abs(v.y));
            if (out > w.out) w = { out, at: Math.round(t), x: +v.x.toFixed(2), y: +v.y.toFixed(2) };
          }
          if (t < ms) requestAnimationFrame(look);
          else done(w);
        };
        look();
      }),
    ms,
  );
}
