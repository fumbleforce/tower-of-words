// The walkable ground of an outdoor place, said once (notes/grounds-system.md). A place lists the rectangles he can
// walk on ([x0, x1, z0, z1] in its local x and z) and the barriers that already show where walking ends (a building,
// a wall, a gate, the line a trip starts from). From that one list come:
//   contains(x, z)  is this point walkable ground (his centre may stand here if he fits)
//   blockers()      the ground inside bounds that isn't walkable, as few rectangles as it takes, for the walk grid
//                   (movement/navigation.js Nav.block keeps his whole body off them, as it does off furniture)
//   edges           every line between drawn walkable ground and the rest, split where what lies beyond changes and
//                   joined where it doesn't: { a: [x, z], b: [x, z], out: 'n' | 's' | 'e' | 'w', kind }, kind the
//                   barrier's ('building', 'wall', 'gate', 'open'...) or 'kerb' where nothing else stands there
//   stops           the same lines for where the walk grid stops him (inside bounds); kind 'seam' marks a stop that
//                   nothing shows (walkable-looking ground he can't enter), which a place must never have
//   corner(e, end)  at an edge's end, 'outside' (the ground turns away), 'inside' (it carries on) or 'flat'
// walk: where he walks; indoor: walk rectangles that are inside a building (its walls stop him). backdrop: ground drawn the same way that he can't reach from this place (a street seen past
// a trip's start, walkable in the next place), so its borders are drawn here too. cut: taken out again (a kiosk).
// bounds: the walk grid's area; past it nothing is walkable here.
// Overlapping and touching rectangles join with no edge between them. No Three.js here: the drawn borders
// (scenes/outdoor/walk-edges.js) and the walk grid both read this, so a border is drawn exactly where he is stopped.
//   const g = walkGround({ walk: [court, lane], barriers: [{ kind: 'building', rect: station }], bounds });

const EPS = 1e-6;
const inside = (x, z, [x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1;
const uniq = (vs) => [...new Set(vs.map((v) => Math.round(v * 1e5) / 1e5))].sort((a, b) => a - b);
const real = (r) => r[1] - r[0] > EPS && r[3] - r[2] > EPS;

// a compressed grid over every coordinate the rectangles start or end at, so each cell is wholly in or out
function cells(coords, test) {
  const xs = uniq(coords.flatMap((r) => [r[0], r[1]])),
    zs = uniq(coords.flatMap((r) => [r[2], r[3]]));
  const nx = xs.length - 1,
    nz = zs.length - 1;
  const cx = (i) => (xs[i] + xs[i + 1]) / 2,
    cz = (k) => (zs[k] + zs[k + 1]) / 2;
  const on = new Uint8Array(Math.max(0, nx * nz));
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) on[k * nx + i] = test(cx(i), cz(k)) ? 1 : 0;
  const at = (i, k) => i >= 0 && k >= 0 && i < nx && k < nz && on[k * nx + i] === 1;
  // the centre of the cell next to (i, k) in a direction, or a point just past the grid's edge
  const next = (i, k, di, dk) => [
    i + di < 0 ? xs[0] - 1 : i + di >= nx ? xs[nx] + 1 : cx(i + di),
    k + dk < 0 ? zs[0] - 1 : k + dk >= nz ? zs[nz] + 1 : cz(k + dk),
  ];
  return { xs, zs, nx, nz, at, next, cx, cz };
}

// the lines round the cells that are in, each labelled by kindAt(x, z) of the cell beyond, joined while it stays
function outline({ xs, zs, nx, nz, at, next, cx, cz }, kindAt) {
  const pieces = [];
  for (let k = 0; k < nz; k++)
    for (let i = 0; i < nx; i++) {
      if (!at(i, k)) continue;
      const side = (out, di, dk, line, s0, s1) => {
        if (!at(i + di, k + dk))
          pieces.push({
            out,
            line,
            s0,
            s1,
            kind: kindAt(next(i, k, di, dk), [cx(i), cz(k)]),
          });
      };
      side('n', 0, -1, zs[k], xs[i], xs[i + 1]);
      side('s', 0, 1, zs[k + 1], xs[i], xs[i + 1]);
      side('w', -1, 0, xs[i], zs[k], zs[k + 1]);
      side('e', 1, 0, xs[i + 1], zs[k], zs[k + 1]);
    }
  pieces.sort((p, q) => (p.out < q.out ? -1 : p.out > q.out ? 1 : p.line - q.line || p.s0 - q.s0));
  const edges = [];
  for (const p of pieces) {
    const last = edges.at(-1);
    if (last && last.out === p.out && last.line === p.line && last.kind === p.kind && Math.abs(last.s1 - p.s0) < EPS)
      last.s1 = p.s1;
    else edges.push({ ...p });
  }
  for (const e of edges) {
    const alongX = e.out === 'n' || e.out === 's';
    e.a = alongX ? [e.s0, e.line] : [e.line, e.s0];
    e.b = alongX ? [e.s1, e.line] : [e.line, e.s1];
  }
  return edges;
}

export function walkGround({ walk, backdrop = [], indoor = [], cut = [], barriers = [], bounds }) {
  walk = walk.filter(real);
  backdrop = backdrop.filter(real);
  const shown = [...walk, ...backdrop];
  const uncut = (x, z) => !cut.some((r) => inside(x, z, r));
  const contains = (x, z) => inside(x, z, bounds) && walk.some((r) => inside(x, z, r)) && uncut(x, z);
  const drawn = (x, z) => shown.some((r) => inside(x, z, r)) && uncut(x, z);
  // what stops him at a line: the wall of a building he is inside, or the barrier beyond it
  const barrierAt = ([x, z], [ix, iz]) =>
    indoor.some((r) => inside(ix, iz, r)) ? 'building' : barriers.find((b) => inside(x, z, b.rect))?.kind;
  const coords = [...shown, ...cut, ...barriers.map((b) => b.rect), bounds];
  const navCells = cells(coords, contains),
    drawCells = cells(coords, drawn);
  const edges = outline(drawCells, (p, q) => barrierAt(p, q) || 'kerb');
  const stops = outline(
    navCells,
    (p, q) => barrierAt(p, q) || (!inside(...p, bounds) ? 'open' : drawn(...p) ? 'seam' : 'kerb'),
  );

  // the ground inside bounds that isn't walkable: runs of cells along x, row by row, joined down z while a run
  // stays the same; the ones on the bounds carry on past them, so nothing there is left open
  function blockers() {
    const { xs, zs, nx, nz, at } = navCells,
      [ax0, ax1, az0, az1] = bounds;
    const out = [];
    let open = new Map(); // "i0,i1" -> the rectangle still growing down z
    for (let k = 0; k < nz; k++) {
      if (zs[k + 1] <= az0 + EPS || zs[k] >= az1 - EPS) continue;
      const runs = [];
      for (let i = 0; i < nx; i++) {
        if (xs[i + 1] <= ax0 + EPS || xs[i] >= ax1 - EPS || at(i, k)) continue;
        const last = runs.at(-1);
        if (last && last[1] === i) last[1] = i + 1;
        else runs.push([i, i + 1]);
      }
      const grown = new Map();
      for (const [i0, i1] of runs) {
        const key = i0 + ',' + i1;
        let r = open.get(key);
        if (r) r[3] = zs[k + 1];
        else out.push((r = [xs[i0], xs[i1], zs[k], zs[k + 1]]));
        grown.set(key, r);
      }
      open = grown;
    }
    return out.map(([x0, x1, z0, z1]) => [
      x0 <= ax0 + EPS ? ax0 - 1 : x0,
      x1 >= ax1 - EPS ? ax1 + 1 : x1,
      z0 <= az0 + EPS ? az0 - 1 : z0,
      z1 >= az1 - EPS ? az1 + 1 : z1,
    ]);
  }

  // at an end of a drawn edge: does the drawn ground carry on past it (an inside corner) or stop (an outside one)?
  function corner(e, end) {
    const alongX = e.out === 'n' || e.out === 's',
      s = end === 'b' ? 1 : -1,
      d = 1e-3,
      inward = e.out === 'n' || e.out === 'w' ? 1 : -1;
    const [px, pz] = e[end];
    const ahead = alongX ? drawn(px + s * d, pz + inward * d) : drawn(px + inward * d, pz + s * d),
      beyond = alongX ? drawn(px + s * d, pz - inward * d) : drawn(px - inward * d, pz + s * d);
    return ahead && beyond ? 'inside' : !ahead && !beyond ? 'outside' : 'flat';
  }
  return {
    walk,
    backdrop,
    cut,
    barriers,
    bounds,
    contains,
    drawn,
    edges,
    stops,
    blockers,
    corner,
  };
}

// the walk grid for a place's ground: his centre must be on walkable ground (Nav.extra, as before), and the rest is
// blocked as rectangles, so the grid keeps his radius off every edge the way it does off furniture
export function applyGround(nav, ground) {
  nav.extra = ground.contains;
  for (const r of ground.blockers()) nav.block(...r);
  nav.ground = ground;
  return nav;
}
