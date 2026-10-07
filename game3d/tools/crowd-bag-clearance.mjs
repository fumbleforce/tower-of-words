// Diagnostic only: clip posed leg surface triangles against the real convex bag body.
// World-space planes keep the numerical tolerance independent of character/prop scale.
export function legClearance(THREE, rig, bag) {
  const body = bag.children[0],
    geometry = body.geometry,
    center = new THREE.Vector3(),
    planes = [],
    a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  geometry.computeBoundingBox();
  geometry.boundingBox.getCenter(center);
  const indices = (g) =>
    g.index ? Array.from(g.index.array) : Array.from({ length: g.attributes.position.count }, (_, i) => i);
  const bodyIndices = indices(geometry);
  for (let i = 0; i < bodyIndices.length; i += 3) {
    a.fromBufferAttribute(geometry.attributes.position, bodyIndices[i]);
    b.fromBufferAttribute(geometry.attributes.position, bodyIndices[i + 1]);
    c.fromBufferAttribute(geometry.attributes.position, bodyIndices[i + 2]);
    const plane = new THREE.Plane().setFromCoplanarPoints(a, b, c);
    if (plane.normal.lengthSq() < 0.5) continue;
    if (plane.distanceToPoint(center) > 0) plane.negate();
    if (!planes.some((p) => p.normal.distanceTo(plane.normal) < 1e-5 && Math.abs(p.constant - plane.constant) < 1e-5))
      planes.push(plane);
  }
  if (planes.length < 4) throw Error('Bag body has no closed convex volume');
  const meshes = [];
  const collect = (mesh) => {
    if (!mesh.isMesh || !mesh.geometry?.attributes.position) return;
    const g = mesh.geometry,
      all = indices(g),
      triangles = [],
      vertices = new Map();
    const legVertex = (i) => {
      if (!mesh.isSkinnedMesh) return true;
      let weight = 0;
      for (let k = 0; k < 4; k++) {
        const bone = mesh.skeleton.bones[g.attributes.skinIndex.getComponent(i, k)];
        if (/(?:upleg|leg|foot|toe)/i.test(bone?.name || '')) weight += g.attributes.skinWeight.getComponent(i, k);
      }
      return weight >= 0.5;
    };
    for (let i = 0; i < all.length; i += 3) {
      const triangle = all.slice(i, i + 3);
      if (!triangle.some(legVertex)) continue;
      triangles.push(triangle);
      for (const index of triangle) if (!vertices.has(index)) vertices.set(index, new THREE.Vector3());
    }
    if (triangles.length) meshes.push({ mesh, triangles, vertices });
  };
  if (rig.model)
    rig.model.traverse((mesh) => {
      if (mesh.isSkinnedMesh) collect(mesh);
    });
  else for (const leg of rig.legs) leg.traverse(collect);
  const triangleCount = meshes.reduce((n, item) => n + item.triangles.length, 0);
  if (!triangleCount) throw Error('No leg triangles found; cannot claim bag clearance');
  const box = new THREE.Box3(),
    triangleBox = new THREE.Box3();
  function measure() {
    body.updateWorldMatrix(true, false);
    const worldPlanes = planes.map((p) => p.clone().applyMatrix4(body.matrixWorld));
    box.copy(geometry.boundingBox).applyMatrix4(body.matrixWorld);
    let intersections = 0,
      depth = 0,
      witness = null;
    for (const { mesh, triangles, vertices } of meshes) {
      for (const [index, point] of vertices) mesh.getVertexPosition(index, point).applyMatrix4(mesh.matrixWorld);
      for (const triangle of triangles) {
        let polygon = triangle.map((i) => vertices.get(i));
        triangleBox.setFromPoints(polygon);
        if (!triangleBox.intersectsBox(box)) continue;
        // Shrink by 10 micrometres solely to exclude numerical/touching contacts.
        for (const plane of worldPlanes) {
          const clipped = [];
          for (let j = 0; j < polygon.length; j++) {
            const p = polygon[j],
              q = polygon[(j + 1) % polygon.length];
            const dp = plane.distanceToPoint(p) + 0.00001,
              dq = plane.distanceToPoint(q) + 0.00001;
            if (dp <= 0) clipped.push(p);
            if (dp < 0 !== dq < 0) clipped.push(p.clone().lerp(q, dp / (dp - dq)));
          }
          polygon = clipped;
          if (polygon.length < 3) break;
        }
        if (polygon.length < 3) continue;
        const at = polygon.reduce((sum, p) => sum.add(p), new THREE.Vector3()).divideScalar(polygon.length);
        const inside = Math.min(...worldPlanes.map((p) => -p.distanceToPoint(at)));
        if (inside <= 0.00001) continue;
        intersections++;
        if (inside > depth) {
          depth = inside;
          witness = {
            mesh: mesh.name,
            triangle,
            point: at.toArray(),
            vertices: triangle.map((index) => ({
              index,
              world: vertices.get(index).toArray(),
              weights: mesh.isSkinnedMesh
                ? Array.from({ length: 4 }, (_, k) => ({
                    bone: mesh.skeleton.bones[mesh.geometry.attributes.skinIndex.getComponent(index, k)]?.name,
                    weight: mesh.geometry.attributes.skinWeight.getComponent(index, k),
                  }))
                : [],
            })),
          };
        }
      }
    }
    return { intersections, depth, witness, triangleCount };
  }
  return measure;
}
