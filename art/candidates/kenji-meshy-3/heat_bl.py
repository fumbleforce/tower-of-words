"""Blender (background): bone-heat skin weights for a mesh on a given skeleton, for Kenji round 3 (reweight.py).
Reads an .npz with V (welded vertices, metres, y up), F (triangles), names, pos (joint positions), parent (index or
-1), deform (0/1); builds the mesh and an armature whose bones run from each joint to its first child (or along the
parent's direction for end bones), parents with automatic weights, and writes the weights as an .npy (vertices x
joints, unnormalised zeros for non-deforming joints).

  blender -b -P heat_bl.py -- <in.npz> <out.npy>
"""
import bpy, sys
import numpy as np
from mathutils import Vector

src, out = sys.argv[sys.argv.index('--') + 1:][:2]
D = np.load(src)
V, F, names, pos, parent, deform = D['V'], D['F'], list(D['names']), D['pos'], D['parent'], D['deform']
bpy.ops.wm.read_factory_settings(use_empty=True)
# Blender is z up: (x, y, z) here -> (x, -z, y)
conv = lambda p: Vector((float(p[0]), float(-p[2]), float(p[1])))
me = bpy.data.meshes.new('m')
me.from_pydata([tuple(conv(v)) for v in V], [], [tuple(int(i) for i in f) for f in F])
me.update()
ob = bpy.data.objects.new('m', me)
bpy.context.scene.collection.objects.link(ob)
arm = bpy.data.armatures.new('a')
ao = bpy.data.objects.new('a', arm)
bpy.context.scene.collection.objects.link(ao)
bpy.context.view_layer.objects.active = ao
bpy.ops.object.mode_set(mode='EDIT')
kids = {i: [k for k in range(len(names)) if parent[k] == i and deform[k]] for i in range(len(names))}
eb = {}
for i, n in enumerate(names):
    if not deform[i]:
        continue
    b = arm.edit_bones.new(n)
    h = conv(pos[i])
    if kids[i]:
        t = sum((conv(pos[k]) for k in kids[i]), Vector()) / len(kids[i])
        if (t - h).length < 1e-3:
            t = h + Vector((0, 0, 0.03))
    else:
        p = parent[i]
        d = (h - conv(pos[p])) if p >= 0 else Vector((0, 0, 1))
        t = h + d.normalized() * max(0.03, min(0.1, d.length * 0.6))
    b.head, b.tail = h, t
    eb[i] = b
for i, b in eb.items():
    p = parent[i]
    while p >= 0 and not deform[p]:
        p = parent[p]
    if p >= 0:
        b.parent = eb[p]
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='DESELECT')
ob.select_set(True); ao.select_set(True)
bpy.context.view_layer.objects.active = ao
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
W = np.zeros((len(V), len(names)), np.float32)
gi = {g.index: names.index(g.name) for g in ob.vertex_groups}
for v in me.vertices:
    for g in v.groups:
        W[v.index, gi[g.group]] = g.weight
print('HEAT empty vertices', int((W.sum(1) == 0).sum()), 'of', len(V))
np.save(out, W)
