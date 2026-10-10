// How high a seated Meshy body sits (avatar.js sitAt): its underside, measured once from the sit pose, on the seat top.
import * as THREE from 'three';

// Where a seated Meshy body's underside ends up over the seat top: pressed 8 mm in. It was the hips joint 5 cm over
// the top, which put the thighs 5 to 6 cm into every seat ("MC is sitting inside the seats", Jørgen, 2026-10-05).
// ?slift= tries another value; game3d/tools/seat-check.mjs fails the player deeper than 3 cm into a seat.
let SIT_LIFT = -0.008;
// The lowest vertex of the sit pose the body rests on (skinned mostly to the hips or a thigh, up to 20 cm ahead of
// the hips joint; the knees can hang past a seat's front edge), in the root's space. Once per model and size.
const UNDER = new Map();
export function seatUnderside(key, model, root, hip) {
  if (UNDER.has(key)) return UNDER.get(key);
  const v = new THREE.Vector3();
  let low = Infinity;
  model.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const pos = o.geometry.attributes.position,
      si = o.geometry.attributes.skinIndex,
      sw = o.geometry.attributes.skinWeight;
    if (!si) return;
    const sitBone = o.skeleton.bones.map((b) => /hips|pelvis|up_?leg|thigh/i.test(b.name) && !/spine/i.test(b.name));
    for (let i = 0; i < pos.count; i++) {
      let best = 0,
        bone = -1;
      for (let k = 0; k < 4; k++)
        if (sw.getComponent(i, k) > best) {
          best = sw.getComponent(i, k);
          bone = si.getComponent(i, k);
        }
      if (!sitBone[bone]) continue;
      o.getVertexPosition(i, v);
      root.worldToLocal(v.applyMatrix4(o.matrixWorld));
      if (v.z - hip.z < 0.2 && v.y < low) low = v.y;
    }
  });
  // no skin to read: about 5 cm under the hips joint
  const under = low === Infinity ? hip.y - 0.05 : low;
  UNDER.set(key, under);
  return under;
}
export function setSitLift(v) {
  SIT_LIFT = v;
}
// the root's height for a body whose underside is `under` (root space) on a seat top, at root scale k
export const sitRootY = (seatTop, under, k) => seatTop + (SIT_LIFT - under) * k;
