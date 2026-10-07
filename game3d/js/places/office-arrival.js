import { sit, armsLap } from '../cast.js';

// The chief's clear approach is distinct from the chair inside the desk blocker.
export function officeArrival(people, moriBlob, scale) {
  return (id, [x, z]) => {
    const rig = people[id];
    if (id !== 'mori' || !rig || Math.hypot(x - 2.3, z + 2.55) > 0.05) return false;
    if (Math.hypot(rig.root.position.x - x, rig.root.position.z - z) > 0.2) return false;
    if (rig.meshy) rig.sitAt(2.16, 0.245, -3.36, -Math.PI / 2);
    else {
      sit(rig);
      rig.root.position.set(2.16, rig.root.position.y + 0.03 * scale, -3.36);
      rig.root.rotation.y = -Math.PI / 2;
      armsLap(rig);
    }
    rig.seated = true;
    moriBlob.position.set(2.2, 0.004, -3.36);
    return true;
  };
}
