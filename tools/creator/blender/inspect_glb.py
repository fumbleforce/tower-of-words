# Print what a GLB holds: objects, mesh sizes, materials, the armature's bones (world head/tail) and actions.
#   blender -b --factory-startup -P tools/creator/blender/inspect_glb.py -- <file.glb>
import sys
import bpy

path = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
r = lambda v: [round(x, 3) for x in v]
for o in bpy.data.objects:
    print('OBJ', o.name, o.type, r(o.location), r(o.rotation_euler), r(o.scale), 'parent', o.parent.name if o.parent else None)
    if o.type == 'MESH':
        ws = [o.matrix_world @ v.co for v in o.data.vertices]
        print('  verts', len(ws), 'faces', len(o.data.polygons), 'min', r([min(w[i] for w in ws) for i in range(3)]),
              'max', r([max(w[i] for w in ws) for i in range(3)]))
        print('  mats', [m.name for m in o.data.materials], 'uv', [u.name for u in o.data.uv_layers], 'groups', len(o.vertex_groups))
    if o.type == 'ARMATURE':
        for b in o.data.bones:
            print('  BONE', b.name, 'parent', b.parent.name if b.parent else None,
                  'head', r(o.matrix_world @ b.head_local), 'tail', r(o.matrix_world @ b.tail_local))
for a in bpy.data.actions:
    print('ACTION', a.name, r(a.frame_range))
for i in bpy.data.images:
    print('IMG', i.name, list(i.size))
