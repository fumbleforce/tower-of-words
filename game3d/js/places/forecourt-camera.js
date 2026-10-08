// Follow the western campus approach, then recover the station's established framing.
const smooth = (value, low, high) => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
};
export function campusApproach({ x, z }) {
  return (1 - smooth(x, -3.8, -1)) * (1 - smooth(z, -2.4, 0.5));
}
export function forecourtWestClamp(p, phone) {
  const base = phone ? -1 : 5.2;
  return base + (-6.8 - base) * campusApproach(p);
}

export function attachForecourtFraming(cam, isPhone, isTrial) {
  let orbit = false;
  const frame = (p) => {
    if (isTrial()) return;
    if (cam.clamp) cam.clamp[0] = forecourtWestClamp(p, isPhone());
    // A slight view from the west clears the courtyard tree as he steps off the street.
    const approach = campusApproach(p);
    if (!isPhone() && (approach || orbit)) cam.yaw = -0.5 * approach;
    orbit = !isPhone() && approach > 0;
  };
  const snap = cam.snap.bind(cam);
  cam.snap = (p) => {
    if (p) frame(p);
    snap(p);
  };
  return frame;
}
