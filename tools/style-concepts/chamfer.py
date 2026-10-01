# claude-chamfer: figures built the way the world's props are (game3d/js/look/detail.js): boxes with one flat
# chamfer on every edge, matte, flat-shaded. The voxel concept's proportions and parts (a squarish head about a third
# of the height, face features as flat plates, glasses as a frame of bars standing off the face, hair as stepped
# slabs), without the voxel grid, so they sit with the benches, planters and desks.
# Space as in kit.py: Z up, facing -Y, her left at +X (image right in a front view). 7-bone rig, rigid parts.
import kit

MATTE = dict(rough=0.8, spec=0.3)

PAL = {
    'mio': dict(skin='#f4dccb', hair='#13292f', hair2='#1d3d44', teal='#20a081', top='#0b2a30', top2='#071d22',
                legs='#3b4152', shoe='#e9e6df', sole='#3d4658', iris='#c49a5a', pupil='#4a3420', frame='#7f858c',
                lash='#1b1c22', mouth='#c98579', phone='#272b33', card='#f1f2ef', lanyard='#20a081'),
    'eric': dict(skin='#f6ddcf', hair='#ad8d5c', hair2='#bb9c69', hair3='#957848', beard='#dcb796', top='#2d3a58',
                 top2='#232e47', hood='#8f9298', hood2='#7b7e84', legs='#373c48', shoe='#2b2a2e', sole='#5a5c62',
                 iris='#3c7fc8', pupil='#1d2f4a', frame='#98a2ad', lash='#3a2e22', brow='#8a6f45', mouth='#b9776c',
                 nose='#efcdb9', lanyard='#2f62b8', card='#f1f2ef', tie='#2f62b8', string='#d9d7d2'),
}


def build(ch, coll):
    C = PAL[ch]
    E = ch == 'eric'
    s = 1.05 if E else 1.0
    parts = {b: [] for b in ('root', 'torso', 'head', 'arm.L', 'arm.R', 'leg.L', 'leg.R')}

    def B(bone, col, lo, hi, c=0.012, **kw):
        o = kit.cbox(f'{ch}-{bone}-{len(parts[bone])}', kit.mat(C[col] if col in C else col, **MATTE), lo, hi, c,
                     coll=coll, **kw)
        parts[bone].append(o)
        return o

    # ---- legs and shoes (a toe a little forward) ----
    hip = 0.32 * s
    lx = 0.078
    for b, sx in (('leg.L', 1), ('leg.R', -1)):
        x = sx * lx
        B(b, 'legs', (x - 0.058, -0.065, 0.07), (x + 0.058, 0.065, hip), 0.014)
        B(b, 'shoe', (x - 0.063, -0.105, 0.016), (x + 0.063, 0.075, 0.095), 0.022)
        B(b, 'sole', (x - 0.064, -0.107, 0.0), (x + 0.064, 0.077, 0.026), 0.008)

    # ---- torso ----
    t0, t1 = hip - 0.02, 0.665 * s
    W, D = 0.38 * s, 0.24
    neck = t1
    fy = -D / 2  # chest front
    if E:
        # open navy blazer over the grey hoodie
        B('torso', 'top', (-W / 2, -D / 2, t0 + 0.03), (W / 2, D / 2, t1), 0.025, taper=(0.94, 1.0))
        B('torso', 'top2', (-W / 2 - 0.004, -D / 2 - 0.004, t0), (W / 2 + 0.004, D / 2 + 0.004, t0 + 0.05), 0.012)
        B('torso', 'hood', (-0.05, fy - 0.012, t0 + 0.03), (0.05, fy + 0.02, t1 - 0.005), 0.008, taper=(1.45, 1))
        for sx in (1, -1):  # lapels: slabs leaning in toward the waist
            B('torso', 'top2', (sx * 0.075 - 0.02, fy - 0.018, t1 - 0.17), (sx * 0.075 + 0.02, fy + 0.01, t1 - 0.005),
              0.006, rot=(0, -sx * 14, 0))
            B('torso', 'string', (sx * 0.022 - 0.005, fy - 0.02, t1 - 0.12), (sx * 0.022 + 0.005, fy - 0.008,
                                                                                t1 - 0.03), 0.003)
            B('torso', 'top2', (sx * 0.12 - 0.04, fy - 0.008, t0 + 0.09), (sx * 0.12 + 0.04, fy + 0.004, t0 + 0.105),
              0.003)  # pocket flaps
        # the hood bunched round the back of his neck
        B('torso', 'hood', (-0.13, 0.0, t1 - 0.02), (0.13, 0.14, t1 + 0.04), 0.02)
        B('torso', 'hood2', (-0.11, D / 2 - 0.01, t1 - 0.1), (0.11, D / 2 + 0.03, t1 + 0.02), 0.015)
        # lanyard on his right (image left) and the card
        B('torso', 'lanyard', (-0.105, fy - 0.022, t1 - 0.15), (-0.09, fy - 0.014, t1), 0.003, rot=(0, -6, 0))
        B('torso', 'card', (-0.13, fy - 0.03, t1 - 0.235), (-0.07, fy - 0.018, t1 - 0.15), 0.006)
    else:
        # oversized hoodie: a slightly flared box, a darker hem band, a kangaroo pocket, the hood lying on her back
        B('torso', 'top', (-W / 2, -D / 2, t0 + 0.03), (W / 2, D / 2, t1), 0.03, taper=(0.9, 0.95))
        B('torso', 'top2', (-W / 2 - 0.005, -D / 2 - 0.005, t0), (W / 2 + 0.005, D / 2 + 0.005, t0 + 0.05), 0.014)
        B('torso', 'top2', (-0.1, fy - 0.012, t0 + 0.06), (0.1, fy + 0.01, t0 + 0.15), 0.01)
        B('torso', 'top2', (-0.12, D / 2 - 0.02, t1 - 0.14), (0.12, D / 2 + 0.035, t1 + 0.01), 0.02)
        # headphones round her neck: a band behind, two cups on her collarbones with teal faces
        B('torso', 'phone', (-0.12, 0.045, t1 - 0.005), (0.12, 0.08, t1 + 0.025), 0.008)
        for sx in (1, -1):
            B('torso', 'phone', (sx * 0.12 - 0.017, -0.07, t1 - 0.005), (sx * 0.12 + 0.017, 0.08, t1 + 0.025), 0.008)
            cx = sx * 0.115
            B('torso', 'phone', (cx - 0.045, fy - 0.035, t1 - 0.075), (cx + 0.045, fy + 0.01, t1 + 0.015), 0.016,
              rot=(0, 0, -sx * 18))
            B('torso', 'teal', (cx - 0.032, fy - 0.045, t1 - 0.062), (cx + 0.032, fy - 0.03, t1 + 0.002), 0.008,
              rot=(0, 0, -sx * 18), pivot=(cx, fy - 0.0125, t1 - 0.03))
        # lanyard straps and card
        for sx in (1, -1):
            B('torso', 'lanyard', (sx * 0.04 - 0.008, fy - 0.014, t1 - 0.16), (sx * 0.04 + 0.008, fy - 0.006,
                                                                                t1 - 0.06), 0.003,
              rot=(0, -sx * 16, 0))
        B('torso', 'card', (-0.03, fy - 0.022, t1 - 0.245), (0.03, fy - 0.01, t1 - 0.165), 0.006)
    B('torso', 'skin', (-0.05, -0.05, t1 - 0.01), (0.05, 0.05, t1 + 0.04), 0.01)

    # ---- arms: a sleeve, a cuff, a small chamfered hand ----
    sz = t1 - 0.025
    ax = W / 2 + 0.048
    a1 = sz - 0.25 * s
    for b, sx in (('arm.L', 1), ('arm.R', -1)):
        x = sx * ax
        B(b, 'top', (x - 0.046, -0.052, a1 + 0.03), (x + 0.046, 0.052, sz + 0.02), 0.018)
        B(b, 'hood' if E else 'top2', (x - 0.048, -0.054, a1), (x + 0.048, 0.054, a1 + 0.035), 0.012)
        B(b, 'skin', (x - 0.036, -0.04, a1 - 0.065), (x + 0.036, 0.04, a1 + 0.002), 0.016)

    # ---- head: a chamfered box, the face on its front ----
    h0 = neck + 0.03
    HW, HD, HH = 0.44 * s, 0.4 * s, 0.41 * s
    h1 = h0 + HH
    hy = -HD / 2  # face plane
    B('head', 'skin', (-HW / 2, -HD / 2, h0), (HW / 2, HD / 2, h1), 0.04)
    ez = h0 + (0.4 if E else 0.37) * HH
    ex = 0.088 * s
    for sx in (1, -1):
        x = sx * ex
        # eye: iris plate, pupil, a highlight toward her right-top (image left), lash bar on top
        B('head', 'iris', (x - 0.026, hy - 0.004, ez - 0.034), (x + 0.026, hy + 0.004, ez + 0.026), 0.006)
        B('head', 'pupil', (x - 0.015 + sx * 0.004, hy - 0.007, ez - 0.03), (x + 0.015 + sx * 0.004, hy, ez + 0.006),
          0.004)
        B('head', '#fbfbfb', (x - 0.02, hy - 0.009, ez + 0.002), (x - 0.006, hy - 0.002, ez + 0.016), 0.003)
        B('head', 'lash', (x - 0.032, hy - 0.007, ez + 0.024), (x + 0.032, hy + 0.002, ez + 0.038), 0.004,
          rot=(0, -sx * 6, 0))
        if E:
            B('head', 'brow', (x - 0.035, hy - 0.007, ez + 0.075), (x + 0.03, hy + 0.002, ez + 0.092), 0.004,
              rot=(0, sx * 5, 0))
        # glasses: four bars standing off the face, a temple back to the ear
        gw, gh, bar, gy = (0.116, 0.096, 0.02, hy - 0.024)
        gz = ez - 0.003
        for (lo, hi) in (((x - gw / 2, gy, gz + gh / 2 - bar), (x + gw / 2, gy + 0.012, gz + gh / 2)),
                         ((x - gw / 2, gy, gz - gh / 2), (x + gw / 2, gy + 0.012, gz - gh / 2 + bar)),
                         ((x - gw / 2, gy, gz - gh / 2 + bar), (x - gw / 2 + bar, gy + 0.012, gz + gh / 2 - bar)),
                         ((x + gw / 2 - bar, gy, gz - gh / 2 + bar), (x + gw / 2, gy + 0.012, gz + gh / 2 - bar))):
            # the side bars run between the top and bottom ones: overlapping bars render dark at the corners
            B('head', 'frame', lo, hi, 0.0)
        ox = sx * (ex + gw / 2)
        B('head', 'frame', (min(ox, sx * (HW / 2 + 0.01)), gy, gz + gh / 2 - 0.022),
          (max(ox, sx * (HW / 2 + 0.01)), gy + 0.012, gz + gh / 2 - 0.01), 0.004)
        B('head', 'frame', (sx * (HW / 2 + 0.002) - 0.008, gy, gz + gh / 2 - 0.022),
          (sx * (HW / 2 + 0.002) + 0.008, 0.02, gz + gh / 2 - 0.01), 0.004)
    B('head', 'frame', (-0.035, hy - 0.024, ez + 0.012), (0.035, hy - 0.012, ez + 0.024), 0.004)
    mz = h0 + 0.085 * s
    if E:
        # stubble: the lower face a shade darker, smile with a lift at her... his left corner, a one-plate nose
        B('head', 'beard', (-HW / 2 - 0.003, -HD / 2 - 0.003, h0 - 0.003), (HW / 2 + 0.003, HD / 2 * 0.2,
                                                                            h0 + 0.105), 0.04)
        B('head', 'mouth', (-0.04, hy - 0.008, mz - 0.006), (0.022, hy, mz + 0.006), 0.003)
        B('head', 'mouth', (0.016, hy - 0.008, mz - 0.002), (0.034, hy, mz + 0.016), 0.003, rot=(0, -30, 0))
        B('head', 'nose', (-0.012, hy - 0.016, ez - 0.075), (0.012, hy, ez - 0.045), 0.006)
    else:
        B('head', 'mouth', (-0.016, hy - 0.006, mz - 0.005), (0.016, hy, mz + 0.005), 0.003)

    if E:
        hair_eric(B, HW, HD, h0, h1, hy, s)
        top = h1 + 0.09
    else:
        hair_mio(B, HW, HD, h0, h1, hy)
        top = h1 + 0.13

    bones = [('root', (0, 0, 0), (0, 0, hip), None),
             ('torso', (0, 0, hip), (0, 0, neck), 'root'),
             ('head', (0, 0, neck), (0, 0, top), 'torso'),
             ('arm.L', (ax, 0, sz), (ax, 0, a1), 'torso'),
             ('arm.R', (-ax, 0, sz), (-ax, 0, a1), 'torso'),
             ('leg.L', (lx, 0, hip), (lx, 0, 0), 'root'),
             ('leg.R', (-lx, 0, hip), (-lx, 0, 0), 'root')]
    arm = kit.rig(ch + '-rig', bones, coll)
    objs = []
    for b, os_ in parts.items():
        for o in os_:
            kit.attach(o, arm, b)
            objs.append(o)
    HEAD[ch] = (0, 0, (h0 + h1) / 2 + 0.02)
    return arm, objs


def hair_mio(B, HW, HD, h0, h1, hy):
    """Dark green-black slabs, the teal underlayer at the nape and on her left (image right), bangs falling toward
    her right (image left), the long strand on her right, a messy bun high at the back on her left."""
    o = 0.028  # how far the hair stands off the head
    xl, xr = HW / 2 + o, -HW / 2 - o
    yb = HD / 2 + o
    top = h1 + 0.045
    B('head', 'hair', (xr, hy - 0.02, h1 - 0.03), (xl, yb, top), 0.035)
    # back: dark above, teal under at the nape
    B('head', 'hair', (xr, HD / 2 - 0.02, h0 + 0.12), (xl, yb, h1), 0.02)
    B('head', 'teal', (xr + 0.01, HD / 2 - 0.02, h0 + 0.02), (xl - 0.01, yb - 0.004, h0 + 0.13), 0.018)
    # her right side (image left): down to the jaw, a teal edge at the bottom
    B('head', 'hair', (xr, hy - 0.01, h0 + 0.13), (xr + o + 0.004, yb, h1), 0.016)
    B('head', 'teal', (xr + 0.003, hy + 0.04, h0 + 0.07), (xr + o, yb - 0.01, h0 + 0.135), 0.012)
    # her left side (image right): tucked behind the ear, teal showing under it, short above the ear in front
    B('head', 'hair', (xl - o - 0.004, -0.01, h0 + 0.17), (xl, yb, h1), 0.016)
    B('head', 'teal', (xl - o, -0.005, h0 + 0.06), (xl - 0.003, yb - 0.01, h0 + 0.175), 0.012)
    B('head', 'hair', (xl - o - 0.004, hy - 0.01, h0 + 0.27), (xl, -0.0, h1), 0.016)
    B('head', 'skin', (HW / 2 - 0.01, -0.065, h0 + 0.14), (HW / 2 + 0.018, -0.015, h0 + 0.22), 0.01)
    # bangs: four slabs, lowest on her right (image left), each leaning forward a little
    # bangs: four slabs that overlap, lowest on her right (image left), each standing a little further forward
    steps = [(-HW / 2 - 0.02, -0.1, 0.6, 0.012), (-0.12, 0.01, 0.7, 0.0), (-0.01, 0.12, 0.76, 0.008),
             (0.1, HW / 2 + 0.02, 0.8, -0.004)]
    for n, (a, b, f, dy) in enumerate(steps):
        B('head', 'hair2' if n == 1 else 'hair', (a, hy - 0.03 - dy, h0 + f * (h1 - h0)), (b, hy + 0.03, top), 0.016,
          rot=(-6, 0, 0))
    # the long strand on her right (image left), past the chin, teal on its inside
    B('head', 'hair', (xr - 0.012, hy - 0.025, h0 - 0.1), (xr + 0.03, hy + 0.06, h0 + 0.26), 0.014)
    B('head', 'teal', (xr + 0.028, hy - 0.015, h0 - 0.09), (xr + 0.036, hy + 0.05, h0 + 0.07), 0.003)
    # the bun: a turned chamfered cube high at the back on her left (image right), teal beneath, a loose wisp
    B('head', 'teal', (0.04, HD / 2 - 0.02, h1 - 0.06), (0.16, HD / 2 + 0.1, h1 + 0.04), 0.025, rot=(10, 0, 20))
    B('head', 'hair', (0.03, HD / 2 - 0.05, h1 - 0.0), (0.2, HD / 2 + 0.11, h1 + 0.15), 0.035, rot=(18, 12, 28))
    B('head', 'hair2', (0.17, HD / 2 + 0.02, h1 + 0.1), (0.21, HD / 2 + 0.05, h1 + 0.16), 0.008, rot=(0, 30, 0))


def hair_eric(B, HW, HD, h0, h1, hy, s):
    """Dark blond, combed back in three steps from a high hairline, the sides short above the ears, a short
    ponytail with a blue tie."""
    o = 0.024
    xl, xr = HW / 2 + o, -HW / 2 - o
    yb = HD / 2 + o
    B('head', 'hair', (xr, hy - 0.022, h1 - 0.075), (xl, yb, h1 + 0.03), 0.03)  # first step, front edge lowest
    B('head', 'hair2', (xr + 0.012, hy + 0.03, h1 + 0.0), (xl - 0.012, yb - 0.01, h1 + 0.06), 0.025)
    B('head', 'hair', (xr + 0.05, hy + 0.09, h1 + 0.03), (xl - 0.05, yb - 0.03, h1 + 0.085), 0.022)
    for sx in (1, -1):
        x0 = sx * (HW / 2 - 0.004)
        # side and back slabs sit 6 mm inside the combed steps: faces in one plane render as a black strip
        xo = sx * (HW / 2 + o - 0.006)
        B('head', 'hair3', (min(x0, xo), -0.005, h0 + 0.17), (max(x0, xo), yb - 0.006,
                                                                               h1 + 0.02), 0.014)
        B('head', 'skin', (min(sx * (HW / 2 - 0.01), sx * (HW / 2 + 0.018)), -0.06, h0 + 0.15),
          (max(sx * (HW / 2 - 0.01), sx * (HW / 2 + 0.018)), -0.01, h0 + 0.23), 0.01)
    B('head', 'hair', (xr + 0.006, HD / 2 - 0.02, h0 + 0.09), (xl - 0.006, yb - 0.006, h1 + 0.02), 0.02)
    # ponytail: a blue tie, then a short tapering tail
    pz = h0 + 0.2
    B('head', 'tie', (-0.035, yb - 0.005, pz - 0.035), (0.035, yb + 0.03, pz + 0.035), 0.01)
    B('head', 'hair', (-0.04, yb + 0.02, pz - 0.15), (0.04, yb + 0.07, pz + 0.03), 0.018, rot=(-12, 0, 0),
      taper=(1.25, 1.2))


HEAD = {}
HEAD_SPAN = 0.6
