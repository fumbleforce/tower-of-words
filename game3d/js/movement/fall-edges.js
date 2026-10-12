// The geometry of a fall (falls.js), kept free of the renderer so it can be tested on its own.
//   edgeAhead(edges, [x, z], [dx, dz], reach)   the edge he is going over, and how far inside its line he is, or null:
//                                                within reach of its line on the inside, within its length, and
//                                                heading out over it (edges as a place's `falls` lists them)
const AIM = 0.35; // how squarely he must be heading over (the cosine between his way and the way out)

export function edgeAhead(edges, [x, z], [dx, dz], reach) {
  for (const e of edges || []) {
    const [ox, oz] = e.out,
      d = -((x - e.a[0]) * ox + (z - e.a[1]) * oz); // how far inside the line he is
    if (d < -0.05 || d > reach || dx * ox + dz * oz < AIM) continue;
    const lx = e.b[0] - e.a[0],
      lz = e.b[1] - e.a[1],
      len = Math.hypot(lx, lz),
      along = ((x - e.a[0]) * lx + (z - e.a[1]) * lz) / (len || 1);
    if (along >= 0 && along <= len) return { edge: e, d };
  }
  return null;
}
