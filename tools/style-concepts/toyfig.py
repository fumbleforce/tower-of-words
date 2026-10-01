# claude-toyfig: a toy figure built from clean primitives, in the proportions of a minifig or a Playmobil piece:
# cylinder head with a printed-style face, trapezoid torso, legs that swing from one hip pin, C-clip hands,
# clip-on hair pieces, glossy plastic. Same 7-bone rig as the voxel concept (rigid parts).
import math

import bmesh
from mathutils import Matrix, Vector

import kit

PLASTIC = dict(rough=0.32, coat=0.35, spec=0.5)

PAL = {
    'mio': dict(skin='#f4dccb', hair='#13292f', teal='#20a081', top='#0b2a30', top2='#0f343b', legs='#3b4152',
                shoe='#ece9e2', sole='#3d4658', iris='#b98f52', frame='#80868d', dark='#1d1b1e', mouth='#c3837a',
                phone='#24282f', card='#f1f2ef', lanyard='#20a081'),
    'eric': dict(skin='#f6ddcf', hair='#ad8d5c', hair2='#c3a26e', top='#2d3a58', top2='#25304a', hood='#8f9298',
                 legs='#373c48', shoe='#2b2a2e', sole='#55575d', iris='#3c7fc8', frame='#a4acb6', dark='#2a2420',
                 brow='#8a6f45', mouth='#a8675e', stubble='#e2bea0', lanyard='#2f62b8', card='#f1f2ef',
                 tie='#2f62b8', string='#e4e2dc'),
}


def M(col, **kw):
    a = dict(PLASTIC)
    a.update(kw)
    return kit.mat(col, **a)


def P(kind, name, col, coll, smooth=40, **kw):
    return kit.prim(kind, name, col, m=M(col), smooth=smooth, coll=coll, **kw)


def rod(name, a, b, w, d, col, coll, bevel=0.0):
    """A box from point a to point b, w wide (local x) and d deep."""
    return kit.rod(name, a, b, w, d, M(col), coll, bevel)


def cap(name, col, coll, rx, ry, z_bot, z_mid, rz, co, no, cy=0.0):
    return kit.cap(name, M(col), coll, rx, ry, z_bot, z_mid, rz, co, no, cy=cy, smooth=50)


def trapezoid(name, col, coll, z0, z1, wb, wt, db, dt, bevel=0.025, y=0.0):
    vs = []
    for z, w, d in ((z0, wb, db), (z1, wt, dt)):
        vs += [(-w / 2, y - d / 2, z), (w / 2, y - d / 2, z), (w / 2, y + d / 2, z), (-w / 2, y + d / 2, z)]
    bm = bmesh.new()
    v = [bm.verts.new(p) for p in vs]
    for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
        bm.faces.new([v[i] for i in f])
    bm.normal_update()
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=3, profile=0.5, affect='EDGES', clamp_overlap=True)
    return kit.to_obj(name, bm, [M(col)], 40, coll)


def torus(name, col, coll, center, R, r, rot=(0, 0, 0), arc=360, gap_at=0, segs=40, rsegs=12, scale=(1, 1, 1)):
    """A torus in the XY plane, or an arc of one (arc degrees, centred opposite gap_at degrees)."""
    bm = bmesh.new()
    n = segs if arc >= 360 else segs + 1
    rings = []
    for i in range(n):
        a = math.radians(gap_at + 180 - arc / 2 + arc * i / segs) if arc < 360 else 2 * math.pi * i / segs
        ring = []
        for k in range(rsegs):
            b = 2 * math.pi * k / rsegs
            rr = R + r * math.cos(b)
            ring.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), r * math.sin(b))))
        rings.append(ring)
    for i in range(n if arc >= 360 else n - 1):
        A, B = rings[i], rings[(i + 1) % n]
        for k in range(rsegs):
            bm.faces.new([A[k], B[k], B[(k + 1) % rsegs], A[(k + 1) % rsegs]])
    if arc < 360:
        for ring in (rings[0], rings[-1]):
            bm.faces.new(ring)
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.transform(kit.xform(center, rot, scale))
    return kit.to_obj(name, bm, [M(col)], 60, coll)


def on_head(x, z, R, out=0.0):
    """A point on the head cylinder's front at height z and sideways offset x, plus its yaw (degrees)."""
    y = -math.sqrt(max(R * R - x * x, 0)) - out
    return (x, y, z), math.degrees(math.atan2(x, -y))


def disc(name, col, coll, x, z, R, w, h, out=0.0, t=0.008):
    (px, py, pz), yaw = on_head(x, z, R, out)
    return kit.prim('cyl', name, col, loc=(px, py + t * 0.3, pz), size=(w, h, t), rot=(90, 0, yaw), segs=24,
                    m=M(col, rough=0.25), smooth=60, coll=coll)


def build(ch, coll):
    C = PAL[ch]
    tall = ch == 'eric'
    s = 1.06 if tall else 1.0  # Eric is a size up
    parts = {b: [] for b in ('root', 'torso', 'head', 'arm.L', 'arm.R', 'leg.L', 'leg.R')}
    add = lambda b, o: parts[b].append(o)

    # legs: one block each with a foot step forward, a sneaker on the foot, swinging from a hip pin
    hip = 0.40 * s
    for b, sx in (('leg.L', 1), ('leg.R', -1)):
        x = sx * 0.092 * s
        add(b, P('box', f'{ch}-{b}', C['legs'], coll, loc=(x, 0.0, (0.07 + hip - 0.02) / 2 * 1), size=(0.17 * s,
            0.18, hip - 0.09), bevel=0.02))
        add(b, P('box', f'{ch}-{b}-shoe', C['shoe'], coll, loc=(x, -0.025, 0.045), size=(0.172 * s, 0.24, 0.09),
                 bevel=0.03))
        add(b, P('box', f'{ch}-{b}-sole', C['sole'], coll, loc=(x, -0.025, 0.012), size=(0.176 * s, 0.245, 0.024),
                 bevel=0.008))
    add('root', P('box', f'{ch}-hips', C['legs'], coll, loc=(0, 0, hip), size=(0.37 * s, 0.18, 0.08), bevel=0.02))
    add('root', P('cyl', f'{ch}-hip-pin', C['legs'], coll, loc=(0, 0, hip - 0.05), size=(0.06, 0.06, 0.37 * s),
                  rot=(0, 90, 0)))

    # torso
    z0, z1 = hip + 0.04, hip + 0.04 + 0.37 * s
    add('torso', trapezoid(f'{ch}-torso', C['top'], coll, z0, z1, 0.40 * s, 0.29 * s, 0.2, 0.18))
    neck = z1
    add('torso', P('cyl', f'{ch}-neck', C['skin'], coll, loc=(0, 0, neck + 0.02), size=(0.11, 0.11, 0.05)))

    # head: a rounded cylinder
    R = 0.15 * s
    hz0, hz1 = neck + 0.035, neck + 0.035 + 0.27 * s
    hc = (hz0 + hz1) / 2
    # straight sides up to the brow line, then a low dome, so the hair piece can hug it
    hm = hc + 0.06 * s
    add('head', kit.to_obj(f'{ch}-head', kit.lathe_bm(kit.dome_profile(hz0, hm, hz1 - hm, round_bot=0.12), R, R), [M(C['skin'])],
                           50, coll))
    ez = hc - 0.01 * s
    # eyes: a dark lash line on top, the iris, a pupil and a highlight, as printed on the cylinder
    for sx in (1, -1):
        x = sx * 0.055 * s
        add('head', disc(f'{ch}-eye{sx}', C['iris'], coll, x, ez, R, 0.034 * s, 0.046 * s))
        add('head', disc(f'{ch}-pupil{sx}', C['dark'], coll, x, ez - 0.002, R, 0.019 * s, 0.03 * s, out=0.002))
        add('head', disc(f'{ch}-hl{sx}', '#ffffff', coll, x - sx * 0.008, ez + 0.01, R, 0.009, 0.009, out=0.004))
        (px, py, pz), yaw = on_head(x, ez + 0.026 * s, R, 0.003)
        add('head', kit.prim('box', f'{ch}-lash{sx}', C['dark'], loc=(px, py, pz), size=(0.044 * s, 0.006, 0.009),
                             rot=(0, -sx * 8, yaw), m=M(C['dark']), coll=coll))
    # glasses: two rectangle frames just off the face, a bridge, temples back to the ears
    gz, gw, gh, bar = ez + 0.003, 0.074 * s, 0.062 * s, 0.009
    for sx in (1, -1):
        x = sx * 0.055 * s
        (px, py, pz), yaw = on_head(x, gz, R, 0.012)
        fr = []
        for (dx, dz, w, h) in ((0, gh / 2, gw + bar, bar), (0, -gh / 2, gw + bar, bar), (gw / 2, 0, bar, gh), (-gw / 2, 0, bar,
                                                                                                    gh)):
            o = kit.prim('box', f'{ch}-frame{sx}', C['frame'], loc=(dx, 0, dz), size=(w, 0.008 if h < w else 0.0068, h), bevel=0.003,
                         m=M(C['frame'], rough=0.25), smooth=40, coll=coll)
            o.data.transform(Matrix.Translation((px, py, pz)) @ Matrix.Rotation(math.radians(yaw), 4, 'Z'))
            add('head', o)
        ox = x + sx * gw / 2
        a = on_head(ox * 0.98, gz + gh / 2 - 0.006, R, 0.012)[0]
        add('head', rod(f'{ch}-temple{sx}', a, (sx * (R + 0.006), 0.02, gz + gh / 2 - 0.01), 0.007, 0.007,
                        C['frame'], coll))
    add('head', rod(f'{ch}-bridge', on_head(-0.02, gz + 0.012, R, 0.012)[0], on_head(0.02, gz + 0.012, R, 0.012)[0],
                    0.008, 0.008, C['frame'], coll))

    if ch == 'mio':
        # flat little mouth
        (px, py, pz), yaw = on_head(0, hz0 + 0.06, R, 0.001)
        add('head', kit.prim('box', 'mio-mouth', C['mouth'], loc=(px, py, pz), size=(0.026, 0.006, 0.007),
                             m=M(C['mouth']), coll=coll))
        # hair: a dark piece cut low over her right brow (image left), high behind her left ear (image right);
        # a teal piece under it shows at the nape and sides
        add('head', cap('mio-hair', C['hair'], coll, R + 0.03, R + 0.035, hz0 - 0.03, hm, hz1 - hm + 0.04,
                        (0, -0.18, hc + 0.035), (-0.38, 0.32, 1)))
        add('head', cap('mio-hair-under', C['teal'], coll, R + 0.025, R + 0.03, hz0 - 0.03, hm, hz1 - hm + 0.035,
                        (0, 0, hz0 - 0.03), (0, 1.4, 1)))
        # the long strand on her right (image left) down past the chin
        strand = P('cyl', 'mio-strand', C['hair'], coll, loc=(0, 0, 0), size=(0.05, 0.045, 0.2), taper=0.45, segs=20)
        strand.data.transform(kit.xform((-R - 0.012, -0.075, hz0 + 0.02), (180, 0, 4)))
        add('head', strand)
        # messy bun high on the back of her head, her left (image right), with teal underneath
        add('head', P('sphere', 'mio-bun', C['hair'], coll, loc=(0.08, 0.13, hz1 + 0.01), size=(0.15, 0.14, 0.13),
                      segs=28))
        add('head', P('sphere', 'mio-bun-under', C['teal'], coll, loc=(0.075, 0.14, hz1 - 0.035),
                      size=(0.1, 0.1, 0.08), segs=24))
        # hood lying on her shoulders, headphones round her neck with teal cups, lanyard and card
        add('torso', torus('mio-hood', C['top2'], coll, (0, 0.035, neck - 0.005), 0.1, 0.035, arc=230, gap_at=-90,
                           scale=(1.1, 0.95, 1)))
        add('torso', torus('mio-phones', C['phone'], coll, (0, -0.01, neck + 0.01), 0.095, 0.014, rot=(-14, 0, 0)))
        for sx in (1, -1):
            add('torso', P('cyl', f'mio-cup{sx}', C['phone'], coll, loc=(sx * 0.085, -0.095, neck - 0.02),
                           size=(0.075, 0.075, 0.035), rot=(76, 0, sx * 25)))
            add('torso', P('cyl', f'mio-cupface{sx}', C['teal'], coll, loc=(sx * 0.081, -0.112, neck - 0.024),
                           size=(0.05, 0.05, 0.01), rot=(76, 0, sx * 25)))
        for sx in (1, -1):
            add('torso', rod(f'mio-lanyard{sx}', (sx * 0.045, -0.1, neck - 0.05), (sx * 0.008, -0.108, neck - 0.17),
                             0.012, 0.004, C['lanyard'], coll))
        add('torso', P('box', 'mio-card', C['card'], coll, loc=(0, -0.11, neck - 0.205), size=(0.05, 0.008, 0.066),
                       bevel=0.004))
        add('torso', P('box', 'mio-pocket', C['top2'], coll, loc=(0, -0.103, z0 + 0.08), size=(0.24, 0.01, 0.1),
                       bevel=0.01))
    else:
        # smile and brows; stubble printed round the jaw
        (px, py, pz), yaw = on_head(0, hz0 + 0.07, R, 0.001)
        add('head', torus('eric-smile', C['mouth'], coll, (px, py - 0.001, pz + 0.025), 0.03, 0.0045,
                          rot=(90, 0, 0), arc=110, gap_at=90, segs=16, rsegs=8))
        for sx in (1, -1):
            x = sx * 0.058 * s
            (px, py, pz), yaw = on_head(x, ez + 0.06, R, 0.004)
            add('head', kit.prim('box', f'eric-brow{sx}', C['brow'], loc=(px, py, pz), size=(0.05, 0.008, 0.011),
                                 rot=(0, sx * 6, yaw), m=M(C['brow']), coll=coll))
        st = kit.prim('cyl', 'eric-stubble', C['stubble'], loc=(0, -0.002, hz0 + 0.045), size=(2 * R + 0.003,
                      2 * R + 0.003, 0.07), segs=40, m=M(C['stubble'], rough=0.5), smooth=60, coll=coll)
        add('head', st)
        # hair combed back from a high hairline, a lift at the front, a short ponytail with a blue tie
        add('head', cap('eric-hair', C['hair'], coll, R + 0.025, R + 0.03, hz0, hm, hz1 - hm + 0.04,
                        (0, -0.17, hc + 0.075), (0, 0.9, 1)))
        add('head', P('cyl', 'eric-tie', C['tie'], coll, loc=(0, 0.215, hc - 0.02), size=(0.065, 0.065, 0.035),
                      rot=(70, 0, 0)))
        add('head', P('cyl', 'eric-tail', C['hair'], coll, loc=(0, 0.25, hc - 0.07), size=(0.075, 0.075, 0.13),
                      rot=(35, 0, 0), taper=0.35))
        # open blazer over the grey hoodie: hoodie panel, lapels, strings, the hood round his neck, lanyard and card
        add('torso', trapezoid('eric-hoodie', C['hood'], coll, z0 + 0.02, neck - 0.005, 0.1, 0.13, 0.03, 0.03,
                               bevel=0.008, y=-0.095))
        for sx in (1, -1):
            add('torso', rod(f'eric-lapel{sx}', (sx * 0.085, -0.104, neck - 0.01), (sx * 0.05, -0.108, z0 + 0.06),
                             0.03, 0.012, C['top2'], coll, bevel=0.004))
            add('torso', rod(f'eric-string{sx}', (sx * 0.022, -0.112, neck - 0.03), (sx * 0.024, -0.114,
                             neck - 0.12), 0.007, 0.007, C['string'], coll))
        add('torso', torus('eric-hood', C['hood'], coll, (0, 0.03, neck - 0.005), 0.1, 0.038, arc=250, gap_at=-90,
                           scale=(1.12, 1.0, 1)))
        add('torso', rod('eric-lanyard', (-0.075, -0.1, neck - 0.01), (-0.06, -0.112, neck - 0.17), 0.013, 0.004,
                         C['lanyard'], coll))
        add('torso', P('box', 'eric-card', C['card'], coll, loc=(-0.06, -0.116, neck - 0.205),
                       size=(0.05, 0.008, 0.066), bevel=0.004))

    # arms: an angled tube from a round shoulder, a cuff, a C-clip hand
    sh_z = neck - 0.055
    for b, sx in (('arm.L', 1), ('arm.R', -1)):
        shp = Vector((sx * 0.165 * s, 0, sh_z))
        el = Vector((sx * 0.2 * s, -0.01, sh_z - 0.29 * s))
        add(b, P('sphere', f'{ch}-{b}-shoulder', C['top'], coll, loc=shp, size=(0.1, 0.1, 0.1), segs=24))
        add(b, rod(f'{ch}-{b}-sleeve', shp, el, 0.088, 0.088, C['top'], coll, bevel=0.03))
        cuff = C['hood'] if ch == 'eric' else C['top2']
        add(b, rod(f'{ch}-{b}-cuff', el + Vector((0, 0, 0.02)), el - Vector((0, 0, 0.02)), 0.084, 0.084, cuff, coll,
                   bevel=0.025))
        add(b, P('cyl', f'{ch}-{b}-wrist', C['skin'], coll, loc=el - Vector((0, 0, 0.035)), size=(0.04, 0.04, 0.04)))
        add(b, torus(f'{ch}-{b}-hand', C['skin'], coll, el - Vector((0, 0.0, 0.09)), 0.04, 0.022, rot=(90, 0, 90),
                     arc=270, gap_at=0, segs=20, rsegs=10))

    top = hz1 + 0.12
    bones = [('root', (0, 0, 0), (0, 0, hip), None),
             ('torso', (0, 0, hip), (0, 0, neck), 'root'),
             ('head', (0, 0, neck), (0, 0, top), 'torso'),
             ('arm.L', (0.165 * s, 0, sh_z), (0.2 * s, -0.01, sh_z - 0.29 * s), 'torso'),
             ('arm.R', (-0.165 * s, 0, sh_z), (-0.2 * s, -0.01, sh_z - 0.29 * s), 'torso'),
             ('leg.L', (0.092 * s, 0, hip - 0.05), (0.092 * s, 0, 0), 'root'),
             ('leg.R', (-0.092 * s, 0, hip - 0.05), (-0.092 * s, 0, 0), 'root')]
    arm = kit.rig(ch + '-rig', bones, coll)
    objs = []
    for b, os_ in parts.items():
        for o in os_:
            kit.attach(o, arm, b)
            objs.append(o)
    HEAD[ch] = (0, 0, hc + 0.03)
    return arm, objs


HEAD = {}
HEAD_SPAN = 0.42
MOTION = dict(swing=30, arm_swing=26, arm_out=0)
