"""Blender (background, CPU), the steps of chibi_game.py for one rigged Meshy chibi.

Meshy's texture atlas is hundreds of tiny islands, so a decimated copy that keeps those UVs gets triangles that
straddle two islands (flecks of the wrong colour all over the clothes). So the copy gets fresh UVs and the colour is
baked onto them from the full mesh. Blender's collapse decimation folded the finely noisy surface over on itself, so
meshoptimizer (gltf-transform simplify) does the decimating, between merge and decimate.
  merge <rigged.glb> <merged.glb>
      weld the importer's seam splits and drop UVs and normals, so the simplifier sees one plain skinned surface
  decimate <rigged.glb> <simplified.glb> <work.blend> <mesh.json>
      the full mesh and the simplified one side by side; save the scene and the triangles for chibi_uv.py (xatlas)
  bake <work.blend> <uv.json> <out.glb> <out.png> <texture px>
      put the new UVs on, bake the original's colour (selected to active, colour only, no light), export the
      skinned low mesh without images
"""
import bpy, json, os, sys

step, *args = sys.argv[sys.argv.index('--') + 1:]
count = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)


def edit_all(o, fn):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    fn()
    bpy.ops.object.mode_set(mode='OBJECT')


def load(src):
    """import a rigged file; its mesh and armature (the importer's bone-shape sphere dropped)"""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=src)
    new = [o for o in bpy.data.objects if o not in before]
    for o in [o for o in new if o.type == 'MESH' and not o.vertex_groups]:
        new.remove(o)
        bpy.data.objects.remove(o)
    arm = [o for o in new if o.type == 'ARMATURE'][0]
    arm.data.pose_position = 'REST'
    return [o for o in new if o.type == 'MESH'][0], arm


if step == 'merge':
    src, dst = args
    bpy.ops.wm.read_factory_settings(use_empty=True)
    lo, arm = load(src)
    edit_all(lo, lambda: bpy.ops.mesh.remove_doubles(threshold=1e-5))
    while len(lo.data.uv_layers) > 0:
        lo.data.uv_layers.remove(lo.data.uv_layers[0])
    if lo.data.has_custom_normals:
        bpy.ops.mesh.customdata_custom_splitnormals_clear()
    bpy.ops.object.shade_smooth()
    lo.data.materials.clear()
    arm.data.pose_position = 'POSE'
    bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_animations=False, export_normals=False,
                              export_materials='NONE', export_yup=True)

elif step == 'decimate':
    src, simple, blend, mesh_json = args
    bpy.ops.wm.read_factory_settings(use_empty=True)
    hi, harm = load(src)
    hi.name, harm.name = 'high', 'high-armature'
    lo, arm = load(simple)
    lo.name = 'chibi'
    bpy.context.view_layer.objects.active = lo
    bpy.ops.object.select_all(action='DESELECT')
    lo.select_set(True)
    bpy.ops.object.shade_smooth()
    print('triangles', count(lo))
    json.dump({'positions': [list(v.co) for v in lo.data.vertices],
               'faces': [list(p.vertices) for p in lo.data.polygons]}, open(mesh_json, 'w'))
    bpy.ops.wm.save_as_mainfile(filepath=blend)

elif step == 'bake':
    blend, uv_json, dst, png, px = args
    bpy.ops.wm.open_mainfile(filepath=blend)
    hi, lo = bpy.data.objects['high'], bpy.data.objects['chibi']
    arm = lo.parent
    uv = json.load(open(uv_json))['corners']  # per triangle, three (u, v)
    while len(lo.data.uv_layers) > 0:
        lo.data.uv_layers.remove(lo.data.uv_layers[0])
    layer = lo.data.uv_layers.new(name='UVMap')
    for p, corners in zip(lo.data.polygons, uv):
        for li, c in zip(p.loop_indices, corners):
            layer.data[li].uv = c
    # the decimated surface is creased; it takes the full mesh's normals, for its shading and for the bake's rays
    dt = lo.modifiers.new('normals', 'DATA_TRANSFER')
    dt.object = hi
    dt.use_loop_data = True
    dt.data_types_loops = {'CUSTOM_NORMAL'}
    dt.loop_mapping = 'POLYINTERP_NEAREST'
    bpy.context.view_layer.objects.active = lo
    while lo.modifiers[0].name != 'normals':
        bpy.ops.object.modifier_move_up(modifier='normals')
    bpy.ops.object.modifier_apply(modifier='normals')
    img = bpy.data.images.new('baked', int(px), int(px))
    mat = bpy.data.materials.new('chibi')
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = img
    nodes.active = tex
    lo.data.materials.clear()
    lo.data.materials.append(mat)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 4
    bake = scene.render.bake
    bake.use_selected_to_active = True
    bake.cage_extrusion = float(os.environ.get('CHIBI_CAGE', 1.0))  # the mesh's own units: it is 100 tall
    bake.max_ray_distance = 3 * bake.cage_extrusion
    bake.margin = 16
    bake.use_pass_direct = False
    bake.use_pass_indirect = False
    bake.use_pass_color = True
    bpy.ops.object.select_all(action='DESELECT')
    hi.select_set(True)
    lo.select_set(True)
    bpy.context.view_layer.objects.active = lo
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'})
    img.filepath_raw = png
    img.file_format = 'PNG'
    img.save()
    bpy.data.objects.remove(hi)
    bpy.data.objects.remove(bpy.data.objects['high-armature'])
    arm.data.pose_position = 'POSE'
    bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_image_format='NONE',
                              export_animations=False, export_tangents=False, export_yup=True)
