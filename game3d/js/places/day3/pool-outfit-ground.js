// The selected bare feet need a small pelvis correction while clips crossfade on the dry deck.
// Root transforms, flight phases and the seat/water pose owners remain untouched.
import * as THREE from 'three';
export function poolOutfitGround(body) {
  const root = body.root,
    vertices = [],
    point = new THREE.Vector3(),
    space = new THREE.Matrix4();
  let hips;
  body.model.traverse((o) => {
    if (o.isBone && /^(mixamorig:?)?Hips$/.test(o.name)) hips = o;
    if (!o.isSkinnedMesh) return;
    const a = o.geometry.attributes;
    for (let i = 0; i < a.position.count; i++) {
      let best = 0;
      for (let k = 1; k < 4; k++) if (a.skinWeight.getComponent(i, k) > a.skinWeight.getComponent(i, best)) best = k;
      if (/Foot|Toe/.test(o.skeleton.bones[a.skinIndex.getComponent(i, best)].name)) vertices.push([o, i]);
    }
  });
  let lift = 0;
  const clear = () => {
    if (hips && lift) hips.position.y -= lift;
    lift = 0;
  };
  const update = body.update,
    setState = body.setState,
    sitAt = body.sitAt;
  body.setState = function (...args) {
    clear();
    return setState.apply(this, args);
  };
  body.sitAt = function (...args) {
    clear();
    return sitAt.apply(this, args);
  };
  body.update = function (...args) {
    clear();
    const result = update.apply(this, args);
    if (!hips || this.seated || this.swimming || this.state === 'sit') return result;
    root.updateWorldMatrix(true, true);
    if (root.parent) space.copy(root.parent.matrixWorld).invert();
    else space.identity();
    let low = Infinity;
    for (const [mesh, i] of vertices) {
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld).applyMatrix4(space);
      low = Math.min(low, point.y);
    }
    if (low < -0.0001) {
      space.multiply(hips.parent.matrixWorld);
      lift = -low / space.elements[5];
      hips.position.y += lift;
      hips.updateWorldMatrix(false, true);
    }
    return result;
  };
  return { clear };
}
