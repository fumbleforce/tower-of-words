import { changingPlan } from '../../scenes/sports/changing-room.js';
import { turningCam } from '../turning-cam.js';

// Look over the lockers while walking the rear entrance corridor; deck and authored water shots keep their lens.
export function poolWalkingCamera(cam, look, gender) {
  const { bounds } = changingPlan(gender);
  const poseAt = (x, z) => {
    const [x0, x1, z0, z1] = bounds;
    const inPavilion = x >= x0 - 0.4 && x <= x1 + 0.4 && z >= z0 - 0.4;
    const blend = inPavilion ? Math.max(0, Math.min(1, (z1 + 2.0 - z) / 1.4)) : 0;
    return { yaw: look.yaw, elev: look.elev + (Math.PI * 0.43 - look.elev) * blend };
  };
  const turn = turningCam(cam, poseAt);
  return {
    update(position, dt) {
      if (cam.close) turn.reset();
      else turn.steer(position, dt);
    },
  };
}
