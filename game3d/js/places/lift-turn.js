// Smoothstep's peak slope is 1.5: scale the duration with the angle so a
// half-turn stays unhurried even though a small adjustment can finish quickly.
export function liftTurnPlan(from, to, minimumSeconds = 0.35) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return {
    delta,
    seconds: Math.max(minimumSeconds, (1.5 * Math.abs(delta)) / 2.5),
  };
}

export async function turnInLift(game, root, target, animate, minimumSeconds = 0.35) {
  const from = root.rotation.y,
    { delta, seconds } = liftTurnPlan(from, target, minimumSeconds);
  const walker = root === game.player.root ? game.walker : null;
  await animate(game, seconds, (progress) => {
    root.rotation.y = from + delta * progress;
    if (walker) walker.facing = root.rotation.y;
  });
  walker?.sync?.();
}

// Face the doorway while it opens, before moving across the threshold.
export async function waitFacingLift(game, site, animate, milliseconds) {
  const root = game.player.root,
    target = Math.atan2(site.x - root.position.x, site.zFront + 0.05 - root.position.z);
  await Promise.all([game.wait(milliseconds), turnInLift(game, root, target, animate)]);
}
