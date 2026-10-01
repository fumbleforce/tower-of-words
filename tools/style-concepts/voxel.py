# claude-voxel: blocky voxel figures, one cube size for everything (Crossy Road, MagicaVoxel), face drawn as pixel
# blocks, glasses as a block frame standing one voxel off the face. Rigid parts on a 7-bone rig (Minecraft-style
# swing walk). Cell (i, j, k): i toward her left (+X, image right), j toward her back (front is -j), k up.
import math

import kit

U = 0.031  # metres per voxel: Mio stands 36 voxels (1.12 m), Eric 38

PAL = {
    'mio': dict(skin='#f4dccb', hair='#13292f', hair2='#1d3d44', teal='#20a081', top='#0b2a30', top2='#071d22',
                legs='#3b4152', shoe='#e9e6df', sole='#3d4658', iris='#c49a5a', frame='#7f858c', lash='#1b1c22',
                mouth='#c98579', phone='#272b33', cup='#20a081', card='#f1f2ef', lanyard='#20a081'),
    'eric': dict(skin='#f6ddcf', hair='#ad8d5c', hair2='#bb9c69', hair3='#957848', beard='#d2ad8a', top='#2d3a58',
                 top2='#232e47', hood='#8f9298', hood2='#7b7e84', legs='#373c48', shoe='#2b2a2e', sole='#5a5c62',
                 iris='#3c7fc8', frame='#98a2ad', lash='#3a2e22', brow='#8a6f45', mouth='#b9776c', lanyard='#2f62b8',
                 card='#f1f2ef', tie='#2f62b8', string='#d9d7d2'),
}


class Grid(dict):
    def box(self, i0, i1, j0, j1, k0, k1, c):
        for i in range(i0, i1 + 1):
            for j in range(j0, j1 + 1):
                for k in range(k0, k1 + 1):
                    self[(i, j, k)] = c

    def put(self, i, j, k, c):
        self[(i, j, k)] = c

    def paint(self, cells, c):
        for p in cells:
            if p in self:
                self[p] = c


def body(ch, P, L, T, sleeve_hand=2):
    """Legs, torso and arms. Returns {bone: Grid} and the head base k."""
    g = {b: Grid() for b in ('leg.L', 'leg.R', 'torso', 'arm.L', 'arm.R', 'head')}
    for b, (i0, i1) in (('leg.L', (1, 4)), ('leg.R', (-5, -2))):
        g[b].box(i0, i1, -2, 2, 0, L - 1, P['legs'])
        g[b].box(i0, i1, -3, 2, 0, 1, P['shoe'])  # shoes, a toe one voxel forward
        g[b].box(i0, i1, -3, 2, 0, 0, P['sole'])
    hb = L + T
    g['torso'].box(-6, 5, -3, 3, L, hb - 1, P['top'])
    for b, (i0, i1) in (('arm.L', (6, 8)), ('arm.R', (-9, -7))):
        g[b].box(i0, i1, -1, 1, hb - 10, hb - 1, P['top'])
        g[b].box(i0, i1, -1, 1, hb - 10, hb - 11 + sleeve_hand, P['skin'])
    return g, hb


def face(h, P, hb, eyes_r=4, brows=False, smile=False):
    """Eyes 2x3 pixels on the front layer (j = -6), the glasses frame on j = -7 around them."""
    F = -6
    for (a, b) in ((2, 3), (-4, -3)):
        outer = b if a > 0 else a
        inner = a if a > 0 else b
        h.put(a, F, hb + eyes_r + 2, P['lash'])
        h.put(b, F, hb + eyes_r + 2, P['lash'])
        h.put(inner, F, hb + eyes_r + 1, P['iris'])
        h.put(outer, F, hb + eyes_r + 1, '#fbfbfb')
        h.put(a, F, hb + eyes_r, P['iris'])
        h.put(b, F, hb + eyes_r, P['iris'])
        if brows:
            for i in (a, b, outer + (1 if a > 0 else -1)):
                h.put(i, F, hb + eyes_r + 4, P['brow'])
    if smile:
        for i in (-2, -1, 0):
            h.put(i, F, hb + 1, P['mouth'])
        h.put(1, F, hb + 2, P['mouth'])
    else:
        h.put(-1, F, hb + 1, P['mouth'])
        h.put(0, F, hb + 1, P['mouth'])


def glasses(h, P, hb, r0=3, r1=7, thick=False):
    G = -7
    for (i0, i1) in ((1, 4), (-5, -2)):
        for i in range(i0, i1 + 1):
            for r in range(r0, r1 + 1):
                if i in (i0, i1) or r in (r0, r1):
                    h.put(i, G, hb + r, P['frame'])
    for i in (-1, 0):
        h.put(i, G, hb + r1 - 1, P['frame'])
    # temples back to the ears
    for i in (5, 6):
        h.put(i, G, hb + r1 - 1, P['frame'])
    for i in (-6, -7):
        h.put(i, G, hb + r1 - 1, P['frame'])
    for j in range(-6, -1):
        h.put(7, j, hb + r1 - 1, P['frame'])
        h.put(-8, j, hb + r1 - 1, P['frame'])


def mio():
    P = PAL['mio']
    g, hb = body('mio', P, 9, 11, sleeve_hand=1)
    t = g['torso']
    # hem band, kangaroo pocket, the hood lying on her back, lanyard and ID card, headphones round the neck
    t.paint([(i, j, 9) for i in range(-6, 6) for j in range(-3, 4)], P['top2'])
    t.paint([(i, -3, k) for i in range(-4, 4) for k in (11, 12, 13)], P['top2'])
    t.box(-4, 3, 4, 4, hb - 4, hb - 1, P['top2'])
    t.box(-3, 2, 5, 5, hb - 3, hb - 1, P['top2'])
    for k, (a, b) in zip(range(hb - 1, hb - 6, -1), ((-3, 2), (-3, 2), (-2, 1), (-2, 1), (-1, 0))):
        t.paint([(a, -3, k), (b, -3, k)], P['lanyard'])
    t.box(-1, 0, -4, -4, hb - 8, hb - 7, P['card'])
    t.put(-1, -4, hb - 6, P['lanyard'])
    t.put(0, -4, hb - 6, P['lanyard'])
    # headphones round her neck: two cups on her collarbones, a teal ring on each face
    for (i0, i1) in ((-6, -4), (3, 5)):
        t.box(i0, i1, -5, -4, hb - 3, hb - 1, P['phone'])
        for i in range(i0, i1 + 1):
            for k in range(hb - 3, hb):
                if not (i == i0 + 1 and k == hb - 2):
                    t.put(i, -5, k, P['cup'])
    # arms: long sleeves with a darker cuff
    for b in ('arm.L', 'arm.R'):
        a = g[b]
        a.paint([p for p in a if p[2] == hb - 9], P['top2'])

    h = g['head']
    h.box(-7, 6, -6, 6, hb, hb + 13, P['skin'])
    face(h, P, hb)
    # hair: a shell one voxel round the head, bangs swept toward her right (image left), longer there
    H0, H1, GN = P['hair'], P['hair2'], P['teal']
    for i in range(-8, 8):
        for j in range(-7, 8):
            for r in range(0, 15):
                inside = -7 <= i <= 6 and -6 <= j <= 6 and r <= 13
                if inside:
                    continue
                c = None
                if r == 14 and -7 <= i <= 6 and -7 <= j <= 6:
                    c = H1 if (i + j) % 5 == 0 else H0
                elif j == 7 and -7 <= i <= 6 and r >= 1:
                    c = GN if r <= 3 else H0
                elif i in (-8, 7) and -6 <= j <= 7:
                    bottom = 1 if j >= 0 else 4
                    if i == 7 and j < 0:
                        bottom = 7  # tucked behind the ear on her left (image right)
                    if r >= bottom:
                        c = GN if r <= bottom + 1 and j >= -2 else H0
                elif j == -7 and -7 <= i <= 6:
                    bot = {-7: 3, -6: 5, -5: 7, -4: 8, -3: 8, -2: 8, -1: 9, 0: 9, 1: 9, 2: 10, 3: 10, 4: 11, 5: 11,
                           6: 11}[i]
                    if r >= bot:
                        c = H1 if r == bot and i in (-6, -2, 2) else H0
                if c:
                    h[(i, j, hb + r)] = c
    # the long strand on her right (image left) down past her chin, green on its inside
    for r in range(-2, 6):
        h.put(-8, -6, hb + r, H0)
        h.put(-8, -5, hb + r, GN if r < 2 else H0)
    # her left ear (image right), with the hair tucked behind it
    h.box(7, 7, -2, -1, hb + 3, hb + 5, P['skin'])
    glasses(h, P, hb)
    # the messy bun, high on the back of her head on her left (image right), teal underneath
    for i in range(1, 8):
        for j in range(4, 12):
            for r in range(10, 18):
                d = math.dist((i, j, r), (4, 8, 14))
                if d <= 3.2 and (i, j, hb + r) not in h:
                    h[(i, j, hb + r)] = GN if r <= 11 else H0
    # two loose wisps out of the bun
    h.put(7, 8, hb + 15, H0)
    h.put(6, 10, hb + 12, GN)
    return g, hb


def eric():
    P = PAL['eric']
    g, hb = body('eric', P, 10, 12, sleeve_hand=2)
    t = g['torso']
    L = 10
    # open navy blazer over the grey hoodie: a hoodie strip down the middle, its strings, lapels, the lanyard
    for k in range(L, hb):
        w = 1 if k < hb - 5 else 2
        t.paint([(i, -3, k) for i in range(-w, w)], P['hood'])
    t.paint([(i, j, L) for i in range(-6, 6) for j in range(-3, 4)], P['top2'])
    for k in range(hb - 4, hb - 2):
        t.paint([(-2, -3, k), (1, -3, k)], P['string'])
    for k, (a, b) in zip(range(hb - 1, hb - 7, -1), ((-3, 2), (-3, 2), (-3, 2), (-2, 1), (-2, 1), (-2, 1))):
        t.paint([(a, -3, k), (b, -3, k)], P['top2'])
    for k, i in zip(range(hb - 1, hb - 7, -1), (-4, -4, -3, -3, -3, -2)):
        t.paint([(i, -3, k)], P['lanyard'])
    t.box(-4, -3, -4, -4, hb - 9, hb - 8, P['card'])
    t.put(-4, -4, hb - 7, P['lanyard'])
    # the hood bunched round the back of his neck
    t.box(-5, 4, -1, 4, hb, hb, P['hood'])
    t.box(-4, 3, 4, 4, hb - 3, hb - 1, P['hood2'])
    t.box(-4, 3, 5, 5, hb - 2, hb, P['hood'])
    t.paint([(i, j, hb) for i in range(-3, 3) for j in range(-1, 3)], P['hood2'])
    # blazer pockets and cuffs
    t.paint([(i, -3, L + 3) for i in (-5, -4, -3, 2, 3, 4)], P['top2'])
    for b in ('arm.L', 'arm.R'):
        a = g[b]
        a.paint([p for p in a if p[2] == hb - 8], P['hood'])

    h = g['head']
    h.box(-7, 6, -6, 6, hb, hb + 13, P['skin'])
    face(h, P, hb, eyes_r=5, brows=True, smile=True)
    # stubble along the jaw and chin
    for i in range(-7, 7):
        for r in (0, 1, 2) if -3 <= i <= 2 else (0, 1):
            if (i, -6, hb + r) in h and h[(i, -6, hb + r)] == P['skin']:
                h[(i, -6, hb + r)] = P['beard']
    for j in range(-6, 1):
        for r in (0, 1, 2):
            h.paint([(-7, j, hb + r), (6, j, hb + r)], P['beard'])
    h.put(-1, -6, hb + 2, P['beard'])
    h.put(0, -6, hb + 2, P['beard'])
    # nose: one voxel
    h.put(-1, -7, hb + 4, '#efcdb9')
    # hair swept straight back: hairline high on the forehead, a little lift at the front, streaks running back
    H0, H1, H2 = P['hair'], P['hair2'], P['hair3']
    for i in range(-8, 8):
        for j in range(-7, 8):
            for r in range(0, 17):
                if -7 <= i <= 6 and -6 <= j <= 6 and r <= 13:
                    continue
                c = None
                streak = H1 if i % 3 == 0 else (H2 if i % 3 == 2 else H0)
                if r == 14 and -7 <= i <= 6 and -7 <= j <= 6:
                    c = H1 if j == -7 else streak
                elif r == 15 and -7 <= i <= 6 and -6 <= j <= 6:
                    c = H1 if j == -6 else streak  # combed back in steps: each layer starts further back
                elif r == 16 and -5 <= i <= 4 and -4 <= j <= 4:
                    c = H1 if j == -4 else streak
                elif j == 7 and -7 <= i <= 6 and 2 <= r <= 15:
                    c = H0 if i % 3 else H2
                elif i in (-8, 7) and -4 <= j <= 7 and (7 if j < 2 else 3) <= r <= 15:
                    c = H2 if r == 7 else H0
                elif j == -7 and -7 <= i <= 6 and r == 13:
                    c = H0
                if c:
                    h[(i, j, hb + r)] = c
    # ears
    h.box(7, 7, -2, -1, hb + 4, hb + 6, P['skin'])
    h.box(-8, -8, -2, -1, hb + 4, hb + 6, P['skin'])
    glasses(h, P, hb, r0=4, r1=8)
    # short ponytail at the back, blue tie
    h.box(-2, 1, 8, 8, hb + 6, hb + 9, H0)
    h.box(-2, 1, 9, 9, hb + 6, hb + 9, P['tie'])
    h.box(-1, 0, 10, 11, hb + 5, hb + 9, H0)
    h.box(-1, 0, 12, 12, hb + 3, hb + 7, H2)
    h.box(-1, 0, 11, 11, hb + 3, hb + 4, H2)
    return g, hb


def build(ch, coll):
    g, hb = (mio if ch == 'mio' else eric)()
    u = U
    top = max(k for p in g['head'] for k in [p[2]]) + 1
    bones = [('root', (0, 0, 0), (0, 0, (hb - 11 if ch == 'mio' else hb - 12) * u), None)]
    L = hb - (11 if ch == 'mio' else 12)
    bones += [('torso', (0, 0, L * u), (0, 0, hb * u), 'root'),
              ('head', (0, 0, hb * u), (0, 0, top * u), 'torso'),
              ('arm.L', (7.5 * u, 0, (hb - 0.5) * u), (7.5 * u, 0, (hb - 10) * u), 'torso'),
              ('arm.R', (-7.5 * u, 0, (hb - 0.5) * u), (-7.5 * u, 0, (hb - 10) * u), 'torso'),
              ('leg.L', (3 * u, 0.5 * u, L * u), (3 * u, 0.5 * u, 0), 'root'),
              ('leg.R', (-3 * u, 0.5 * u, L * u), (-3 * u, 0.5 * u, 0), 'root')]
    arm = kit.rig(ch + '-rig', bones, coll)
    objs = []
    for b, cells in g.items():
        o = kit.voxels(f'{ch}-{b}', cells, u, coll=coll)
        kit.attach(o, arm, b)
        objs.append(o)
    return arm, objs


HEAD = {'mio': (0, 0, (20 + 6.5) * U), 'eric': (0, 0, (22 + 7) * U)}
HEAD_SPAN = 0.62
