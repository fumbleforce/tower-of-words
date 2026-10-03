"""Blender (background, Cycles on the CPU): paint a chibi's face through a straight-on picture of it.

Meshy's texture atlas is hundreds of small islands, so the face can't be painted on the atlas itself. Instead:
  front <rigged.glb> <out.png> <cam.json> [px]
      render the head straight on (orthographic, the texture's own colour, no light) and write the camera box
  bake <rigged.glb> <front.png> <mask.png> <cam.json> <color.png> <weight.png>
      project front.png back onto the model from the same camera and bake it into the atlas (color.png), with a
      weight (weight.png): the mask, times "this point is the first thing the camera sees", times "faces the
      camera". face.py mixes them into the original texture, so every texel with weight 0 stays as it was.
The mesh is used in its rest pose; the character faces -Y (glTF +Z).
"""
import bpy, bmesh, json, math, sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree

step, *args = sys.argv[sys.argv.index('--') + 1:]


def load(src):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    objs = list(bpy.data.objects)
    for o in [o for o in objs if o.type == 'MESH' and not o.vertex_groups]:
        bpy.data.objects.remove(o)
    arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
    arm.data.pose_position = 'REST'
    me = [o for o in bpy.data.objects if o.type == 'MESH'][0]
    bpy.context.view_layer.update()
    return me, arm


def head_box(me):
    names = [g.name for g in me.vertex_groups if g.name.lower().startswith('head')]
    idx = {me.vertex_groups[n].index for n in names}
    mw = me.matrix_world
    pts = [mw @ v.co for v in me.data.vertices if sum(g.weight for g in v.groups if g.group in idx) > 0.5]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    return lo, hi


def cycles(px):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 16
    sc.render.resolution_x = sc.render.resolution_y = px
    sc.view_settings.view_transform = 'Standard'
    sc.render.film_transparent = True
    return sc


def emission_from(mat, color_socket):
    nt = mat.node_tree
    out = [n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'][0]
    em = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(color_socket, em.inputs['Color'])
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    return nt


if step == 'front':
    src, out, cam_json, *rest = args
    px = int(rest[0]) if rest else 1024
    me, arm = load(src)
    lo, hi = head_box(me)
    # the face: the head's front half, a little wider than tall
    cx, cz = (lo.x + hi.x) / 2, (lo.z + hi.z) / 2
    size = max(hi.x - lo.x, hi.z - lo.z) * 1.04
    sc = cycles(px)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    sc.camera = cam
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = size
    cam.data.clip_end = 100
    cam.location = (cx, lo.y - 2, cz)
    cam.rotation_euler = (math.pi / 2, 0, 0)
    mat = me.data.materials[0]
    tex = [n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE'][0]
    emission_from(mat, tex.outputs['Color'])
    sc.render.filepath = out
    bpy.ops.render.render(write_still=True)
    json.dump({'x0': cx - size / 2, 'z0': cz - size / 2, 'size': size, 'y': lo.y - 2, 'px': px}, open(cam_json, 'w'))

elif step == 'bake':
    src, front, mask, cam_json, color_out, weight_out = args
    cam = json.load(open(cam_json))
    me, arm = load(src)
    mw = me.matrix_world
    mesh = me.data
    # projected UVs and visibility, per corner
    deps = bpy.context.evaluated_depsgraph_get()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.transform(mw)
    tree = BVHTree.FromBMesh(bm)
    world = [v.co.copy() for v in bm.verts]
    bm.free()
    look = Vector((0, 1, 0))
    vis = []
    for p in world:
        start = Vector((p.x, cam['y'], p.z))
        hit = tree.ray_cast(start, look, 100)
        vis.append(1.0 if hit[0] is not None and (hit[0] - p).length < cam['size'] * 0.004 else 0.0)
    proj = mesh.uv_layers.new(name='proj')
    for lp in mesh.loops:
        p = world[lp.vertex_index]
        proj.data[lp.index].uv = ((p.x - cam['x0']) / cam['size'], (p.z - cam['z0']) / cam['size'])
    va = mesh.color_attributes.new('vis', 'FLOAT_COLOR', 'POINT')
    for i, v in enumerate(vis):
        va.data[i].color = (v, v, v, 1)
    base_uv = [u.name for u in mesh.uv_layers if u.name != 'proj'][0]
    mesh.uv_layers.active = mesh.uv_layers[base_uv]
    for u in mesh.uv_layers:
        u.active_render = u.name == base_uv
    mat = mesh.materials[0]
    nt = mat.node_tree
    orig = [n for n in nt.nodes if n.type == 'TEX_IMAGE'][0].image
    W, H = orig.size
    uvn = nt.nodes.new('ShaderNodeUVMap')
    uvn.uv_map = 'proj'

    def img_node(path):
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = bpy.data.images.load(path)
        n.extension = 'CLIP'
        nt.links.new(uvn.outputs['UV'], n.inputs['Vector'])
        return n

    fimg = img_node(front)
    mimg = img_node(mask)
    mimg.image.colorspace_settings.name = 'Non-Color'
    # weight = mask * vis * facing
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    dot = nt.nodes.new('ShaderNodeVectorMath')
    dot.operation = 'DOT_PRODUCT'
    dot.inputs[1].default_value = (0, -1, 0)
    nt.links.new(geo.outputs['Normal'], dot.inputs[0])
    face = nt.nodes.new('ShaderNodeMapRange')
    face.inputs['From Min'].default_value = 0.15
    face.inputs['From Max'].default_value = 0.4
    nt.links.new(dot.outputs['Value'], face.inputs['Value'])
    attr = nt.nodes.new('ShaderNodeAttribute')
    attr.attribute_name = 'vis'
    m1 = nt.nodes.new('ShaderNodeMath')
    m1.operation = 'MULTIPLY'
    nt.links.new(mimg.outputs['Color'], m1.inputs[0])
    nt.links.new(attr.outputs['Fac'], m1.inputs[1])
    m2 = nt.nodes.new('ShaderNodeMath')
    m2.operation = 'MULTIPLY'
    nt.links.new(m1.outputs[0], m2.inputs[0])
    nt.links.new(face.outputs['Result'], m2.inputs[1])
    sc = cycles(64)
    sc.cycles.samples = 1
    sc.render.bake.margin = 3
    sc.render.bake.use_clear = True
    bpy.ops.object.select_all(action='DESELECT')
    me.select_set(True)
    bpy.context.view_layer.objects.active = me
    target = nt.nodes.new('ShaderNodeTexImage')
    for sock, out, cs in ((fimg.outputs['Color'], color_out, 'sRGB'), (m2.outputs[0], weight_out, 'Non-Color')):
        img = bpy.data.images.new('bake', W, H, alpha=False, float_buffer=False)
        img.colorspace_settings.name = cs
        target.image = img
        nt.nodes.active = target
        emission_from(mat, sock)
        bpy.ops.object.bake(type='EMIT')
        img.filepath_raw = out
        img.file_format = 'PNG'
        img.save()
