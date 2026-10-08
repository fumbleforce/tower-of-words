import { PRINT_STEP, pt } from '../scenes/campus/plan.js';
import { turningCam } from './turning-cam.js';

const smooth = (value, from, to) => {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};
const [west, north] = pt([-18, -32]);

// Turn before reaching the tower: its tall north wall otherwise fills the overview.
// The west approach blends back to the shed-street view without a camera cut.
export function campusCameraPose(x, z) {
  const print = 1 - smooth(Math.hypot(x - PRINT_STEP[0], z - PRINT_STEP[1]), 2, 8);
  const rear = smooth(x, west, west + 4) * smooth(z, north, north + 6);
  return {
    yaw: 0.22 + print * 0.85 - rear * (Math.PI + 0.22),
    elev: ((55 - print * 8) * Math.PI) / 180,
  };
}

export function campusCamera(cam) {
  const turn = turningCam(cam, campusCameraPose),
    snap = cam.snap.bind(cam);
  cam.snap = (position) => {
    if (position) {
      turn.reset();
      turn.steer(position, 0);
    }
    snap(position);
  };
  return turn;
}
