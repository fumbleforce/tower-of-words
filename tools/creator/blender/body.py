# The bare chibi body, modelled from simple shapes on the original's own skeleton.
#
# Torso: lofted rings (a box-modelled trunk, 10 sides). Neck, arms and legs: tapered 8-sided tubes. Head: a low-poly
# sphere whose front is fitted onto the original's face (its skin triangles only, never the hair), so the cheeks and
# chin keep the original's shape. Ears, hands (a mitten with a thumb) and feet are small lofts. Every piece is a closed
# shell; they overlap where they meet and all wear one flat skin colour, so no join shows.
#
# Weights are written as the shapes are made: each vertex takes the bones of the chain it sits on (spine, arm, leg),
# blended smoothly at the joints, with the neck, shoulders and hips blended into the trunk.
import os

import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

import common as C
import face as F
import reference as R
from shapes import Builder, chain_weights, frame, mix, smooth

X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
# the jaw's sides keep the modelled shape (the original's side locks hang there): |x| above, z below
JAW = {'eric': (1.0, 0.0), 'mio': (0.1, 0.62)}

# All sizes are fractions of the model's height. Trunk rings: (z, half width, half depth front, half depth back).
PARAMS = {
    'eric': {
        'shade': 'smooth',
        'trunk': [(0.27, 0.05, 0.036, 0.038), (0.286, 0.078, 0.05, 0.056), (0.315, 0.087, 0.055, 0.06),
                  (0.352, 0.083, 0.055, 0.057), (0.39, 0.079, 0.054, 0.055), (0.43, 0.085, 0.06, 0.057),
                  (0.462, 0.086, 0.058, 0.054), (0.49, 0.08, 0.048, 0.047), (0.507, 0.048, 0.036, 0.034)],
        'neck': (0.47, 0.575, 0.034),            # z from, z to, radius
        # head rings round the skull's centre line (x 0, y head_y): (z, half width, depth to the front, to the back);
        # the first entry is the chin point (at y 'chin'), the last the crown
        'head_y': -0.012,
        'head': [(0.533,), (0.543, 0.075, 0.15, 0.085), (0.565, 0.125, 0.163, 0.12), (0.605, 0.158, 0.17, 0.145),
                 (0.66, 0.171, 0.172, 0.15), (0.72, 0.171, 0.172, 0.16), (0.78, 0.164, 0.166, 0.165),
                 (0.84, 0.143, 0.146, 0.15), (0.89, 0.1, 0.105, 0.11), (0.918,)],
        'chin': -0.135,
        'fit_face': True,
        'ear': {'base': (0.13, -0.012, 0.662), 'tip': (0.184, -0.02, 0.668), 'r': (0.032, 0.048), 'mid': 0.8},
        'arm': [0.037, 0.034, 0.03, 0.028, 0.023],   # radius at shoulder, mid upper arm, elbow, mid forearm, wrist
        'hand': {'len': 0.078, 'w': [0.022, 0.031, 0.033, 0.03], 't': [0.018, 0.02, 0.018, 0.014], 'thumb': 0.01},
        'leg_x': (0.05, 0.07),                   # leg centre x at the top and at the ankle
        'leg': [0.056, 0.051, 0.04, 0.041, 0.029],   # radius at the top, mid thigh, knee, mid calf, ankle
        'foot': {'heel': 0.032, 'toe': 0.108, 'w': 0.035, 'h': 0.05},
    },
    'mio': {
        'shade': 'flat',
        'trunk': [(0.303, 0.05, 0.036, 0.04), (0.32, 0.08, 0.052, 0.06), (0.346, 0.089, 0.057, 0.064),
                  (0.376, 0.08, 0.053, 0.056), (0.405, 0.07, 0.05, 0.05), (0.435, 0.077, 0.06, 0.05),
                  (0.46, 0.078, 0.055, 0.049), (0.482, 0.071, 0.043, 0.042), (0.5, 0.04, 0.031, 0.03)],
        'neck': (0.47, 0.56, 0.03),
        'head_y': 0.0,
        'head': [(0.504,), (0.52, 0.06, 0.13, 0.08), (0.55, 0.11, 0.155, 0.12), (0.59, 0.145, 0.168, 0.15),
                 (0.64, 0.172, 0.172, 0.16), (0.7, 0.19, 0.175, 0.17), (0.76, 0.184, 0.172, 0.175),
                 (0.82, 0.163, 0.15, 0.16), (0.865, 0.12, 0.11, 0.12), (0.895,)],
        'chin': -0.115,
        'fit_face': True,
        'ear': {'base': (0.155, 0.025, 0.635), 'tip': (0.232, 0.05, 0.645), 'r': (0.03, 0.05), 'mid': 0.55},
        'arm': [0.033, 0.03, 0.026, 0.024, 0.02],
        'hand': {'len': 0.07, 'w': [0.02, 0.028, 0.03, 0.027], 't': [0.016, 0.018, 0.016, 0.013], 'thumb': 0.009},
        'leg_x': (0.05, 0.074),
        'leg': [0.057, 0.051, 0.036, 0.037, 0.026],
        'foot': {'heel': 0.03, 'toe': 0.1, 'w': 0.032, 'h': 0.046},
    },
}


def build(body, arm, original):
    P = PARAMS[body]
    H = C.height(original)
    J = {k: v / H for k, v in C.joints(arm, body).items()}   # joints in height units
    names = C.rig_names(body)
    B = Builder()
    spine = [('Hips', Vector((0, J['Hips'].y, 0.2))), ('Spine02', J['Spine02']), ('Spine01', J['Spine01']),
             ('Spine', J['Spine']), ('neck', J['neck']), ('Head', J['Head']), (None, J['head_end'])]
    spine_w = lambda p: chain_weights(Vector((0, p.y, p.z)), spine, 0.018)   # noqa: E731

    def spine_y(z):
        pts = [J['Hips'], J['Spine02'], J['Spine01'], J['Spine'], J['neck']]
        if z <= pts[0].z:
            return pts[0].y
        for a, b in zip(pts, pts[1:]):
            if z <= b.z:
                return a.y + (b.y - a.y) * (z - a.z) / (b.z - a.z)
        return pts[-1].y

    # ---- trunk ----
    def trunk_w(p):
        w = spine_w(p)
        side = 'Left' if p.x > 0 else 'Right'
        # the seat and hips follow the thigh a little; the shoulder corners follow the collarbone and upper arm
        hip = smooth(J['Hips'].z, J[side + 'UpLeg'].z - 0.02, p.z) * smooth(0.015, 0.05, abs(p.x)) * 0.55
        top = smooth(0.045, 0.075, abs(p.x)) * smooth(J['Spine'].z - 0.02, J[side + 'Arm'].z, p.z)
        w = mix((1 - hip - top * 0.6, w), (hip, {side + 'UpLeg': 1}), (top * 0.6, {side + 'Shoulder': 0.6, side + 'Arm': 0.4}))
        return w
    rings = [B.ring(Vector((0, spine_y(z), z)), X, Y, rx, rf, rb, n=10) for z, rx, rf, rb in P['trunk']]
    B.loft(rings, 'trunk', trunk_w, cap_start=Vector((0, spine_y(P['trunk'][0][0]), P['trunk'][0][0] - 0.012)),
           cap_end=Vector((0, spine_y(P['trunk'][-1][0]), P['trunk'][-1][0] + 0.004)))

    # ---- neck ----
    z0, z1, r = P['neck']
    rings = [B.ring(Vector((0, J['neck'].y + (z - J['neck'].z) * 0.1, z)), X, Y, r * s, r * s * 0.92, r * s, n=8)
             for z, s in ((z0, 1.05), ((z0 + z1) / 2, 1.0), (z1, 0.95))]
    B.loft(rings, 'neck', spine_w)

    # ---- head ----
    head_w = lambda p: {'Head': 1.0}   # noqa: E731
    hy, rings = P['head_y'], P['head']
    head_rings = [B.ring(Vector((0, hy, z)), X, Y, rx, rf, rb, n=16, phase=0.0) for z, rx, rf, rb in rings[1:-1]]
    vs = B.loft(head_rings, 'head', head_w, cap_start=Vector((0, P['chin'], rings[0][0])),
                cap_end=Vector((0, hy, rings[-1][0])))
    centre = Vector((0, hy, (rings[0][0] + rings[-1][0]) / 2))
    if P['fit_face']:
        head_verts = list({v for f, part in B.part.items() if part == 'head' for v in f.verts})
        fit_face(B, head_verts, centre, body, original, H)

    # ---- ears ----
    e = P['ear']
    for sx in (1, -1):
        base = Vector((e['base'][0] * sx, e['base'][1], e['base'][2]))
        tip = Vector((e['tip'][0] * sx, e['tip'][1], e['tip'][2]))
        d = tip - base
        u, v = frame(d, Z)
        mid = base + d * e['mid']
        rings = [B.ring(base, u, v, e['r'][1], e['r'][0], n=6, phase=0.5),
                 B.ring(mid, u, v, e['r'][1] * 0.8, e['r'][0] * 0.55, n=6, phase=0.5)]
        B.loft(rings, 'ear', head_w, cap_end=tip)

    # ---- arms and hands ----
    for side in ('Left', 'Right'):
        sx = 1 if side == 'Left' else -1
        sh, el, wr = J[side + 'Arm'], J[side + 'ForeArm'], J[side + 'Hand']
        dh = (wr - el).normalized()
        tip = wr + dh * P['hand']['len']
        chain = [(side + 'Shoulder', J[side + 'Shoulder']), (side + 'Arm', sh), (side + 'ForeArm', el),
                 (side + 'Hand', wr), (None, tip)]
        arm_w = lambda p, chain=chain: chain_weights(p, chain, 0.02)   # noqa: E731
        start = Vector((0.045 * sx, sh.y, sh.z - 0.02))
        ra = P['arm']
        pts = [(start, ra[0] * 0.8), (sh, ra[0]), ((sh + el) / 2, ra[1]), (el, ra[2]), ((el + wr) / 2, ra[3]), (wr + dh * 0.004, ra[4])]
        rings = []
        for i, (c, rr) in enumerate(pts):
            d = (pts[min(i + 1, len(pts) - 1)][0] - pts[max(i - 1, 0)][0]).normalized()
            u, v = frame(d, Y)
            rings.append(B.ring(c, u, v, rr, rr, n=8))
        B.loft(rings, 'arm', arm_w)
        hand(B, P['hand'], wr, dh, sx, arm_w)

    # ---- legs and feet ----
    for side in ('Left', 'Right'):
        sx = 1 if side == 'Left' else -1
        hip, knee, ank, toe = J[side + 'UpLeg'], J[side + 'Leg'], J[side + 'Foot'], J[side + 'Toe']
        top = Vector((P['leg_x'][0] * sx, hip.y, hip.z + 0.02))
        bot = Vector((P['leg_x'][1] * sx, ank.y, ank.z))
        f = P['foot']
        toe_tip = Vector((bot.x + 0.004 * sx, ank.y - f['toe'], 0.015))
        chain = [(side + 'UpLeg', hip), (side + 'Leg', knee), (side + 'Foot', ank), (side + 'Toe', toe), (None, toe_tip)]
        leg_w = lambda p, chain=chain, side=side: mix(   # noqa: E731
            (1 - smooth(hip.z - 0.01, hip.z + 0.03, p.z) * 0.5, chain_weights(p, chain, 0.022)),
            (smooth(hip.z - 0.01, hip.z + 0.03, p.z) * 0.5, {'Hips': 1}))
        rl = P['leg']
        zs = [top.z, (top.z + knee.z) / 2, knee.z, (knee.z + ank.z) / 2, ank.z]
        rings = []
        for z, rr in zip(zs, rl):
            t = (top.z - z) / (top.z - bot.z)
            c = top.lerp(bot, t)
            c.y = hip.y + (knee.y - hip.y) * min(1, t * 1.9) if z > knee.z else knee.y + (ank.y - knee.y) * (knee.z - z) / (knee.z - ank.z)
            rings.append(B.ring(c, X, Y, rr, rr * 0.95, rr * 1.02, n=8))
        B.loft(rings, 'leg', leg_w, cap_end=Vector((bot.x, bot.y, bot.z - 0.01)))
        foot(B, f, bot, toe_tip, sx, lambda p, chain=chain: chain_weights(p, chain, 0.015))

    bm = B.finish()
    me = bpy.data.meshes.new(body + '-body')
    parts = {f.index: B.part[f] for f in bm.faces}
    weights = {v.index: B.weights[v] for v in bm.verts}
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(body + '-body', me)
    bpy.context.scene.collection.objects.link(obj)
    me.transform(Matrix.Scale(H, 4))      # height units to the model's own size
    # vertex groups by the rig's bone names
    for v, w in weights.items():
        total = sum(w.values()) or 1
        for bone, x in w.items():
            name = names.get(bone, bone)
            g = obj.vertex_groups.get(name) or obj.vertex_groups.new(name=name)
            g.add([v], x / total, 'REPLACE')
    obj['parts'] = [parts[i] for i in range(len(parts))]
    for p in me.polygons:
        p.use_smooth = P['shade'] == 'smooth'
    return obj


def hand(B, h, wr, d, sx, weigh):
    """A mitten along d from the wrist: wide front to back (the palm faces the body), with a thumb at the front."""
    u, v = frame(d, Y)          # u: across the hand, front-back; v: thickness
    ls = [0.0, 0.3, 0.62, 0.9]
    rings = [B.ring(wr + d * (h['len'] * t), u, v, w, th, n=8) for t, w, th in zip(ls, h['w'], h['t'])]
    B.loft(rings, 'hand', weigh, cap_start=None, cap_end=wr + d * h['len'])
    # thumb: from the front edge of the palm, pointing forward and down along the hand
    base = wr + d * (h['len'] * 0.28) - u * (h['w'][1] * 0.75)
    td = (d * 0.75 - u * 0.65).normalized()
    tu, tv = frame(td, v)
    r = h['thumb']
    rings = [B.ring(base, tu, tv, r, r, n=6), B.ring(base + td * 0.022, tu, tv, r * 0.9, r * 0.85, n=6)]
    B.loft(rings, 'hand', weigh, cap_end=base + td * 0.032)


def foot(B, f, ankle, toe_tip, sx, weigh):
    """A bare foot along -Y: heel behind the ankle, flat sole on the ground, rounded toes."""
    ys = [ankle.y + f['heel'], ankle.y + f['heel'] * 0.3, ankle.y - f['toe'] * 0.35, ankle.y - f['toe'] * 0.75]
    hs = [f['h'] * 0.62, f['h'], f['h'] * 0.72, f['h'] * 0.52]
    ws = [f['w'] * 0.82, f['w'], f['w'] * 1.06, f['w'] * 0.96]
    rings = []
    for y, hh, ww in zip(ys, hs, ws):
        c = Vector((ankle.x + (toe_tip.x - ankle.x) * (ankle.y - y) / max(1e-6, ankle.y - toe_tip.y), y, hh / 2))
        rings.append(B.ring(c, X, Z, ww, hh / 2, hh / 2, n=8))
    B.loft(rings, 'foot', weigh, cap_start=Vector((ankle.x, ys[0] + 0.008, hs[0] * 0.45)), cap_end=toe_tip)


def fit_face(B, verts, centre, body, original, H):
    """Move the front of the skull onto the original's face (skin triangles only), then ease the rest of the head
    into it so there is no step at the edge of the face."""
    keep = F.skin_triangles(body, original)
    W = original.matrix_world
    me = original.data
    pts = [(W @ v.co) / H for v in me.vertices]
    polys = [list(me.polygons[i].vertices) for i in keep]
    bvh = BVHTree.FromPolygons(pts, polys)
    disp = {}
    for v in verts:
        d = (v.co - centre)
        if d.normalized().y > -0.25 or (abs(v.co.x) > JAW[body][0] and v.co.z < JAW[body][1]):
            continue
        hit = bvh.ray_cast(centre, d.normalized(), d.length * 1.6)
        if hit[0] is not None and (hit[0] - centre).length > d.length * 0.6:
            disp[v] = hit[0] - v.co
    print('FIT', len(disp), 'of', len(verts), 'head points moved onto the face; largest move',
          round(max((d.length for d in disp.values()), default=0), 4))
    faced = set(disp)
    # everywhere else the skull stays inside the original's hair shell (the hair was the back of its head), so no
    # skin shows between the locks
    hair = R.hair_polys(body, original)
    hbvh = BVHTree.FromPolygons(pts, [list(me.polygons[i].vertices) for i in hair])
    tucked = 0
    for v in verts:
        # the middle of the face stays where it was fitted; its sides go under the side locks too
        if v in disp and abs(v.co.x) < 0.1:
            continue
        now = v.co + disp.get(v, Vector())
        d = now - centre
        hit = hbvh.ray_cast(centre, d.normalized(), d.length * 2)
        if hit[0] is not None:
            room = (hit[0] - centre).length - 0.012
            if d.length > room:
                disp[v] = d.normalized() * room - (v.co - centre)
                tucked += 1
    print('TUCK', tucked, 'head points moved inside the hair')
    free = [v for v in verts if v not in disp]
    field = dict(disp)
    for v in free:
        field[v] = Vector()
    for _ in range(12):
        nxt = {}
        for v in free:
            ns = [e.other_vert(v) for e in v.link_edges if e.other_vert(v) in field]
            nxt[v] = sum((field[n] for n in ns), Vector()) / max(1, len(ns)) * 0.85 if ns else Vector()
        field.update(nxt)
    for v, dv in field.items():
        v.co += dv
    # the skull under the hair is smoothed round (the hair shell's inside is spiky; a bald head must not be)
    for _ in range(4):
        new = {}
        for v in verts:
            if v in faced:
                continue
            ns = [e.other_vert(v) for e in v.link_edges if e.other_vert(v) in field]
            if ns:
                new[v] = v.co.lerp(sum((n.co for n in ns), Vector()) / len(ns), 0.5)
        for v, co in new.items():
            v.co = co
