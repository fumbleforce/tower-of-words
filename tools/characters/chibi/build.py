"""Hand-built chibi kit from Jørgen's two reference pictures (2026-10-02, reviews/chibi-manual-1). Blender, -t 8:

  blender -b -t 8 --factory-startup -P tools/characters/chibi/build.py -- <attempt>

Kit, one collection each, all skinned to one Mixamo-named armature (the game's Mio rig names, so her idle and walk
carry over by name):
  base     the vinyl body: marshmallow head with the painted face (face-base.svg), torso, arms, mitten hands,
           legs and feet. Every part is a superellipsoid; plain matte materials.
  hair     shoulder-length bob: a shell round the head with the face window cut out, plus side-swept bang locks
           laid on the forehead by ray casts. Her right (image left) is covered by the sweep.
  office   white blouse with rolled sleeves and collar, dark grey pencil skirt, dark flats.
Space: Z up, she faces -Y, her left is +X (image right in a front view). 1 mm = 1 px of his base picture, floor at
z = 0, so measurements come straight off the picture: x = (px - 624.5) / 1000, z = (1185 - py) / 1000 (the
head's middle and the floor line, from a row-by-row scan of its silhouette).
Writes <MAIN>/art/parts/chibi-manual/<attempt>/: chibi.blend, base.glb (body only), office.glb (dressed), face.png.
"""
import math
import os
import subprocess
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
MAIN = '/home/jorgen/repo/japanese'
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ATTEMPT = argv[0] if argv else 'a01'
OUT = f'{MAIN}/art/parts/chibi-manual/{ATTEMPT}'
os.makedirs(OUT, exist_ok=True)

SKIN, HAIR, BLOUSE, SKIRT, SHOE = '#f2c8ae', '#5a4037', '#f3e9e6', '#4a4241', '#3a302e'

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


def both(make):
    """(left, right) bmesh pair: make() builds her left (+X), the right is its mirror."""
    return make(), mirror(make())


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
    T = TORSO
    bm = blob(T['c'], T['a'], T['b'], T['h'], T['e'], T['f'], n=16)
    for v in bm.verts:                     # shoulders a little narrower than the belly
        k = max(0.0, (v.co.z - T['c'][2]) / T['h'])
        v.co.x *= 1 - TAPER * k * k
    parts['torso'] = obj('torso', bm, mats['skin'], coll)

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
        l, r = both(make)
        parts[f'{nm}.L'] = obj(f'{nm}.L', l, mats['skin'], coll)
        parts[f'{nm}.R'] = obj(f'{nm}.R', r, mats['skin'], coll)
    return parts


# ------------------------------------------------------------------ hair
HAIR_SHELL = dict(c=(0, 0.006, 0.77), a=0.345, b=0.27, h=0.36, e=4.0, f=4.0)
HAIRLINE, WINDOW_X, HAIR_END = 0.945, 0.272, 0.52
DZ = 0.095                                 # bang lines were drawn with the floor at 1090 px
CLUMPS = 18
FLARE = 0.03                               # the bob widens toward its ends


def theta(v):
    return math.atan2(v.x, -v.y)          # 0 at the front middle


def build_hair(coll, mats, head):
    S = HAIR_SHELL
    bm = blob(S['c'], S['a'], S['b'], S['h'], S['e'], S['f'], n=40)
    gone = [fc for fc in bm.faces
            if (c := fc.calc_center_median()).z < HAIR_END
            or (c.y < 0 and c.z < HAIRLINE and abs(c.x) < WINDOW_X)]
    bmesh.ops.delete(bm, geom=gone, context='FACES')
    for v in bm.verts:                     # clumps: shallow grooves, and a pointed tip at the end of each clump
        t = theta(v.co)
        groove = (0.5 - 0.5 * math.cos(CLUMPS * t)) ** 2
        r = Vector((v.co.x, v.co.y, 0))
        if r.length > 1e-6:
            down = min(1.0, max(0.0, (1.025 - v.co.z) / 0.15))
            v.co -= r.normalized() * 0.006 * groove * down
            v.co += r.normalized() * FLARE * min(1.0, max(0.0, (0.76 - v.co.z) / 0.24)) ** 1.5
        tip = max(0.0, math.cos(CLUMPS * t)) ** 3
        ramp = min(1.0, max(0.0, (0.645 - v.co.z) / 0.12))
        v.co.z -= 0.015 * tip * ramp
    shell_bm = bm.copy()
    o = obj('hair-shell', bm, mats['hair'], coll)
    sol = o.modifiers.new('thick', 'SOLIDIFY')
    sol.thickness, sol.offset = 0.02, -1
    parts = {'hair-shell': o}

    # bang locks: drawn as centre lines in the front view (x, z), laid onto the head by rays from the front
    hb = bmesh.new(); hb.from_mesh(head.data)
    head_bvh, shell_bvh = BVHTree.FromBMesh(hb), BVHTree.FromBMesh(shell_bm)
    LOCKS = [  # (centre line from root to tip, root width)
        ([(0.10, 0.985), (0.05, 0.92), (-0.04, 0.84), (-0.12, 0.76), (-0.165, 0.685)], 0.14),
        ([(0.13, 0.975), (0.09, 0.91), (0.02, 0.83), (-0.02, 0.75), (-0.03, 0.69)], 0.10),
        ([(0.0, 0.985), (-0.09, 0.93), (-0.18, 0.85), (-0.23, 0.76), (-0.25, 0.66)], 0.12),
        ([(0.17, 0.97), (0.21, 0.91), (0.245, 0.83), (0.262, 0.76)], 0.09),
        ([(-0.22, 0.92), (-0.25, 0.80), (-0.26, 0.68), (-0.255, 0.56), (-0.235, 0.46)], 0.06),
    ]
    for i, (pts, w) in enumerate(LOCKS):
        bm = lock([(x, z + DZ) for x, z in pts], w, head_bvh, shell_bvh, lift0=0.004 + 0.003 * i)
        if bm: parts[f'bang{i + 1}'] = obj(f'bang{i + 1}', bm, mats['hair'], coll)
    hb.free(); shell_bm.free()
    return parts


def spline(pts, m):
    """Catmull-Rom through 2D points, m samples."""
    P = [Vector(p) for p in pts]
    P = [2 * P[0] - P[1]] + P + [2 * P[-1] - P[-2]]
    out = []
    for k in range(m):
        u = k / (m - 1) * (len(P) - 3)
        i = min(int(u), len(P) - 4); t = u - i
        p0, p1, p2, p3 = P[i:i + 4]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                          + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    return out


def lock(pts, width, head_bvh, shell_bvh, lift0, M=28, K=9, thick=0.016):
    """A flat tapered lock lying on the head: top surface raised by a rounded profile, bottom just under it.
    Where the hair shell is in front of the head, the lock rides on the shell instead (lift = the gap)."""
    C = spline(pts, M)
    grid = []
    for i, c in enumerate(C):
        u = i / (M - 1)
        tg = (C[min(i + 1, M - 1)] - C[max(i - 1, 0)]).normalized()
        nrm2 = Vector((-tg.y, tg.x))
        w = width * (1 - u) ** 0.9 * (0.85 + 0.15 * min(1, u * 8))
        row = []
        for j in range(K):
            v = -1 + 2 * j / (K - 1)
            p = c + nrm2 * v * w / 2
            org, d = Vector((p.x, -1.0, p.y)), Vector((0, 1, 0))
            hit, n, _, dh = head_bvh.ray_cast(org, d)
            sh = shell_bvh.ray_cast(org, d)
            if hit is None:                # past the head's outline (a cheek lock's tip): ride on the shell
                if sh[0] is None:
                    print('LOCK MISS', tuple(round(q, 3) for q in p)); return None
                hit, n, dh = sh[0], sh[1], sh[3]
            gap = (dh - sh[3]) if sh[0] is not None and sh[3] < dh else 0.0
            row.append([hit, n, gap, v, u])
        grid.append(row)
    # smooth the gaps so a lock crossing the hairline bends gently instead of stepping
    for _ in range(6):
        g = [[r[2] for r in row] for row in grid]
        for i in range(M):
            for j in range(K):
                nb = [g[i][j]] + [g[a][b] for a, b in ((i - 1, j), (i + 1, j), (i, j - 1), (i, j + 1)) if 0 <= a < M and 0 <= b < K]
                grid[i][j][2] = max(g[i][j], sum(nb) / len(nb))
    bm = bmesh.new()
    top, bot = [], []
    for row in grid:
        tr, br = [], []
        for hit, n, gap, v, u in row:
            base = hit - Vector((0, gap, 0)) + n * lift0     # back along the ray onto the shell where it is in front
            h = thick * math.sqrt(max(0.0, 1 - v * v)) * (1 - 0.6 * u)
            tr.append(bm.verts.new(base + n * h))
            br.append(bm.verts.new(base - n * 0.006))
        top.append(tr); bot.append(br)
    for i in range(M - 1):
        for j in range(K - 1):
            bm.faces.new((top[i][j], top[i + 1][j], top[i + 1][j + 1], top[i][j + 1]))
            bm.faces.new((bot[i][j + 1], bot[i + 1][j + 1], bot[i + 1][j], bot[i][j]))
        for j in (0, K - 1):
            bm.faces.new((top[i][j], bot[i][j], bot[i + 1][j], top[i + 1][j]))
    for i in (0, M - 1):
        for j in range(K - 1):
            bm.faces.new((top[i][j], top[i][j + 1], bot[i][j + 1], bot[i][j]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm


# ------------------------------------------------------------------ office clothes
SLEEVE = 0.95                              # rolled sleeves end just above the wrist


def build_office(coll, mats):
    parts = {}
    T = TORSO
    bm = blob(T['c'], T['a'] + 0.009, T['b'] + 0.009, T['h'] + 0.004, T['e'], T['f'], n=16)
    for v in bm.verts:
        k = max(0.0, (v.co.z - T['c'][2]) / T['h'])
        v.co.x *= 1 - TAPER * k * k
    parts['blouse'] = obj('blouse', bm, mats['blouse'], coll)

    # collar: two flat rounded flaps lying on the chest under the chin, with a V between them
    def flap():
        bm = blob((0.045, -T['b'] - 0.006, 0.51), 0.06, 0.008, 0.04, 2.2, 2.2, n=8)
        bmesh.ops.rotate(bm, cent=(0.045, -T['b'], 0.51), matrix=Matrix.Rotation(math.radians(-35), 3, 'Y'), verts=bm.verts[:])
        return bm
    l, r = both(flap)
    parts['collar.L'] = obj('collar.L', l, mats['blouse'], coll)
    parts['collar.R'] = obj('collar.R', r, mats['blouse'], coll)
    for k, z in enumerate((0.5, 0.455)):          # buttons down the front
        b = blob((0, -T['b'] - 0.009, z), 0.007, 0.003, 0.007, n=4)
        parts[f'button{k}'] = obj(f'button{k}', b, mats['button'], coll)

    def sleeve():
        end = SHOULDER + (WRIST - SHOULDER) * SLEEVE
        top = SHOULDER - (WRIST - SHOULDER).normalized() * 0.045      # over the round top of the arm
        L = (end - top).length
        bm = blob((top + end) / 2, ARM_R + 0.011, ARM_R + 0.011, L / 2 + 0.01, 2.0, 3.0, n=12, M=along(top, end))
        return bm

    def cuff():
        end = SHOULDER + (WRIST - SHOULDER) * SLEEVE
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=ARM_R + 0.016, radius2=ARM_R + 0.016, depth=0.026)
        bmesh.ops.transform(bm, matrix=Matrix.Translation(end) @ along(SHOULDER, WRIST).to_4x4(), verts=bm.verts[:])
        return bm

    for nm, make in (('sleeve', sleeve), ('cuff', cuff)):
        l, r = both(make)
        parts[f'{nm}.L'] = obj(f'{nm}.L', l, mats['blouse'], coll)
        parts[f'{nm}.R'] = obj(f'{nm}.R', r, mats['blouse'], coll)

    bm = blob((0, 0, 0.325), 0.163, 0.126, 0.09, 2.6, 6.0, n=16)          # pencil skirt, waist to upper leg
    for v in bm.verts:
        k = (v.co.z - 0.32) / 0.088                   # a little narrower at the hem than at the hips
        v.co.x *= 1 - 0.05 * max(0, -k)
    parts['skirt'] = obj('skirt', bm, mats['skirt'], coll)
    bm = blob((0, 0, 0.402), 0.168, 0.131, 0.02, 2.6, 4.0, n=16)         # waistband
    parts['waistband'] = obj('waistband', bm, mats['skirt'], coll)

    def shoe():
        F = FOOT
        bm = blob((F['c'][0], F['c'][1] - 0.003, F['c'][2]), F['a'] + 0.008, F['b'] + 0.009, F['h'] + 0.006, 2.3, 2.4, n=14)
        bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0.072),
                               plane_no=(0, 0, 1), clear_outer=True)     # a clean opening for the top of the foot
        for v in bm.verts: v.co.z = max(v.co.z, 0.0)
        return bm
    l, r = both(shoe)
    for nm, b in (('shoe.L', l), ('shoe.R', r)):
        o = obj(nm, b, mats['shoe'], coll)
        s = o.modifiers.new('thick', 'SOLIDIFY'); s.thickness = 0.006
        parts[nm] = o
    return parts


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


# which bones each part may follow (distance weights among them); one bone = rigid
ALLOWED = {
    'head': ['Head'], 'hair-shell': ['Head'], 'bang': ['Head'],
    'torso': ['Hips', 'Spine', 'Spine1', 'Spine2'], 'blouse': ['Hips', 'Spine', 'Spine1', 'Spine2'],
    'collar': ['Spine2'], 'button': ['Spine1'],
    'arm': ['{s}Arm', '{s}ForeArm'], 'sleeve': ['{s}Arm', '{s}ForeArm'], 'cuff': ['{s}ForeArm'],
    'hand': ['{s}Hand'], 'leg': ['{s}UpLeg', '{s}Leg'], 'foot': ['{s}Foot', '{s}ToeBase'], 'shoe': ['{s}Foot', '{s}ToeBase'],
    'skirt': ['Hips', 'LeftUpLeg', 'RightUpLeg'], 'waistband': ['Hips'],
}


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
        if key == 'skirt':
            ws = skirt_weights(p)
        else:
            ws = distance_weights(p, bones, segs)
            if key in ('torso', 'blouse'):        # above the waist: the spine; under the skirt: the skirt's weights
                h = min(1.0, max(0.0, (0.45 - p.z) / 0.06))
                under = skirt_weights(p)
                ws = {b: ws.get(b, 0) * (1 - h) + under.get(b, 0) * h for b in set(ws) | set(under)}
        for b, w in ws.items():
            if w > 0.01:
                if b not in groups: groups[b] = o.vertex_groups.new(name='mixamorig:' + b)
                groups[b].add([v.index], w, 'REPLACE')
    o.parent = arm
    m = o.modifiers.new('arm', 'ARMATURE'); m.object = arm


# ------------------------------------------------------------------ main
def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    face_png = f'{OUT}/face.png'
    subprocess.run(['rsvg-convert', '-w', '2048', '-h', '2048', f'{HERE}/face-base.svg', '-o', face_png], check=True)
    mats = {'skin': material('skin', SKIN, 0.55), 'face': material('face', SKIN, 0.55, image=face_png),
            'hair': material('hair', HAIR, 0.5), 'blouse': material('blouse', BLOUSE, 0.65),
            'button': material('button', '#e9e1de', 0.4), 'skirt': material('skirt', SKIRT, 0.7),
            'shoe': material('shoe', SHOE, 0.45)}
    cb, ch, co = collection('base'), collection('hair'), collection('office')
    base = build_base(cb, mats)
    hair = build_hair(ch, mats, base['head'])
    office = build_office(co, mats)
    arm, segs = build_rig()
    for o in list(base.values()) + list(hair.values()) + list(office.values()):
        skin(o, arm, segs)
    bpy.ops.wm.save_as_mainfile(filepath=f'{OUT}/chibi.blend')
    export(f'{OUT}/base.glb', [arm] + list(base.values()))
    export(f'{OUT}/office.glb', [arm] + list(base.values()) + list(hair.values()) + list(office.values()))
    faces = sum(len(o.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.polygons)
                for o in list(base.values()) + list(hair.values()) + list(office.values()))
    print('BUILT', OUT, 'faces', faces)


def export(path, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_skins=True,
                              export_animations=False, export_apply=True, export_image_format='WEBP')


main()
