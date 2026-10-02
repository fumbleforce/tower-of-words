// Walking lines for the ambient crowd (crowd/index.js): a coarse copy of the place's walk grid with each cell's
// distance to the nearest edge, an A* over it that keeps to the middle of a path (people walk down the middle of a
// lane, not along its kerb), and the result pulled straight where the line stays clear. Routes are found once per
// pair of ends and kept; each walker then takes its own lane, a little to the right of the line.
//
//   const g = coarseGrid(nav)              built once a place (a few ms; the fine grid must exist)
//   routeBetween(g, a, b)                  [[x, z], ...] from a to b, or null (cached per pair)
//   laneOf(g, line, off)                   the same line moved off to the right by up to `off`, where there's room
//   snapFree(g, [x, z])                    the nearest free point, or null
//   clearAt(g, x, z)                       distance to the nearest blocked cell (place units; 0 when blocked)

const C = 0.25; // coarse cell (place units)

export function coarseGrid(nav) {
  if (!nav.grid) nav.build();
  const nx = Math.ceil((nav.x1 - nav.x0) / C),
    nz = Math.ceil((nav.z1 - nav.z0) / C),
    free = new Uint8Array(nx * nz);
  const fine = nav.grid,
    fx = nav.nx;
  for (let k = 0; k < nz; k++)
    for (let i = 0; i < nx; i++) {
      const [a, b] = nav.cellOf(nav.x0 + (i + 0.5) * C, nav.z0 + (k + 0.5) * C);
      free[k * nx + i] = fine[b * fx + a];
    }
  // distance to the nearest blocked cell, two chamfer passes (in cells)
  const dist = new Float32Array(nx * nz);
  for (let n = 0; n < dist.length; n++) dist[n] = free[n] ? 1e4 : 0;
  const D2 = Math.SQRT2;
  const relax = (n, m, w) => {
    if (dist[m] + w < dist[n]) dist[n] = dist[m] + w;
  };
  for (let k = 0; k < nz; k++)
    for (let i = 0; i < nx; i++) {
      const n = k * nx + i;
      if (!free[n]) continue;
      if (i === 0 || k === 0 || i === nx - 1 || k === nz - 1) dist[n] = Math.min(dist[n], 1);
      if (i > 0) relax(n, n - 1, 1);
      if (k > 0) {
        relax(n, n - nx, 1);
        if (i > 0) relax(n, n - nx - 1, D2);
        if (i < nx - 1) relax(n, n - nx + 1, D2);
      }
    }
  for (let k = nz - 1; k >= 0; k--)
    for (let i = nx - 1; i >= 0; i--) {
      const n = k * nx + i;
      if (!free[n]) continue;
      if (i < nx - 1) relax(n, n + 1, 1);
      if (k < nz - 1) {
        relax(n, n + nx, 1);
        if (i < nx - 1) relax(n, n + nx + 1, D2);
        if (i > 0) relax(n, n + nx - 1, D2);
      }
    }
  return { nav, nx, nz, free, dist, x0: nav.x0, z0: nav.z0, cache: new Map() };
}

const cellOf = (g, x, z) => [
  Math.max(0, Math.min(g.nx - 1, Math.floor((x - g.x0) / C))),
  Math.max(0, Math.min(g.nz - 1, Math.floor((z - g.z0) / C))),
];
const centre = (g, n) => [g.x0 + ((n % g.nx) + 0.5) * C, g.z0 + (((n / g.nx) | 0) + 0.5) * C];

export function clearAt(g, x, z) {
  if (x < g.x0 || z < g.z0) return 0;
  const [i, k] = cellOf(g, x, z);
  return g.dist[k * g.nx + i] * C;
}

export function snapFree(g, [x, z], minClear = 0.3) {
  const [i0, k0] = cellOf(g, x, z);
  for (let r = 0; r < 40; r++) {
    let best = null,
      bd = 1e9;
    for (let di = -r; di <= r; di++)
      for (let dk = -r; dk <= r; dk++) {
        if (Math.max(Math.abs(di), Math.abs(dk)) !== r) continue;
        const i = i0 + di,
          k = k0 + dk;
        if (i < 0 || k < 0 || i >= g.nx || k >= g.nz) continue;
        const n = k * g.nx + i;
        if (g.dist[n] * C < minClear) continue;
        const d = di * di + dk * dk;
        if (d < bd) {
          bd = d;
          best = n;
        }
      }
    if (best !== null) return centre(g, best);
  }
  return null;
}

// a small binary heap of cell indices by score
function heap() {
  const a = [],
    s = [];
  return {
    get size() {
      return a.length;
    },
    push(n, f) {
      a.push(n);
      s.push(f);
      let i = a.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (s[p] <= s[i]) break;
        [a[p], a[i]] = [a[i], a[p]];
        [s[p], s[i]] = [s[i], s[p]];
        i = p;
      }
    },
    pop() {
      const top = a[0],
        ln = a.pop(),
        ls = s.pop();
      if (a.length) {
        a[0] = ln;
        s[0] = ls;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1,
            r = l + 1;
          let m = i;
          if (l < a.length && s[l] < s[m]) m = l;
          if (r < a.length && s[r] < s[m]) m = r;
          if (m === i) break;
          [a[m], a[i]] = [a[i], a[m]];
          [s[m], s[i]] = [s[i], s[m]];
          i = m;
        }
      }
      return top;
    },
  };
}

// MID: how far in from the edge of a path a walker likes to be (place units); closer costs more
const MID = 0.9,
  EDGE_COST = 2.5,
  MIN_CLEAR = 0.3;

function search(g, a, b) {
  const sa = snapFree(g, a, MIN_CLEAR),
    sb = snapFree(g, b, MIN_CLEAR);
  if (!sa || !sb) return null;
  const [si, sk] = cellOf(g, ...sa),
    [ti, tk] = cellOf(g, ...sb);
  const S = sk * g.nx + si,
    T = tk * g.nx + ti,
    N = g.nx * g.nz;
  const cost = new Float32Array(N).fill(Infinity),
    from = new Int32Array(N).fill(-1),
    done = new Uint8Array(N);
  const h = (n) => {
    const dx = Math.abs((n % g.nx) - ti),
      dz = Math.abs(((n / g.nx) | 0) - tk);
    return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
  };
  const open = heap();
  cost[S] = 0;
  open.push(S, h(S));
  let found = false;
  while (open.size) {
    const n = open.pop();
    if (n === T) {
      found = true;
      break;
    }
    if (done[n]) continue; // an older, dearer entry for a cell already settled
    done[n] = 1;
    const i = n % g.nx,
      k = (n / g.nx) | 0;
    for (let dk = -1; dk <= 1; dk++)
      for (let di = -1; di <= 1; di++) {
        if (!di && !dk) continue;
        const x = i + di,
          z = k + dk;
        if (x < 0 || z < 0 || x >= g.nx || z >= g.nz) continue;
        const m = z * g.nx + x;
        const cl = g.dist[m] * C;
        if (cl < MIN_CLEAR) continue;
        if (di && dk && (g.dist[k * g.nx + x] * C < MIN_CLEAR || g.dist[z * g.nx + i] * C < MIN_CLEAR)) continue;
        const step = (di && dk ? 1.414 : 1) * (1 + Math.max(0, MID - cl) * EDGE_COST);
        const c = cost[n] + step;
        if (c < cost[m]) {
          cost[m] = c;
          from[m] = n;
          open.push(m, c + h(m));
        }
      }
  }
  if (!found) return null;
  const cells = [];
  for (let n = T; n !== -1; n = from[n]) cells.push(n);
  cells.reverse();
  return pull(
    g,
    cells.map((n) => centre(g, n)),
  );
}

// keep a point only where the straight line past it would come closer to an edge than the path itself does
function pull(g, pts) {
  if (pts.length < 3) return pts;
  const ok = (p, q) => {
    const want = Math.min(MID * 0.7, clearAt(g, ...p), clearAt(g, ...q)) - 0.05,
      d = Math.hypot(q[0] - p[0], q[1] - p[1]),
      n = Math.ceil(d / (C * 0.5));
    for (let s = 1; s < n; s++) {
      const t = s / n;
      if (clearAt(g, p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t) < want) return false;
    }
    return true;
  };
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !ok(out[out.length - 1], pts[j])) j--;
    out.push(pts[j]);
    i = j;
  }
  return out;
}

export function routeBetween(g, a, b) {
  const key = a.join() + '>' + b.join();
  if (!g.cache.has(key)) {
    const back = g.cache.get(b.join() + '>' + a.join());
    g.cache.set(key, back ? back.slice().reverse() : search(g, a, b));
  }
  return g.cache.get(key);
}

// the line moved to the walker's right by up to `off`, less where the path is narrow (keeping MIN_CLEAR + a body)
export function laneOf(g, line, off) {
  if (!off) return line.map((p) => p.slice());
  return line.map((p, i) => {
    const a = line[Math.max(0, i - 1)],
      b = line[Math.min(line.length - 1, i + 1)];
    let dx = b[0] - a[0],
      dz = b[1] - a[1];
    const l = Math.hypot(dx, dz) || 1;
    dx /= l;
    dz /= l;
    // right of travel, in x east / z south: (-dz, dx)
    const rx = -dz,
      rz = dx;
    for (let o = off; o > 0.02; o *= 0.6) {
      const x = p[0] + rx * o,
        z = p[1] + rz * o;
      if (clearAt(g, x, z) >= MIN_CLEAR + 0.25) return [x, z];
    }
    return p.slice();
  });
}

// how long a line is, and the point a distance s along it (with the index of the leg it is on)
export function lineLength(line) {
  let L = 0;
  for (let i = 1; i < line.length; i++) L += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
  return L;
}
export function pointAlong(line, s) {
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1],
      [bx, bz] = line[i],
      d = Math.hypot(bx - ax, bz - az);
    if (s <= d || i === line.length - 1) {
      const t = d ? Math.min(1, s / d) : 1;
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, leg: i };
    }
    s -= d;
  }
  return { x: line[0][0], z: line[0][1], leg: 1 };
}
