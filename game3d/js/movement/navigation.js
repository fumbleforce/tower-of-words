import { drain } from '../perf/slice.js';

// ---------- walk grid ----------
// Blockers are axis-aligned rectangles [x0, x1, z0, z1] in the place's local x/z.
export class Nav {
  constructor(x0, x1, z0, z1, cell = 0.1) {
    Object.assign(this, { x0, x1, z0, z1, cell });
    this.nx = Math.ceil((x1 - x0) / cell);
    this.nz = Math.ceil((z1 - z0) / cell);
    this.rects = [];
    this.extra = null; // optional fn(x, z) -> true if walkable (e.g. the train's rounded corners)
    this.grid = null;
    this.R = 0.17;
  }
  block(x0, x1, z0, z1) {
    this.rects.push([Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1)]);
    this.grid = null;
    return this;
  }
  unblock(tag) {
    this.rects = this.rects.filter((r) => r.tag !== tag);
    this.grid = null;
  }
  blockTagged(tag, x0, x1, z0, z1) {
    const r = [x0, x1, z0, z1];
    r.tag = tag;
    this.rects.push(r);
    this.grid = null;
  }
  // a way only a scene walks him through (the station's door, the dorm hall's passage): its tagged blocks lifted
  // while he goes through it and waits there for the next place, put back when the place is left
  open(tag) {
    this.opened = [...(this.opened || []), ...this.rects.filter((r) => r.tag === tag)];
    this.unblock(tag);
  }
  shut(tag) {
    const back = (this.opened || []).filter((r) => r.tag === tag);
    if (!back.length) return;
    this.opened = this.opened.filter((r) => r.tag !== tag);
    this.rects.push(...back);
    this.grid = null;
  }
  free(x, z, r = this.R) {
    if (x < this.x0 + r || x > this.x1 - r || z < this.z0 + r || z > this.z1 - r) return false;
    for (const [a, b, c, d] of this.rects)
      if (x > a - r && x < b + r && z > c - r && z < d + r) {
        // rounded: allow the corner region outside the circle
        const cx = Math.max(a, Math.min(b, x)),
          cz = Math.max(c, Math.min(d, z));
        if (Math.hypot(x - cx, z - cz) < r) return false;
      }
    if (this.extra && !this.extra(x, z)) return false;
    return true;
  }
  // how far (x, z) is from the nearest blocker or edge of the grid (0 inside one)
  clearance(x, z) {
    let c = Math.min(x - this.x0, this.x1 - x, z - this.z0, this.z1 - z);
    for (const [a, b, e, d] of this.rects) {
      const dx = Math.max(a - x, 0, x - b),
        dz = Math.max(e - z, 0, z - d);
      c = Math.min(c, Math.hypot(dx, dz));
    }
    if (this.extra && !this.extra(x, z)) c = Math.min(c, 0);
    return Math.max(0, c);
  }
  build() {
    drain(this.buildSteps());
  }
  // the same, yielding every few columns, for a place built in slices (js/perf/slice.js); a grid blocked or
  // unblocked meanwhile is left unbuilt
  *buildSteps() {
    const g = new Uint8Array(this.nx * this.nz),
      { rects, extra } = this,
      n = rects.length;
    for (let i = 0; i < this.nx; i++) {
      for (let k = 0; k < this.nz; k++)
        g[k * this.nx + i] = this.free(this.x0 + (i + 0.5) * this.cell, this.z0 + (k + 0.5) * this.cell, this.R + 0.02)
          ? 1
          : 0;
      if (i % 8 === 7) yield;
    }
    if (this.rects === rects && rects.length === n && this.extra === extra) this.grid = g;
  }
  cellOf(x, z) {
    return [
      Math.max(0, Math.min(this.nx - 1, Math.floor((x - this.x0) / this.cell))),
      Math.max(0, Math.min(this.nz - 1, Math.floor((z - this.z0) / this.cell))),
    ];
  }
  nearestFree(i, k) {
    const g = this.grid;
    if (g[k * this.nx + i]) return [i, k];
    for (let r = 1; r < 40; r++) {
      let best = null,
        bd = 1e9;
      for (let di = -r; di <= r; di++)
        for (let dk = -r; dk <= r; dk++) {
          if (Math.max(Math.abs(di), Math.abs(dk)) !== r) continue;
          const a = i + di,
            b = k + dk;
          if (a < 0 || b < 0 || a >= this.nx || b >= this.nz || !g[b * this.nx + a]) continue;
          const d = di * di + dk * dk;
          if (d < bd) {
            bd = d;
            best = [a, b];
          }
        }
      if (best) return best;
    }
    return null;
  }
  // A* over the grid (8-neighbour), then string-pulled to a few waypoints.
  path(sx, sz, tx, tz) {
    if (!this.grid) this.build();
    const g = this.grid,
      nx = this.nx;
    const s0 = this.nearestFree(...this.cellOf(sx, sz)),
      t0 = this.nearestFree(...this.cellOf(tx, tz));
    if (!s0 || !t0) return null;
    const S = s0[1] * nx + s0[0],
      T = t0[1] * nx + t0[0];
    const N = g.length,
      gs = new Float32Array(N).fill(1e9),
      from = new Int32Array(N).fill(-1),
      closed = new Uint8Array(N);
    const h = (i) => {
      const x = i % nx,
        z = (i / nx) | 0;
      const dx = Math.abs(x - t0[0]),
        dz = Math.abs(z - t0[1]);
      return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
    };
    const open = [S];
    gs[S] = 0;
    const f = new Float32Array(N).fill(1e9);
    f[S] = h(S);
    let found = false,
      iter = 0;
    while (open.length && iter++ < 60000) {
      let bi = 0;
      for (let j = 1; j < open.length; j++) if (f[open[j]] < f[open[bi]]) bi = j;
      const cur = open[bi];
      open[bi] = open[open.length - 1];
      open.pop();
      if (cur === T) {
        found = true;
        break;
      }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cx = cur % nx,
        cz = (cur / nx) | 0;
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          if (!dx && !dz) continue;
          const x = cx + dx,
            z = cz + dz;
          if (x < 0 || z < 0 || x >= nx || z >= this.nz) continue;
          const n = z * nx + x;
          if (!g[n] || closed[n]) continue;
          if (dx && dz && (!g[cz * nx + x] || !g[z * nx + cx])) continue;
          const ng = gs[cur] + (dx && dz ? 1.414 : 1);
          if (ng < gs[n]) {
            gs[n] = ng;
            from[n] = cur;
            f[n] = ng + h(n);
            open.push(n);
          }
        }
    }
    if (!found) return null;
    const cells = [];
    for (let c = T; c !== -1; c = from[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map((c) => [
      this.x0 + ((c % nx) + 0.5) * this.cell,
      this.z0 + (((c / nx) | 0) + 0.5) * this.cell,
    ]);
    pts[pts.length - 1] = this.free(tx, tz) ? [tx, tz] : pts[pts.length - 1];
    // string pull: keep a point only if the straight line from the last kept point to the next one is blocked
    const out = [[sx, sz]];
    let i = 0;
    while (i < pts.length - 1) {
      let j = pts.length - 1;
      while (j > i + 1 && !this.clear(out[out.length - 1], pts[j])) j--;
      out.push(pts[j]);
      i = j;
    }
    if (out.length === 1) out.push(pts[pts.length - 1]);
    return out.slice(1);
  }
  clear(a, b) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]),
      n = Math.ceil(d / (this.cell * 0.5));
    for (let s = 1; s <= n; s++) {
      const t = s / n;
      if (!this.free(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, this.R + 0.01)) return false;
    }
    return true;
  }
  // push a circle out of the blockers and back inside the bounds
  // (someone already inside the margin, put there by a scene, can always move out: any step that gets them further
  // from the furniture is allowed, so nobody is ever stuck in it)
  collide(x, z, ox, oz) {
    if (this.free(x, z)) return [x, z];
    // try sliding along each axis
    if (this.free(x, oz)) return [x, oz];
    if (this.free(ox, z)) return [ox, z];
    if (!this.free(ox, oz)) {
      const c0 = this.clearance(ox, oz);
      if (this.clearance(x, z) > c0) return [x, z];
      if (this.clearance(x, oz) > c0) return [x, oz];
      if (this.clearance(ox, z) > c0) return [ox, z];
    }
    return [ox, oz];
  }
}

// the reachable cell (flood fill from the start over the walk grid) closest to the target
export function reachableNear(nav, sx, sz, tx, tz) {
  if (!nav.grid) nav.build();
  const g = nav.grid,
    nx = nav.nx,
    s0 = nav.nearestFree(...nav.cellOf(sx, sz));
  if (!s0) return null;
  const seen = new Uint8Array(g.length),
    q = [s0[1] * nx + s0[0]];
  seen[q[0]] = 1;
  let best = null,
    bd = 1e9;
  for (let h = 0; h < q.length; h++) {
    const c = q[h],
      x = c % nx,
      z = (c / nx) | 0;
    const wx = nav.x0 + (x + 0.5) * nav.cell,
      wz = nav.z0 + (z + 0.5) * nav.cell,
      d = Math.hypot(wx - tx, wz - tz);
    if (d < bd) {
      bd = d;
      best = [wx, wz];
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const a = x + dx,
        b = z + dz;
      if (a < 0 || b < 0 || a >= nx || b >= nav.nz) continue;
      const n = b * nx + a;
      if (!seen[n] && g[n]) {
        seen[n] = 1;
        q.push(n);
      }
    }
  }
  return best;
}

// a free spot near (x, z) that no one else stands on (for NPC destinations and approach points)
export function clearOf(list, x, z, rad) {
  return list.every((b) => Math.hypot(b.x - x, b.z - z) >= b.r + rad);
}

export function freeNear(nav, list, x, z, rad, ok = null) {
  if ((!nav || nav.free(x, z, nav.R + 0.02)) && clearOf(list, x, z, rad) && (!ok || ok(x, z))) return [x, z];
  for (let ring = 1; ring <= 6; ring++) {
    const d = ring * 0.14;
    let best = null,
      bd = 1e9;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2,
        cx = x + Math.cos(a) * d,
        cz = z + Math.sin(a) * d;
      if (nav && !nav.free(cx, cz, nav.R + 0.02)) continue;
      if (!clearOf(list, cx, cz, rad) || (ok && !ok(cx, cz))) continue;
      const k = Math.hypot(cx - x, cz - z);
      if (k < bd) {
        bd = k;
        best = [cx, cz];
      }
    }
    if (best) return best;
  }
  return [x, z];
}

// a route that goes round the people standing in the way. They're blocked just for this search, on a copy of the
// built grid with only their cells marked: blocking them on the grid itself rebuilt the whole grid twice a search
// (every cell against every blocker), 150 to 400 ms on a phone each time Eric's way was full of people.
export function pathAround(nav, from, to, list, myR) {
  if (!nav.grid) nav.build();
  const base = nav.grid,
    rects = nav.rects,
    g = base.slice(),
    m = nav.R + 0.02, // the margin build() keeps from a blocker
    people = [];
  for (const b of list) {
    const r = Math.max(0.05, b.r + myR - nav.R),
      rect = [b.x - r, b.x + r, b.z - r, b.z + r];
    people.push(rect);
    const [i0, k0] = nav.cellOf(rect[0] - m, rect[2] - m),
      [i1, k1] = nav.cellOf(rect[1] + m, rect[3] + m);
    for (let i = i0; i <= i1; i++)
      for (let k = k0; k <= k1; k++) {
        const x = nav.x0 + (i + 0.5) * nav.cell,
          z = nav.z0 + (k + 0.5) * nav.cell;
        const cx = Math.max(rect[0], Math.min(rect[1], x)),
          cz = Math.max(rect[2], Math.min(rect[3], z));
        if (Math.hypot(x - cx, z - cz) < m) g[k * nav.nx + i] = 0;
      }
  }
  // free() and clear() (the end point, the string pulling) see them too, as before
  nav.rects = rects.concat(people);
  nav.grid = g;
  let path;
  try {
    path = nav.path(from[0], from[1], to[0], to[1]);
  } finally {
    nav.rects = rects;
    nav.grid = base;
  }
  return path && path.length ? path : null;
}

// A walk getting nowhere stops where it is (Jørgen, 2026-09-30: "Mio was spinning around 20 times in place"): no
// nearer the end for a second close to it (2.5 s anywhere), a full turn without getting nearer, or going round and
// round one way. A route never turns much more than half a turn one way, but someone circling a point she can't
// reach creeps a little nearer each lap, which kept clearing the full-turn count (Mio circled her chair's corner 1.5
// times, #195), so the one-way turn (`net`) isn't cleared by progress; it fades by a full turn every 3 s instead.
export function stuck(prog, remain, dt, wait, turn) {
  const ROUND = 1.5 * Math.PI, // the most one way a walk turns before it counts as circling
    FADE = (2 * Math.PI) / 3; // rad/s
  if (remain < prog.best - 0.02) Object.assign(prog, { best: remain, noGain: 0, spun: 0 });
  else if (!wait) prog.noGain += dt;
  prog.spun += Math.abs(turn);
  const net = (prog.net || 0) + turn;
  prog.net = Math.sign(net) * Math.max(0, Math.abs(net) - FADE * dt);
  return (
    (prog.noGain > 1 && remain < 0.6) || prog.noGain > 2.5 || prog.spun > 2 * Math.PI || Math.abs(prog.net) > ROUND
  );
}
