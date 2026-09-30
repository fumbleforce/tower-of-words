# Mesh building blocks: rings lofted into closed tubes, with the bone weights of every vertex recorded as it is made.
import math

import bmesh
from mathutils import Vector


def smooth(e0, e1, x):
    if e0 == e1:
        return 1.0 if x >= e1 else 0.0
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


class Builder:
    """A bmesh plus the weights of each vertex ({bone: weight}) and a part name per face."""

    def __init__(self):
        self.bm = bmesh.new()
        self.weights = {}
        self.part = {}

    def vert(self, co, weights=None):
        v = self.bm.verts.new(co)
        self.weights[v] = weights or {}
        return v

    def face(self, verts, part):
        f = self.bm.faces.new(verts)
        self.part[f] = part
        return f

    def ring(self, centre, u, v, ru, rv_front, rv_back=None, n=8, phase=0.5, squash=None):
        """n points round centre in the plane (u, v); v's positive side uses rv_back (the back, +Y for bodies)."""
        rv_back = rv_front if rv_back is None else rv_back
        pts = []
        for i in range(n):
            a = 2 * math.pi * (i + phase) / n
            c, s = math.cos(a), math.sin(a)
            rv = rv_back if s > 0 else rv_front
            p = centre + u * (ru * c) + v * (rv * s)
            if squash:
                p = squash(p, c, s)
            pts.append(p)
        return pts

    def loft(self, rings, part, weigh, cap_start=None, cap_end=None):
        """Join rings (lists of points, same count) into a tube; caps are pole points (or None for an n-gon)."""
        vs = [[self.vert(p, weigh(p)) for p in r] for r in rings]
        n = len(rings[0])
        for a, b in zip(vs, vs[1:]):
            for i in range(n):
                j = (i + 1) % n
                self.face([a[i], a[j], b[j], b[i]], part)
        for ring, pole, flip in ((vs[0], cap_start, True), (vs[-1], cap_end, False)):
            if pole is None:
                self.face(list(reversed(ring)) if flip else ring, part)
                continue
            pv = self.vert(pole, weigh(pole))
            for i in range(n):
                j = (i + 1) % n
                self.face([ring[j], ring[i], pv] if flip else [ring[i], ring[j], pv], part)
        return vs

    def finish(self):
        bmesh.ops.recalc_face_normals(self.bm, faces=list(self.bm.faces))
        return self.bm


def frame(d, ref):
    """Two unit vectors across direction d, the first as close to ref as possible."""
    d = d.normalized()
    u = (ref - d * ref.dot(d))
    if u.length < 1e-6:
        u = Vector((1, 0, 0)) if abs(d.x) < 0.9 else Vector((0, 1, 0))
        u = u - d * u.dot(d)
    u.normalize()
    return u, d.cross(u).normalized()


def chain_weights(p, chain, radius):
    """Weights along a polyline of joints. chain: [(bone, joint point)], the last entry a bone's end point with
    bone None. The point is placed along the chain by its nearest segment; bones blend over `radius` at each joint."""
    best = None
    acc = 0.0
    marks = []
    for i in range(len(chain) - 1):
        a, b = chain[i][1], chain[i + 1][1]
        ab = b - a
        L = ab.length
        t = max(0.0, min(1.0, (p - a).dot(ab) / (L * L))) if L > 0 else 0.0
        d = (a + ab * t - p).length
        if best is None or d < best[0] - 1e-9:
            best = (d, acc + t * L)
        marks.append(acc)
        acc += L
    s = best[1]
    w = {}
    bones = [c[0] for c in chain[:-1]]
    for i, bone in enumerate(bones):
        lo = 1.0 if i == 0 else smooth(marks[i] - radius, marks[i] + radius, s)
        hi = 0.0 if i == len(bones) - 1 else smooth(marks[i + 1] - radius, marks[i + 1] + radius, s)
        if lo - hi > 1e-4:
            w[bone] = w.get(bone, 0) + lo - hi
    return w


def mix(*parts):
    """Blend weight dicts: mix((0.3, wa), (0.7, wb))."""
    out = {}
    for k, w in parts:
        for b, x in w.items():
            out[b] = out.get(b, 0) + k * x
    return out
