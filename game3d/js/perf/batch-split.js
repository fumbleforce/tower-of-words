// How the draw-call pass (perf/batch.js) cuts a group of meshes into batches: median cuts along the longest side until
// each part spans at most `span` metres or holds at most `tris` triangles, so parts off screen are still culled.
// where: mesh -> { x, y, z (centre in the batch's space), t (triangles) }; groups under `light` triangles stay whole.
export function split(list, span, tris, where, light) {
  const out = [],
    todo = [list];
  while (todo.length) {
    const l = todo.pop();
    let t = 0;
    const lo = [1e9, 1e9, 1e9],
      hi = [-1e9, -1e9, -1e9];
    for (const o of l) {
      const w = where.get(o);
      t += w.t;
      const v = [w.x, w.y, w.z];
      for (let i = 0; i < 3; i++) {
        if (v[i] < lo[i]) lo[i] = v[i];
        if (v[i] > hi[i]) hi[i] = v[i];
      }
    }
    const ext = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]],
      ax = ext[0] >= ext[1] && ext[0] >= ext[2] ? 'x' : ext[1] >= ext[2] ? 'y' : 'z';
    // light groups merge whatever their spread (drawing them off screen costs next to nothing)
    if (l.length < 2 || t <= light || (Math.max(...ext) <= span && t <= tris)) {
      out.push(l);
      continue;
    }
    const sorted = l.slice().sort((a, b) => where.get(a)[ax] - where.get(b)[ax]),
      h = sorted.length >> 1;
    todo.push(sorted.slice(0, h), sorted.slice(h));
  }
  return out;
}
