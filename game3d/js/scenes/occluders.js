// Buildings that would hide Eric: their upper mass fades out while he is behind or inside them, and comes back
// as he walks out. The fade is alphaHash (dithered, not `transparent`), so the look (js/look) still applies and
// nothing is sorted; opacity runs 0 to 1 over FADE seconds.
//
//   const occ = addOccluder(place, [upperWalls, upperGlass], footprint(x0, x1, z0, z1, () => game.liftRiding));
//   addOccluder(place, stationTop, screenShadow({ x0, x1, zNorth, h }));
//   place.update = (dt) => updateOccluders(place, game.player.root.position, dt);   // dt Infinity snaps
//
// Hand in meshes already merged per material (at most 5 per occluder, 2 occluders per chunk). Each gets its own
// material copy and a name, so mergeStatic (scenes/merge-static.js) and the perf batch (perf/batch.js) leave it
// alone; fully faded meshes are hidden, so they cost no draw call.
export const FADE = 0.3;

export function addOccluder(place, meshes, test, { name = 'occluder' } = {}) {
  const list = place.occluders || (place.occluders = []);
  const occ = {
    meshes: [].concat(meshes).filter(Boolean),
    test,
    k: 1,
    name: `${name}${list.length}`,
  };
  occ.meshes.forEach((m, i) => {
    m.name = m.name || `${occ.name}:${i}`;
    m.userData.noBatch = true;
    m.userData.occluder = occ.name;
    m.material = m.material.clone();
    m.material.alphaHash = true;
    m.material.transparent = false;
    m.material.opacity = 1;
  });
  list.push(occ);
  return occ;
}

function setK(occ, k) {
  occ.k = k;
  for (const m of occ.meshes) {
    m.material.opacity = k;
    m.visible = k > 0.01;
  }
}

// pos: Eric's position in the place's frame (a Vector3 or {x, z})
export function updateOccluders(place, pos, dt) {
  for (const occ of place.occluders || []) {
    const want = occ.test(pos, place) ? 0 : 1;
    if (occ.k === want) continue;
    const step = dt / FADE;
    setK(occ, want > occ.k ? Math.min(want, occ.k + step) : Math.max(want, occ.k - step));
  }
}

// Eric inside the footprint [x0, x1] x [z0, z1] (the lobby), or whenever `also()` says so (riding the lift)
export const footprint =
  (x0, x1, z0, z1, also = null) =>
  (p, place) =>
    (p.x >= x0 && p.x <= x1 && p.z >= z0 && p.z <= z1) || !!also?.(p, place);

// Eric in the box's screen shadow: the camera at 46 degrees looks north over it, so a box of height h hides the
// ground up to 0.97 h north of its north face (zNorth), within its x range (plus a margin for his width)
export const screenShadow =
  ({ x0, x1, zNorth, h }, { margin = 0.3, reach = 0.97 } = {}) =>
  (p) =>
    p.x >= x0 - margin && p.x <= x1 + margin && p.z <= zNorth + margin && p.z >= zNorth - reach * h;
