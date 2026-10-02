"""Rig an assembled parts model (reviews/char-mio-parts-1) with a simple humanoid armature. Blender, run with -t 8:

  blender -b -t 8 -P tools/characters/parts/rig.py -- <attempt> [head_faces=100000] [body_faces=50000]

Bone names are Mixamo's (the game's Mio rig, game3d/assets/mio/walk.glb), so her approved idle and walk can be
carried over by name (tools/characters/parts/viewer.html retargets them live; tools/characters/retarget.py is the
offline version). Joints are placed from the target picture: each part was cut from it and placed back by the same
pixel map (placement.json), so a joint's picture position gives its height and left-right place; its depth is the
middle of the mesh at that height. Left and right are hers: her left is image right (+X).
Weights: distance weights for the body (bone heat fails on these meshes; weights=heat tries it); the head and hair move rigidly with the Head bone
and the hood lining with the neck. The mesh is decimated (collapse, UVs and textures kept) to those budgets so the
browser can skin it; the stills use the full model.
Writes <attempt>/mio-rigged.glb and rig.json next to the assembly.
"""
import bpy, json, os, sys
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
attempt = argv[0]
opt = dict(kv.split('=', 1) for kv in argv[1:])
D = f'/home/jorgen/repo/japanese/art/parts/char-mio-parts/{attempt}'
bpy.ops.wm.open_mainfile(filepath=f'{D}/mio.blend')
rec = json.load(open(f'{D}/placement.json'))
m = rec['metres_per_px']
CX, FLOOR = 1535, 2898

# joint -> (x px, y px) in the target picture; parents follow the Mixamo chain
J = {
    'Hips': (1535, 1830), 'Spine': (1535, 1660), 'Spine1': (1535, 1480), 'Spine2': (1535, 1290),
    'Neck': (1535, 900), 'Head': (1535, 800), 'HeadTop_End': (1535, 215),
    'LeftShoulder': (1585, 960), 'LeftArm': (1745, 985), 'LeftForeArm': (1860, 1400), 'LeftHand': (1860, 1800),
    'LeftHandEnd': (1855, 1935),
    'LeftUpLeg': (1650, 1860), 'LeftLeg': (1645, 2250), 'LeftFoot': (1655, 2650), 'LeftToeBase': (1655, 2860),
    'LeftToe_End': (1655, 2880),
}
for k, (x, y) in list(J.items()):
    if k.startswith('Left'): J['Right' + k[4:]] = (2 * CX - x, y)
PARENT = {'Spine': 'Hips', 'Spine1': 'Spine', 'Spine2': 'Spine1', 'Neck': 'Spine2', 'Head': 'Neck', 'HeadTop_End': 'Head'}
for s in ('Left', 'Right'):
    PARENT.update({f'{s}Shoulder': 'Spine2', f'{s}Arm': f'{s}Shoulder', f'{s}ForeArm': f'{s}Arm', f'{s}Hand': f'{s}ForeArm',
                   f'{s}HandEnd': f'{s}Hand', f'{s}UpLeg': 'Hips', f'{s}Leg': f'{s}UpLeg', f'{s}Foot': f'{s}Leg',
                   f'{s}ToeBase': f'{s}Foot', f'{s}Toe_End': f'{s}ToeBase'})


def V(o):
    a = np.empty(len(o.data.vertices) * 3); o.data.vertices.foreach_get('co', a); return a.reshape(-1, 3)


body, head = bpy.data.objects['body'], bpy.data.objects['head']
B = V(body)


def world(name):
    x, y = J[name]
    X, Z = (x - CX) * m, (FLOOR - y) * m
    r = 25 * m
    band = B[(np.abs(B[:, 0] - X) < r) & (np.abs(B[:, 2] - Z) < r)]
    if 'Toe' in name:                                   # toes: the front of the shoe
        Y = band[:, 1].min() + (0.03 if name.endswith('Base') else 0.0) if len(band) else 0
    else:
        Y = (band[:, 1].min() + band[:, 1].max()) / 2 if len(band) else (B[:, 1].min() + B[:, 1].max()) / 2
    return Vector((X, Y, Z))


P = {k: world(k) for k in J}
# The torso's depth from a thin band zig-zagged (a10: Spine 17 cm in front of the hips, inside the pocket), and the
# idle then straightened the zig-zag into a taller spine. Torso joints take the middle of the whole slice instead,
# and the shoulder joints sit at the same depth as Spine2.
for k in ('Hips', 'Spine', 'Spine1', 'Spine2'):
    z = P[k].z
    sl = B[(np.abs(B[:, 2] - z) < 80 * m) & (np.abs(B[:, 0]) < 150 * m)]
    if len(sl): P[k].y = (sl[:, 1].min() + sl[:, 1].max()) / 2
for s in ('Left', 'Right'):
    for k in ('Shoulder', 'Arm'): P[s + k].y = P['Spine2'].y
# Neck and head depth: the body's middle at neck height is pulled back by the hood, which tipped the neck bone
# forward and lifted the head off the collar in the idle. Use the throat on the head part instead: its front at
# 815 px plus the neck's half-width (45 px).
Hh = V(head)
throat = Hh[(np.abs(Hh[:, 0]) < 12 * m) & (np.abs(Hh[:, 2] - (FLOOR - 815) * m) < 10 * m)]
if len(throat):
    for k in ('Neck', 'Head'): P[k].y = throat[:, 1].min() + 45 * m
P['HeadTop_End'].y = P['Head'].y
# toes point forward along the floor
for s in ('Left', 'Right'):
    P[f'{s}ToeBase'].z = P[f'{s}Toe_End'].z = 0.03
    P[f'{s}Toe_End'].y = P[f'{s}ToeBase'].y - 0.08

# decimate each mesh past its own budget (collapse keeps UVs and textures); a Smart Topology body stays as it is
budget = {body.name: int(opt.get('body_faces', 50000)), head.name: int(opt.get('head_faces', 100000))}
for o in (body, head):
    mod = o.modifiers.new('dec', 'DECIMATE'); mod.ratio = min(1.0, budget[o.name] / len(o.data.polygons))
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier='dec')

arm = bpy.data.objects.new('Armature', bpy.data.armatures.new('Armature'))
bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
eb = {}
children = {}
for k, p in PARENT.items(): children.setdefault(p, []).append(k)
for k in J:
    if k.endswith('End') or k == 'HeadTop_End': continue
    b = arm.data.edit_bones.new('mixamorig:' + k)
    b.head = P[k]
    kids = [c for c in children.get(k, []) if not c.endswith('Shoulder') and not c.endswith('UpLeg')]
    if k == 'Hips': kids = ['Spine']
    if k == 'Spine2': kids = ['Neck']
    b.tail = P[kids[0]] if kids else P[k] + Vector((0, 0, 0.05))
    if (b.tail - b.head).length < 1e-3: b.tail = b.head + Vector((0, 0, 0.05))
    eb[k] = b
for k, b in eb.items():
    if k in PARENT and PARENT[k] in eb:
        b.parent = eb[PARENT[k]]
        b.use_connect = False
bpy.ops.object.mode_set(mode='OBJECT')

# body weights. weights=heat is Blender's bone heat; on a07 it failed for most bones ("failed to find solution", the
# generated mesh is not watertight), so the default is distance weights: each vertex takes its three nearest bone
# segments, weighted 1/d^4. Below the crotch a vertex may only follow its own side's leg; arm bones are only used
# outside the shoulder joints' span, so the hoodie's sides don't swing with the arms.
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active = arm
if opt.get('weights') == 'heat':
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
else:
    bpy.ops.object.parent_set(type='ARMATURE_NAME')
    Bv = V(body)
    names = list(eb)
    heads, tails = {}, {}
    for k in names:
        b = arm.data.bones['mixamorig:' + k]
        heads[k] = np.array(arm.matrix_world @ b.head_local); tails[k] = np.array(arm.matrix_world @ b.tail_local)
    dist = np.zeros((len(Bv), len(names)))
    for j, k in enumerate(names):
        a, b = heads[k], tails[k]; ab = b - a
        t = np.clip(((Bv - a) @ ab) / max(ab @ ab, 1e-9), 0, 1)
        dist[:, j] = np.linalg.norm(Bv - (a + t[:, None] * ab), axis=1)
    crotch = (FLOOR - 1890) * m
    torso = (1745 - CX) * m * float(opt.get('arm_in', 0.92))
    legs_out = (1770 - CX) * m                            # outer edge of her thighs in the picture
    for j, k in enumerate(names):
        side = 1 if k.startswith('Left') else -1
        if 'Leg' in k or 'Foot' in k or 'Toe' in k:
            dist[(Bv[:, 2] < crotch) & (np.sign(Bv[:, 0]) != side), j] = 1e9
            dist[np.abs(Bv[:, 0]) > legs_out, j] = 1e9   # the hands hang beside the thighs; they are not leg
        if any(t in k for t in ('Arm', 'Hand')):
            dist[Bv[:, 0] * side < torso, j] = 1e9
        if k.endswith('Shoulder'):
            dist[:, j] = 1e9                              # shoulders carry no skin of their own
    near = np.argsort(dist, axis=1)[:, :3]
    groups = {k: body.vertex_groups.get('mixamorig:' + k) or body.vertex_groups.new(name='mixamorig:' + k) for k in names}
    for i in range(len(Bv)):
        d = dist[i, near[i]]; w = 1 / np.maximum(d, 1e-4) ** 4; w[d > 1e8] = 0; w /= w.sum()
        for j, wj in zip(near[i], w):
            if wj > 0.01: groups[names[j]].add([int(i)], float(wj), 'REPLACE')
empty_groups = sum(1 for v in body.data.vertices if not v.groups)

# head and lining: rigid
for o, bone in ((head, 'mixamorig:Head'), (bpy.data.objects.get('lining'), 'mixamorig:Neck')):
    if o is None: continue
    g = o.vertex_groups.new(name=bone); g.add(range(len(o.data.vertices)), 1.0, 'REPLACE')
    o.parent = arm
    md = o.modifiers.new('arm', 'ARMATURE'); md.object = arm

# one skinned mesh
bpy.ops.object.select_all(action='DESELECT')
objs = [o for o in (body, head, bpy.data.objects.get('lining')) if o]
for o in objs: o.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body.name = 'mio'

bpy.ops.object.select_all(action='DESELECT')
bpy.ops.export_scene.gltf(filepath=f'{D}/mio-rigged.glb', export_format='GLB', export_skins=True, export_animations=False,
                          export_image_format='WEBP', export_image_quality=90)
bpy.ops.wm.save_as_mainfile(filepath=f'{D}/mio-rigged.blend')
info = {'faces': len(body.data.polygons), 'unweighted_body_vertices': empty_groups,
        'joints_px': J, 'joints_m': {k: [round(c, 4) for c in v] for k, v in P.items()}}
json.dump(info, open(f'{D}/rig.json', 'w'), indent=1)
print('RIGGED', json.dumps({k: info[k] for k in ('faces', 'unweighted_body_vertices')}))
