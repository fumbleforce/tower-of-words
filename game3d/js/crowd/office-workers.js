// The selected office pair also fills office roles inside the station and lift.
// Keep the old worker's gender selection and the scene's scripted arm poses.
import { PEOPLE } from '../cast.js';
import { proxyParts } from '../chibi-crowd.js';
import { approvedCrowd } from './approved-models.js';
import { blob } from '../engine.js';
import { bridgeOfficePose } from './office-pose.js';

export { prepareApprovedCrowd as prepareOfficeWorkers } from './approved-models.js';

export function officeWorker(seed) {
  const rig = approvedCrowd(seed % 3 === 1 ? 1 : 0);
  if (!rig) return PEOPLE.worker(seed);
  rig.ph = seed * 1.37;
  proxyParts(rig);
  bridgeOfficePose(rig);
  return rig;
}

export function addOfficeWorker(root, seed, scale, [x, z, yaw] = [0, 0, 0]) {
  const rig = officeWorker(seed);
  rig.root.scale.multiplyScalar(scale);
  rig.root.position.set(x, 0, z);
  rig.root.rotation.y = yaw;
  rig.blob = blob(0.5, 0.35);
  rig.blob.position.set(x, 0.004, z);
  root.add(rig.root, rig.blob);
  return rig;
}
