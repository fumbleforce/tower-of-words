# claude-facet: tall faceted low-poly figures, flat-shaded planes, a small head on a long tapered body, the
# silhouette doing the work (Mio an A: a bell-shaped oversized hoodie on thin legs; Eric a V: broad blazer
# shoulders over a narrow waist). Faces are only the glasses, two eye planes and brows. Every shape is a lathe with
# few sides (5 to 8) and a flat face to the front. Rig: the 7 bones plus a knee in each leg.
import math

from mathutils import Vector

import kit

MATTE = dict(rough=0.85, spec=0.25)

PAL = {
    'mio': dict(skin='#f2d6c4', hair='#13292f', teal='#20a081', top='#0d2c33', top2='#123a40', legs='#3b4152',
                shoe='#ece9e2', sole='#3d4658', eye='#2a2622', frame='#7c838b', phone='#22262d', card='#f1f2ef',
                lanyard='#20a081'),
    'eric': dict(skin='#f4d8c6', hair='#ad8d5c', hair2='#c2a170', top='#2d3a58', top2='#243050', hood='#8f9298',
                 legs='#373c48', shoe='#2b2a2e', sole='#55575d', eye='#22303f', frame='#aab2bc', brow='#8a6f45',
                 stubble='#d9b496', lanyard='#2f62b8', card='#f1f2ef', tie='#2f62b8'),
}


def M(col):
    return kit.mat(col, **MATTE)


def lathe(name, col, coll, profile, rx, ry=None, cx=0.0, cy=0.0, segs=8, phase=22.5):
    return kit.to_obj(name, kit.lathe_bm(profile, rx, ry or rx, cx=cx, cy=cy, segs=segs, phase=phase), [M(col)],
                      None, coll)


def limb(name, col, coll, a, b, r0, r1, segs=6):
    """A tapered prism from a (radius r0) to b (radius r1)."""
    a, b = Vector(a), Vector(b)
    L = (b - a).length
    o = lathe(name, col, coll, [(0, 0), (1, 0), (r1 / r0 * 0.5 + 0.5, L * 0.5), (r1 / r0, L), (0, L)], r0, segs=segs,
              phase=0)
    q = Vector((0, 0, 1)).rotation_difference(b - a)
    o.data.transform(q.to_matrix().to_4x4())
    o.data.transform(kit.Matrix.Translation(a))
    return o


def flat(name, col, coll, center, w, h, t=0.006, yaw=0.0, pitch=0.0):
    return kit.prim('box', name, col, loc=center, size=(w, t, h), rot=(pitch, 0, yaw), m=M(col), coll=coll)


def build(ch, coll):
    C = PAL[ch]
    E = ch == 'eric'
    parts = {b: [] for b in ('root', 'torso', 'head', 'arm.L', 'arm.R', 'leg.L', 'leg.R', 'shin.L', 'shin.R')}
    add = lambda b, o: parts[b].append(o)

    hip = 0.6 if E else 0.56
    knee = hip * 0.52
    lx = 0.07 if E else 0.06
    lr = 0.05 if E else 0.042
    # legs: thigh and shin as tapered prisms, a wedge shoe
    for sx, L in ((1, 'L'), (-1, 'R')):
        x = sx * lx
        add('leg.' + L, limb(f'{ch}-thigh{L}', C['legs'], coll, (x, 0, hip), (x, 0, knee), lr, lr * 0.85))
        add('shin.' + L, limb(f'{ch}-shin{L}', C['legs'], coll, (x, 0, knee), (x, 0, 0.06), lr * 0.85, lr * 0.7))
        shoe = kit.mesh(f'{ch}-shoe{L}', [(x - 0.045, 0.04, 0), (x + 0.045, 0.04, 0), (x + 0.04, -0.11, 0),
                                          (x - 0.04, -0.11, 0), (x - 0.04, 0.035, 0.08), (x + 0.04, 0.035, 0.08),
                                          (x + 0.035, -0.03, 0.07), (x - 0.035, -0.03, 0.07)],
                        [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)],
                        C['shoe'], m=M(C['shoe']), coll=coll)
        add('shin.' + L, shoe)
        add('shin.' + L, kit.prim('box', f'{ch}-sole{L}', C['sole'], loc=(x, -0.035, 0.008),
                                  size=(0.092, 0.155, 0.016), m=M(C['sole']), coll=coll))

    if E:
        # V: blazer narrow at the waist, broad and square at the shoulders
        shz, neck = 0.97, 1.0
        body = [(0, hip - 0.04), (0.75, hip - 0.04), (0.72, hip + 0.06), (0.85, 0.82), (1.0, 0.93), (0.92, shz),
                (0.4, neck), (0, neck)]
        add('torso', lathe(f'{ch}-blazer', C['top'], coll, body, 0.19, 0.12, segs=6, phase=30))
        # grey hoodie in the open front: a narrow wedge, its hood round the back of the neck
        add('torso', kit.mesh(f'{ch}-hoodie', [(-0.06, -0.112, 0.94), (0.06, -0.112, 0.94), (0.0, -0.104, hip + 0.05),
                                              (0, -0.135, 0.9)], [(0, 1, 3), (1, 2, 3), (2, 0, 3)], C['hood'],
                              m=M(C['hood']), coll=coll))
        add('torso', lathe(f'{ch}-hood', C['hood'], coll, [(0, 0.95), (1, 0.95), (1.0, 1.0), (0.7, 1.03), (0, 1.03)],
                           0.1, 0.085, cy=0.03, segs=7))
        add('torso', kit.rod(f'{ch}-lanyard', (-0.085, -0.105, 0.97), (-0.07, -0.13, 0.82), 0.014, 0.004,
                             M(C['lanyard']), coll, smooth=None))
        add('torso', flat(f'{ch}-card', C['card'], coll, (-0.07, -0.135, 0.79), 0.045, 0.06, yaw=0, pitch=-8))
    else:
        # A: an oversized hoodie flaring to a wide hem, sleeves to the knuckles
        shz, neck = 0.9, 0.93
        body = [(0, hip - 0.06), (1.0, hip - 0.06), (1.0, hip - 0.01), (0.86, 0.72), (0.72, 0.85), (0.6, shz),
                (0.3, neck), (0, neck)]
        add('torso', lathe(f'{ch}-hoodie', C['top'], coll, body, 0.2, 0.15, segs=7, phase=90 + 360 / 14))
        add('torso', lathe(f'{ch}-hood', C['top2'], coll, [(0, 0.86), (1, 0.86), (1.0, 0.92), (0.7, 0.96), (0, 0.96)],
                           0.1, 0.09, cy=0.04, segs=7))
        # headphones round the neck (a low ring) with teal cups, lanyard and card
        add('torso', lathe(f'{ch}-phones', C['phone'], coll, [(0, 0.905), (1, 0.905), (1, 0.93), (0, 0.93)], 0.085,
                           0.08, cy=-0.005, segs=8))
        for sx in (1, -1):
            cup = lathe(f'{ch}-cup{sx}', C['phone'], coll, [(0, 0), (1, 0), (1, 0.03), (0, 0.03)], 0.034, segs=6, phase=0)
            cup.data.transform(kit.xform((sx * 0.07, -0.085, 0.885), (78, 0, sx * 28)))
            add('torso', cup)
            face = lathe(f'{ch}-cupface{sx}', C['teal'], coll, [(0, 0), (1, 0), (1, 0.008), (0, 0.008)], 0.024, segs=6,
                         phase=0)
            face.data.transform(kit.xform((sx * 0.066, -0.115, 0.882), (78, 0, sx * 28)))
            add('torso', face)
        for sx in (1, -1):
            add('torso', kit.rod(f'{ch}-lanyard{sx}', (sx * 0.035, -0.115, 0.86), (sx * 0.006, -0.14, 0.75), 0.011,
                                 0.004, M(C['lanyard']), coll, smooth=None))
        add('torso', flat(f'{ch}-card', C['card'], coll, (0, -0.145, 0.725), 0.042, 0.055, pitch=-12))

    # arms
    for sx, b in ((1, 'arm.L'), (-1, 'arm.R')):
        sh = Vector((sx * (0.165 if E else 0.11), 0, shz - 0.03))
        hand = Vector((sx * (0.19 if E else 0.17), -0.01, (0.6 if E else 0.56)))
        add(b, limb(f'{ch}-{b}-sleeve', C['top'], coll, sh, hand, 0.042 if E else 0.04, 0.034 if E else 0.038))
        if E:
            add(b, limb(f'{ch}-{b}-cuff', C['hood'], coll, hand + (sh - hand) * 0.05, hand - (sh - hand) * 0.04,
                        0.033, 0.03))
        h = kit.prim('ico', f'{ch}-{b}-hand', C['skin'], loc=hand - (sh - hand).normalized() * 0.04,
                     size=(0.055, 0.05, 0.065), sub=1, m=M(C['skin']), coll=coll)
        add(b, h)

    # head: an eight-sided lathe, flat face forward, a narrower chin
    hz0 = neck + 0.03
    hh = 0.25 if E else 0.24
    R = 0.105 if E else 0.1
    prof = [(0, hz0), (0.5, hz0), (0.86, hz0 + 0.24 * hh), (1, hz0 + 0.5 * hh), (0.97, hz0 + 0.72 * hh),
            (0.74, hz0 + 0.93 * hh), (0, hz0 + hh)]
    add('torso', limb(f'{ch}-neck', C['skin'], coll, (0, 0, neck - 0.02), (0, 0, hz0 + 0.05), 0.04, 0.04, segs=6))
    add('head', lathe(f'{ch}-head', C['skin'], coll, prof, R, R * 1.05))
    fy = -R * 1.05 * math.cos(math.pi / 8)  # the front face plane
    ez = hz0 + 0.47 * hh
    for sx in (1, -1):
        x = sx * 0.042
        add('head', flat(f'{ch}-eye{sx}', C['eye'], coll, (x, fy - 0.001, ez - 0.002), 0.014, 0.022 if E else 0.018))
        # glasses: a rectangle of four bars standing just off the face, temples back to the ears
        gy, gw, gh, t = fy - 0.012, 0.064, 0.05 if E else 0.046, 0.008
        for (dx, dz, w, h) in ((0, gh / 2, gw + t, t), (0, -gh / 2, gw + t, t), (gw / 2, 0, t, gh), (-gw / 2, 0, t, gh)):
            add('head', kit.prim('box', f'{ch}-frame{sx}', C['frame'], loc=(x + dx, gy, ez + dz), size=(w, 0.008 if h < w else 0.0068, h),
                                 m=M(C['frame']), coll=coll))
        add('head', kit.rod(f'{ch}-temple{sx}', (sx * (0.042 + gw / 2), gy, ez + gh / 2 - 0.004),
                            (sx * (R + 0.004), 0.0, ez + gh / 2 - 0.004), 0.007, 0.007, M(C['frame']), coll, smooth=None))
    add('head', kit.prim('box', f'{ch}-bridge', C['frame'], loc=(0, gy, ez + 0.008), size=(0.026, 0.0064, 0.007),
                         m=M(C['frame']), coll=coll))
    top = hz0 + hh
    if E:
        for sx in (1, -1):
            add('head', flat(f'{ch}-brow{sx}', C['brow'], coll, (sx * 0.042, fy - 0.003, ez + 0.042), 0.046, 0.01,
                             yaw=0))
        # stubble: the lower face, a shell just outside the jaw, cut off above the mouth and behind the ears
        add('head', kit.cap(f'{ch}-stubble', M(C['stubble']), coll, R * 1.03, R * 1.08, 0, 0, 0,
                            (0, 0, hz0 + 0.3 * hh), (0, 0.3, -1),
                            profile=[(p[0] * 1.0, p[1] - 0.002) for p in prof], segs=8, phase=22.5))
        # hair combed back from a high hairline, straight back to a short ponytail with a blue tie
        hp = [(0, hz0 + 0.3 * hh), (1, hz0 + 0.3 * hh), (1.02, hz0 + 0.62 * hh), (1.0, hz0 + 0.86 * hh),
              (0.78, hz0 + 1.03 * hh), (0.35, hz0 + 1.09 * hh), (0, hz0 + 1.1 * hh)]
        add('head', kit.cap(f'{ch}-hair', M(C['hair']), coll, R * 1.05, R * 1.1, 0, 0, 0, (0, -R, hz0 + 0.86 * hh),
                            (0, 0.9, 1), profile=hp, segs=8, phase=22.5, cy=0.006))
        # a lighter combed-back lift along the top
        add('head', kit.cap(f'{ch}-hairtop', M(C['hair2']), coll, R * 0.75, R * 1.0, 0, 0, 0,
                            (0, -R, hz0 + 0.98 * hh), (0, 0.6, 1), profile=[(x, z + 0.008) for x, z in hp], segs=8,
                            phase=22.5, cy=0.0))
        add('head', limb(f'{ch}-tie', C['tie'], coll, (0, R * 0.95, hz0 + 0.58 * hh), (0, R * 1.2, hz0 + 0.5 * hh),
                         0.026, 0.026, segs=6))
        add('head', limb(f'{ch}-tail', C['hair'], coll, (0, R * 1.15, hz0 + 0.53 * hh),
                         (0, R * 1.55, hz0 + 0.18 * hh), 0.03, 0.008, segs=5))
        top = hz0 + 1.12 * hh
    else:
        # hair: a faceted shell cut low over her right brow (image left) and high behind her left ear (image right);
        # the teal layer under it shows at the nape and on her left side; a long strand on her right; a high bun
        hp = [(0, hz0 + 0.05 * hh), (1, hz0 + 0.05 * hh), (1.1, hz0 + 0.5 * hh), (1.08, hz0 + 0.8 * hh),
              (0.86, hz0 + 1.05 * hh), (0.4, hz0 + 1.14 * hh), (0, hz0 + 1.15 * hh)]
        # dark shell: open at the face (a near-vertical cut), ending higher at the back and on her left so the
        # teal shell under it shows there
        add('head', kit.cap(f'{ch}-hair', M(C['hair']), coll, R * 1.04, R * 1.1, 0, 0, 0,
                            (0, -0.07, hz0 + 0.5 * hh), (0, 1, 0.2), profile=hp, segs=8, phase=22.5, cy=0.006,
                            more=[((0, 0, hz0 + 0.3 * hh), (-0.7, -0.6, 1))]))
        add('head', kit.cap(f'{ch}-hair-under', M(C['teal']), coll, R * 1.0, R * 1.06, 0, 0, 0,
                            (0, -0.06, hz0 + 0.5 * hh), (0, 1, 0.2), profile=[(x, z - 0.01) for x, z in hp], segs=8,
                            phase=22.5, cy=0.008))
        add('head', kit.mesh(f'{ch}-bangs', [(-0.11, fy - 0.012, hz0 + 0.52 * hh), (-0.02, fy - 0.016, hz0 + 0.86 * hh),
                                             (0.06, fy - 0.014, hz0 + 0.95 * hh), (-0.105, fy + 0.02, hz0 + 0.95 * hh),
                                             (-0.06, fy - 0.03, hz0 + 0.9 * hh)],
                             [(0, 4, 1), (1, 4, 2), (4, 0, 3), (2, 4, 3)], C['hair'], m=M(C['hair']), coll=coll))
        add('head', limb(f'{ch}-strand', C['hair'], coll, (-R * 1.02, -0.06, hz0 + 0.62 * hh),
                         (-R * 1.08, -0.07, hz0 - 0.06), 0.022, 0.008, segs=5))
        bun = kit.prim('ico', f'{ch}-bun', C['hair'], loc=(0.05, 0.075, hz0 + 1.07 * hh), size=(0.11, 0.1, 0.095),
                       sub=1, m=M(C['hair']), coll=coll)
        add('head', bun)
        add('head', kit.prim('ico', f'{ch}-bun-under', C['teal'], loc=(0.045, 0.085, hz0 + 0.97 * hh),
                             size=(0.07, 0.07, 0.06), sub=1, m=M(C['teal']), coll=coll))
        top = hz0 + 1.25 * hh

    bones = [('root', (0, 0, 0), (0, 0, hip), None),
             ('torso', (0, 0, hip), (0, 0, neck), 'root'),
             ('head', (0, 0, neck), (0, 0, top), 'torso')]
    for sx, L in ((1, 'L'), (-1, 'R')):
        sh = (sx * (0.165 if E else 0.11), 0, shz - 0.03)
        hand = (sx * (0.19 if E else 0.17), -0.01, (0.6 if E else 0.56))
        bones += [('arm.' + L, sh, hand, 'torso'),
                  ('leg.' + L, (sx * lx, 0, hip), (sx * lx, 0, knee), 'root'),
                  ('shin.' + L, (sx * lx, 0, knee), (sx * lx, 0, 0.0), 'leg.' + L)]
    arm = kit.rig(ch + '-rig', bones, coll)
    objs = []
    for b, os_ in parts.items():
        for o in os_:
            kit.attach(o, arm, b)
            objs.append(o)
    HEAD[ch] = (0, 0, hz0 + 0.55 * hh)
    return arm, objs


HEAD = {}
HEAD_SPAN = 0.3
MOTION = dict(swing=24, arm_swing=18, arm_out=3, knees=('shin.L', 'shin.R'))
