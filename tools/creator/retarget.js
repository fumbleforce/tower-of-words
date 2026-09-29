import * as THREE from 'three';

// Keep the host's local bind rotation while applying the reference's motion.
// Returns new values; source clips and source bind frames remain untouched.
export function retargetRotationValues(values, bone, host, reference) {
  const result = values.slice();
  // buildCharacter passes the actual lib.src entry, so the reference body is
  // identical here. A cloned reference would be normalized like another host.
  if (host === reference) return result;
  const parent = reference.parent[bone];
  const hostLocal = host.B[bone].clone();
  const referenceLocal = reference.B[bone].clone();
  if (parent) {
    hostLocal.premultiply(host.B[parent].clone().invert());
    referenceLocal.premultiply(reference.B[parent].clone().invert());
  }
  const correction = hostLocal.normalize().multiply(referenceLocal.normalize().invert());
  const rotation = new THREE.Quaternion();
  for (let i = 0; i < result.length; i += 4) {
    rotation.fromArray(values, i).premultiply(correction).normalize().toArray(result, i);
  }
  return result;
}
