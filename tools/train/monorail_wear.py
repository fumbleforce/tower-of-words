"""The car skin's baked wear texture (issue #356), used by tools/train/monorail.py: game3d/assets/train/monorail-wear.webp.

The skin gets one UV layout: its outer walls unrolled round the plan outline in two strips (z >= 0, the platform side,
and z < 0), the roof seen from above, and two flat patches for the small parts (dark rubber and louvres in 'matte',
the roof units and vents in 'metal'). Cycles bakes the skin's position, normal and ambient occlusion (with the skirt
as an occluder) into float images; the wear is then drawn per texel from those: soft grime under the windows and in
the seams, dark drips from the gutter, road dust low down, clear rust streaks running down from the panel joints and
the door frames, light edge wear on the rounded shoulder and corners, and a brushed grain along the car.

The texture is data, not colour (train/models.js reads it in its shader): R the shade (x 1.25: 0.8 leaves the vertex
colour as it is), G the rust amount, B the roughness. Whether a face is bare metal is in the vertex colour's alpha.
"""
import math
import random

import bmesh
import bpy
import numpy as np

SIZE = 1024
K = {}  # monorail.py's globals (set by monorail.py): the car's numbers, seams, windows, doors, drips

# the atlas, in Blender's UV convention (v up)
STRIPS = {1: (0.006, 0.262), -1: (0.272, 0.528)}  # v ranges of the two side strips, by the side's sign of z
SU = (0.01, 0.99)  # their u range, the half outline's length
YT = 1.58  # their height range, y in [0, YT]
ROOF = (0.01, 0.79, 0.54, 0.99)  # u0, u1, v0, v1 for x in [-HX, HX], z in [-HZ, HZ]
PATCH = {'matte': ((0.82, 0.99, 0.55, 0.75), 0.85), 'metal': ((0.82, 0.99, 0.78, 0.99), 0.4)}  # box, roughness


def _half_outline():
    a, b, r = K['HX'] - K['RP'], K['HZ'] - K['RP'], K['RP']
    return a, b, r, 2 * a + 2 * b + math.pi * r


def perimeter(x, z):
    """Distance along the plan outline's z >= 0 half, from (HX, 0) round by the platform side to (-HX, 0)."""
    a, b, r, _ = _half_outline()
    z = abs(z)
    if x > a and z > b:
        return b + r * math.atan2(z - b, x - a)
    if x < -a and z > b:
        return b + r * math.pi / 2 + 2 * a + r * (math.atan2(z - b, x + a) - math.pi / 2)
    if x > a:
        return z
    if x < -a:
        return 2 * b + 2 * a + math.pi * r - z
    return b + r * math.pi / 2 + (a - x)


def uv_of(part, side, p):
    if part == 'roof':
        u0, u1, v0, v1 = ROOF
        return (u0 + (p.x + K['HX']) / (2 * K['HX']) * (u1 - u0), v0 + (p.z + K['HZ']) / (2 * K['HZ']) * (v1 - v0))
    if part == 'side':
        v0, v1 = STRIPS[side]
        s = perimeter(p.x, p.z) / _half_outline()[3]
        return (SU[0] + s * (SU[1] - SU[0]), v0 + min(1.0, max(0.0, p.y / YT)) * (v1 - v0))
    (u0, u1, v0, v1), _ = PATCH['matte']
    return ((u0 + u1) / 2, (v0 + v1) / 2)


def unwrap(ob, part_of):
    """The skin body's UVs: part_of(face_centre, face_normal) -> 'roof', 'side' or anything else (the matte patch)."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.normal_update()
    uvl = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        c = f.calc_center_median()
        part, side = part_of(c, f.normal), 1 if c.z >= 0 else -1
        for lp in f.loops:
            lp[uvl].uv = uv_of(part, side, lp.vert.co)
    bm.to_mesh(ob.data)
    bm.free()


def patch(ob, kind):
    """A small part's UVs: every corner on its patch's centre."""
    (u0, u1, v0, v1), _ = PATCH[kind]
    me = ob.data
    uv = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
    for d in uv.data:
        d.uv = ((u0 + u1) / 2, (v0 + v1) / 2)


# ---- noise, vectorised ----
def _hash(i, j, s):
    n = (i * 374761393 + j * 668265263 + s * 2246822519) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


def vnoise(x, y, s=0):
    i, j = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
    fx, fy = x - i, y - j
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b, c, d = _hash(i, j, s), _hash(i + 1, j, s), _hash(i, j + 1, s), _hash(i + 1, j + 1, s)
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy


def fbm(x, y, s=0):
    return 0.6 * vnoise(x, y, s) + 0.3 * vnoise(2.1 * x, 2.1 * y, s + 7) + 0.1 * vnoise(4.3 * x, 4.3 * y, s + 13)


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def blur(a, r=2):
    for ax in (0, 1):
        acc = np.zeros_like(a)
        for k in range(-r, r + 1):
            acc += np.roll(a, k, axis=ax)
        a = acc / (2 * r + 1)
    return a


# ---- the wear ----
def side_wear(x, y, z, ao):
    """Shade, rust and roughness on the outer walls."""
    rng = random.Random(356)
    WIN_XS, WIN_W, WIN_Y0 = K['WIN_XS'], K['WIN_W'], K['WIN_Y0']
    G0, G1 = K['GUTTER']
    HX, HZ, RP = K['HX'], K['HZ'], K['RP']
    flat = np.abs(z) > HZ - 0.06  # the long walls, not the ends
    sides = {1: (z >= 0) & flat, -1: (z < 0) & flat}
    shade = np.ones_like(x)
    rust = np.zeros_like(x)
    rough = np.full_like(x, 0.34)
    # each panel is a slightly different sheet; a brushed grain runs along the car
    panel = np.digitize(x, K['SEAMS_X']) + 10 * (z < 0)
    pv = _hash(panel, panel * 7 + 3, 17)
    shade += 0.08 * (pv - 0.5)
    rough += 0.1 * (pv - 0.5)
    hair = vnoise(x * 1.2, y * 75, 5)
    rough += 0.12 * (hair - 0.5)
    shade += 0.025 * (hair - 0.5) + 0.05 * (fbm(x * 0.8, y * 2.2, 3) - 0.5)
    g = np.zeros_like(x)
    for sgn, m in sides.items():
        for wx in WIN_XS:  # grime washing down from each sill, and darker runs from its corners
            below = (WIN_Y0 - 0.035) - y
            dn = (below > 0) & m
            inx = smooth(WIN_W / 2 + 0.04, WIN_W / 2 - 0.06, np.abs(x - wx))
            g += dn * inx * np.exp(-np.maximum(below, 0) / 0.14) * 0.13
            for _ in range(6):
                xs, L, w, a = wx + rng.uniform(-0.44, 0.44), rng.uniform(0.1, 0.42), rng.uniform(0.008, 0.02), rng.uniform(0.1, 0.24)
                g += dn * a * np.exp(-((x - xs) / w) ** 2) * np.clip(1 - below / L, 0, 1)
            for s in (-1, 1):
                xs = wx + s * (WIN_W / 2 - 0.07)
                g += dn * 0.28 * np.exp(-((x - xs) / 0.02) ** 2) * np.clip(1 - below / rng.uniform(0.3, 0.44), 0, 1)
        for xd in K['DRIPS']:  # drips from the gutter
            below = G0 - y
            g += m * (below > 0) * 0.2 * np.exp(-((x - xd) / 0.015) ** 2) * np.clip(1 - below / K['DRIP_LEN'][xd], 0, 1)
    for s in K['SEAMS_X']:  # dirt kept in the panel lines, more of it low down
        g += flat * np.exp(-((x - s) / 0.014) ** 2) * (0.05 + 0.1 * np.clip(1 - y / 1.3, 0, 1))
    g += np.exp(-((y - K['SEAM_Y']) / 0.012) ** 2) * 0.06
    g += (y < G0) * np.exp(-np.maximum(G0 - y, 0) / 0.04) * 0.1  # under the gutter
    g += 0.16 * np.clip(1 - y / 0.3, 0, 1) ** 1.5 * (0.7 + 0.6 * fbm(x * 2, y * 4, 8))  # road dust
    # rust, running down from joints: where the panel lines cross, under the gutter at the seams, and from the door
    # frames' top corners on the platform side
    origins = []
    for sgn in (1, -1):
        for s in K['SEAMS_X']:
            if rng.random() < 0.6:
                origins.append((sgn, s + rng.uniform(-0.01, 0.01), K['SEAM_Y'] - 0.008, rng.uniform(0.3, 0.9), rng.uniform(0.6, 0.9)))
            if rng.random() < 0.4:
                origins.append((sgn, s + rng.uniform(-0.02, 0.02), G0 - 0.005, rng.uniform(0.2, 0.5), rng.uniform(0.5, 0.75)))
    for x0, x1 in K['DOORS']:
        for xs in (x0 - 0.075, x1 + 0.075):
            origins.append((1, xs, K['DOOR_TOP'] + 0.06, rng.uniform(0.35, 0.8), rng.uniform(0.65, 0.9)))
    for sgn, xs, y0, L, a in origins:
        m = sides[sgn] & (y < y0 + 0.03) & (np.abs(x - xs) < 0.08)
        if not m.any():
            continue
        t = np.clip((y0 - y) / L, 0, 1)
        wob = 0.005 * np.sin(y * 23 + xs * 7)
        w = 0.022 * (1 - 0.5 * t)
        r = a * np.exp(-((x - xs - wob) / w) ** 2) * (1 - t) ** 1.2 * (y < y0)
        r += a * np.exp(-((x - xs) ** 2 + (y - y0) ** 2) / 0.022 ** 2)
        rust = np.where(m, np.maximum(rust, r), rust)
    # edge wear: the rounded shoulder and the corners rubbed brighter and smoother, in patches
    a_, b_ = HX - RP, HZ - RP
    th = np.arctan2(np.abs(z) - b_, np.abs(x) - a_)
    corner = (np.abs(x) > a_) & (np.abs(z) > b_)
    e = np.clip((y - G1) / 0.08, 0, 1) + corner * np.exp(-((th - math.pi / 4) / 0.4) ** 2) * 0.8
    e = np.clip(e, 0, 1) * smooth(0.42, 0.68, fbm(x * 5, y * 5 + z * 5, 9))
    shade += 0.14 * e - g
    rough += 0.5 * g - 0.18 * e
    painted = ((K['STRIPE'][0] < y) & (y < K['STRIPE'][1])) | ((z > 0) & (y < K['DOOR_TOP'] + 0.065)
                                                               & np.any([(x > x0 - 0.065) & (x < x1 + 0.065) for x0, x1 in K['DOORS']], axis=0))
    rough = np.where(painted, 0.42 + 0.4 * g, rough)
    shade *= 0.45 + 0.55 * ao
    return shade, np.clip(rust, 0, 1), rough


def roof_wear(x, y, z, ao):
    HX, HZ = K['HX'], K['HZ']
    rng = random.Random(357)
    shade = 0.8 + 0.18 * (fbm(x * 0.4, z * 5, 11) - 0.5)
    g = 0.28 * smooth(0.5, 0.72, fbm(x * 0.9, z * 1.6, 14))  # dried puddles
    for s in K['ROOF_SEAMS']:
        g += 0.2 * np.exp(-((x - s) / 0.035) ** 2)
    g += 0.14 * np.clip(1 - (HZ - np.abs(z)) / 0.35, 0, 1)  # dirt toward the edges
    rust = np.zeros_like(x)
    spots = [(s, sz * (HZ - rng.uniform(0.15, 0.35))) for s in K['ROOF_SEAMS'] for sz in (-1, 1) if rng.random() < 0.7]
    spots += [(vx + rng.uniform(-0.25, 0.25), rng.uniform(-0.2, 0.2)) for vx in (-3.55, 0.0, 3.55)]
    for sx, sz in spots:
        d2 = (x - sx) ** 2 + (z - sz) ** 2
        rust = np.maximum(rust, (0.55 * np.exp(-d2 / 0.035 ** 2) + 0.25 * np.exp(-d2 / 0.09 ** 2))
                          * smooth(0.3, 0.6, vnoise(x * 30, z * 30, 19)))
    e = np.clip(1 - np.minimum(HZ - np.abs(z), HX - np.abs(x)) / 0.12, 0, 1) * smooth(0.45, 0.7, fbm(x * 5, z * 5, 23))
    shade = shade - g + 0.1 * e
    rough = 0.58 + 0.14 * (fbm(x * 0.7, z * 2, 29) - 0.5) + 0.5 * g - 0.15 * e
    shade = shade * (0.4 + 0.6 * ao)
    return shade, rust, rough


# ---- the bake ----
def _image(name, float_buffer):
    im = bpy.data.images.new(name, SIZE, SIZE, alpha=True, float_buffer=float_buffer)
    im.colorspace_settings.name = 'Non-Color'
    im.generated_color = (0, 0, 0, 0)
    return im


def _pixels(im):
    a = np.empty(SIZE * SIZE * 4, np.float32)
    im.pixels.foreach_get(a)
    return a.reshape(SIZE, SIZE, 4)


def bake(skin, occluders, hidden, out):
    """Bake the skin's position, normal and AO (occluders cast it, hidden don't) and write the wear texture to out."""
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    scn.cycles.device = 'CPU'
    scn.cycles.samples = 16
    for o in hidden:
        o.hide_render = True
    mat = bpy.data.materials.new('wear-bake')
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out_n = nt.nodes.new('ShaderNodeOutputMaterial')
    emit = nt.nodes.new('ShaderNodeEmission')
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    add = nt.nodes.new('ShaderNodeVectorMath')
    add.operation = 'ADD'
    add.inputs[1].default_value = (8, 8, 8)  # positions all positive; unbaked texels stay 0
    nrm = nt.nodes.new('ShaderNodeVectorMath')
    nrm.operation = 'MULTIPLY_ADD'
    nrm.inputs[1].default_value = (0.5, 0.5, 0.5)
    nrm.inputs[2].default_value = (0.5, 0.5, 0.5)
    ao = nt.nodes.new('ShaderNodeAmbientOcclusion')
    ao.samples = 16
    ao.inputs['Distance'].default_value = 0.35
    tex = nt.nodes.new('ShaderNodeTexImage')
    nt.links.new(geo.outputs['Position'], add.inputs[0])
    nt.links.new(geo.outputs['Normal'], nrm.inputs[0])
    nt.links.new(emit.outputs[0], out_n.inputs['Surface'])
    saved = list(skin.data.materials)
    skin.data.materials.clear()
    skin.data.materials.append(mat)
    for o in scn.objects:
        o.select_set(o is skin)
    bpy.context.view_layer.objects.active = skin
    baked = {}
    for name, src in (('pos', add.outputs[0]), ('nrm', nrm.outputs[0]), ('ao', ao.outputs['AO'])):
        im = _image('wear-' + name, True)
        tex.image = im
        nt.nodes.active = tex
        nt.links.new(src, emit.inputs['Color'])
        bpy.ops.object.bake(type='EMIT', margin=6, use_clear=True)
        baked[name] = _pixels(im)
        bpy.data.images.remove(im)
    skin.data.materials.clear()
    for m in saved:
        skin.data.materials.append(m)
    bpy.data.materials.remove(mat)
    for o in hidden:
        o.hide_render = False

    P = baked['pos'][..., :3] - 8
    valid = baked['pos'][..., 1] > 1
    x, y, z = P[..., 0], P[..., 1], P[..., 2]
    aov = np.clip(blur(baked['ao'][..., 0]), 0, 1)
    v = ((np.arange(SIZE) + 0.5) / SIZE)[:, None] * np.ones((1, SIZE))
    u = ((np.arange(SIZE) + 0.5) / SIZE)[None, :] * np.ones((SIZE, 1))
    R = np.full((SIZE, SIZE), 0.8)
    G = np.zeros((SIZE, SIZE))
    B = np.full((SIZE, SIZE), 0.5)
    for region, fn in ((valid & (v < 0.533), side_wear), (valid & (v >= 0.533) & (u < 0.81), roof_wear)):
        s, r, ro = fn(x, y, z, aov)
        R = np.where(region, s / 1.25, R)
        G = np.where(region, r, G)
        B = np.where(region, ro, B)
    for (u0, u1, v0, v1), rough in PATCH.values():
        box = (u > u0) & (u < u1) & (v > v0) & (v < v1)
        R, G, B = np.where(box, 0.8, R), np.where(box, 0.0, G), np.where(box, rough, B)
    img = np.stack([np.clip(R, 0, 1), np.clip(G, 0, 1), np.clip(B, 0.05, 1), np.ones_like(R)], -1).astype(np.float32)
    im = bpy.data.images.new('monorail-wear', SIZE, SIZE, alpha=False)
    im.colorspace_settings.name = 'Non-Color'
    im.pixels.foreach_set(img.ravel())
    im.file_format = 'WEBP'
    im.filepath_raw = out
    scn.render.image_settings.quality = 90
    im.save()
    bpy.data.images.remove(im)
    print('wrote', out)
