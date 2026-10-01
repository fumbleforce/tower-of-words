# char-mio-i2i: Mio modelled to the target picture Jørgen picked (char-face-1, gen-i2i mio-front-d60).
# Every size below was measured on that picture at its own camera (mio_i2i_cam, mio_i2i_ref.py rows.json): 1 px is
# about 1.43 mm at the body. Space as kit.py: Z up, she faces -Y, her left is +X (image right in the front view).
#
# One mesh, skinned to the 9-bone rig of claude-facet (root, torso, head, arm.L/R, leg.L/R, shin.L/R), so the knees
# bend without a gap. Flat shaded: every part is a low-sided prism or a faceted shell.
#
# Parts and where they sit in the picture (px):
#   hair      peak at (516, 71); crown 420..595 wide; a fringe across her right brow (image left) from (455, 190) up to
#             the parting at (537, 138); a long lock in front of her right shoulder (image left) down to y 370; on
#             her left (image right) the hair falls behind the ear to y 285; green underneath shows by the neck
#   face      458..568 wide, chin (510, 257), eyes on y 203; her left ear (image right) 570..592
#   hoodie    shoulders 420..600 at y 310, hem band 590..625, kangaroo pocket 445..575 from y 500, drawstrings at
#             505 and 527 down to y 470, sleeves flaring to 362..430 at y 550, ribbed cuffs to y 600
#   hands     383..420 and 600..640, y 600..650
#   leggings  legs centred on x 467 and 555, knee y 738, ankle y 870, cuff band 870..885
#   sneakers  y 880..965, 436..503 and 518..580
import math

import bmesh
import bpy
from mathutils import Vector

import kit

PAL = dict(hair='#1e2530', green='#0f7a48', skin='#f4caa1', face='#f4caa1', hood='#2e3433', hood2='#262b2c',
           legs='#2f5560', sock='#1f2a35', shoe='#e5d6cc', sole='#4a4c55', string='#ddd5d6', frame='#15171c',
           pocket='#2a2f2f')
SLOTS = list(PAL)

HIP, KNEE = 0.56, 0.30
LEGX = 0.064
SH = 0.90  # shoulder joint height
NECK = 0.94


def ang(*deg):
    return [math.radians(d) for d in deg]


def ring(cx, cy, z, hx, hy, angles):
    return [Vector((cx + hx * math.cos(a), cy + hy * math.sin(a), z)) for a in angles]


class Body:
    """One bmesh with a deform layer: parts add faces with a material slot and a weight function co -> {bone: w}."""

    def __init__(self):
        self.bm = bmesh.new()
        self.dl = self.bm.verts.layers.deform.verify()
        self.groups = ['root', 'torso', 'head', 'arm.L', 'arm.R', 'leg.L', 'leg.R', 'shin.L', 'shin.R']

    def part(self, rings, slot, weights, cap0=True, cap1=True, closed=True, fan=False):
        """Loft through rings (lists of points, same count). closed: the rings wrap round."""
        bm = self.bm
        vs = [[bm.verts.new(p) for p in r] for r in rings]
        n = len(rings[0])
        mi = SLOTS.index(slot)
        faces = []
        for A, B in zip(vs, vs[1:]):
            for i in range(n if closed else n - 1):
                j = (i + 1) % n
                faces.append(bm.faces.new([A[i], A[j], B[j], B[i]]))
        for cap, r, rev in ((cap0, vs[0], True), (cap1, vs[-1], False)):
            if not cap:
                continue
            if fan:
                c = bm.verts.new(sum((v.co for v in r), Vector()) / len(r))
                for i in range(n):
                    tri = [r[i], r[(i + 1) % n], c]
                    faces.append(bm.faces.new(tri[::-1] if rev else tri))
            else:
                faces.append(bm.faces.new(r[::-1] if rev else r))
        for f in faces:
            f.material_index = mi
        for r in vs:
            for v in r:
                self.weigh(v, weights)
        return faces

    def raw(self, verts, faces, slot, weights):
        vs = [self.bm.verts.new(p) for p in verts]
        mi = SLOTS.index(slot)
        out = []
        for f in faces:
            face = self.bm.faces.new([vs[i] for i in f])
            face.material_index = mi
            out.append(face)
        for v in vs:
            self.weigh(v, weights)
        return out

    def weigh(self, v, weights):
        w = weights(v.co) if callable(weights) else weights if isinstance(weights, dict) else {weights: 1.0}
        for b, x in w.items():
            if x > 0:
                v[self.dl][self.groups.index(b)] = x


def tube(path, radii, n=6, phase=0.0, squash=1.0):
    """Rings round a polyline (points), radius per point; the ring's first axis is world X projected off the
    tangent, the second (scaled by squash) points along -Y-ish."""
    rings = []
    for k, p in enumerate(path):
        p = Vector(p)
        t = (Vector(path[min(k + 1, len(path) - 1)]) - Vector(path[max(k - 1, 0)])).normalized()
        u = Vector((1, 0, 0))
        u = (u - t * u.dot(t)).normalized()
        w = t.cross(u).normalized()
        r = radii[k]
        rings.append([p + u * r * math.cos(a) + w * r * squash * math.sin(a)
                      for a in [math.radians(phase + 360 * i / n) for i in range(n)]])
    return rings


def lock(stations, n=6):
    """A faceted hair lock: stations (centre, half-width vector, half-depth vector), a flattened hexagon section."""
    rings = []
    for c, W, D in stations:
        c, W, D = Vector(c), Vector(W), Vector(D)
        if n == 6:
            rings.append([c + W, c + 0.45 * W + D, c - 0.45 * W + D, c - W, c - 0.45 * W - D, c + 0.45 * W - D])
        else:
            rings.append([c + W, c + D, c - W, c - D])
    return rings


def legw(sx):
    L = 'L' if sx > 0 else 'R'

    def f(co):
        t = min(1, max(0, (co.z - (KNEE - 0.05)) / 0.1))
        return {'leg.' + L: t, 'shin.' + L: 1 - t}
    return f


def armw(sx):
    L = 'L' if sx > 0 else 'R'

    def f(co):
        t = min(1, max(0, (SH - 0.02 - co.z) / 0.08))
        return {'arm.' + L: 0.5 + 0.5 * t, 'torso': 0.5 - 0.5 * t}
    return f


def neckw(co):
    t = min(1, max(0, (co.z - 0.95) / 0.06))
    return {'head': t, 'torso': 1 - t}


def build_mesh():
    B = Body()
    # ---- legs: one hexagonal prism each, hip to ankle (widths from the picture, legs 0.128 apart)
    for sx in (1, -1):
        x = sx * LEGX
        prof = [(0.57, 0.050), (0.47, 0.045), (0.40, 0.040), (0.33, 0.035), (0.30, 0.034), (0.25, 0.036),
                (0.21, 0.038), (0.16, 0.030), (0.125, 0.023)]
        rings = [ring(x + sx * 0.003 * (z < 0.3), 0.0, z, r, r * 0.95, ang(*range(0, 360, 60))) for z, r in prof]
        B.part(rings, 'legs', legw(sx))
        # ankle cuff (sock band)
        B.part([ring(x, 0.0, z, r, r, ang(*range(0, 360, 60))) for z, r in ((0.098, 0.026), (0.128, 0.025))],
               'sock', {'shin.' + ('L' if sx > 0 else 'R'): 1.0})
        # sneaker: a faceted wedge, heel to toe along -Y, laces area lighter in the texture
        sh = 'shin.' + ('L' if sx > 0 else 'R')
        xs = x + sx * 0.004
        pts = []
        # stations along the foot: (y, half width, sole top z, upper top z)
        st = [(0.055, 0.034, 0.022, 0.10), (0.02, 0.043, 0.022, 0.105), (-0.04, 0.046, 0.02, 0.085),
              (-0.09, 0.044, 0.018, 0.06), (-0.125, 0.034, 0.016, 0.04), (-0.142, 0.02, 0.015, 0.026)]
        upper = []
        sole = []
        for y, hw, zs, zt in st:
            upper.append([Vector((xs + hw, y, zs)), Vector((xs + hw * 0.85, y, zs + (zt - zs) * 0.7)),
                          Vector((xs, y, zt)), Vector((xs - hw * 0.85, y, zs + (zt - zs) * 0.7)),
                          Vector((xs - hw, y, zs))])
            sole.append([Vector((xs + hw + 0.003, y, 0.0)), Vector((xs + hw + 0.003, y, zs)),
                         Vector((xs - hw - 0.003, y, zs)), Vector((xs - hw - 0.003, y, 0.0))])
        B.part(upper, 'shoe', sh, closed=False)
        # close the upper's bottom with the sole top
        B.part(sole, 'sole', sh)
    # ---- hoodie body: an eight-sided loft, wide flat front, hem band, drop shoulders
    A = ang(-128, -52, -15, 25, 62, 118, 155, 195)
    body = [(0.472, 0.124, 0.098, 0.0), (0.505, 0.127, 0.100, 0.0), (0.515, 0.131, 0.103, 0.0),
            (0.62, 0.133, 0.106, 0.0), (0.74, 0.132, 0.106, 0.004), (0.84, 0.13, 0.102, 0.008),
            (0.895, 0.125, 0.094, 0.012), (0.925, 0.10, 0.078, 0.016), (0.945, 0.06, 0.055, 0.02)]
    B.part([ring(0, cy, z, hx, hy, A) for z, hx, hy, cy in body], 'hood', 'torso')
    # kangaroo pocket: a thin plate on the front, trapezoid (narrow top, wide bottom)
    fy = -0.106 * math.sin(math.radians(52)) - 0.004
    pk = [(-0.068, 0.648), (0.066, 0.648), (0.088, 0.53), (-0.09, 0.53)]
    v = [Vector((x, fy - 0.006, z)) for x, z in pk] + [Vector((x * 0.97, fy + 0.012, z)) for x, z in pk]
    B.raw(v, [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], 'pocket', 'torso')
    # hood: a thick collar round the neck, high at the back, low in the front, and its rolled bulk at the back
    CA = ang(*range(-90, 270, 36))
    lo, hi = [], []
    for a in CA:
        front = max(0.0, -math.sin(a))  # 1 at the front
        lo.append(Vector((0.085 * math.cos(a), 0.012 + 0.075 * math.sin(a), 0.915)))
        hi.append(Vector((0.072 * math.cos(a), 0.018 + 0.064 * math.sin(a), 0.99 - 0.045 * front)))
    inner = [Vector((p.x * 0.55, 0.012 + (p.y - 0.012) * 0.55, p.z)) for p in hi]
    B.part([lo, hi, inner], 'hood', neckw, cap0=False, cap1=False)
    B.part(lock([((0, 0.085, 0.93), (0.085, 0, 0), (0, 0.035, 0.02)), ((0, 0.1, 0.87), (0.075, 0, 0), (0, 0.03, 0)),
                 ((0, 0.095, 0.82), (0.05, 0, 0), (0, 0.02, 0))]), 'hood2', 'torso')
    # drawstrings with metal eyelets and tips (gone from mi-06: the clean reference has none)
    for sx, x0, x1 in ((-1, -0.011, -0.012), (1, 0.019, 0.022)):
        if not GEAR['strings']:
            break
        path = [(x0, -0.072, 0.94), (x0, -0.093, 0.9), (x1, -0.103, 0.8), (x1, -0.103, 0.71)]
        B.part(tube(path, [0.0045] * 4, n=4, phase=45), 'string', 'torso')
    # ---- sleeves (flaring), ribbed cuffs, hands
    for sx in (1, -1):
        L = 'arm.' + ('L' if sx > 0 else 'R')
        path = [(sx * 0.10, 0.0, 0.905), (sx * 0.12, 0.0, 0.84), (sx * 0.145, -0.005, 0.72), (sx * 0.167, -0.005, 0.60),
                (sx * 0.17, -0.005, 0.575)]
        B.part(tube(path, [0.042, 0.042, 0.046, 0.05, 0.046], n=7, phase=90), 'hood', armw(sx))
        B.part(tube([(sx * 0.165, -0.004, 0.58), (sx * 0.16, -0.004, 0.545), (sx * 0.158, -0.004, 0.508)],
                    [0.036, 0.034, 0.03], n=7, phase=90), 'hood2', L)
        # hand: a flattened faceted block, palm toward the thigh, fingers down, thumb forward
        hx = sx * 0.157
        hp = [(0.51, 0.016, 0.022), (0.485, 0.019, 0.03), (0.455, 0.016, 0.026), (0.437, 0.008, 0.014)]
        B.part([ring(hx, -0.004, z, a, b, ang(0, 60, 120, 180, 240, 300)) for z, a, b in hp], 'skin', L, fan=True)
        B.part(tube([(hx - sx * 0.002, -0.022, 0.5), (hx - sx * 0.006, -0.034, 0.47)], [0.009, 0.007], n=4), 'skin', L)
    # ---- neck
    B.part(tube([(0, 0.006, 0.9), (0, 0.006, 0.96), (0, 0.004, 1.02)], [0.024, 0.022, 0.022], n=6), 'skin', neckw)
    # ---- head: a ten-sided lathe with a wide flat front for the face, chin forward
    HA = ang(-108, -72, -40, -5, 35, 65, 115, 145, 185, 220)
    hz = HEADZ
    B.part([ring(0.002, 0.012 + dy, z, 0.081 * kx, 0.094 * ky, HA) for z, kx, ky, dy in hz], 'skin', 'head', fan=True)
    # ears: small wedges on both sides, tilted back
    for sx in (1, -1):
        e = [(sx * 0.078, 0.004, 1.095), (sx * 0.097, 0.012, 1.10), (sx * 0.1, 0.02, 1.07), (sx * 0.084, 0.012, 1.048),
             (sx * 0.076, 0.022, 1.07)]
        B.raw(e, [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4), (0, 3, 2, 1)] if sx > 0 else
              [(0, 4, 1), (1, 4, 2), (2, 4, 3), (3, 4, 0), (0, 1, 2, 3)], 'skin', 'head')
    if not GEAR['glasses']:
        # glasses temples: thin bars from the lens edge back over the ears (the front frame is in the face picture)
        for sx in (1, -1):
            B.part(tube([(sx * 0.074, -0.074, 1.083), (sx * 0.083, -0.03, 1.085), (sx * 0.086, 0.01, 1.08)],
                        [0.0035] * 3, n=4, phase=45), 'frame', 'head')
    hair(B)
    if SHEET['on']:
        hair_sheet(B)
    for sk in GEAR['skins']:
        facet_skin(B, *sk)
    if GEAR['glasses']:
        glasses(B)
    return B


GEAR = {'strings': True, 'glasses': False, 'teeth': False, 'crown_fit': False, 'skins': (), 'short_back': False}
# the lenses in the target picture (px): her right (image left) and her left (image right), box x0, y0, x1, y1
LENS = ((458, 190, 497, 222), (520, 190, 565, 222))


def cam_ray(u, v, yaw=0.0):
    import mio_i2i_cam as C
    cam = Vector(C.cam_pos(yaw))
    f = (Vector(C.MID) - cam).normalized()
    right = f.cross(Vector((0, 0, 1))).normalized()
    up = right.cross(f)
    F = C.RES / 2 / math.tan(math.radians(C.FOV) / 2)
    return cam, (f + right * ((u - C.RES / 2) / F) - up * ((v - C.RES / 2) / F)).normalized()


def glasses(B):
    """Her glasses as their own geometry (mi-06 on, with the clean reference that has none painted): two
    rounded-rectangle frames where the target drew them, each corner cast from the target camera onto the face and
    brought 7 mm forward, a bridge, and temples back over the ears. Thin black bars, 3 mm."""
    from mathutils.bvhtree import BVHTree
    tree = BVHTree.FromBMesh(B.bm)
    rings = []
    for x0, y0, x1, y1 in LENS:
        cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2
        pts = []
        for i in range(24):
            a = 2 * math.pi * i / 24
            c, s_ = math.cos(a), math.sin(a)
            # a soft superellipse: an oval with fuller corners, as the target's lenses
            u = cx + rx * math.copysign(abs(c) ** 0.8, c)
            v = cy + ry * math.copysign(abs(s_) ** 0.8, s_)
            cam, d = cam_ray(u, v)
            hit = tree.ray_cast(cam, d)
            p = hit[0] if hit[0] is not None else cam + d * 4.08
            pts.append(Vector((p.x, min(p.y, -0.06) - 0.007, p.z)))
        rings.append(pts)
        loop = [pts[-1]] + pts + [pts[0], pts[1]]  # closed: tangents wrap round, the last ring meets the first
        B.part(tube(loop, [0.0016] * len(loop), n=4, phase=45)[1:-1], 'frame', 'head', cap0=False, cap1=False)
    # bridge: inner edge of one lens to the other, at mid height
    a, b = rings[0][0], rings[1][12]
    B.part(tube([a, (a + b) / 2 + Vector((0, -0.003, 0.002)), b], [0.0016] * 3, n=4, phase=45), 'frame', 'head')
    for pts, sx in ((rings[0], -1), (rings[1], 1)):
        e = pts[12] if sx < 0 else pts[0]  # the outer edge at mid height
        B.part(tube([e, Vector((sx * 0.084, -0.03, e.z + 0.002)), Vector((sx * 0.086, 0.01, e.z - 0.004))],
                    [0.0018] * 3, n=4, phase=45), 'frame', 'head')


def hair(B):
    """The faceted hair masses (see the header for where they sit in the picture)."""
    # crown: an off-centre faceted dome, peak at x 0.006, cut away low at the front for the face
    CA = ang(*range(-90, 270, 40))
    cr = [(1.262, 0.006, 0.0, 0.0, -0.01), (1.238, -0.006, 0.064, 0.08, -0.006), (1.205, -0.01, 0.098, 0.104, 0.0),
          (1.168, -0.006, 0.12, 0.116, 0.004), (1.12, -0.004, 0.123, 0.118, 0.008), (1.07, -0.004, 0.122, 0.116, 0.012)]
    if GEAR['crown_fit']:
        # mi-09: the crown's width at each height read off the picture's outline (rows.json, x from her right to
        # her left), so the front shows its angular peak, not a dome; depth follows the width
        fit = [(1.262, 0.003, 0.009), (1.245, -0.03, 0.042), (1.227, -0.058, 0.055), (1.21, -0.089, 0.086),
               (1.193, -0.118, 0.099), (1.176, -0.132, 0.11), (1.12, -0.128, 0.118), (1.07, -0.127, 0.12)]
        cr = [(z, (a + b) / 2, (b - a) / 2, min(0.118, (b - a) / 2 * 0.95), 0.0) for z, a, b in fit]
    rings = [ring(cx, 0.012 + cy, z, max(hx, 0.004), max(hy, 0.004), CA) for z, cx, hx, hy, cy in cr]
    faces = B.part(rings, 'hair', 'head', cap0=True, cap1=False)
    # open the crown's front below the fringe line, so the forehead and face stay clear
    # (with the hair sheet the sheet is the front, so more of the crown's front goes: it would stand off the sheet)
    zcut, ycut = (1.215, -0.02) if SHEET['on'] else (1.16, -0.04)
    dead = [f for f in faces if f.calc_center_median().y < ycut and f.calc_center_median().z < zcut]
    bmesh.ops.delete(B.bm, geom=dead, context='FACES_ONLY')
    if not SHEET['on']:
        hand_fringe(B)
    # her right side (image left): the long lock in front of the shoulder, to y 370 in the picture
    st = [((-0.1, -0.05, 1.16), (0.03, 0, 0), (0, 0.03, 0)),
          ((-0.107, -0.06, 1.06), (0.033, 0, 0), (0, 0.022, 0)),
          ((-0.1, -0.072, 0.96), (0.034, 0, 0), (0, 0.018, 0)),
          ((-0.096, -0.085, 0.88), (0.03, 0, 0), (0, 0.014, 0)),
          ((-0.092, -0.094, 0.83), (0.012, 0, 0), (0, 0.008, 0))]
    B.part(lock(st), 'hair', 'head', fan=True)
    # the back: a thick C-shaped curtain round the back of the head down past the hood, green on its inside
    BA = ang(*range(-20, 201, 20))
    outer, inner = [], []
    curtain = ((1.13, 0.128, 0.118, 0.012), (1.04, 0.13, 0.118, 0.02), (0.96, 0.13, 0.108, 0.04),
               (0.9, 0.12, 0.095, 0.055))
    if GEAR['short_back']:  # mi-13: ends where the aligned side and back views end it, at the hood (y 300, z 0.94)
        curtain = ((1.13, 0.128, 0.118, 0.012), (1.04, 0.13, 0.118, 0.02), (0.985, 0.13, 0.11, 0.035),
                   (0.94, 0.125, 0.1, 0.045))
    for z, hx, hy, cy in curtain:
        outer.append(ring(0, cy, z, hx, hy, BA))
        inner.append(ring(0, cy + 0.006, z, hx * 0.78, hy * 0.72, BA))
    # a closed shell: outer rings down, inner rings back up, so its inside (facing forward) exists for the green
    B.part(outer + inner[::-1], 'hair', 'head', cap0=False, cap1=False, closed=False)
    # green underside: a thinner inner layer at the nape, visible beside the neck under the jaw
    gl = []
    GA = ang(*range(-30, 211, 15))
    for z, hx, hy, cy in ((1.02, 0.085, 0.06, 0.03), (0.96, 0.09, 0.07, 0.038)):
        gl.append(ring(0, cy, z, hx, hy, GA))
    if GEAR['teeth']:  # the lower edge in points, as the picture's green triangles
        for i, p in enumerate(gl[1]):
            p.z += 0.0 if i % 2 else 0.028
    B.part(gl, 'green', 'head', cap0=False, cap1=False, closed=False)


def hand_fringe(B):
    """mi-01..mi-03: the fringe, the parting wedge and her left side curtain, modelled by hand."""
    # fringe: a sweep across her right brow (image left), from the parting down to beside her right eye
    st = [((0.03, -0.098, 1.16), (0.016, 0, 0.012), (0, 0.012, 0)),
          ((-0.015, -0.104, 1.15), (0.03, 0, 0.034), (0, 0.014, 0)),
          ((-0.06, -0.096, 1.12), (0.028, 0, 0.04), (0, 0.014, 0)),
          ((-0.088, -0.08, 1.085), (0.012, 0, 0.02), (0, 0.012, 0))]
    B.part(lock(st), 'hair', 'head', fan=True)
    # the fringe's top joins the crown: a wedge from the peak's front down to the parting
    B.part(lock([((-0.012, -0.066, 1.222), (0.06, 0, -0.01), (0, 0.02, 0.0)),
                 ((-0.01, -0.1, 1.185), (0.06, 0, -0.012), (0, 0.016, 0)),
                 ((0.0, -0.104, 1.16), (0.04, 0, -0.01), (0, 0.012, 0))]), 'hair', 'head', fan=True)
    # her left side (image right): a curtain from the parting over the temple, falling behind the ear
    st = [((0.06, -0.075, 1.17), (0.03, 0.01, 0), (0.012, 0, 0.008)),
          ((0.096, -0.035, 1.12), (0.016, 0.03, 0), (0.016, -0.004, 0)),
          ((0.108, 0.005, 1.04), (0.012, 0.045, 0), (0.016, 0, 0)),
          ((0.106, 0.012, 0.975), (0.008, 0.04, 0), (0.01, 0, 0))]
    B.part(lock(st), 'hair', 'head', fan=True)


SHEET = {'on': False, 'step': 3, 'gap': 0.012, 'lift': 0.007, 'ref': 'ref'}


def hair_sheet(B):
    """The hair's front surface straight from the target: every 3 px cell the target shows as hair (ref/hair.png)
    becomes a quad where the target camera's ray through it meets the skull (pushed out by lift) or the hair masses
    behind; cells whose corners lie at different depths (more than gap apart) are left open. Its edge is the
    picture's hairline, so painted hair lands on hair from every angle."""
    import os

    import numpy as np
    from mathutils.bvhtree import BVHTree

    import mio_i2i_cam as C
    img = bpy.data.images.load(os.path.join(C.OUT, SHEET['ref'], 'hair.png'))
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    hair = px.reshape(h, w, 4)[::-1, :, 0] > 0.5  # Blender rows run bottom-up
    # the surface the rays land on: the model so far, plus the skull pushed out by lift
    sup = B.bm.copy()
    HA = ang(-108, -72, -40, -5, 35, 65, 115, 145, 185, 220)
    k = 1 + SHEET['lift'] / 0.081
    rings = [ring(0.002, 0.012 + dy, 1.1 + (z - 1.1) * k, 0.081 * kx * k, 0.094 * ky * k, HA) for z, kx, ky, dy in HEADZ]
    vs = [[sup.verts.new(p) for p in r] for r in rings]
    for A_, B_ in zip(vs, vs[1:]):
        for i in range(len(HA)):
            j = (i + 1) % len(HA)
            sup.faces.new([A_[i], A_[j], B_[j], B_[i]])
    sup.normal_update()
    tree = BVHTree.FromBMesh(sup)
    bare = BVHTree.FromBMesh(B.bm)  # the skull itself, for the sheet's edge
    cam = Vector(C.cam_pos())
    f = (Vector(C.MID) - cam).normalized()
    right = f.cross(Vector((0, 0, 1))).normalized()
    up = right.cross(f)
    F = C.RES / 2 / math.tan(math.radians(C.FOV) / 2)
    st = SHEET['step']
    grid = {}
    for v in range(60, 300, st):
        for u in range(400, 622, st):
            if not hair[v, u]:
                continue
            if v > 250 and 455 < u < 572:  # under the chin the green layer itself takes the picture
                continue
            d = (f + right * ((u - C.RES / 2) / F) - up * ((v - C.RES / 2) / F)).normalized()
            hit = tree.ray_cast(cam, d)
            if hit[0] is not None:
                grid[(u, v)] = hit[0] - d * 0.002
                edge = any(not hair[min(v + dv, h - 1), min(u + du, w - 1)]
                           for du in (-st, 0, st) for dv in (-st, 0, st))
                if edge:  # on the hairline: down onto the skull, so no gap shows under the sheet's edge
                    h2 = bare.ray_cast(cam, d)
                    if h2[0] is not None and (h2[0] - hit[0]).length < SHEET["lift"] * 4:
                        grid[(u, v)] = h2[0] - d * 0.0005
    sup.free()
    bpy.data.images.remove(img)
    verts, faces = [], []
    index = {}
    cells = {(u - du, v - dv) for (u, v) in grid for du in (0, st) for dv in (0, st)}
    for (u, v) in sorted(cells):
        q = [(u, v), (u + st, v), (u + st, v + st), (u, v + st)]
        q = [c for c in q if c in grid]
        if len(q) < 3:  # three corners: a triangle, so the edge runs diagonally instead of in steps
            continue
        ds = [(grid[c] - cam).length for c in q]
        if max(ds) - min(ds) > SHEET['gap']:
            continue
        ids = []
        for c in q:
            if c not in index:
                index[c] = len(verts)
                verts.append(grid[c])
            ids.append(index[c])
        faces.append(ids[::-1])
    B.raw(verts, faces, 'hair', 'head')
    print('SHEET', len(faces), 'cells')


def build(coll):
    """Builds the mesh object and its rig in coll. Returns (armature, mesh object)."""
    B = build_mesh()
    bm = B.bm
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.normal_update()
    skin, face = SLOTS.index('skin'), SLOTS.index('face')
    for f in bm.faces:
        f.smooth = False
        c = f.calc_center_median()
        # the face: the head's front, its own material so the texture takes it from the front picture only
        if f.material_index == skin and f.normal.y < -0.3 and 0.99 < c.z < 1.17 and abs(c.x) < 0.075:
            f.material_index = face
    me = bpy.data.meshes.new('mio')
    bm.to_mesh(me)
    bm.free()
    for s in SLOTS:
        m = kit.mat(PAL[s], rough=0.85, spec=0.25)
        m.use_backface_culling = False  # open shells (hair, hood) show from both sides, in the glb too
        me.materials.append(m)
    ob = kit.link(bpy.data.objects.new('mio', me), coll)
    for g in B.groups:
        ob.vertex_groups.new(name=g)
    # bmesh's deform layer wrote the weights by group index; vertex_groups were created in the same order
    bones = [('root', (0, 0, 0), (0, 0, HIP), None),
             ('torso', (0, 0, HIP), (0, 0, NECK), 'root'),
             ('head', (0, 0, NECK), (0, 0, 1.26), 'torso')]
    for sx, L in ((1, 'L'), (-1, 'R')):
        bones += [('arm.' + L, (sx * 0.11, 0, SH), (sx * 0.16, 0, 0.5), 'torso'),
                  ('leg.' + L, (sx * LEGX, 0, HIP), (sx * LEGX, 0, KNEE), 'root'),
                  ('shin.' + L, (sx * LEGX, 0, KNEE), (sx * LEGX, 0, 0.0), 'leg.' + L)]
    arm = kit.rig('mio-rig', bones, coll)
    ob.parent = arm
    mod = ob.modifiers.new('rig', 'ARMATURE')
    mod.object = arm
    return arm, ob


def tri2d(pts):
    """Ear-clipping triangulation of a simple polygon given as 2D points; returns index triples."""
    idx = list(range(len(pts)))
    area = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in idx)
    sgn = 1 if area > 0 else -1
    out = []
    guard = 0
    while len(idx) > 3 and guard < 500:
        guard += 1
        for k in range(len(idx)):
            a, b, c = idx[k - 1], idx[k], idx[(k + 1) % len(idx)]
            pa, pb, pc = pts[a], pts[b], pts[c]
            cr = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0])
            if cr * sgn <= 0:
                continue

            def inside(p):
                d1 = (pb[0] - pa[0]) * (p[1] - pa[1]) - (pb[1] - pa[1]) * (p[0] - pa[0])
                d2 = (pc[0] - pb[0]) * (p[1] - pb[1]) - (pc[1] - pb[1]) * (p[0] - pb[0])
                d3 = (pa[0] - pc[0]) * (p[1] - pc[1]) - (pa[1] - pc[1]) * (p[0] - pc[0])
                return d1 * sgn > 0 and d2 * sgn > 0 and d3 * sgn > 0
            if any(inside(pts[j]) for j in idx if j not in (a, b, c)):
                continue
            out.append((a, b, c))
            idx.pop(k)
            break
    if len(idx) == 3:
        out.append(tuple(idx))
    return out


def convex(pts):
    sg = 0
    n = len(pts)
    for i in range(n):
        a, b, c = pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
        if abs(cr) < 1e-6:
            continue
        if sg == 0:
            sg = 1 if cr > 0 else -1
        elif (cr > 0) != (sg > 0):
            return False
    return True


def facet_skin(B, name, yaw, face_max=None):
    """mi-11 on: the picture's facets as the model's faces. Every corner of the wireframe read off the picture
    (mio_i2i_wire.py, wire/<name>.json) is cast from that picture's camera onto the model built so far and placed
    1.5 mm in front of it; each facet becomes a face (ear-clipped), kept where its corners agree in depth (within 2.5
    cm, so a facet never bridges two parts) and where it faces the camera. Corners take the bone weights and material
    of the surface they land on. The model under the skin stays, so whatever the picture doesn't cover is still closed."""
    import json
    import os

    from mathutils.bvhtree import BVHTree

    import mio_i2i_cam as C
    data = json.load(open(os.path.join(C.OUT, 'wire', name + '.json')))
    bm = B.bm
    bm.faces.ensure_lookup_table()
    tree = BVHTree.FromBMesh(bm)
    hits = []
    for u, v in data['verts']:
        cam, d = cam_ray(u, v, yaw)
        loc, nrm, fi, dist = tree.ray_cast(cam, d)
        if loc is None:
            hits.append(None)
            continue
        f = bm.faces[fi]
        w = {B.groups[g]: x for g, x in f.verts[0][B.dl].items()}
        hits.append((loc - d * 0.0015, f.material_index, w, (loc - cam).length, cam))
    made = 0
    for p in data['polys']:
        vi = p['v']
        got = [hits[i] for i in vi if hits[i] is not None]
        if len(got) < max(2, len(vi) // 2):
            continue
        ds = [h[3] for h in got]
        bones = {max(h[2], key=h[2].get) for h in got}
        if max(ds) - min(ds) > (0.06 if len(bones) == 1 else 0.02):
            continue
        # corners on the outline whose ray just misses the model: at the facet's mean depth
        mean = sum(ds) / len(ds)
        for i in vi:
            if hits[i] is None:
                u, v = data['verts'][i]
                cam, d = cam_ray(u, v, yaw)
                g = got[0]
                hits[i] = (cam + d * (mean - 0.0015), g[1], g[2], mean, cam)
        pts2 = [data['verts'][i] for i in vi]
        if convex(pts2):  # one face per facet, so the model's edges are the picture's
            tris = [tuple(range(len(vi)))]
        else:
            tris = tri2d(pts2)
        for tri in tris:
            ids = [vi[k] for k in tri]
            A, Bv, Cv = (hits[ids[0]][0], hits[ids[1]][0], hits[ids[2]][0])
            n = (Bv - A).cross(Cv - A)
            if n.length < 1e-9:
                continue
            if face_max is not None:
                look = (A - hits[ids[0]][4]).normalized()
                if abs(n.normalized().dot(look)) < face_max:  # only what faces this camera
                    continue
            mats = [hits[i][1] for i in ids]
            mat = max(set(mats), key=mats.count)
            vs = [bm.verts.new(hits[i][0]) for i in ids]
            try:
                f = bm.faces.new(vs)
            except ValueError:
                continue
            f.material_index = mat
            for vtx, i in zip(vs, ids):
                for g, x in hits[i][2].items():
                    vtx[B.dl][B.groups.index(g)] = x
            made += 1
    print('SKIN', name, made, 'faces')


HEADZ = [(0.998, 0.12, 0.10, -0.03), (1.022, 0.55, 0.62, -0.016), (1.05, 0.88, 0.9, -0.006), (1.08, 1.0, 1.0, 0.0),
         (1.12, 0.98, 1.0, 0.0), (1.165, 0.86, 0.92, 0.004), (1.2, 0.6, 0.7, 0.006), (1.222, 0.25, 0.3, 0.008)]
HEAD = (0, -0.02, 1.09)
HEAD_SPAN = 0.32
MOTION = dict(swing=24, arm_swing=16, arm_out=3, knees=('shin.L', 'shin.R'))
