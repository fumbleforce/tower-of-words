// Hold a readable view of a physical action across the district's normal camera turns.
export function actionShot(P) {
  let shot = null,
    home = null;
  const release = P.cam.release.bind(P.cam);
  P.cam.release = () => {
    if (home) Object.assign(P.cam, home);
    shot = home = null;
    release();
  };
  return {
    focus(point, distance, y = 0.7, yaw = 0.35, elev = 0.65) {
      home ||= { yaw: P.cam.yaw, elev: P.cam.elev };
      shot = { point, distance, y, yaw, elev };
      P.cam.closeOn(point, P.cam.fitDist / distance, y);
    },
    update() {
      if (!shot || !P.cam.close) return;
      Object.assign(P.cam, { yaw: shot.yaw, elev: shot.elev });
      P.cam.close.zoom = P.cam.fitDist / shot.distance;
    },
    snapshot: () => ({ shot, home }),
    load(s) {
      shot = s?.shot || null;
      home = s?.home || null;
      if (shot) {
        P.cam.closeOn(shot.point, P.cam.fitDist / shot.distance, shot.y);
        Object.assign(P.cam, { yaw: shot.yaw, elev: shot.elev });
      }
    },
  };
}
