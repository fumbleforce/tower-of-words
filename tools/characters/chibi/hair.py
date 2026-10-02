"""Hair for the chibi kit (kit.py): a shell round the head with the face window cut out, shaped into clumps, and
flat tapered locks laid onto the head and the shell by rays from the front. Used by build.py and cast.py.
"""
import math

import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree

import kit


def theta(v):
    return math.atan2(v.x, -v.y)          # 0 at the front middle


def smooth(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def build_hair(coll, mats, head, S):
    """A hair shell round the head with the face window cut out, shaped into clumps, plus locks laid on by rays.
    S: shell (c, a, b, h, e, f), hairline (top of the window), window_x (its half width), end_side / end_back (where
    the hair ends at the sides and at the back), flare, clumps, groove, tip, fringe (depth of the bang tips along the
    window's top edge), inner (material key for the underside), locks [(centre line [(x, z)...], width, material)],
    extras [(name, bmesh maker, material)]."""
    c = S['shell']
    bm = kit.blob(c['c'], c['a'], c['b'], c['h'], c['e'], c['f'], n=40)

    def end(t):
        return S['end_side'] + (S['end_back'] - S['end_side']) * smooth(1.3, 2.1, abs(t))

    gone = [fc for fc in bm.faces
            if (m := fc.calc_center_median()).z < end(theta(m))
            or (m.y < 0 and m.z < S['hairline'] and abs(m.x) < S['window_x'])]
    bmesh.ops.delete(bm, geom=gone, context='FACES')
    for v in bm.verts:                     # the cut steps from row to row where the end varies: snap it onto the line
        if v.is_boundary and abs(v.co.z - end(theta(v.co))) < 0.05 and not (v.co.y < 0 and abs(v.co.x) < S['window_x']):
            v.co.z = end(theta(v.co))
    k, fringe = S.get('clumps', 18), S.get('fringe', 0.0)
    for v in bm.verts:                     # clumps: shallow grooves, and a pointed tip at the end of each clump
        t = theta(v.co)
        groove = (0.5 - 0.5 * math.cos(k * t)) ** 2
        r = Vector((v.co.x, v.co.y, 0))
        if r.length > 1e-6:
            down = min(1.0, max(0.0, (1.025 - v.co.z) / 0.15))
            v.co -= r.normalized() * S.get('groove', 0.006) * groove * down
            v.co += r.normalized() * S.get('flare', 0.0) * min(1.0, max(0.0, (0.76 - v.co.z) / 0.24)) ** 1.5
        tip = max(0.0, math.cos(k * t)) ** 3
        e = end(t)
        v.co.z -= S.get('tip', 0.015) * tip * min(1.0, max(0.0, (e + 0.125 - v.co.z) / 0.12))
        if fringe and v.co.y < 0 and abs(v.co.x) < S['window_x'] + 0.02:     # blunt bangs end in small points
            ft = max(0.0, math.cos(v.co.x * 2 * math.pi / 0.085)) ** 3
            v.co.z -= fringe * ft * min(1.0, max(0.0, (S['hairline'] + 0.05 - v.co.z) / 0.05))
    shell_bm = bm.copy()
    o = kit.obj('hair-shell', bm, mats['hair'], coll)
    kit.solidify(o, 0.02, mats.get(S.get('inner')))
    parts = {'hair-shell': o}

    hb = bmesh.new(); hb.from_mesh(head.data)
    head_bvh, shell_bvh = BVHTree.FromBMesh(hb), BVHTree.FromBMesh(shell_bm)
    for i, (pts, w, mk) in enumerate(S.get('locks', [])):
        bm = lock(pts, w, head_bvh, shell_bvh, lift0=0.004 + 0.003 * i)
        if bm: parts[f'bang{i + 1}'] = kit.obj(f'bang{i + 1}', bm, mats[mk], coll)
    hb.free(); shell_bm.free()
    for name, make, mk in S.get('extras', []):
        parts[name] = kit.obj(name, make(), mats[mk], coll)
    return parts


def spline(pts, m):
    """Catmull-Rom through 2D points, m samples."""
    P = [Vector(p) for p in pts]
    P = [2 * P[0] - P[1]] + P + [2 * P[-1] - P[-2]]
    out = []
    for k in range(m):
        u = k / (m - 1) * (len(P) - 3)
        i = min(int(u), len(P) - 4); t = u - i
        p0, p1, p2, p3 = P[i:i + 4]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                          + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    return out


def lock(pts, width, head_bvh, shell_bvh, lift0, M=28, K=9, thick=0.016):
    """A flat tapered lock lying on the head: top surface raised by a rounded profile, bottom just under it.
    Where the hair shell is in front of the head, the lock rides on the shell instead (lift = the gap)."""
    C = spline(pts, M)
    grid = []
    for i, c in enumerate(C):
        u = i / (M - 1)
        tg = (C[min(i + 1, M - 1)] - C[max(i - 1, 0)]).normalized()
        nrm2 = Vector((-tg.y, tg.x))
        w = width * (1 - u) ** 0.9 * (0.85 + 0.15 * min(1, u * 8))
        row = []
        for j in range(K):
            v = -1 + 2 * j / (K - 1)
            p = c + nrm2 * v * w / 2
            org, d = Vector((p.x, -1.0, p.y)), Vector((0, 1, 0))
            hit, n, _, dh = head_bvh.ray_cast(org, d)
            sh = shell_bvh.ray_cast(org, d)
            if hit is None:                # past the head's outline (a cheek lock's tip): ride on the shell
                if sh[0] is not None:
                    hit, n, dh = sh[0], sh[1], sh[3]
                elif i:                    # past the shell's end too: hang straight down from the row above
                    above = grid[i - 1][j]
                    hit, n, dh = Vector((p.x, above[0].y, p.y)), above[1], above[0].y + 1.0
                    sh = (None, None, None, dh)
                else:
                    print('LOCK MISS', tuple(round(q, 3) for q in p)); return None
            gap = (dh - sh[3]) if sh[0] is not None and sh[3] < dh else 0.0
            row.append([hit, n, gap, v, u])
        grid.append(row)
    # smooth the gaps so a lock crossing the hairline bends gently instead of stepping
    for _ in range(6):
        g = [[r[2] for r in row] for row in grid]
        for i in range(M):
            for j in range(K):
                nb = [g[i][j]] + [g[a][b] for a, b in ((i - 1, j), (i + 1, j), (i, j - 1), (i, j + 1)) if 0 <= a < M and 0 <= b < K]
                grid[i][j][2] = max(g[i][j], sum(nb) / len(nb))
    bm = bmesh.new()
    top, bot = [], []
    for row in grid:
        tr, br = [], []
        for hit, n, gap, v, u in row:
            base = hit - Vector((0, gap, 0)) + n * lift0     # back along the ray onto the shell where it is in front
            h = thick * math.sqrt(max(0.0, 1 - v * v)) * (1 - 0.6 * u)
            tr.append(bm.verts.new(base + n * h))
            br.append(bm.verts.new(base - n * 0.006))
        top.append(tr); bot.append(br)
    for i in range(M - 1):
        for j in range(K - 1):
            bm.faces.new((top[i][j], top[i + 1][j], top[i + 1][j + 1], top[i][j + 1]))
            bm.faces.new((bot[i][j + 1], bot[i + 1][j + 1], bot[i + 1][j], bot[i][j]))
        for j in (0, K - 1):
            bm.faces.new((top[i][j], bot[i][j], bot[i + 1][j], top[i + 1][j]))
    for i in (0, M - 1):
        for j in range(K - 1):
            bm.faces.new((top[i][j], top[i][j + 1], bot[i][j + 1], bot[i][j]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm
