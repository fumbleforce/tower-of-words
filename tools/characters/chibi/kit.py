"""The hand-built chibi kit (reviews/chibi-manual-1, chibi-cast-manual-1): the base body, the garment
builders, the Mixamo-named rig, the weights and the export. Imported inside Blender by build.py (the reference
office woman) and cast.py (Kuro, Eric, Mio); the hair is in hair.py and the faces in face.py.

Space: Z up, the character faces -Y, her left is +X (image right in a front view). 1 mm = 1 px of Jørgen's base
picture (2026-10-02), floor at z = 0: x = (px - 624.5) / 1000, z = (1185 - py) / 1000, from a row-by-row scan of
its silhouette. Every part is a superellipsoid or built from one; plain matte materials; the face is a texture.
"""
import math
import subprocess

import bmesh
import bpy
from mathutils import Matrix, Vector

MAIN = '/home/jorgen/repo/japanese'

# ------------------------------------------------------------------ head and body measurements (metres)
HEAD = dict(c=(0, 0, 0.8325), a=0.3305, b=0.25, h=0.2825, e=4.0, f=4.5)   # x 294..955, y 70..635
FACE_SQ = (-0.3275, 0.49, 0.655)           # texture square: left x, bottom z, side (face-base.svg viewBox)
TORSO = dict(c=(0, 0, 0.40), a=0.1475, b=0.11, h=0.165, e=2.6, f=3.2)     # 295 wide at the belly, 231 at the top
TAPER = 0.22
SHOULDER, HAND_C = Vector((0.1255, 0, 0.495)), Vector((0.2595, 0, 0.315))  # arm root (750, 690), mitten (884, 870)
WRIST = HAND_C - (HAND_C - SHOULDER).normalized() * 0.05
ARM_R, HAND_R = 0.047, 0.058
LEG_X, LEG = 0.0845, dict(top=0.29, bot=0.08, a=0.066, b=0.068)           # 134 wide, centres at 540 and 709
FOOT = dict(c=(0.095, -0.025, 0.052), a=0.088, b=0.1, h=0.054)


def col(hexs):
    h = hexs.lstrip('#')
    return [((int(h[i:i + 2], 16) / 255) ** 2.2) for i in (0, 2, 4)] + [1]


def material(name, hexs, rough=0.6, image=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = col(hexs)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Specular IOR Level'].default_value = 0.3
    if image:
        t = m.node_tree.nodes.new('ShaderNodeTexImage')
        t.image = bpy.data.images.load(image)
        m.node_tree.links.new(t.outputs['Color'], p.inputs['Base Color'])
    return m


def collection(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c


def obj(name, bm, mat, coll):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons: p.use_smooth = True
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me)
    coll.objects.link(o)
    return o


def solidify(o, thickness, inner=None):
    """Give a shell its thickness inward; inner: a material for the inside and the rim (Mio's green underside)."""
    s = o.modifiers.new('thick', 'SOLIDIFY')
    s.thickness, s.offset = thickness, -1
    if inner:
        o.data.materials.append(inner)
        s.material_offset = s.material_offset_rim = 1
    return o


def blob(c, a, b, h, e=2.0, f=2.0, n=16, M=None):
    """Superellipsoid (|x/a|^e + |y/b|^e)^(f/e) + |z/h|^f = 1 from a subdivided cube, so the quads spread evenly.
    e shapes the outline seen from above, f the outline seen from the front. M: extra 3x3 (rotation) before c."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=n - 1, use_grid_fill=True)
    for v in bm.verts:
        d = Vector((v.co.x * a, v.co.y * b, v.co.z * h)).normalized()
        F = (abs(d.x / a) ** e + abs(d.y / b) ** e) ** (f / e) + abs(d.z / h) ** f
        p = d * F ** (-1 / f)
        v.co = (M @ p if M else p) + Vector(c)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


def along(p, q):
    """Rotation taking +Z to the direction p -> q."""
    return (q - p).normalized().to_track_quat('Z', 'Y').to_matrix()


def mirror(bm):
    bmesh.ops.scale(bm, vec=(-1, 1, 1), verts=bm.verts[:])
    bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    return bm


def pair(parts, name, make, mat, coll):
    """Her left part from make() (+X) and its mirror as her right, named <name>.L and <name>.R."""
    parts[f'{name}.L'] = obj(f'{name}.L', make(), mat, coll)
    parts[f'{name}.R'] = obj(f'{name}.R', mirror(make()), mat, coll)


def cut_below(bm, z):
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, z), plane_no=(0, 0, -1),
                           clear_outer=True)
    return bm


def cut_above(bm, z):
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, z), plane_no=(0, 0, 1),
                           clear_outer=True)
    return bm


# ------------------------------------------------------------------ base body
def build_base(coll, mats):
    H = HEAD
    bm = blob(H['c'], H['a'], H['b'], H['h'], H['e'], H['f'], n=32)
    uv = bm.loops.layers.uv.new('UVMap')
    x0, z0, s = FACE_SQ
    for fc in bm.faces:
        front = fc.normal.y < -0.3
        for lp in fc.loops:
            co = lp.vert.co
            lp[uv].uv = ((co.x - x0) / s, (co.z - z0) / s) if front else (0.004, 0.004)
    parts = {'head': obj('head', bm, mats['face'], coll)}
    parts['torso'] = obj('torso', torso_blob(), mats['skin'], coll)

    def arm():
        L = (WRIST - SHOULDER).length
        return blob((SHOULDER + WRIST) / 2, ARM_R, ARM_R, L / 2 + ARM_R, 2.0, 2.6, n=12, M=along(SHOULDER, WRIST))

    def hand():
        return blob(HAND_C, HAND_R * 0.95, HAND_R * 0.85, HAND_R * 1.05, 2.2, 2.2, n=12, M=along(SHOULDER, WRIST))

    def leg():
        z = (LEG['top'] + LEG['bot']) / 2
        return blob((LEG_X, 0, z), LEG['a'], LEG['b'], (LEG['top'] - LEG['bot']) / 2, 2.2, 3.5, n=12)

    def foot():
        bm = blob(FOOT['c'], FOOT['a'], FOOT['b'], FOOT['h'], 2.3, 2.4, n=12)
        for v in bm.verts: v.co.z = max(v.co.z, 0.004)      # stands flat
        return bm

    for nm, make in (('arm', arm), ('hand', hand), ('leg', leg), ('foot', foot)):
        pair(parts, nm, make, mats['skin'], coll)
    return parts


def torso_blob(grow=0.0, dz=0.0, dh=0.0, n=16):
    """The torso, or a garment over it grown by `grow`, its middle moved by dz and half-height by dh."""
    T = TORSO
    bm = blob((0, 0, T['c'][2] + dz), T['a'] + grow, T['b'] + grow, T['h'] + dh, T['e'], T['f'], n=n)
    for v in bm.verts:                     # shoulders a little narrower than the belly
        k = max(0.0, (v.co.z - T['c'][2]) / T['h'])
        v.co.x *= 1 - TAPER * k * k
    return bm


# ------------------------------------------------------------------ garments
def sleeve_maker(frac, grow=0.011):
    def make():
        end = SHOULDER + (WRIST - SHOULDER) * frac
        top = SHOULDER - (WRIST - SHOULDER).normalized() * 0.045      # over the round top of the arm
        L = (end - top).length
        return blob((top + end) / 2, ARM_R + grow, ARM_R + grow, L / 2 + 0.01, 2.0, 3.0, n=12, M=along(top, end))
    return make


def cuff_maker(frac, grow=0.016, depth=0.026):
    def make():
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=ARM_R + grow, radius2=ARM_R + grow, depth=depth)
        end = SHOULDER + (WRIST - SHOULDER) * frac
        bmesh.ops.transform(bm, matrix=Matrix.Translation(end) @ along(SHOULDER, WRIST).to_4x4(), verts=bm.verts[:])
        return bm
    return make


def flap_maker(x, z, a, h, angle, dy=0.006):
    """A flat rounded flap on the chest (collar or lapel), tilted by `angle` degrees."""
    def make():
        y = -TORSO['b'] - dy
        bm = blob((x, y, z), a, 0.008, h, 2.2, 2.2, n=8)
        bmesh.ops.rotate(bm, cent=(x, y, z), matrix=Matrix.Rotation(math.radians(angle), 3, 'Y'), verts=bm.verts[:])
        return bm
    return make


def open_front(bm, z0, w0, slope):
    """Cut a V opening down the front of a garment shell: half width w0 at z0, widening by `slope` per metre up."""
    gone = [fc for fc in bm.faces if (m := fc.calc_center_median()).y < 0 and m.z > z0 - 0.01
            and abs(m.x) < w0 + (m.z - z0) * slope]
    bmesh.ops.delete(bm, geom=gone, context='FACES')
    return bm


def flat_shoe_maker():
    def make():
        F = FOOT
        bm = blob((F['c'][0], F['c'][1] - 0.003, F['c'][2]), F['a'] + 0.008, F['b'] + 0.009, F['h'] + 0.006, 2.3, 2.4, n=14)
        cut_above(bm, 0.072)               # a clean opening for the top of the foot
        for v in bm.verts: v.co.z = max(v.co.z, 0.0)
        return bm
    return make


def sneaker_makers():
    """A closed sneaker upper and its sole."""
    F = FOOT

    def upper():
        bm = blob((F['c'][0], F['c'][1] - 0.006, F['c'][2] + 0.006), F['a'] + 0.012, F['b'] + 0.014, F['h'] + 0.01, 2.4, 2.6, n=14)
        for v in bm.verts: v.co.z = max(v.co.z, 0.016)
        return bm

    def sole():
        bm = blob((F['c'][0], F['c'][1] - 0.006, 0.012), F['a'] + 0.016, F['b'] + 0.018, 0.012, 2.4, 4.0, n=12)
        for v in bm.verts: v.co.z = max(v.co.z, 0.0)
        return bm
    return upper, sole


def skirt_blobs():
    bm = blob((0, 0, 0.325), 0.163, 0.126, 0.09, 2.6, 6.0, n=16)          # pencil skirt, waist to upper leg
    for v in bm.verts:
        k = (v.co.z - 0.32) / 0.088                   # a little narrower at the hem than at the hips
        v.co.x *= 1 - 0.05 * max(0, -k)
    return bm, blob((0, 0, 0.402), 0.168, 0.131, 0.02, 2.6, 4.0, n=16)    # skirt, waistband


def trouser_makers():
    """The seat (hips to crotch, weighted like a skirt) and one trouser leg to the ankle."""
    def seat():
        return blob((0, 0, 0.3), 0.158, 0.12, 0.07, 2.6, 4.0, n=16)

    def leg():
        bm = blob((LEG_X, 0, 0.19), LEG['a'] + 0.013, LEG['b'] + 0.013, 0.13, 2.2, 5.0, n=12)
        return bm
    return seat, leg


# ------------------------------------------------------------------ rig
def joints():
    elbow = (SHOULDER + WRIST) / 2
    J = {'Hips': (0, 0, 0.27), 'Spine': (0, 0, 0.33), 'Spine1': (0, 0, 0.40), 'Spine2': (0, 0, 0.47),
         'Neck': (0, 0, 0.53), 'Head': (0, 0, 0.56), 'HeadTop_End': (0, 0, 1.115),
         'LeftShoulder': (0.04, 0, 0.50), 'LeftArm': tuple(SHOULDER), 'LeftForeArm': tuple(elbow),
         'LeftHand': tuple(WRIST), 'LeftHandEnd': tuple(HAND_C + (HAND_C - WRIST)),
         'LeftUpLeg': (LEG_X, 0, 0.27), 'LeftLeg': (LEG_X, 0, 0.18), 'LeftFoot': (LEG_X, 0, 0.09),
         'LeftToeBase': (FOOT['c'][0], -0.08, 0.03), 'LeftToe_End': (FOOT['c'][0], -0.13, 0.03)}
    for k, v in list(J.items()):
        if k.startswith('Left'): J['Right' + k[4:]] = (-v[0], v[1], v[2])
    P = {'Spine': 'Hips', 'Spine1': 'Spine', 'Spine2': 'Spine1', 'Neck': 'Spine2', 'Head': 'Neck'}
    for s in ('Left', 'Right'):
        P.update({f'{s}Shoulder': 'Spine2', f'{s}Arm': f'{s}Shoulder', f'{s}ForeArm': f'{s}Arm', f'{s}Hand': f'{s}ForeArm',
                  f'{s}UpLeg': 'Hips', f'{s}Leg': f'{s}UpLeg', f'{s}Foot': f'{s}Leg', f'{s}ToeBase': f'{s}Foot'})
    TAIL = {'Hips': 'Spine', 'Spine': 'Spine1', 'Spine1': 'Spine2', 'Spine2': 'Neck', 'Neck': 'Head', 'Head': 'HeadTop_End'}
    for s in ('Left', 'Right'):
        TAIL.update({f'{s}Shoulder': f'{s}Arm', f'{s}Arm': f'{s}ForeArm', f'{s}ForeArm': f'{s}Hand', f'{s}Hand': f'{s}HandEnd',
                     f'{s}UpLeg': f'{s}Leg', f'{s}Leg': f'{s}Foot', f'{s}Foot': f'{s}ToeBase', f'{s}ToeBase': f'{s}Toe_End'})
    return {k: Vector(v) for k, v in J.items()}, P, TAIL


def build_rig():
    J, P, TAIL = joints()
    arm = bpy.data.objects.new('Armature', bpy.data.armatures.new('Armature'))
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    eb = {}
    for k, tail in TAIL.items():
        b = arm.data.edit_bones.new('mixamorig:' + k)
        b.head, b.tail = J[k], J[tail]
        eb[k] = b
    for k, p in P.items(): eb[k].parent = eb[p]
    bpy.ops.object.mode_set(mode='OBJECT')
    segs = {k: (J[k], J[t]) for k, t in TAIL.items()}
    return arm, segs


SPINE = ['Hips', 'Spine', 'Spine1', 'Spine2']
# which bones each part may follow (distance weights among them); one bone = rigid. Parts named in BODY_SHELL
# follow the spine above the waist and the skirt's weights below it.
ALLOWED = {
    'head': ['Head'], 'hair-shell': ['Head'], 'bang': ['Head'], 'bun': ['Head'], 'tail': ['Head'],
    'torso': SPINE, 'blouse': SPINE, 'hoodie': SPINE, 'blazer': SPINE, 'shirt': SPINE, 'hem': SPINE, 'pocket': SPINE,
    'collar': ['Spine2'], 'lapel': ['Spine2', 'Spine1'], 'button': ['Spine1'], 'hood': ['Spine2'], 'string': ['Spine2'],
    'arm': ['{s}Arm', '{s}ForeArm'], 'sleeve': ['{s}Arm', '{s}ForeArm'], 'cuff': ['{s}ForeArm'],
    'hand': ['{s}Hand'], 'leg': ['{s}UpLeg', '{s}Leg'], 'trouser': ['{s}UpLeg', '{s}Leg'],
    'foot': ['{s}Foot', '{s}ToeBase'], 'shoe': ['{s}Foot', '{s}ToeBase'], 'sole': ['{s}Foot', '{s}ToeBase'],
    'skirt': [], 'seat': [], 'waistband': ['Hips'],
}
BODY_SHELL = {'torso', 'blouse', 'hoodie', 'blazer', 'shirt', 'hem', 'pocket'}


def skirt_weights(p):
    """The skirt, and the body and blouse under it: a tube on the hips that shears toward the hem with each thigh,
    so nothing inside can poke out through the cloth when a leg swings."""
    leg = 0.9 * min(1.0, max(0.0, (0.39 - p.z) / 0.13))
    left = min(1.0, max(0.0, 0.5 + p.x / 0.08))
    return {'Hips': 1 - leg, 'LeftUpLeg': leg * left, 'RightUpLeg': leg * (1 - left)}


def distance_weights(p, bones, segs):
    """Each bone by 1/d^4 to its segment, normalised."""
    ws = {}
    for b in bones:
        a, c = segs[b]
        ab = c - a
        t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.dot(ab), 1e-9)))
        ws[b] = 1 / max((p - (a + ab * t)).length, 1e-4) ** 4
    s = sum(ws.values())
    return {b: w / s for b, w in ws.items()}


def skin(o, arm, segs):
    key = o.name.split('.')[0].rstrip('0123456789')
    side = 'Left' if o.name.endswith('.L') else 'Right'
    bones = [b.format(s=side) for b in ALLOWED[key]]
    groups = {}
    for v in o.data.vertices:
        p = v.co
        if key in ('skirt', 'seat'):
            ws = skirt_weights(p)
        else:
            ws = distance_weights(p, bones, segs)
            if key in BODY_SHELL:          # above the waist: the spine; under the skirt: the skirt's weights
                h = min(1.0, max(0.0, (0.45 - p.z) / 0.06))
                under = skirt_weights(p)
                ws = {b: ws.get(b, 0) * (1 - h) + under.get(b, 0) * h for b in set(ws) | set(under)}
        for b, w in ws.items():
            if w > 0.01:
                if b not in groups: groups[b] = o.vertex_groups.new(name='mixamorig:' + b)
                groups[b].add([v.index], w, 'REPLACE')
    o.parent = arm
    m = o.modifiers.new('arm', 'ARMATURE'); m.object = arm


# ------------------------------------------------------------------ output
def rasterise(svg, png):
    subprocess.run(['rsvg-convert', '-w', '2048', '-h', '2048', svg, '-o', png], check=True)


def export(path, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_skins=True,
                              export_animations=False, export_apply=True, export_image_format='WEBP')


def finish(out, groups, files):
    """Rig and skin every part, save the .blend and export each glb: files = {name: [group names]}."""
    arm, segs = build_rig()
    for parts in groups.values():
        for o in parts.values(): skin(o, arm, segs)
    bpy.ops.wm.save_as_mainfile(filepath=f'{out}/chibi.blend')
    for name, keys in files.items():
        export(f'{out}/{name}.glb', [arm] + [o for k in keys for o in groups[k].values()])
    dg = bpy.context.evaluated_depsgraph_get()
    faces = sum(len(o.evaluated_get(dg).data.polygons) for parts in groups.values() for o in parts.values())
    print('BUILT', out, 'faces', faces)
