# claude-facetface: the claude-facet bodies (facet.py, attempt-04) with an anime face painted as a texture.
# The box eyes, box glasses, brows and Eric's stubble shell come off; the head's front faces get a face material
# whose texture (eyes, brows, mouth, Mio's blush, the glasses, Eric's stubble) is projected straight from the front.
# Thin temple bars stay as geometry so the glasses still read from the side.
#
# One change per attempt (ATTEMPTS below):
#   attempt-01  face texture on the current eight-sided head (lit like the rest)
#   attempt-02  plus flat face shading: every vertex of the textured area gets one forward normal, so the facets
#               never cut across the eyes
#   attempt-03  plus a smoother face front: the head's front third gets more, smooth-shaded sides
#   later       refinements, each named in ATTEMPTS
#
# Textures: art/parts/style-concepts/claude-facetface/textures/<set>/<char>-<expr>.png, made by face_tex.py.
# The texture is a square of side 2.4 R (R the head radius) centred on the eye line, seen from the front (-Y).
import math
import os

import bmesh
import bpy
from mathutils import Vector

import facet
import kit

BASE = dict(tex='t3', normals=False, front=False, ink=False, simp=1, chibi=1)
ATTEMPTS = {
    'attempt-01': dict(BASE),
    'attempt-02': dict(BASE, normals=True),
    'attempt-03': dict(BASE, normals=True, front=True),
    'attempt-04': dict(BASE, normals=True, front=True, ink=True),
}
F = ATTEMPTS['attempt-04']  # the face the two series below start from
ATTEMPTS.update({
    'attempt-05': dict(F, simp=2),
    'attempt-06': dict(F, simp=3),
    'attempt-07': dict(F, chibi=2),
    'attempt-08': dict(F, chibi=3),
    # refinement for the game camera, where the face is a few pixels: bolder dark marks in the texture
    'attempt-09': dict(F, tex='t4'),
    # the two together: cf-08's proportions with cf-09's bolder face
    'attempt-10': dict(F, chibi=3, tex='t4'),
})
# simplification levels (simp): 1 as facet.py; 2 fewer sides on every shape, no soles; 3 fewest sides, no hands,
# soles, cuffs, side strand or extra hair pieces. Stylization levels (chibi): head scale and leg length.
SIMP = {1: dict(lathe=0, limb=6, cap=8, drop=()),
        2: dict(lathe=2, limb=4, cap=6, drop=('-sole',)),
        3: dict(lathe=3, limb=4, cap=5, drop=('-sole', '-hand', '-cuff', '-hairtop', '-strand', '-bun-under'))}
CHIBI = {1: (1.0, 1.0), 2: (1.3, 0.85), 3: (1.65, 0.7)}  # (head scale, leg length)
EXPRS = {'mio': ('neutral', 'smile'), 'eric': ('neutral', 'surprised')}
TEX_ROOT = os.path.join(kit.main_checkout(), 'art/parts/style-concepts/claude-facetface/textures')
HALF = 1.2  # half the texture square, in head radii
DROP = ('-eye', '-frame', '-temple', '-bridge', '-brow', '-stubble')


def cfg():
    a = kit.args()
    att = a[1] if len(a) > 1 else 'attempt-01'
    return ATTEMPTS.get(att, ATTEMPTS['attempt-01'])


def tex_path(ch, expr='neutral', tset=None):
    return os.path.join(TEX_ROOT, tset or cfg()['tex'], f'{ch}-{expr}.png')


def face_mat(ch, C, expr='neutral'):
    m = bpy.data.materials.new(f'face-{ch}')
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes.get('Principled BSDF')
    b.inputs['Roughness'].default_value = facet.MATTE['rough']
    b.inputs['Specular IOR Level'].default_value = facet.MATTE['spec']
    t = nt.nodes.new('ShaderNodeTexImage')
    t.name = 'face'
    t.image = bpy.data.images.load(tex_path(ch, expr))
    t.interpolation = 'Linear'
    t.extension = 'EXTEND'
    nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    m.diffuse_color = kit.rgba(C['skin'])
    return m


def set_face(ch, expr):
    """Swap the face texture of a built character (an expression change)."""
    m = bpy.data.materials[f'face-{ch}']
    m.node_tree.nodes['face'].image = bpy.data.images.load(tex_path(ch, expr), check_existing=True)


def head_geo(ch, R, hz0, hh, front):
    """The head lathe. front False: facet.py's eight sides. front True: the front 120 degrees in seven narrow,
    smooth-shaded sides, the back in five flat ones, so the face sits on a gently curved front."""
    prof = [(0, hz0), (0.5, hz0), (0.86, hz0 + 0.24 * hh), (1, hz0 + 0.5 * hh), (0.97, hz0 + 0.72 * hh),
            (0.74, hz0 + 0.93 * hh), (0, hz0 + hh)]
    rx, ry = R, R * 1.05
    if not front:
        bm = kit.lathe_bm(prof, rx, ry, segs=8, phase=22.5)
        return bm, set()
    # angles in degrees round Z; -90 is straight ahead (-Y). Front arc -150..-30 in 7 steps, the rest in 5.
    fa = [-150 + 120 * i / 7 for i in range(8)]
    ba = [-30 + 240 * i / 5 for i in range(1, 5)]
    ang = [math.radians(a) for a in fa + ba]
    bm = bmesh.new()
    rings = []
    for (r, z) in prof[1:-1]:
        ring = []
        for a in ang:
            ring.append(bm.verts.new((rx * r * math.cos(a), ry * r * math.sin(a), z)))
        rings.append(ring)
    bot = bm.verts.new((0, 0, prof[0][1]))
    top = bm.verts.new((0, 0, prof[-1][1]))
    n = len(ang)
    smooth = set()
    for i in range(n):
        j = (i + 1) % n
        f = bm.faces.new([bot, rings[0][j], rings[0][i]])
        if i < 7:
            smooth.add(f)
        for A, B in zip(rings, rings[1:]):
            f = bm.faces.new([A[i], A[j], B[j], B[i]])
            if i < 7:
                smooth.add(f)
        f = bm.faces.new([rings[-1][i], rings[-1][j], top])
    bm.normal_update()
    return bm, smooth


def build_facet(ch, coll, lv):
    """facet.build with fewer sides on its lathes, limbs and hair caps (simplification level lv)."""
    sp = SIMP[lv]
    lathe0, limb0, cap0 = facet.lathe, facet.limb, kit.cap

    def lathe(*a, segs=8, **k):
        return lathe0(*a, segs=max(5, segs - sp['lathe']), **k)

    def limb(*a, segs=6, **k):
        return limb0(*a, segs=min(segs, sp['limb']), **k)

    def cap(*a, segs=40, **k):
        return cap0(*a, segs=min(segs, sp['cap']), **k)

    facet.lathe, facet.limb, kit.cap = lathe, limb, cap
    try:
        return facet.build(ch, coll)
    finally:
        facet.lathe, facet.limb, kit.cap = lathe0, limb0, cap0


def build(ch, coll):
    c = cfg()
    C = facet.PAL[ch]
    E = ch == 'eric'
    arm, objs = build_facet(ch, coll, c['simp'])
    drop = DROP + SIMP[c['simp']]['drop']
    keep = []
    for o in objs:
        if any(s in o.name for s in drop):
            bpy.data.objects.remove(o, do_unlink=True)
        else:
            keep.append(o)
    objs = keep
    head = next(o for o in objs if o.name == f'{ch}-head')
    # the numbers facet.build used
    neck = 1.0 if E else 0.93
    hz0 = neck + 0.03
    hh = 0.25 if E else 0.24
    R = 0.105 if E else 0.1
    ez = hz0 + 0.47 * hh
    S = HALF * R
    mw = head.matrix_world.copy()
    bm, smooth = head_geo(ch, R, hz0, hh, c['front'])
    skin = facet.M(C['skin'])
    fm = face_mat(ch, C)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.normal_update()
    uv = bm.loops.layers.uv.new('UVMap')
    face_faces = []
    for f in bm.faces:
        cen = f.calc_center_median()
        if f.normal.y < -0.25 and cen.z > hz0 - 0.001:
            f.material_index = 1
            face_faces.append(f)
            for lp in f.loops:
                p = lp.vert.co
                lp[uv].uv = ((p.x + S) / (2 * S), (p.z - (ez - S)) / (2 * S))
        else:
            for lp in f.loops:
                lp[uv].uv = (0.0, 0.0)  # a skin-coloured corner of the texture
    for f in bm.faces:
        f.smooth = f in smooth or (c['normals'] and f in face_faces)
    me = head.data
    me.materials.clear()  # before to_mesh: clearing afterwards resets every face's material index
    me.materials.append(skin)
    me.materials.append(fm)
    bm.to_mesh(me)
    bm.free()
    if c['normals']:
        # one forward normal for every corner of the textured area: it shades as one plane, as a drawn face does
        fwd = Vector((0, -1, 0))
        normals = []
        for poly in me.polygons:
            for li in poly.loop_indices:
                normals.append(fwd if poly.material_index == 1 else poly.normal.copy())
        me.normals_split_custom_set(normals)
    # glasses temples: from the lens's outer edge on the face surface back to above the ear
    gw = 0.064
    gz = ez + (0.05 if E else 0.046) / 2 - 0.004
    for sx in (1, -1):
        x0 = sx * (0.042 + gw / 2 + 0.002)
        y0 = surface_y(head, x0, gz)
        t = kit.rod(f'{ch}-temple{sx}', (x0, y0 - 0.002, gz), (sx * (R + 0.006), 0.0, gz), 0.006, 0.006,
                    facet.M(C['frame']), coll, smooth=None)
        kit.attach(t, arm, 'head')
        objs.append(t)
    if c['chibi'] != 1:
        kh, kl = CHIBI[c['chibi']]
        hip = 0.6 if E else 0.56
        restyle(ch, arm, objs, kh, kl, neck, hip)
        global HEAD_SPAN
        top = hz0 + hh * 1.2
        HEAD_SPAN = facet.HEAD_SPAN * kh * top / (hip * kl + (neck - hip) + (top - neck) * kh)
    if c['ink']:
        hm = kit.hull_mat()
        for o in list(objs):
            if o.type != 'MESH':
                continue
            h = kit.hull(o, facet_ink(o), hm, coll)
            kit.attach(h, arm, o.parent_bone)
            objs.append(h)
            _ink.append(h)
    return arm, objs


_ink = []
INK = 0.008  # outline width in metres (claude-ink uses 0.011 on its rounder 1.1 m figure)


def facet_ink(o):
    return INK * (0.6 if o.dimensions.length < 0.12 else 1.0)


def prepare_render():
    if _ink:
        kit.hull_render_mat(_ink[0].data.materials[0], _ink)


def restyle(ch, arm, objs, kh, kl, neck, hip):
    """Push the proportions: the head (and everything on it) kh times bigger about the neck, the legs kl times as
    long, the body moved down to sit on them. Moves the mesh data and the bones, then re-attaches each part."""
    drop = hip * (1 - kl)

    def f(p, bone):
        x, y, z = p
        if bone.startswith(('leg', 'shin')) or bone == 'root' and z <= hip:
            return Vector((x, y, z * kl))
        if bone == 'head':
            return Vector((x * kh, y * kh, neck - drop + (z - neck) * kh))
        return Vector((x, y, z - drop))

    bones = {}
    for o in objs:
        b = o.parent_bone
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
        o.data.transform(mw)
        o.matrix_world = kit.Matrix.Identity(4)
        for v in o.data.vertices:
            v.co = f(v.co, b)
        o.data.update()
        bones[o.name] = b
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    for eb in arm.data.edit_bones:
        eb.head, eb.tail = f(eb.head, eb.name), f(eb.tail, eb.name)
    bpy.ops.object.mode_set(mode='OBJECT')
    for o in objs:
        kit.attach(o, arm, bones[o.name])
    hz = facet.HEAD[ch]
    facet.HEAD[ch] = tuple(f(Vector(hz), 'head'))


def surface_y(head, x, z):
    """Where a ray from the front at (x, z) meets the head."""
    bpy.context.view_layer.update()
    ok, loc, n, i = head.ray_cast(head.matrix_world.inverted() @ Vector((x, -1, z)), Vector((0, 1, 0)))
    return (head.matrix_world @ loc).y if ok else -0.09


HEAD = facet.HEAD
HEAD_SPAN = facet.HEAD_SPAN
MOTION = facet.MOTION
