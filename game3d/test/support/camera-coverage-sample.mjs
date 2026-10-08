// Keep each measured body and camera in the same frame. Physics may move the
// player while the camera settles; the requested grid point still needs a check.
export function sampleCameraFrames({ root, walker, camera, cam, advance, x, z, settle, measure }) {
  root.position.x = x;
  root.position.z = z;
  walker.sync?.();
  walker.stop?.();
  cam?.snap?.(root.position);
  advance(settle);
  const actual = [root.position.x, root.position.z];
  const displacement = Math.hypot(actual[0] - x, actual[1] - z);
  const read = () => {
    root.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    return measure();
  };
  const frames = [{ stage: 'settled', ...read() }];
  if (displacement > 1e-9) {
    if (typeof cam?.snap !== 'function') {
      frames.push({
        stage: 'requested',
        unverified: 'camera has no snap method',
      });
    } else {
      root.position.x = x;
      root.position.z = z;
      walker.sync?.();
      walker.stop?.();
      cam.snap(root.position);
      frames.push({ stage: 'requested', ...read() });
    }
  }
  return { actual, displacement, frames };
}
