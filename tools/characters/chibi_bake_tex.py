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


def face_group(o):
    """a vertex group over the front of the head (the face, cheek to cheek); the head is what the Head bone moves, its
    middle the middle of those points. Blender's collapse keeps nearly every edge in the group whatever the factor,
    so the group's size (CHIBI_FACE_CONE) sets the face's share of the triangles"""
    # the head bone's group and those of the bones on it (Meshy's head_end and headfront carry the fringe): kept
    # together, the fringe stays over the forehead (thinned alone, the forehead's skin came up through the hair)
    heads = {g.index for g in o.vertex_groups if g.name in ('Head', 'head_end', 'headfront')}
    if not heads:
        return None
    from mathutils import Vector
    mw = o.matrix_world
    pts = {v.index: mw @ v.co for v in o.data.vertices if sum(x.weight for x in v.groups if x.group in heads) > 0.5}
    if not pts:
        return None
    c = sum(pts.values(), Vector()) / len(pts)
    # the front: the glTF importer turns the model's +Z (where Meshy's chibis face) into Blender's -Y
    front = Vector((0, -1, 0))
    g = o.vertex_groups.new(name='face')
    cone = float(os.environ.get('CHIBI_FACE_CONE', 0.3))  # how far round the sides it reaches (1: the middle only)
    for i, p in pts.items():
        d = p - c
        f = d.normalized().dot(front) if d.length else 0
        if f > cone:
            g.add([i], 1.0, 'REPLACE')
    return g


def outward(o):
    """Each corner's normal turned to face the same way as the copy's own surface there (its smooth vertex normal):
    the full model's nearest face is at times the inside of a skirt or sleeve, and a corner that took that normal was
    shaded and baked from the inside (dark flecks on the back of the blouse's skirt)."""
    me = o.data
    vn = [v.normal.copy() for v in me.vertices]
    fixed, flipped = [], 0
    for p in me.polygons:
        for li in p.loop_indices:
            n = me.corner_normals[li].vector.copy()
            if n.dot(vn[me.loops[li].vertex_index]) < 0:
                n.negate()
                flipped += 1
            fixed.append(n)
    me.normals_split_custom_set(fixed)
    print('bake normals turned outward', flipped, 'of', len(fixed))


def head_texels(o, layer, side):
    """the texels of the triangles the Head bone moves, as a mask (rows from v = 0, as Blender's pixels)"""
    import numpy as np
    heads = {g.index for g in o.vertex_groups if g.name in ('Head', 'head_end', 'headfront')}
    w = [sum(x.weight for x in v.groups if x.group in heads) for v in o.data.vertices]
    mask = np.zeros((side, side), dtype=bool)
    for p in o.data.polygons:
        if sum(w[i] for i in p.vertices) / len(p.vertices) < 0.5:
            continue
        c = np.array([layer.data[li].uv[:] for li in p.loop_indices]) * side
        x0, y0 = np.maximum(np.floor(c.min(0)).astype(int) - 1, 0)
        x1, y1 = np.minimum(np.ceil(c.max(0)).astype(int) + 1, side - 1)
        if x1 < x0 or y1 < y0:  # a chart off the texture's edge
            continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax, ay), (bx, by), (cx, cy) = c[:3]
        d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(d) < 1e-12:
            continue
        w0 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / d
        w1 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / d
        e = -1.0 / max(1.0, abs(d) ** 0.5)
        mask[y0:y1 + 1, x0:x1 + 1] |= (w0 >= e) & (w1 >= e) & (1 - w0 - w1 >= e)
    return mask


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
    # below what meshoptimizer reaches (its split vertices stop it near 5k on the generics): Blender's collapse on the
    # already simple surface, to CHIBI_TRIS triangles (the phone copies of the generic chibis)
    want = int(os.environ.get('CHIBI_TRIS', 0))
    if want and count(lo) > want:
        d = lo.modifiers.new('fewer', 'DECIMATE')
        d.ratio = want / count(lo)
        d.use_collapse_triangulate = True
        # the face keeps more of its triangles: collapsed thin, its long triangles across the cheek took the nose's
        # normals and left a dark mark. Collapse adds cost where the group's weight is low, so the group is inverted.
        face = face_group(lo)
        if face:
            d.vertex_group = face.name
            d.invert_vertex_group = True
            d.vertex_group_factor = 10
        bpy.ops.object.modifier_apply(modifier='fewer')
        if face:
            gi = lo.vertex_groups['face'].index
            print('face triangles', sum(1 for p in lo.data.polygons if all(
                any(x.group == gi and x.weight > 0.5 for x in lo.data.vertices[v].groups) for v in p.vertices)))
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
    outward(lo)
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
    bake.margin = 0
    bake.use_pass_direct = False
    bake.use_pass_indirect = False
    bake.use_pass_color = True
    bpy.ops.object.select_all(action='DESELECT')
    hi.select_set(True)
    lo.select_set(True)
    bpy.context.view_layer.objects.active = lo
    # Rays go from the cage (the low mesh pushed out along its normals) back in, and take the first surface they meet.
    # A decimated copy sits inside the full surface where that is rounded (a crown, a cheek), sometimes by more than
    # the cage: rays from inside the head met the inside of the face (the crowd's bald spots: skin and even eyes on
    # the crown). So first the outermost surface within reach above each texel (cage = reach, rays no longer than
    # that), then within 2.5 times that, then, where nothing is above (the copy outside the full surface), the first
    # surface below it. On the lighter copies' heads (CHIBI_HEAD_WIDE=1) the wider reach goes first: thinned hair sat
    # below an ear's tip or the forehead, and the skin came up through it; the hair over it is what the full model
    # shows there. (On the finest copy that order found skin through gaps in the hair instead.) Each pass fills only what
    # the ones before it left (unbaked texels keep alpha 0). CHIBI_BAKE_CAGE: the reach, in the mesh's units (100 tall)
    import numpy as np
    side = int(px)
    n = side * side * 4
    reach = float(os.environ.get('CHIBI_BAKE_CAGE', 1.0))
    passes = [(reach, reach), (reach * 2.5, reach * 2.5), (0.05, reach), (reach * 5, reach * 10)]
    got = []
    buf = np.zeros(n, dtype=np.float32)
    for cage, ray in passes:
        bake.cage_extrusion = cage
        bake.max_ray_distance = ray
        img.pixels.foreach_set(np.zeros(n, dtype=np.float32))
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'})
        img.pixels.foreach_get(buf)
        got.append(buf.reshape(side, side, 4).copy())
    head = head_texels(lo, lo.data.uv_layers.active, side)  # (the layer made above is stale once the normals are applied)
    rgba = np.zeros((side, side, 4), dtype=np.float32)
    first = (1, 0, 2, 3) if os.environ.get('CHIBI_HEAD_WIDE') == '1' else (0, 1, 2, 3)
    for order, where in ((first, head), ((0, 1, 2, 3), ~head)):
        for k in order:
            new = where & (got[k][..., 3] > 0.5) & (rgba[..., 3] < 0.5)
            rgba[new] = got[k][new]
    print('bake reach', reach, 'head texels', int(head.sum()), 'baked', int((rgba[..., 3] > 0.5).sum()))
    # the padding round each chart: 16 texels, each from its nearest baked neighbour
    for _ in range(16):
        empty = rgba[..., 3] < 0.5
        if not empty.any():
            break
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            src = np.roll(rgba, (dy, dx), axis=(0, 1))
            take = empty & (src[..., 3] > 0.5)
            rgba[take] = src[take]
            empty &= ~take
    rgba[..., 3] = 1
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = png
    img.file_format = 'PNG'
    img.save()
    bpy.data.objects.remove(hi)
    bpy.data.objects.remove(bpy.data.objects['high-armature'])
    arm.data.pose_position = 'POSE'
    bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_image_format='NONE',
                              export_animations=False, export_tangents=False, export_yup=True)
