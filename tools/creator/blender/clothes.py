# Clothes, modelled for each body as separate meshes: two outfits, a hoodie with trousers and a shirt with a skirt,
# plus sneakers for both.
#
# Every garment is a few lofted ring shells round the body (the trunk, the arms, the legs), sized from the body's own
# rings with room to hang. Then, in this order: a Shrinkwrap (outside, with an offset) so no part of the body can come
# through, a Solidify so the cloth has real thickness (hems, cuffs and the hood show a closed edge and an inside in a
# darker shade), and the body's skin weights, carried over to each garment point from the nearest point on the body.
import math

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

import body as BODY
import common as C
from shapes import Builder, frame, smooth

X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
NONE = lambda p: {}   # noqa: E731  (weights come from the body afterwards)

OUTFITS = {
    'hoodie': {'label': 'Hoodie and trousers', 'pieces': ['hoodie', 'zip', 'hood', 'trousers', 'sneakers']},
    'shirt': {'label': 'Shirt and skirt', 'pieces': ['shirt', 'collar', 'skirt', 'sneakers']},
}
COLOURS = {  # outer, inner
    'hoodie': ('#8d929c', '#5d626b'), 'zip': ('#e8e8ea', '#b8b8bc'), 'hood': ('#8d929c', '#4f545c'), 'trousers': ('#28314f', '#1a2036'),
    'shirt': ('#f3f2ee', '#c9c8c2'), 'collar': ('#f3f2ee', '#c9c8c2'), 'skirt': ('#2b3452', '#1c2238'),
    'sneakers': ('#2a2f3d', '#1a1d26'), 'sole': ('#f1f1f1', '#d8d8d8'),
}


def trunk_at(P, z):
    """The body's trunk ring (half width, front depth, back depth) at height z, interpolated."""
    rings = P['trunk']
    if z <= rings[0][0]:
        return rings[0][1:]
    for a, b in zip(rings, rings[1:]):
        if z <= b[0]:
            t = (z - a[0]) / (b[0] - a[0])
            return tuple(x + (y - x) * t for x, y in zip(a[1:], b[1:]))
    return rings[-1][1:]


def spine_y(J, z):
    pts = [J['Hips'], J['Spine02'], J['Spine01'], J['Spine'], J['neck']]
    if z <= pts[0].z:
        return pts[0].y
    for a, b in zip(pts, pts[1:]):
        if z <= b.z:
            return a.y + (b.y - a.y) * (z - a.z) / (b.z - a.z)
    return pts[-1].y


def trunk_heights(J, top, hem, n=6):
    """Ring heights for a top: from its hem up to just under the shoulders, evenly spaced."""
    end = top - 0.012
    return [hem + (end - hem) * i / (n - 1) for i in range(n)]


def shell(B, P, J, zs, room, n=12, part='cloth', cap_bottom=False):
    """A tube round the trunk through heights zs, each ring the body's ring plus room(z) (a number or a triple)."""
    rings = []
    for z in zs:
        rx, rf, rb = trunk_at(P, z)
        r = room(z)
        dx, df, db = (r, r, r) if isinstance(r, (int, float)) else r
        rings.append(B.ring(Vector((0, spine_y(J, z), z)), X, Y, rx + dx, rf + df, rb + db, n=n))
    B.loft(rings, part, NONE, cap_start=None if not cap_bottom else Vector((0, spine_y(J, zs[0]), zs[0] - 0.01)),
           cap_end=None)
    return rings


def open_loft(B, rings, part, cap_start=None):
    """A tube with its ends open (the Solidify closes the edges); cap_start closes the first end on a pole point."""
    vs = [[B.vert(p, {}) for p in r] for r in rings]
    n = len(rings[0])
    for a, b in zip(vs, vs[1:]):
        for i in range(n):
            j = (i + 1) % n
            B.face([a[i], a[j], b[j], b[i]], part)
    if cap_start is not None:
        pv = B.vert(cap_start, {})
        for i in range(n):
            B.face([vs[0][(i + 1) % n], vs[0][i], pv], part)
    return vs


def limb(B, pts, radii, ref, part, n=8, closed_top=False):
    """Rings along a polyline of centres, open at the far end. closed_top closes the near end (a sleeve's top sits
    inside the body of the top; closed, its inside never shows when the arm swings)."""
    rings = []
    for i, (c, r) in enumerate(zip(pts, radii)):
        d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        u, v = frame(d, ref)
        rings.append(B.ring(c, u, v, r, r, n=n))
    cap = pts[0] - (pts[1] - pts[0]).normalized() * radii[0] * 0.6 if closed_top else None
    return open_loft(B, rings, part, cap)


def arm_points(J, side, upto=1.0):
    sh, el, wr = J[side + 'Arm'], J[side + 'ForeArm'], J[side + 'Hand']
    sx = 1 if side == 'Left' else -1
    start = Vector((0.05 * sx, sh.y, sh.z - 0.012))
    pts = [start, sh, (sh + el) / 2, el, (el + wr) / 2, wr]
    return pts


def hoodie(P, J):
    B = Builder()
    top = P['trunk'][-2][0]
    zs = trunk_heights(J, top, J['Hips'].z - 0.024) + [top + 0.006, P['trunk'][-1][0] + 0.004]
    # loose: more room at the hem and over the chest, snug round the neck opening
    room = lambda z: (0.022 + 0.012 * smooth(J['Hips'].z + 0.05, J['Hips'].z - 0.02, z), 0.02 + 0.008 * smooth(J['Hips'].z + 0.05, J['Hips'].z - 0.02, z), 0.02)  # noqa: E731
    rings = []
    for z in zs:
        rx, rf, rb = trunk_at(P, z)
        dx, df, db = room(z)
        if z > top:
            dx, df, db = 0.012, 0.012, 0.012
        rings.append(B.ring(Vector((0, spine_y(J, z), z)), X, Y, rx + dx, rf + df, rb + db, n=12))
    # the last ring is the neck opening: round, a little wider than the neck
    nr = P['neck'][2] + 0.016
    rings[-1] = B.ring(Vector((0, J['neck'].y, zs[-1])), X, Y, nr, nr, nr, n=12)
    open_loft(B, rings, 'hoodie')
    ra = P['arm']
    for side in ('Left', 'Right'):
        pts = arm_points(J, side)
        # baggy sleeves that widen a little towards the cuff, then close in at the wrist
        radii = [ra[0] + 0.012, ra[0] + 0.018, ra[1] + 0.022, ra[2] + 0.026, ra[3] + 0.03, ra[4] + 0.022]
        limb(B, pts, radii, Y, 'sleeve', closed_top=True)
    return B


def zip_strip(P, J):
    """The hoodie's zip: a narrow strip down the middle of the front, standing just off the cloth."""
    B = Builder()
    top = P['trunk'][-2][0]
    zs = trunk_heights(J, top, J['Hips'].z - 0.023)
    col = []
    for z in zs:
        rx, rf, rb = trunk_at(P, z)
        dx, df, db = (0.022 + 0.012 * smooth(J['Hips'].z + 0.05, J['Hips'].z - 0.02, z), 0.02 + 0.008 * smooth(J['Hips'].z + 0.05, J['Hips'].z - 0.02, z), 0.02)
        y = spine_y(J, z) - (rf + df) - 0.0035
        col.append((B.vert(Vector((-0.0045, y, z)), {}), B.vert(Vector((0.0045, y, z)), {})))
    for (a, b), (c, d) in zip(col, col[1:]):
        B.face([a, b, d, c], 'zip')
    return B


def hood(P, J):
    """A hood lying down on the shoulders and back: a pocket of cloth round the back of the neck, open at the top,
    so its inside shows (Solidify gives it thickness and the inner colour)."""
    B = Builder()
    zb = P['trunk'][-1][0]
    nr = P['neck'][2] + 0.02
    cy = J['neck'].y
    cols = 11
    grid = []
    # rows: 0 = the collar edge round the neck, then out and down the back, then up to the hood's rim
    # (distance from the neck, height, extra lift off the back): collar, over the shoulders, the hood's back, its
    # lowest point, then the rim coming back up and in, which leaves the opening facing up
    rows = [(nr, zb + 0.014, 0.0), (nr + 0.03, zb + 0.018, 0.0), (nr + 0.05, zb + 0.0, 0.003),
            (nr + 0.056, zb - 0.04, 0.006), (nr + 0.05, zb - 0.078, 0.012), (nr + 0.05, zb - 0.07, 0.04),
            (nr + 0.048, zb - 0.035, 0.05), (nr + 0.044, zb - 0.012, 0.048)]
    for i in range(cols):
        a = math.radians(-78 + 156 * i / (cols - 1))      # from the left side, round the back, to the right side
        s, c = math.sin(a), math.cos(a)
        backness = max(0.0, c)                             # 1 at the back, 0 at the sides
        row = []
        for k, (r, z, lift) in enumerate(rows):
            # the hood is deep at the back and only a collar at the front
            rr = nr + (r - nr) * (0.25 + 0.75 * backness ** 0.7)
            zz = zb + 0.012 + (z - zb - 0.012) * (0.2 + 0.8 * backness)
            row.append(B.vert(Vector((s * rr, cy + c * rr + lift * backness, zz)), {}))
        grid.append(row)
    for i in range(cols - 1):
        for k in range(len(rows) - 1):
            B.face([grid[i][k], grid[i][k + 1], grid[i + 1][k + 1], grid[i + 1][k]], 'hood')
    return B


def trousers(P, J):
    B = Builder()
    # pelvis: from the waist down to below the crotch, closed underneath
    hz = J['Hips'].z
    zs = [hz - 0.041, hz - 0.019, hz + 0.006, hz + 0.031]
    shell(B, P, J, zs, lambda z: 0.016, n=12, part='trousers', cap_bottom=True)
    rl = P['leg']
    for side in ('Left', 'Right'):
        sx = 1 if side == 'Left' else -1
        hip, knee, ank = J[side + 'UpLeg'], J[side + 'Leg'], J[side + 'Foot']
        top = Vector((P['leg_x'][0] * sx, hip.y, hip.z + 0.015))
        bot = Vector((P['leg_x'][1] * sx + 0.004 * sx, ank.y, ank.z - 0.012))
        pts, radii = [], []
        for t, r in ((0.0, rl[0] + 0.02), (0.25, rl[1] + 0.02), (0.5, rl[2] + 0.024), (0.75, rl[3] + 0.026),
                     (1.0, rl[4] + 0.03)):
            c = top.lerp(bot, t)
            c.y = hip.y + (knee.y - hip.y) * min(1, t * 2) if t <= 0.5 else knee.y + (ank.y - knee.y) * (t - 0.5) * 2
            pts.append(c)
            radii.append(r)
        limb(B, pts, radii, X, 'trouser-leg', n=10)
    return B


def shirt(P, J):
    B = Builder()
    top = P['trunk'][-2][0]
    zs = trunk_heights(J, top, J['Hips'].z - 0.004) + [top + 0.006, P['trunk'][-1][0] + 0.004]
    rings = []
    for z in zs:
        rx, rf, rb = trunk_at(P, z)
        d = 0.011 if z <= top else 0.009
        rings.append(B.ring(Vector((0, spine_y(J, z), z)), X, Y, rx + d, rf + d, rb + d, n=12))
    nr = P['neck'][2] + 0.01
    rings[-1] = B.ring(Vector((0, J['neck'].y, zs[-1])), X, Y, nr, nr, nr, n=12)
    open_loft(B, rings, 'shirt')
    ra = P['arm']
    for side in ('Left', 'Right'):
        pts = arm_points(J, side)
        sh, el = pts[1], pts[3]
        end = sh.lerp(el, 0.55)
        # short sleeves, a little flared at the end
        limb(B, [pts[0], sh, sh.lerp(el, 0.3), end], [ra[0] + 0.008, ra[0] + 0.011, ra[1] + 0.014, ra[1] + 0.018],
             Y, 'sleeve', closed_top=True)
    return B


def collar(P, J):
    """A shirt collar: a band standing round the neck, then folded down over it, open at the front."""
    B = Builder()
    zb = P['trunk'][-1][0] + 0.004
    nr = P['neck'][2] + 0.012
    cy = J['neck'].y
    cols = 13
    grid = []
    rows = [(nr, zb), (nr + 0.002, zb + 0.022), (nr + 0.02, zb + 0.014), (nr + 0.034, zb - 0.006)]
    for i in range(cols):
        a = math.radians(-160 + 320 * i / (cols - 1))     # a gap at the front (angle 180 is the front)
        s, c = math.sin(a), math.cos(a)
        front = max(0.0, -c)
        row = []
        for k, (r, z) in enumerate(rows):
            # the points of the collar reach further down at the front
            zz = z - (0.012 * front if k == 3 else 0)
            rr = r + (0.008 * front if k == 3 else 0)
            row.append(B.vert(Vector((s * rr, cy + c * rr, zz)), {}))
        grid.append(row)
    for i in range(cols - 1):
        for k in range(len(rows) - 1):
            B.face([grid[i][k], grid[i][k + 1], grid[i + 1][k + 1], grid[i + 1][k]], 'collar')
    return B


def skirt(P, J):
    """A short pleated skirt: 16 panels alternating in and out, from the waist to mid thigh."""
    B = Builder()
    zw = J['Hips'].z + 0.039
    zh = J['Hips'].z - 0.09
    n = 16
    rings = []
    for k, (z, flare) in enumerate(((zw, 0.0), (zw - 0.03, 0.01), (zw - 0.075, 0.03), (zh, 0.052))):
        rx, rf, rb = trunk_at(P, max(z, P['trunk'][1][0]))
        c = Vector((0, spine_y(J, z), z))
        pts = []
        for i in range(n):
            a = 2 * math.pi * i / n
            pleat = (0.006 if i % 2 else -0.002) * (k / 3)
            rr = 1.0
            pts.append(c + X * ((rx + 0.02 + flare + pleat) * math.cos(a) * rr) +
                       Y * ((rf if math.sin(a) < 0 else rb) + 0.02 + flare + pleat) * math.sin(a))
        rings.append(pts)
    open_loft(B, rings, 'skirt')
    return B


def sneakers(P, J):
    """Low sneakers: an upper open at the ankle, and a thick flat sole."""
    B = Builder()
    f = P['foot']
    for side in ('Left', 'Right'):
        sx = 1 if side == 'Left' else -1
        ank = J[side + 'Foot']
        ax = P['leg_x'][1] * sx
        ys = [ank.y + f['heel'] + 0.012, ank.y + f['heel'] * 0.2, ank.y - f['toe'] * 0.4, ank.y - f['toe'] * 0.8,
              ank.y - f['toe'] - 0.016]
        hs = [f['h'] * 1.05, f['h'] * 1.12, f['h'] * 0.85, f['h'] * 0.62, f['h'] * 0.3]
        ws = [f['w'] + 0.008, f['w'] + 0.012, f['w'] + 0.016, f['w'] + 0.014, f['w'] * 0.6]
        sole = 0.014
        rings = []
        for y, h, w in zip(ys, hs, ws):
            c = Vector((ax + 0.004 * sx * (ank.y - y) / 0.1, y, sole + h / 2))
            rings.append(B.ring(c, X, Z, w, h / 2, h / 2, n=8))
        B.loft(rings, 'sneakers', NONE, cap_start=None, cap_end=Vector((ax + 0.005 * sx, ys[-1] - 0.006, sole + 0.012)))
        # sole: a flat slab under the whole shoe
        srings = []
        for y, w in ((ys[0] + 0.004, ws[0]), (ys[1], ws[1] + 0.003), (ys[2], ws[2] + 0.004), (ys[3], ws[3] + 0.003),
                     (ys[4] - 0.004, ws[3] * 0.7)):
            c = Vector((ax + 0.004 * sx * (ank.y - y) / 0.1, y, sole / 2))
            srings.append(B.ring(c, X, Z, w, sole / 2 + 0.002, sole / 2 + 0.002, n=8, phase=0.5,
                                 squash=lambda p, c_, s_: Vector((p.x, p.y, max(0.0, min(sole + 0.004, p.z))))))
        B.loft(srings, 'sole', NONE)
    return B


BUILDERS = {'hoodie': hoodie, 'zip': zip_strip, 'hood': hood, 'trousers': trousers, 'shirt': shirt, 'collar': collar, 'skirt': skirt,
            'sneakers': sneakers}
THICK = {'hoodie': 0.008, 'zip': 0.002, 'hood': 0.008, 'trousers': 0.007, 'shirt': 0.005, 'collar': 0.005, 'skirt': 0.006,
         'sneakers': 0.006}
ROOM = {'hoodie': 0.012, 'zip': 0.012, 'hood': 0.01, 'trousers': 0.01, 'shirt': 0.008, 'collar': 0.007, 'skirt': 0.012,
        'sneakers': 0.006}


# which pieces of the body a part of a garment takes its weights from (so the side of a top under the arm follows
# the chest, not the arm next to it)
FROM = {'sleeve': {'arm', 'hand'}, 'trouser-leg': {'leg'}, 'trousers': {'trunk', 'leg'}, 'skirt': {'trunk', 'leg'},
        'sneakers': {'foot', 'leg'}, 'sole': {'foot', 'leg'}}
TRUNK = {'trunk', 'neck'}


def carry_weights(obj, body_obj, body, parts):
    """Each garment point takes the weights of the nearest point on the matching part of the body (blended over that
    body triangle)."""
    me, bm_ = obj.data, body_obj.data
    pts = [v.co for v in bm_.vertices]
    tris = [list(p.vertices) for p in bm_.polygons]
    body_parts = body_obj['parts']
    trees = {}

    def tree(allowed):
        key = frozenset(allowed)
        if key not in trees:
            keep = [i for i, p in enumerate(body_parts) if p in allowed]
            trees[key] = (BVHTree.FromPolygons(pts, [tris[i] for i in keep]), keep)
        return trees[key]
    part_of = {}
    for p, part in zip(me.polygons, parts):
        for vi in p.vertices:
            part_of.setdefault(vi, part)
    gnames = {g.index: g.name for g in body_obj.vertex_groups}
    vw = [{gnames[g.group]: g.weight for g in v.groups} for v in bm_.vertices]
    for v in me.vertices:
        bvh, keep = tree(FROM.get(part_of.get(v.index), TRUNK))
        loc, nrm, idx, dist = bvh.find_nearest(v.co)
        poly = tris[keep[idx]]
        # inverse-distance blend of the triangle's corners
        ws = [1.0 / max(1e-6, (pts[i] - loc).length) for i in poly]
        total = sum(ws)
        acc = {}
        for i, w in zip(poly, ws):
            for g, x in vw[i].items():
                acc[g] = acc.get(g, 0) + x * w / total
        for g, x in acc.items():
            if x < 0.01:
                continue
            grp = obj.vertex_groups.get(g) or obj.vertex_groups.new(name=g)
            grp.add([v.index], x, 'REPLACE')


def face_out(obj, body_obj):
    """Turn the garment's faces to point away from the body (the Solidify then grows the cloth inwards)."""
    bvh = BVHTree.FromPolygons([v.co for v in body_obj.data.vertices], [list(p.vertices) for p in body_obj.data.polygons])
    me = obj.data
    score = 0.0
    for p in me.polygons:
        loc = bvh.find_nearest(p.center)[0]
        score += p.normal.dot(p.center - loc) * p.area
    if score < 0:
        for p in me.polygons:
            p.flip()
        me.update()


def skirt_weights(obj, body):
    """A skirt hangs from the hips: the waist follows the hips only, the hem shares with the thighs, so a stride
    swings it instead of tearing it."""
    names = C.rig_names(body)
    hips = obj.vertex_groups.get(names['Hips']) or obj.vertex_groups.new(name=names['Hips'])
    zs = [v.co.z for v in obj.data.vertices]
    z0, z1 = min(zs), max(zs)
    for v in obj.data.vertices:
        t = (v.co.z - z0) / max(1e-6, z1 - z0)        # 1 at the waist, 0 at the hem
        keep = 0.45 * (1 - t)                            # how much the legs still pull at this height
        for g in list(v.groups):
            name = obj.vertex_groups[g.group].name
            if name != names['Hips']:
                g.weight *= keep
        others = sum(g.weight for g in v.groups if obj.vertex_groups[g.group].name != names['Hips'])
        hips.add([v.index], max(0.0, 1 - others), 'REPLACE')


def build(body, arm, body_obj, H):
    P = BODY.PARAMS[body]

    J = {k: v / H for k, v in C.joints(arm, body).items()}
    made = {}
    for piece, make in BUILDERS.items():
        B = make(P, J)
        bm = B.finish()
        me = bpy.data.meshes.new(f'{body}-{piece}')
        parts = [B.part[f] for f in bm.faces]
        bm.to_mesh(me)
        bm.free()
        me.transform(__import__('mathutils').Matrix.Scale(H, 4))
        obj = bpy.data.objects.new(f'{body}-{piece}', me)
        bpy.context.scene.collection.objects.link(obj)
        outer, inner = COLOURS[piece]
        me.materials.append(C.flat_material(f'{piece}', C.hex_rgba(outer)))
        if 'sole' in parts:
            me.materials.append(C.flat_material('sole', C.hex_rgba(COLOURS['sole'][0])))
            for p, part in zip(me.polygons, parts):
                p.material_index = 1 if part == 'sole' else 0
        me.materials.append(C.flat_material(f'{piece}-inside', C.hex_rgba(inner)))
        for p in me.polygons:
            p.use_smooth = P['shade'] == 'smooth'
        face_out(obj, body_obj)
        carry_weights(obj, body_obj, body, parts)
        if piece == 'skirt':
            skirt_weights(obj, body)
        sw = obj.modifiers.new('clear-of-the-body', 'SHRINKWRAP')
        sw.target = body_obj
        sw.wrap_method = 'NEAREST_SURFACEPOINT'
        sw.wrap_mode = 'OUTSIDE'
        sw.offset = ROOM[piece] * H
        so = obj.modifiers.new('thickness', 'SOLIDIFY')
        so.thickness = THICK[piece] * H
        so.offset = -1
        so.use_rim = True
        so.use_even_offset = False
        so.material_offset = len(me.materials) - 1
        so.material_offset_rim = len(me.materials) - 1
        obj.parent = arm
        obj.matrix_parent_inverse = arm.matrix_world.inverted()
        mod = obj.modifiers.new('rig', 'ARMATURE')
        mod.object = arm
        obj['outfits'] = [k for k, o in OUTFITS.items() if piece in o['pieces']]
        made[piece] = obj
    return made
