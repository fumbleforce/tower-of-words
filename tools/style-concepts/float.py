# claude-float: a limbless figure. Body and head are one faceted bean (twelve sides, flat-shaded like the world's
# trees and planters), split at the collar so the head can move; hands and shoes float free of it, with a cuff at
# each wrist and a trouser hem over each shoe. The hair is built like the tree canopies: faceted clumps (low
# icospheres) heaped over the top of the bean. The clothes are bands round the bean; the face is drawn on its front
# facets (eye plates and a glasses frame that follow them).
# Space as in kit.py. 7-bone rig: the arm and leg bones carry the floating hands and shoes.
import math

from mathutils import Matrix, Vector

import kit
import toyfig

MATTE = dict(rough=0.82, spec=0.3)
SEGS = 12  # sides of the bean
PHASE = 15  # turns the rings so a flat facet, not an edge, faces the front (-Y)

PAL = {
    'mio': dict(skin='#f4dccb', hair='#13292f', hair2='#1b3a41', teal='#20a081', top='#0b2a30', top2='#0f363d',
                legs='#3b4152', shoe='#ece9e2', sole='#3d4658', iris='#c49a5a', pupil='#3e2a18', frame='#7f858c',
                lash='#1b1c22', mouth='#c98579', phone='#272b33', card='#f1f2ef', lanyard='#20a081'),
    'eric': dict(skin='#f6ddcf', hair='#ad8d5c', hair2='#c0a06c', hair3='#957848', stubble='#dfba9b', top='#2d3a58',
                 top2='#232e47', hood='#8f9298', legs='#373c48', shoe='#2b2a2e', sole='#5a5c62', iris='#3c7fc8',
                 pupil='#16263d', frame='#98a2ad', lash='#3a2e22', brow='#8a6f45', mouth='#b9776c',
                 lanyard='#2f62b8', card='#f1f2ef', tie='#2f62b8', string='#d9d7d2'),
}


def M(col):
    return kit.mat(col, **MATTE)


class Bean:
    """The body: a 12-sided solid of revolution, ellipse rx by ry in plan. prof: [(r, z)] bottom to top."""

    def __init__(self, prof, rx, ry):
        self.prof, self.rx, self.ry = prof, rx, ry

    def r(self, z):
        p = self.prof
        for (r0, z0), (r1, z1) in zip(p, p[1:]):
            if z0 <= z <= z1:
                return r0 + (r1 - r0) * (z - z0) / max(z1 - z0, 1e-6)
        return 0.0

    def ring(self, z, grow=1.0):
        r = self.r(z) * grow
        return [(self.rx * r * math.cos(2 * math.pi * i / SEGS + math.radians(PHASE)),
                 self.ry * r * math.sin(2 * math.pi * i / SEGS + math.radians(PHASE)))
                for i in range(SEGS)]

    def at(self, x, z, out=0.0):
        """The point on the front at sideways offset x and height z, pushed out along the facet's normal, and the
        facet's yaw in degrees."""
        pts = self.ring(z)
        for i in range(SEGS):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % SEGS]
            if y0 < 0 and y1 < 0 and min(x0, x1) <= x <= max(x0, x1):
                t = (x - x0) / (x1 - x0) if x1 != x0 else 0
                y = y0 + (y1 - y0) * t
                n = Vector((y1 - y0, -(x1 - x0), 0)).normalized()
                if n.y > 0:
                    n = -n
                return Vector((x, y, z)) + n * out, math.degrees(math.atan2(n.x, -n.y))
        return Vector((x, -self.ry * self.r(z), z)), 0.0

    def band(self, name, col, coll, z0, z1, grow=1.02, cut=None):
        """A band of the bean between two heights, a little proud of it (clothes, stubble, hair)."""
        prof = [(0, z0)] + [(r * grow, z) for r, z in self.prof if z0 < z < z1]
        prof = [(0, z0), (self.r(z0) * grow, z0)] + prof[1:] + [(self.r(z1) * grow, z1), (0, z1)]
        bm = kit.lathe_bm(prof, self.rx, self.ry, segs=SEGS, phase=PHASE)
        if cut:
            for co, no in cut:
                res = kit.bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces), dist=1e-6,
                                                 plane_co=co, plane_no=Vector(no).normalized(), clear_inner=True)
                e = [g for g in res['geom_cut'] if isinstance(g, kit.bmesh.types.BMEdge)]
                kit.bmesh.ops.holes_fill(bm, edges=e, sides=0)
        return kit.to_obj(name, bm, [M(col)], None, coll)


def plate(name, col, coll, bean, x, z, w, h, out=0.003, t=0.005, tilt=0.0):
    p, yaw = bean.at(x, z, out)
    return kit.prim('box', name, col, loc=p, size=(w, t, h), rot=(0, tilt, yaw), m=M(col), coll=coll)


def clump(name, col, coll, loc, size, rot=(0, 0, 0)):
    """One faceted clump, like a tree canopy's."""
    return kit.prim('ico', name, col, loc=loc, size=size, rot=rot, sub=1, m=M(col), coll=coll)


def build(ch, coll):
    C = PAL[ch]
    E = ch == 'eric'
    s = 1.05 if E else 1.0
    parts = {b: [] for b in ('root', 'torso', 'head', 'arm.L', 'arm.R', 'leg.L', 'leg.R')}
    add = lambda b, o: parts[b].append(o) or o

    z0 = 0.15 * s  # bottom of the bean
    seam = 0.53 * s  # collar: below is the torso bone, above the head bone
    top = 0.99 * s
    prof = [(0, z0), (0.78, z0), (0.93, z0 + 0.05), (1.0, z0 + 0.15), (1.0, seam - 0.08), (0.95, seam),
            (0.97, seam + 0.06), (1.0, seam + 0.17), (0.96, seam + 0.29), (0.82, top - 0.06), (0.52, top - 0.01),
            (0, top)]
    prof = [(r, z * 1.0) for r, z in prof]
    rx, ry = 0.235 * s, 0.205 * s
    bean = Bean(prof, rx, ry)
    lower = [(0, z0)] + [p for p in prof if z0 < p[1] < seam] + [(bean.r(seam), seam), (0, seam)]
    upper = [(0, seam)] + [(bean.r(seam), seam)] + [p for p in prof if p[1] > seam]
    add('torso', kit.to_obj(f'{ch}-body', kit.lathe_bm(lower, rx, ry, segs=SEGS, phase=PHASE), [M(C['top'])], None, coll))
    add('head', kit.to_obj(f'{ch}-head', kit.lathe_bm(upper, rx, ry, segs=SEGS, phase=PHASE), [M(C['skin'])], None, coll))
    fy = lambda z: bean.at(0, z)[0].y

    # ---- clothes on the lower bean ----
    add('torso', bean.band(f'{ch}-hem', C['top2'], coll, z0 - 0.002, z0 + 0.06, grow=1.03))
    if E:
        # grey hoodie in the open blazer front, lapels, strings, the hood round the back of the collar
        a, b = bean.at(-0.06, seam - 0.01, 0.004)[0], bean.at(0.06, seam - 0.01, 0.004)[0]
        c = bean.at(0, z0 + 0.08, 0.004)[0]
        add('torso', kit.mesh(f'{ch}-hoodie', [a, b, c], [(0, 2, 1)], C['hood'], m=M(C['hood']), coll=coll))
        for sx in (1, -1):
            add('torso', kit.rod(f'{ch}-lapel{sx}', bean.at(sx * 0.075, seam - 0.01, 0.008)[0],
                                 bean.at(sx * 0.012, z0 + 0.12, 0.008)[0], 0.026, 0.01, M(C['top2']), coll,
                                 smooth=None))
            add('torso', kit.rod(f'{ch}-string{sx}', bean.at(sx * 0.022, seam - 0.03, 0.012)[0],
                                 bean.at(sx * 0.024, seam - 0.11, 0.012)[0], 0.007, 0.007, M(C['string']), coll,
                                 smooth=None))
        add('torso', toyfig.torus(f'{ch}-hood', C['hood'], coll, (0, 0.05, seam + 0.005), 0.14 * s, 0.04, arc=200,
                                  gap_at=-90, scale=(1.15, 1.0, 1), segs=12, rsegs=6))
        add('torso', kit.rod(f'{ch}-lanyard', bean.at(-0.1, seam, 0.01)[0], bean.at(-0.095, seam - 0.15, 0.012)[0],
                             0.013, 0.005, M(C['lanyard']), coll, smooth=None))
        add('torso', plate(f'{ch}-card', C['card'], coll, bean, -0.095, seam - 0.185, 0.05, 0.064, out=0.015,
                           t=0.008))
    else:
        # hood lying on her back, a kangaroo pocket, headphones over the collar with teal cups, lanyard and card
        add('torso', toyfig.torus(f'{ch}-hood', C['top2'], coll, (0, 0.06, seam), 0.13, 0.045, arc=200, gap_at=-90,
                                  scale=(1.15, 1.0, 1), segs=12, rsegs=6))
        add('torso', plate(f'{ch}-pocket', C['top2'], coll, bean, 0, z0 + 0.1, 0.19, 0.085, out=0.004, t=0.012))
        add('torso', toyfig.torus(f'{ch}-phones', C['phone'], coll, (0, 0.0, seam - 0.02), 0.205, 0.016,
                                  scale=(1.12, 0.98, 1), arc=200, gap_at=-90, segs=12, rsegs=6))
        for sx in (1, -1):
            p, yaw = bean.at(sx * 0.12, seam - 0.035, 0.02)
            add('torso', kit.prim('cyl', f'{ch}-cup{sx}', C['phone'], loc=p, size=(0.08, 0.08, 0.04),
                                  rot=(90, 0, yaw), segs=8, m=M(C['phone']), coll=coll))
            p2 = bean.at(sx * 0.12, seam - 0.035, 0.042)[0]
            add('torso', kit.prim('cyl', f'{ch}-cupface{sx}', C['teal'], loc=p2, size=(0.056, 0.056, 0.008),
                                  rot=(90, 0, yaw), segs=8, m=M(C['teal']), coll=coll))
            add('torso', kit.rod(f'{ch}-lanyard{sx}', bean.at(sx * 0.05, seam - 0.04, 0.008)[0],
                                 bean.at(sx * 0.01, seam - 0.16, 0.008)[0], 0.012, 0.005, M(C['lanyard']), coll,
                                 smooth=None))
        add('torso', plate(f'{ch}-card', C['card'], coll, bean, 0, seam - 0.19, 0.046, 0.06, out=0.012, t=0.008))

    # ---- floating hands with a cuff, floating shoes with a trouser hem ----
    shz = seam - 0.05
    hx = rx + 0.04
    hz = z0 + 0.13
    for sx, b in ((1, 'arm.L'), (-1, 'arm.R')):
        add(b, kit.prim('cyl', f'{ch}-{b}-cuff', C['hood'] if E else C['top'], loc=(sx * hx, 0, hz + 0.07),
                        size=(0.09, 0.09, 0.05), segs=8, bevel=0.01, bevel_segs=1, m=M(C['hood'] if E else C['top']),
                        coll=coll))
        add(b, clump(f'{ch}-{b}-hand', C['skin'], coll, (sx * hx, 0, hz), (0.1, 0.09, 0.11)))
    lx = 0.095 * s
    for sx, b in ((1, 'leg.L'), (-1, 'leg.R')):
        x = sx * lx
        add(b, kit.prim('cyl', f'{ch}-{b}-hem', C['legs'], loc=(x, 0.0, 0.105), size=(0.1, 0.1, 0.045), segs=8,
                        bevel=0.008, bevel_segs=1, m=M(C['legs']), coll=coll))
        add(b, kit.cbox(f'{ch}-{b}-shoe', M(C['shoe']), (x - 0.055, -0.1, 0.018), (x + 0.055, 0.06, 0.085), 0.02,
                        coll=coll))
        add(b, kit.cbox(f'{ch}-{b}-sole', M(C['sole']), (x - 0.057, -0.102, 0.0), (x + 0.057, 0.062, 0.022), 0.006,
                        coll=coll))

    # ---- face on the front facets ----
    ez = seam + (0.17 if E else 0.155) * s
    ex = 0.082 * s
    for sx in (1, -1):
        x = sx * ex
        add('head', plate(f'{ch}-iris{sx}', C['iris'], coll, bean, x, ez - 0.004, 0.044, 0.056))
        add('head', plate(f'{ch}-pupil{sx}', C['pupil'], coll, bean, x + sx * 0.003, ez - 0.008, 0.024, 0.034,
                          out=0.006))
        add('head', plate(f'{ch}-hl{sx}', '#fbfbfb', coll, bean, x - 0.01, ez + 0.01, 0.012, 0.012, out=0.009))
        add('head', plate(f'{ch}-lash{sx}', C['lash'], coll, bean, x + sx * 0.003, ez + 0.03, 0.058, 0.012,
                          out=0.006, tilt=-sx * 7))
        if E:
            add('head', plate(f'{ch}-brow{sx}', C['brow'], coll, bean, x, ez + 0.072, 0.054, 0.012, out=0.005,
                              tilt=sx * 4))
        # glasses: four bars on the facet under the eye, a temple back along the side
        p, yaw = bean.at(x, ez, 0.034)
        p.x = x
        gw, gh, bar = 0.104 * s, 0.082 * s, 0.012
        rm = Matrix.Translation(p) @ Matrix.Rotation(math.radians(yaw), 4, 'Z')
        for (dx, dz, w, h) in ((0, gh / 2, gw + bar, bar), (0, -gh / 2, gw + bar, bar), (gw / 2, 0, bar, gh),
                               (-gw / 2, 0, bar, gh)):
            o = kit.prim('box', f'{ch}-frame{sx}', C['frame'], loc=(dx, 0, dz), size=(w, 0.01, h), m=M(C['frame']),
                         coll=coll)
            o.data.transform(rm)
            add('head', o)
        corner = rm @ Vector((sx * gw / 2, 0, gh / 2 - 0.01))
        add('head', kit.rod(f'{ch}-temple{sx}', corner, (sx * rx * bean.r(ez) * 1.02, 0.0, ez + gh / 2 - 0.012),
                            0.009, 0.009, M(C['frame']), coll, smooth=None))
    a = bean.at(-0.03, ez + 0.012, 0.034)[0]
    b = bean.at(0.03, ez + 0.012, 0.034)[0]
    add('head', kit.rod(f'{ch}-bridge', a, b, 0.009, 0.009, M(C['frame']), coll, smooth=None))
    mz = seam + 0.075 * s
    if E:
        add('head', bean.band(f'{ch}-stubble', C['stubble'], coll, seam, seam + 0.1 * s, grow=1.008,
                              cut=[((0, 0.03, 0), (0, -1, 0))]))
        add('head', plate(f'{ch}-mouth', C['mouth'], coll, bean, 0.004, mz, 0.048, 0.011, out=0.006, tilt=-5))
        hair_eric(add, C, coll, bean, seam, top, ez, rx, ry, s)
        htop = top + 0.08
    else:
        add('head', plate(f'{ch}-mouth', C['mouth'], coll, bean, 0, mz, 0.026, 0.009))
        hair_mio(add, C, coll, bean, seam, top, ez, rx, ry)
        htop = top + 0.15

    bones = [('root', (0, 0, 0), (0, 0, z0), None),
             ('torso', (0, 0, z0), (0, 0, seam), 'root'),
             ('head', (0, 0, seam), (0, 0, htop), 'torso'),
             ('arm.L', (rx - 0.03, 0, shz), (hx, 0, hz), 'torso'),
             ('arm.R', (-rx + 0.03, 0, shz), (-hx, 0, hz), 'torso'),
             ('leg.L', (lx, 0, z0 + 0.04), (lx, 0, 0), 'root'),
             ('leg.R', (-lx, 0, z0 + 0.04), (-lx, 0, 0), 'root')]
    arm = kit.rig(ch + '-rig', bones, coll)
    objs = []
    for b, os_ in parts.items():
        for o in os_:
            kit.attach(o, arm, b)
            objs.append(o)
    HEAD[ch] = (0, 0, ez + 0.02)
    return arm, objs


def hair_mio(add, C, coll, bean, seam, top, ez, rx, ry):
    """Clumps heaped over the top and back, open at the face; teal clumps under them at the nape and on her left
    (image right); a fringe of clumps lower on her right (image left); the long strand on her right; a bun high at
    the back on her left."""
    H, H2, T = C['hair'], C['hair2'], C['teal']
    # a cap band over the top of the bean, cut open at the face
    add('head', bean.band('mio-cap', H, coll, ez + 0.035, top + 0.001, grow=1.06,
                          cut=[((0, 0, 0), (0, 0, 1))]))
    add('head', bean.band('mio-back', H, coll, seam + 0.07, ez + 0.08, grow=1.06,
                          cut=[((0, -0.02, 0), (0, 1, 0))]))
    add('head', bean.band('mio-nape', T, coll, seam + 0.01, seam + 0.09, grow=1.05,
                          cut=[((0, 0.0, 0), (0, 1, 0))]))
    # fringe: clumps along the brow, lower toward her right (image left)
    for n, (x, dz) in enumerate(((-0.17, -0.05), (-0.1, -0.02), (-0.03, 0.0), (0.04, 0.015), (0.11, 0.025),
                                 (0.17, 0.03))):
        p = bean.at(x * 0.95, ez + 0.075 + dz, 0.02)[0]
        add('head', clump(f'mio-fringe{n}', H2 if n % 3 == 1 else H, coll, p, (0.085, 0.06, 0.1),
                          rot=(0, 0, n * 17)))
    # sides: her right (image left) a hanging strand of clumps past the chin; her left tucked back, teal under it
    for n, z in enumerate((ez + 0.02, ez - 0.06, ez - 0.14, seam - 0.06)):
        add('head', clump(f'mio-strand{n}', H if n < 3 else T, coll, (-rx * 1.0, -0.07, z), (0.075, 0.07, 0.1),
                          rot=(0, n * 20, 0)))
    for n, (y, z) in enumerate(((0.02, ez + 0.03), (0.06, ez - 0.05), (0.08, seam + 0.04))):
        add('head', clump(f'mio-leftside{n}', H if n == 0 else T, coll, (rx * 0.98, y, z), (0.07, 0.11, 0.1),
                          rot=(n * 15, 0, 0)))
    for n, x in enumerate((-0.14, -0.05, 0.05, 0.14)):
        add('head', clump(f'mio-crown{n}', H2 if n % 2 else H, coll, (x, 0.02 + 0.04 * (n % 2), top - 0.03),
                          (0.15, 0.17, 0.09), rot=(0, 0, n * 23)))
    # bun with teal under it
    add('head', clump('mio-bun-under', T, coll, (0.08, 0.1, top + 0.02), (0.1, 0.1, 0.07)))
    add('head', clump('mio-bun', H, coll, (0.085, 0.11, top + 0.08), (0.14, 0.13, 0.12), rot=(10, 20, 30)))


def hair_eric(add, C, coll, bean, seam, top, ez, rx, ry, s):
    """Combed back: three rows of long clumps from a high hairline running back over the crown, short at the sides,
    a short ponytail with a blue tie."""
    H, H2, H3 = C['hair'], C['hair2'], C['hair3']
    add('head', bean.band('eric-cap', H, coll, ez + 0.08, top + 0.001, grow=1.04, cut=[((0, 0, 0), (0, 0, 1))]))
    add('head', bean.band('eric-back', H, coll, seam + 0.08, ez + 0.1, grow=1.045, cut=[((0, -0.03, 0), (0, 1, 0))]))
    for row, (yf, z, n) in enumerate(((-ry * 0.82, ez + 0.11, 5), (-ry * 0.45, top - 0.035, 4), (-ry * 0.05,
                                                                                                top - 0.0, 3))):
        for k in range(n):
            x = (k - (n - 1) / 2) * 0.085 * s
            col = (H2, H, H3)[(k + row) % 3]
            add('head', clump(f'eric-row{row}-{k}', col, coll, (x, yf + 0.11, z + 0.012), (0.12, 0.28, 0.075),
                              rot=(12 - row * 10, 0, x * 40)))
    for sx in (1, -1):
        add('head', clump(f'eric-side{sx}', H3, coll, (sx * rx * 0.97, 0.06, ez + 0.02), (0.06, 0.16, 0.12)))
    pz = ez - 0.02
    add('head', kit.prim('cyl', 'eric-tie', C['tie'], loc=(0, ry * 1.04, pz), size=(0.055, 0.055, 0.03),
                         rot=(70, 0, 0), segs=8, m=M(C['tie']), coll=coll))
    add('head', clump('eric-tail', H, coll, (0, ry * 1.18, pz - 0.05), (0.065, 0.06, 0.13), rot=(-25, 0, 0)))


HEAD = {}
HEAD_SPAN = 0.55
MOTION = dict(swing=32, arm_swing=30, arm_out=2)
