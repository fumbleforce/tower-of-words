// Lane movement and optional group tracking for recurring pool sessions.
import { sfx } from '../../sfx.js';
export function poolLengths(
  game,
  { action, camera, who, inWater, waterPose, LANE, LANE2, WX0, WX1, WZ0, WZ1, laneWidth },
) {
  return async function swimLength(withPlayer, { track = false } = {}) {
    const rows = [
      ['kuro', LANE2],
      ['emi', LANE2 + laneWidth],
    ];
    if (withPlayer) rows.push(['eric', LANE]);
    const from = rows.map(([id, x]) => {
      const r = who(id);
      if (id !== 'eric') inWater(id, [x, r.root.position.z], Math.PI);
      waterPose(id).enter('swim');
      return [r, x, r.root.position.z, id];
    });
    const far = WZ0 + 1.2,
      near = WZ1 - 1.8;
    const cam = game.place.cam;
    camera.clear();
    const centre = () => [
      from.reduce((n, [r]) => n + r.root.position.x, 0) / from.length,
      from.reduce((n, [r]) => n + r.root.position.z, 0) / from.length,
    ];
    if (track) camera.frame(centre(), { span: withPlayer ? 6 : 5, yaw: 2.65, elev: 0.65, cut: true });
    else cam.closeOn?.([(WX0 + WX1) / 2, (WZ0 + WZ1) / 2], 0.9);
    sfx('flap');
    await action.wait(
      action.tween(8, (k) => {
        from.forEach(([r, x, z0]) => {
          r.root.position.set(x, r.root.position.y, z0 + (far - z0) * k);
          r.root.rotation.y = Math.PI;
        });
        if (track) camera.track(centre());
      }),
    );
    await action.wait(
      action.tween(8, (k) => {
        from.forEach(([r, x]) => {
          r.root.position.set(x, r.root.position.y, far + (near - far) * k);
          r.root.rotation.y = 0;
        });
        if (track) camera.track(centre());
      }),
    );
    for (const [, , , id] of from) waterPose(id).enter();
    sfx('flap');
    if (withPlayer) {
      // Kuro finishes beside the player and waits at the wall
      const k = who('kuro');
      k.root.position.set(LANE + 0.75, k.root.position.y, near);
      camera.frame([LANE2, near]);
    }
  };
}
