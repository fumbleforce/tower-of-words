# char-mio-i2i texturing: project pictures onto the model from the cameras they were drawn for, and blend them into
# one texture (Blender, Cycles bakes on the CPU).
#
# For every view (a picture prepared by mio_i2i_views.py: RGB with the figure's colours pushed out past its edge, A the
# figure mask) three bakes go into the model's own UV layout:
#   colour  the picture through a UV layer projected from that view's camera
#   mask    the picture's alpha, and the face flag (the 'face' material slot)
#   seen    direct light from a point light at the camera: how squarely the view sees each texel, 0 where hidden
# Then per texel: weight = mask * seen^p * gain, the face only from the front picture, and the flat colours of the
# model's own materials under everything with a tiny weight (what no picture sees).
import os

import bmesh
import bpy
import numpy as np
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

import kit
import mio_i2i_cam as C

SIZE = 2048


def uv_unwrap(ob, face_slot, face_boost=2.5):
    """Own UV layout: smart project, the face islands scaled up before packing so the face gets more texels."""
    me = ob.data
    uv = me.uv_layers.new(name='UVMap')
    me.uv_layers.active = uv
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.004, area_weight=0.0, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    face = face_slot
    bm = bmesh.new()
    bm.from_mesh(me)
    lay = bm.loops.layers.uv['UVMap']
    for f in bm.faces:
        if f.material_index == face:
            for l in f.loops:
                l[lay].uv *= face_boost
    bm.to_mesh(me)
    bm.free()
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.select_all(action='SELECT')
    bpy.ops.uv.pack_islands(margin=0.004, rotate=True, scale=True)
    bpy.ops.object.mode_set(mode='OBJECT')


def project_uv(ob, cam, name):
    sc = bpy.context.scene
    me = ob.data
    lay = me.uv_layers.get(name) or me.uv_layers.new(name=name)
    mw = ob.matrix_world
    co = [world_to_camera_view(sc, cam, mw @ v.co) for v in me.vertices]
    for li, l in enumerate(me.loops):
        p = co[l.vertex_index]
        lay.data[li].uv = (p.x, p.y)
    me.uv_layers.active = me.uv_layers['UVMap']
    me.uv_layers['UVMap'].active_render = True


def new_image(name, alpha=False):
    im = bpy.data.images.get(name)
    if im:
        bpy.data.images.remove(im)
    return bpy.data.images.new(name, SIZE, SIZE, alpha=alpha, float_buffer=True)


def pixels(im):
    a = np.empty(SIZE * SIZE * 4, np.float32)
    im.pixels.foreach_get(a)
    return a.reshape(SIZE, SIZE, 4)


def bake_mats(ob, make):
    """Swap every slot for a bake material built by make(slot_index, original) (each with an active target image
    node), returning the originals to put back."""
    orig = list(ob.data.materials)
    for i, m in enumerate(orig):
        ob.data.materials[i] = make(i, m)
    return orig


def restore(ob, orig):
    for i, m in enumerate(orig):
        ob.data.materials[i] = m


def emission_mat(target, colour_fn):
    """A material that emits colour_fn(nt) (a socket) and has target as the active image node."""
    m = bpy.data.materials.new('bake')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(colour_fn(nt), em.inputs['Color'])
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    t = nt.nodes.new('ShaderNodeTexImage')
    t.image = target
    nt.nodes.active = t
    return m


def proj_tex(nt, img, uvname):
    uvn = nt.nodes.new('ShaderNodeUVMap')
    uvn.uv_map = uvname
    t = nt.nodes.new('ShaderNodeTexImage')
    t.image = img
    t.interpolation = 'Linear'
    t.extension = 'EXTEND'
    nt.links.new(uvn.outputs['UV'], t.inputs['Vector'])
    return t


def bake(ob, kind, samples=1):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.render.bake.margin = 6
    sc.render.bake.use_clear = True
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.view_layer.objects:
        o.select_set(o == ob)
    if kind == 'EMIT':
        bpy.ops.object.bake(type='EMIT')
    else:
        sc.render.bake.use_pass_direct = True
        sc.render.bake.use_pass_indirect = False
        sc.render.bake.use_pass_color = False
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT'})


def base_colours(ob):
    """The model's own flat colours, baked."""
    tgt = new_image('base')

    def make(i, m):
        col = tuple(m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value)

        def c(nt):
            n = nt.nodes.new('ShaderNodeRGB')
            n.outputs[0].default_value = col
            return n.outputs[0]
        return emission_mat(tgt, c)
    orig = bake_mats(ob, make)
    bake(ob, 'EMIT')
    restore(ob, orig)
    return pixels(tgt)[..., :3]


def view_bakes(ob, cam, img_path, tag, face_slot):
    project_uv(ob, cam, 'proj')
    img = bpy.data.images.load(img_path, check_existing=False)
    img.colorspace_settings.name = 'sRGB'
    # colour
    tc = new_image('c-' + tag)
    orig = bake_mats(ob, lambda i, m: emission_mat(tc, lambda nt: proj_tex(nt, img, 'proj').outputs['Color']))
    bake(ob, 'EMIT')
    restore(ob, orig)
    col = pixels(tc)[..., :3]
    # mask (alpha) in R, face flag in G
    tm = new_image('m-' + tag)

    def make(i, m):
        def c(nt):
            t = proj_tex(nt, img, 'proj')
            comb = nt.nodes.new('ShaderNodeCombineColor')
            nt.links.new(t.outputs['Alpha'], comb.inputs[0])
            comb.inputs[1].default_value = 1.0 if i == face_slot else 0.0
            return comb.outputs[0]
        return emission_mat(tm, c)
    orig = bake_mats(ob, make)
    bake(ob, 'EMIT')
    restore(ob, orig)
    pm = pixels(tm)
    # seen: a point light at the camera, white diffuse everywhere
    tv = new_image('v-' + tag)

    def make_v(i, m):
        mm = bpy.data.materials.new('bake-v')
        mm.use_nodes = True
        nt = mm.node_tree
        nt.nodes['Principled BSDF'].inputs['Base Color'].default_value = (1, 1, 1, 1)
        nt.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1.0
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = tv
        nt.nodes.active = t
        return mm
    ld = bpy.data.lights.new('proj-light', 'POINT')
    ld.energy = 1000
    ld.shadow_soft_size = 0.0
    lo = kit.link(bpy.data.objects.new('proj-light', ld))
    lo.location = cam.location
    orig = bake_mats(ob, make_v)
    bake(ob, 'DIFFUSE', samples=4)
    restore(ob, orig)
    bpy.data.objects.remove(lo)
    seen = pixels(tv)[..., 0]
    return col, pm[..., 0], pm[..., 1], seen


def apply(ob, views, out_dir, face_slot, frame_slot=None, front_gain=3.0, p_front=2.0, p_side=4.0):
    """views: [(tag, camera object, picture path)], the front picture first. Writes out_dir/tex.png and
    puts it on the model as one material. Returns the texture image."""
    sc = bpy.context.scene
    w = sc.world or bpy.data.worlds.new('w')
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[1].default_value = 0.0
    me = ob.data
    base = base_colours(ob)
    num = base * 1e-3
    den = np.full(base.shape[:2], 1e-3, np.float32)
    front_w = None
    for k, (tag, cam, path) in enumerate(views):
        col, mask, face, seen = view_bakes(ob, cam, path, tag, face_slot)
        valid = seen > 0
        norm = np.percentile(seen[valid], 99.5) if valid.any() else 1.0
        s = np.clip(seen / norm, 0, 1)
        if k == 0:
            wt = front_gain * mask * s ** p_front
            front_w = wt
        else:
            # the face comes from the front picture alone, wherever that picture sees it
            wt = mask * s ** p_side * ((face < 0.5) | (front_w < 0.05))
        num += col * wt[..., None]
        den += wt
        print('VIEW', tag, 'covered texels', float((wt > 0.05).mean()))
    tex = num / den[..., None]
    im = new_image('mio-tex', alpha=False)
    rgba = np.dstack([tex, np.ones(tex.shape[:2], np.float32)]).astype(np.float32)
    im.pixels.foreach_set(rgba.ravel())
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, 'tex.png')
    im.filepath_raw = path
    im.file_format = 'PNG'
    im.save()
    # one material for the whole figure; render and export from the saved 8-bit sRGB texture
    tex_img = bpy.data.images.load(path, check_existing=False)
    m = bpy.data.materials.new('mio-tex')
    m.use_nodes = True
    m.use_backface_culling = False
    nt = m.node_tree
    t = nt.nodes.new('ShaderNodeTexImage')
    t.name = 'tex'
    t.image = tex_img
    b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = 0.85
    b.inputs['Specular IOR Level'].default_value = 0.25
    nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    # the glasses keep their own flat black (they are geometry, not paint)
    frame = [p.index for p in me.polygons if p.material_index == frame_slot] if frame_slot is not None else []
    fm = None
    if frame:
        fm = kit.mat('#15171c', rough=0.5, spec=0.3).copy()
        fm.name = 'frame'
    me.materials.clear()
    me.materials.append(m)
    if fm:
        me.materials.append(fm)
    for poly in me.polygons:
        poly.material_index = 0
    for i in frame:
        me.polygons[i].material_index = 1
    for name in [l.name for l in me.uv_layers if l.name != 'UVMap']:
        me.uv_layers.remove(me.uv_layers[name])
    return m


def set_unlit(m, unlit, ob=None):
    """unlit: the texture straight to the output (Cycles shows it as is; the glTF exporter writes
    KHR_materials_unlit). Otherwise the Principled BSDF, lit by the scene."""
    nt = m.node_tree
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    t = nt.nodes['tex']
    if unlit:
        nt.links.new(t.outputs['Color'], out.inputs['Surface'])
        # the glasses: unlit black too, so they read as the drawn frames do
        for fm in (ob.data.materials[1:] if ob else []):
            fo = next(n for n in fm.node_tree.nodes if n.type == 'OUTPUT_MATERIAL')
            rgb = fm.node_tree.nodes.new('ShaderNodeRGB')
            rgb.outputs[0].default_value = kit.rgba('#141619')
            fm.node_tree.links.new(rgb.outputs[0], fo.inputs['Surface'])
    else:
        nt.links.new(nt.nodes['Principled BSDF'].outputs[0], out.inputs['Surface'])
