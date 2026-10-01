# claude-ink: an anime toon figure with an ink outline, after the approved ink-line portraits. Smooth, simple forms in
# flat matte colours, a chibi body about three and a half heads tall, anime eyes drawn on the face, hair as pointed
# clumps, and a dark outline round every part (an inverted hull: a copy pushed out along the normals with its faces
# flipped and back faces culled, so the game draws it with no shader of its own). The world's outline pass already
# draws thin lines; this makes the people's lines heavier than the props'.
# Space as in kit.py. Rig: the 7 bones plus a knee in each leg.
import math

from mathutils import Vector

import kit
import toyfig

MATTE = dict(rough=0.75, spec=0.25)
INK = 0.011  # outline width in metres at a 1.1 m figure (about a pixel and a half at the game camera)

PAL = {
    'mio': dict(skin='#f6e0d0', hair='#13292f', teal='#20a081', top='#0b2a30', top2='#0f363d', legs='#3b4152',
                shoe='#ece9e2', sole='#3d4658', iris='#c49a5a', pupil='#3a2616', frame='#6d737a', lash='#1b1c22',
                mouth='#c3837a', phone='#24282f', card='#f1f2ef', lanyard='#20a081', blush='#f0b8a8'),
    'eric': dict(skin='#f7e1d3', hair='#ad8d5c', hair2='#c3a26e', top='#2d3a58', top2='#25304a', hood='#8f9298',
                 legs='#373c48', shoe='#2b2a2e', sole='#55575d', iris='#3c7fc8', pupil='#16263d', frame='#8f99a4',
                 lash='#2a2420', brow='#7d6440', mouth='#a8675e', stubble='#e0bea2', lanyard='#2f62b8',
                 card='#f1f2ef', tie='#2f62b8', string='#e4e2dc'),
}

_ink = []  # every outline object, so prepare_render can swap their material


def M(col):
    return kit.mat(col, **MATTE)


def smooth_obj(name, bm, col, coll):
    return kit.to_obj(name, bm, [M(col)], 50, coll)


def lathe(name, col, coll, profile, rx, ry=None, cx=0.0, cy=0.0, segs=20, phase=0.0):
    return smooth_obj(name, kit.lathe_bm(profile, rx, ry or rx, cx=cx, cy=cy, segs=segs, phase=phase), col, coll)


def spike(name, col, coll, a, b, w, d, tip=0.12, segs=10, twist=0.0, bulge=1.15):
    """A pointed clump from a (w wide, d deep) to a point at b: anime hair. twist turns the flat side (degrees)."""
    a, b = Vector(a), Vector(b)
    L = (b - a).length
    prof = [(0, 0), (0.85, 0), (bulge, L * 0.3), (0.8, L * 0.65), (tip, L * 0.97), (0, L)]
    bm = kit.lathe_bm(prof, w / 2, d / 2, segs=segs)
    bm.transform(kit.Matrix.Rotation(math.radians(twist), 4, 'Z'))
    q = Vector((0, 0, 1)).rotation_difference(b - a)
    bm.transform(kit.Matrix.Translation(a) @ q.to_matrix().to_4x4())
    return smooth_obj(name, bm, col, coll)


def limb(name, col, coll, a, b, r0, r1, segs=14):
    a, b = Vector(a), Vector(b)
    L = (b - a).length
    prof = [(0, -r0 * 0.6), (0.7, -r0 * 0.5), (1, 0), (r1 / r0, L), (r1 / r0 * 0.7, L + r1 * 0.5), (0, L + r1 * 0.6)]
    bm = kit.lathe_bm(prof, r0, r0, segs=segs)
    q = Vector((0, 0, 1)).rotation_difference(b - a)
    bm.transform(kit.Matrix.Translation(a) @ q.to_matrix().to_4x4())
    return smooth_obj(name, bm, col, coll)


def blob(name, col, coll, loc, size, sub=2, rot=(0, 0, 0)):
    return kit.prim('ico', name, col, loc=loc, size=size, rot=rot, sub=sub, m=M(col), smooth=70, coll=coll)


class Face:
    """The head: a lathe with a narrow chin. at(x, z) gives the point on its front and the yaw of the surface."""

    def __init__(self, h0, HH, rx, ry):
        self.h0, self.HH, self.rx, self.ry = h0, HH, rx, ry
        self.prof = [(0, 0), (0.3, 0.015), (0.62, 0.09), (0.88, 0.22), (0.99, 0.42), (1.0, 0.6), (0.95, 0.78),
                     (0.78, 0.92), (0.45, 0.99), (0, 1.0)]

    def r(self, z):
        t = (z - self.h0) / self.HH
        p = self.prof
        for (r0, z0), (r1, z1) in zip(p, p[1:]):
            if z0 <= t <= z1:
                return r0 + (r1 - r0) * (t - z0) / max(z1 - z0, 1e-6)
        return 0.0

    def at(self, x, z, out=0.0):
        r = self.r(z)
        c = max(-1.0, min(1.0, x / (self.rx * r)))
        th = math.acos(c)
        y = -self.ry * r * math.sin(th)
        # normal of the ellipse (x/rx)^2 + (y/ry)^2 = r^2
        n = Vector((x / self.rx ** 2, y / self.ry ** 2, 0)).normalized()
        p = Vector((x, y, z)) + n * out
        return p, math.degrees(math.atan2(n.x, -n.y))


def decal(name, col, coll, face, x, z, w, h, out=0.003, kind='box', t=0.004, tilt=0.0):
    p, yaw = face.at(x, z, out)
    if kind == 'oval':
        return kit.prim('cyl', name, col, loc=p, size=(w, h, t), rot=(90, tilt, yaw), segs=20, m=M(col), smooth=60,
                        coll=coll)
    return kit.prim('box', name, col, loc=p, size=(w, t, h), rot=(0, tilt, yaw), m=M(col), coll=coll)


def build(ch, coll):
    C = PAL[ch]
    E = ch == 'eric'
    s = 1.05 if E else 1.0
    parts = {b: [] for b in ('root', 'torso', 'head', 'arm.L', 'arm.R', 'leg.L', 'leg.R', 'shin.L', 'shin.R')}
    inked = []

    def add(b, o, ink=True):
        parts[b].append(o)
        if ink:
            inked.append((b, o))
        return o

    hip = 0.37 * s
    knee = hip * 0.5
    lx = 0.062
    for sx, L in ((1, 'L'), (-1, 'R')):
        x = sx * lx
        add('leg.' + L, limb(f'{ch}-thigh{L}', C['legs'], coll, (x, 0, hip), (x, 0, knee), 0.05, 0.043))
        add('shin.' + L, limb(f'{ch}-shin{L}', C['legs'], coll, (x, 0, knee), (x, 0, 0.07), 0.043, 0.037))
        add('shin.' + L, blob(f'{ch}-shoe{L}', C['shoe'], coll, (x, -0.025, 0.045), (0.1, 0.17, 0.085)))
        add('shin.' + L, kit.prim('cyl', f'{ch}-sole{L}', C['sole'], loc=(x, -0.025, 0.01), size=(0.1, 0.172, 0.02),
                                  segs=20, m=M(C['sole']), smooth=60, coll=coll))

    neck = 0.69 * s
    if E:
        body = [(0, hip - 0.04), (0.8, hip - 0.04), (0.84, hip + 0.06), (0.88, 0.55 * s), (1.0, neck - 0.07),
                (0.85, neck - 0.01), (0.35, neck), (0, neck)]
        add('torso', lathe(f'{ch}-blazer', C['top'], coll, body, 0.19 * s, 0.125, segs=20))
        fy = -0.125 * 0.86
        add('torso', kit.mesh(f'{ch}-hoodie', [(-0.065, fy - 0.004, neck - 0.02), (0.065, fy - 0.004, neck - 0.02),
                                              (0.0, fy + 0.0, hip + 0.02), (0, fy - 0.025, neck - 0.1)],
                              [(0, 1, 3), (1, 2, 3), (2, 0, 3)], C['hood'], m=M(C['hood']), coll=coll), ink=False)
        add('torso', toyfig.torus(f'{ch}-hood', C['hood'], coll, (0, 0.03, neck - 0.005), 0.085, 0.034, arc=250,
                                  gap_at=-90, scale=(1.15, 1.0, 1)))
        for sx in (1, -1):
            add('torso', kit.rod(f'{ch}-string{sx}', (sx * 0.02, fy - 0.022, neck - 0.04), (sx * 0.022, fy - 0.014,
                                 neck - 0.13), 0.007, 0.007, M(C['string']), coll), ink=False)
        add('torso', kit.rod(f'{ch}-lanyard', (-0.085, fy - 0.006, neck - 0.01), (-0.075, fy - 0.03, neck - 0.17),
                             0.013, 0.004, M(C['lanyard']), coll), ink=False)
        add('torso', kit.prim('box', f'{ch}-card', C['card'], loc=(-0.075, fy - 0.035, neck - 0.2),
                              size=(0.048, 0.008, 0.064), bevel=0.004, m=M(C['card']), coll=coll))
    else:
        body = [(0, hip - 0.07), (1.0, hip - 0.07), (1.0, hip - 0.02), (0.9, 0.5), (0.78, neck - 0.07),
                (0.6, neck - 0.01), (0.3, neck), (0, neck)]
        add('torso', lathe(f'{ch}-hoodie', C['top'], coll, body, 0.19, 0.14, segs=20))
        fy = -0.14 * 0.93
        add('torso', toyfig.torus(f'{ch}-hood', C['top2'], coll, (0, 0.04, neck - 0.01), 0.085, 0.034, arc=230,
                                  gap_at=-90, scale=(1.15, 1.0, 1)))
        add('torso', toyfig.torus(f'{ch}-phones', C['phone'], coll, (0, -0.005, neck + 0.005), 0.085, 0.012,
                                  rot=(-14, 0, 0)))
        for sx in (1, -1):
            cup = kit.prim('cyl', f'{ch}-cup{sx}', C['phone'], loc=(sx * 0.08, -0.085, neck - 0.025),
                           size=(0.068, 0.068, 0.034), rot=(76, 0, sx * 25), segs=20, m=M(C['phone']), smooth=50,
                           coll=coll)
            add('torso', cup)
            add('torso', kit.prim('cyl', f'{ch}-cupface{sx}', C['teal'], loc=(sx * 0.076, -0.103, neck - 0.03),
                                  size=(0.046, 0.046, 0.01), rot=(76, 0, sx * 25), segs=20, m=M(C['teal']),
                                  smooth=50, coll=coll), ink=False)
            add('torso', kit.rod(f'{ch}-lanyard{sx}', (sx * 0.04, fy - 0.004, neck - 0.05), (sx * 0.008, fy - 0.02,
                                 neck - 0.17), 0.011, 0.004, M(C['lanyard']), coll), ink=False)
        add('torso', kit.prim('box', f'{ch}-card', C['card'], loc=(0, fy - 0.026, neck - 0.2), size=(0.044, 0.008, 0.058),
                              bevel=0.004, m=M(C['card']), coll=coll))
        add('torso', kit.prim('box', f'{ch}-pocket', C['top2'], loc=(0, fy - 0.006, hip + 0.06),
                              size=(0.17, 0.01, 0.075), bevel=0.01, m=M(C['top2']), coll=coll), ink=False)

    shz = neck - 0.04
    sw = 0.165 * s if E else 0.145
    hand_z = hip + 0.04
    for sx, b in ((1, 'arm.L'), (-1, 'arm.R')):
        sh = Vector((sx * sw, 0, shz))
        hand = Vector((sx * (sw + 0.03), -0.005, hand_z))
        add(b, limb(f'{ch}-{b}-sleeve', C['top'], coll, sh, hand, 0.045, 0.04))
        add(b, limb(f'{ch}-{b}-cuff', C['hood'] if E else C['top2'], coll, hand + (sh - hand) * 0.12, hand, 0.042,
                    0.041))
        add(b, blob(f'{ch}-{b}-hand', C['skin'], coll, hand - (sh - hand).normalized() * 0.035, (0.055, 0.05, 0.065)))

    # head
    h0 = neck + 0.005
    HH = 0.355 * s
    rx, ry = 0.185 * s, 0.17 * s
    f = Face(h0, HH, rx, ry)
    add('torso', limb(f'{ch}-neck', C['skin'], coll, (0, 0, neck - 0.03), (0, 0, h0 + 0.05), 0.035, 0.035), ink=False)
    add('head', lathe(f'{ch}-head', C['skin'], coll, [(r, h0 + z * HH) for r, z in f.prof], rx, ry, segs=24))
    ez = h0 + 0.4 * HH
    ex = 0.07 * s
    for sx in (1, -1):
        x = sx * ex
        add('head', decal(f'{ch}-iris{sx}', C['iris'], coll, f, x, ez, 0.046, 0.06, kind='oval'), ink=False)
        add('head', decal(f'{ch}-pupil{sx}', C['pupil'], coll, f, x, ez + 0.006, 0.028, 0.04, out=0.0055,
                          kind='oval'), ink=False)
        add('head', decal(f'{ch}-hl{sx}', '#ffffff', coll, f, x - 0.012, ez + 0.016, 0.014, 0.014, out=0.008,
                          kind='oval'), ink=False)
        add('head', decal(f'{ch}-lash{sx}', C['lash'], coll, f, x + sx * 0.004, ez + 0.032, 0.062, 0.011, out=0.006,
                          tilt=-sx * 8), ink=False)
        if E:
            add('head', decal(f'{ch}-brow{sx}', C['brow'], coll, f, x, ez + 0.075, 0.054, 0.011, out=0.004,
                              tilt=sx * 4), ink=False)
        # glasses: four bars on a plane just off the face, turned with it; a temple back to the ear
        p, yaw = f.at(x, ez, 0.022)
        gw, gh, bar = 0.1 * s, 0.076 * s, 0.01
        rotm = kit.Matrix.Translation(p) @ kit.Matrix.Rotation(math.radians(yaw), 4, 'Z')
        for (dx, dz, w, h) in ((0, gh / 2, gw + bar, bar), (0, -gh / 2, gw + bar, bar), (gw / 2, 0, bar, gh),
                               (-gw / 2, 0, bar, gh)):
            o = kit.prim('box', f'{ch}-frame{sx}', C['frame'], loc=(dx, 0, dz), size=(w, 0.008, h), m=M(C['frame']),
                         coll=coll)
            o.data.transform(rotm)
            add('head', o, ink=False)
        corner = rotm @ Vector((sx * gw / 2, 0, gh / 2 - 0.008))
        add('head', kit.rod(f'{ch}-temple{sx}', corner, (sx * rx * 1.0, 0.0, ez + gh / 2 - 0.01), 0.008, 0.008,
                            M(C['frame']), coll), ink=False)
    a = f.at(-0.024, ez + 0.012, 0.022)[0]
    b = f.at(0.024, ez + 0.012, 0.022)[0]
    add('head', kit.rod(f'{ch}-bridge', a, b, 0.008, 0.008, M(C['frame']), coll), ink=False)
    mz = h0 + 0.17 * HH
    if E:
        add('head', decal(f'{ch}-mouth', C['mouth'], coll, f, 0.006, mz, 0.04, 0.009, tilt=-6), ink=False)
        add('head', kit.cap(f'{ch}-stubble', M(C['stubble']), coll, rx * 1.012, ry * 1.02, 0, 0, 0,
                            (0, 0, h0 + 0.3 * HH), (0, 0.35, -1),
                            profile=[(r, h0 + z * HH - 0.001) for r, z in f.prof], segs=24, smooth=50), ink=False)
        hair_eric(add, C, coll, f, h0, HH, rx, ry)
        top = h0 + HH * 1.15
    else:
        add('head', decal(f'{ch}-mouth', C['mouth'], coll, f, 0, mz, 0.024, 0.008), ink=False)
        for sx in (1, -1):
            add('head', decal(f'{ch}-blush{sx}', C['blush'], coll, f, sx * 0.105, ez - 0.05, 0.034, 0.014,
                              kind='oval', out=0.002), ink=False)
        hair_mio(add, C, coll, f, h0, HH, rx, ry)
        top = h0 + HH * 1.3

    bones = [('root', (0, 0, 0), (0, 0, hip), None),
             ('torso', (0, 0, hip), (0, 0, neck), 'root'),
             ('head', (0, 0, neck), (0, 0, top), 'torso')]
    for sx, L in ((1, 'L'), (-1, 'R')):
        bones += [('arm.' + L, (sx * sw, 0, shz), (sx * (sw + 0.03), -0.005, hand_z), 'torso'),
                  ('leg.' + L, (sx * lx, 0, hip), (sx * lx, 0, knee), 'root'),
                  ('shin.' + L, (sx * lx, 0, knee), (sx * lx, 0, 0.0), 'leg.' + L)]
    arm = kit.rig(ch + '-rig', bones, coll)
    hm = kit.hull_mat()
    for b, o in inked:
        h = kit.hull(o, INK * (0.75 if o.dimensions.length < 0.12 else 1.0), hm, coll)
        parts[b].append(h)
        _ink.append(h)
    objs = []
    for b, os_ in parts.items():
        for o in os_:
            kit.attach(o, arm, b)
            objs.append(o)
    HEAD[ch] = (0, 0, h0 + 0.5 * HH)
    return arm, objs


def hair_mio(add, C, coll, f, h0, HH, rx, ry):
    """A shell over the skull open at the face, the teal layer under it at the nape and her left (image right),
    pointed bangs sweeping toward her right (image left), the long strand on her right, a bun high at the back on
    her left with a few spikes."""
    hp = [(0, h0 + 0.12 * HH), (1, h0 + 0.12 * HH), (1.08, h0 + 0.5 * HH), (1.07, h0 + 0.78 * HH),
          (0.84, h0 + 1.02 * HH), (0.42, h0 + 1.1 * HH), (0, h0 + 1.11 * HH)]
    add('head', kit.cap('mio-hair', M(C['hair']), coll, rx * 1.03, ry * 1.06, 0, 0, 0, (0, -0.06, h0 + 0.5 * HH),
                        (0, 1, 0.15), profile=hp, segs=24, cy=0.008, smooth=50,
                        more=[((0, 0, h0 + 0.36 * HH), (-0.7, -0.5, 1))]))
    add('head', kit.cap('mio-hair-under', M(C['teal']), coll, rx * 1.0, ry * 1.03, 0, 0, 0, (0, -0.05, h0 + 0.5 * HH),
                        (0, 1, 0.15), profile=[(x, z - 0.012) for x, z in hp], segs=24, cy=0.01, smooth=50))
    # bangs: clumps from the crown's front edge down over the forehead, longer toward her right (image left)
    top_z = h0 + 1.0 * HH
    for x0, x1, zt, w in ((0.13, 0.11, 0.7, 0.07), (0.07, 0.05, 0.64, 0.075), (0.0, -0.025, 0.58, 0.08),
                          (-0.07, -0.1, 0.5, 0.08), (-0.13, -0.17, 0.42, 0.075)):
        a = Vector((x0 * 0.9, -ry * 0.45, h0 + 1.06 * HH))  # under the shell on top of the head
        b = f.at(x1, h0 + zt * HH, 0.03)[0]
        add('head', spike(f'mio-bang{x0}', C['hair'], coll, a, b, w * 1.45, 0.06, bulge=1.25))
    # the long strand on her right (image left) past the chin, and a teal one behind it
    a = f.at(-0.15, h0 + 0.82 * HH, 0.02)[0]
    add('head', spike('mio-strand', C['hair'], coll, a, (-0.2, -0.07, h0 - 0.1), 0.075, 0.04))
    add('head', spike('mio-strand-teal', C['teal'], coll, (-0.17, -0.02, h0 + 0.6 * HH), (-0.2, 0.0, h0 - 0.02), 0.06,
                      0.03))
    # back: clumps pointing down at the nape, teal among them
    for n, x in enumerate((-0.12, -0.04, 0.04, 0.12)):
        add('head', spike(f'mio-nape{n}', C['teal'] if n % 2 else C['hair'], coll, (x, ry * 0.8, h0 + 0.55 * HH),
                          (x * 1.2, ry * 1.0, h0 + 0.02), 0.09, 0.05))
    # bun on her left (image right), high at the back, with three short spikes
    bc = (0.07, 0.11, h0 + 1.05 * HH)
    add('head', blob('mio-bun', C['hair'], coll, bc, (0.13, 0.12, 0.115)))
    add('head', blob('mio-bun-under', C['teal'], coll, (0.065, 0.12, h0 + 0.95 * HH), (0.085, 0.085, 0.06)))
    for n, d in enumerate(((0.06, 0.04, 0.06), (-0.02, 0.07, 0.07), (0.07, 0.0, -0.01))):
        add('head', spike(f'mio-bunspike{n}', C['hair'], coll, bc, Vector(bc) + Vector(d) * 1.4, 0.05, 0.035))


def hair_eric(add, C, coll, f, h0, HH, rx, ry):
    """Dark blond, combed back from a high hairline in clumps that point backward, short at the sides, a short
    ponytail with a blue tie."""
    hp = [(0, h0 + 0.28 * HH), (1, h0 + 0.28 * HH), (1.05, h0 + 0.6 * HH), (1.04, h0 + 0.82 * HH),
          (0.82, h0 + 1.04 * HH), (0.4, h0 + 1.1 * HH), (0, h0 + 1.11 * HH)]
    add('head', kit.cap('eric-hair', M(C['hair']), coll, rx * 1.03, ry * 1.06, 0, 0, 0, (0, -ry, h0 + 0.84 * HH),
                        (0, 0.9, 1), profile=hp, segs=24, cy=0.006, smooth=50))
    # combed back: clumps meet over the crown; one set points forward to a pointed hairline, one runs back
    for n, x in enumerate((-0.11, -0.055, 0.0, 0.055, 0.11)):
        m = Vector((x * 0.9, -ry * 0.15, h0 + 1.17 * HH - abs(x) * 0.3))
        col = C['hair2'] if n % 2 else C['hair']
        add('head', spike(f'eric-front{n}', col, coll, m, f.at(x * 1.05, h0 + 0.86 * HH, 0.035)[0], 0.095, 0.055,
                          bulge=1.2))
        add('head', spike(f'eric-back{n}', C['hair'] if n % 2 else C['hair2'], coll, m,
                          (x * 1.2, ry * 1.12, h0 + 0.72 * HH), 0.1, 0.06, bulge=1.2))
    pz = h0 + 0.55 * HH
    add('head', kit.prim('cyl', 'eric-tie', C['tie'], loc=(0, ry * 1.05, pz), size=(0.05, 0.05, 0.03),
                         rot=(70, 0, 0), segs=16, m=M(C['tie']), smooth=50, coll=coll))
    add('head', spike('eric-tail', C['hair'], coll, (0, ry * 1.08, pz), (0, ry * 1.35, pz - 0.12), 0.06, 0.05))


def prepare_render():
    m = _ink[0].data.materials[0]
    kit.hull_render_mat(m, _ink)


HEAD = {}
HEAD_SPAN = 0.42
MOTION = dict(swing=26, arm_swing=20, arm_out=3, knees=('shin.L', 'shin.R'))
