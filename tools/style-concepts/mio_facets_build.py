# char-mio-facets: build one attempt in Blender from its mesh.json (mio_facets_lift.py): the facet mesh with one flat
# colour per facet (a face-corner colour attribute), the face decal, the glb, and the review renders.
#   ~/.local/bin/blender -b --factory-startup -t 8 -P tools/style-concepts/mio_facets_build.py -- <attempt>
# Outputs go to the main checkout's art/parts/style-concepts/claude-miofacets/<attempt>/ (git-ignored, :8771).
#
# Staging (shot-staging): Mio alone, standing straight, looking ahead, nothing else in frame. Camera: the picture's
# (20 degree lens, 4 degrees above level, aimed at mid-body, the whole figure), swung round her: front 0, l40
# three-quarter toward her left (image right), l90 her left side, back 180, r40 and r90 the same toward her right.
# Head-only studies use the same yaw and pitch, framed around the head bounds with 30% margin.
# Flat renders are unlit: each facet shows exactly its one colour, so the front render can be laid over the picture.
# Clay renders: plain grey, one sun from her right-front-above (image left), the facet edges drawn (edges between
# two facets; the triangulation inside a facet is not drawn).
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402

import kit  # noqa: E402
import mio_i2i_cam as C  # noqa: E402

OUT = os.path.join(C.MAIN, 'art/parts/style-concepts/claude-miofacets')
YAWS = {'front': 0, 'l40': 40, 'l90': 90, 'back': 180, 'r40': -40, 'r90': -90}

att = kit.args()[0]
d = os.path.join(OUT, att)
data = json.load(open(os.path.join(d, 'mesh.json')))
kit.reset()
sc = bpy.context.scene
coll = bpy.data.collections.new('mio')
sc.collection.children.link(coll)


def node_mat(name, kind):
    m = bpy.data.materials.new(name)
    if hasattr(m, 'use_nodes'):
        m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    if kind == 'flat':
        a = nt.nodes.new('ShaderNodeVertexColor')
        a.layer_name = 'col'
        e = nt.nodes.new('ShaderNodeEmission')
        nt.links.new(a.outputs['Color'], e.inputs['Color'])
        nt.links.new(e.outputs[0], out.inputs['Surface'])
    elif kind == 'lit':
        a = nt.nodes.new('ShaderNodeVertexColor')
        a.layer_name = 'col'
        b = nt.nodes.new('ShaderNodeBsdfPrincipled')
        b.inputs['Roughness'].default_value = 0.9
        b.inputs['Specular IOR Level'].default_value = 0.2
        nt.links.new(a.outputs['Color'], b.inputs['Base Color'])
        nt.links.new(b.outputs[0], out.inputs['Surface'])
    elif kind == 'clay':
        b = nt.nodes.new('ShaderNodeBsdfPrincipled')
        b.inputs['Base Color'].default_value = kit.rgba('#c9ccd1')
        b.inputs['Roughness'].default_value = 0.9
        nt.links.new(b.outputs[0], out.inputs['Surface'])
    return m


def decal_mat(kind):
    m = bpy.data.materials.new('decal-' + kind)
    if hasattr(m, 'use_nodes'):
        m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(os.path.join(d, 'decal.png'))
    tex.interpolation = 'Linear'
    if kind == 'flat':
        e = nt.nodes.new('ShaderNodeEmission')
        t = nt.nodes.new('ShaderNodeBsdfTransparent')
        mix = nt.nodes.new('ShaderNodeMixShader')
        nt.links.new(tex.outputs['Color'], e.inputs['Color'])
        nt.links.new(tex.outputs['Alpha'], mix.inputs[0])
        nt.links.new(t.outputs[0], mix.inputs[1])
        nt.links.new(e.outputs[0], mix.inputs[2])
        nt.links.new(mix.outputs[0], out.inputs['Surface'])
    else:
        b = nt.nodes.new('ShaderNodeBsdfPrincipled')
        b.inputs['Roughness'].default_value = 0.9
        nt.links.new(tex.outputs['Color'], b.inputs['Base Color'])
        nt.links.new(tex.outputs['Alpha'], b.inputs['Alpha'])
        nt.links.new(b.outputs[0], out.inputs['Surface'])
        if hasattr(m, 'blend_method'):
            m.blend_method = 'CLIP'
    return m


# ---- the facet mesh ---------------------------------------------------------------------------------------------
faces = data['faces']
me = bpy.data.meshes.new('mio')
me.from_pydata([tuple(v) for v in data['verts']], [], [tuple(f['v']) for f in faces])
col = me.color_attributes.new('col', 'BYTE_COLOR', 'CORNER')
for poly, f in zip(me.polygons, faces):
    r, g, b = (c / 255 for c in f['rgb'])
    for li in poly.loop_indices:
        col.data[li].color_srgb = (r, g, b, 1.0)
me.update()
ob = kit.link(bpy.data.objects.new('mio', me), coll)
M_FLAT, M_LIT, M_CLAY = node_mat('flat', 'flat'), node_mat('lit', 'lit'), node_mat('clay', 'clay')
me.materials.append(M_FLAT)

# facet edges (between two facets, or on the open border) are the edges to draw
key = [(f.get('side'), f.get('facet'), f.get('part')) for f in faces]
edge_faces = {}
for poly in me.polygons:
    for ek in poly.edge_keys:
        edge_faces.setdefault(ek, []).append(poly.index)
fe = me.attributes.get('freestyle_edge') or me.attributes.new('freestyle_edge', 'BOOLEAN', 'EDGE')
for e in me.edges:
    fs = edge_faces.get(e.key, [])
    sides = {key[i][0] for i in fs}
    fe.data[e.index].value = (len(fs) != 2 or key[fs[0]] != key[fs[1]]) and sides != {'core'}

# ---- the face decal -----------------------------------------------------------------------------------------------
dob = None
if data['decal']:
    dm = bpy.data.meshes.new('face')
    vs, fs, uvs = [], [], []
    for tri in data['decal']:
        fs.append(tuple(range(len(vs), len(vs) + 3)))
        for c in tri:
            vs.append(tuple(c['co']))
            uvs.append(tuple(c['uv']))
    dm.from_pydata(vs, [], fs)
    uv = dm.uv_layers.new(name='uv')
    for poly in dm.polygons:
        for li in poly.loop_indices:
            uv.data[li].uv = uvs[dm.loops[li].vertex_index]
    D_FLAT, D_LIT = decal_mat('flat'), decal_mat('lit')
    dm.materials.append(D_FLAT)
    dob = kit.link(bpy.data.objects.new('face', dm), coll)

lo, hi = kit.bounds([ob])
head_only = data.get('slice') == 'head'
render_mid = tuple((lo + hi) / 2) if head_only else C.MID
render_span = (hi.z - lo.z) * 1.3 if head_only else C.SPAN
print('BOUNDS', tuple(lo), tuple(hi))

# ---- glb (lit colours, as the game lights it) ---------------------------------------------------------------------
me.materials[0] = M_LIT
if dob:
    dob.data.materials[0] = D_LIT
kit.export(coll, os.path.join(d, 'mio.glb'))
me.materials[0] = M_FLAT
if dob:
    dob.data.materials[0] = D_FLAT

# ---- renders ------------------------------------------------------------------------------------------------------
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = 24
sc.cycles.use_denoising = False
sc.render.threads_mode = 'FIXED'
sc.render.threads = 8
sc.render.resolution_x = sc.render.resolution_y = C.RES
sc.render.film_transparent = True
sc.view_settings.view_transform = 'Standard'
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
w = bpy.data.worlds.new('w')
sc.world = w
if hasattr(w, 'use_nodes'):
    w.use_nodes = True
w.node_tree.nodes.get('Background').inputs[0].default_value = kit.rgba('#eef0f3')
w.node_tree.nodes.get('Background').inputs[1].default_value = 0.9
cam = kit.link(bpy.data.objects.new('cam', bpy.data.cameras.new('cam')))
sc.camera = cam
for tag, yaw in YAWS.items():
    kit.aim(cam, render_mid, yaw, C.PITCH, render_span, fov=C.FOV)
    kit.render(os.path.join(d, 'renders', tag + '.png'))
# face close-up
kit.aim(cam, (0, 0, 1.17), 0, 3, 0.36)
kit.render(os.path.join(d, 'renders', 'face.png'))
kit.aim(cam, (0, 0, 1.17), 32, 3, 0.36)
kit.render(os.path.join(d, 'renders', 'face-l32.png'))

# clay with the facet edges
ld = bpy.data.lights.new('sun', 'SUN')
ld.energy = 3.2
ld.angle = math.radians(8)
kit.link(bpy.data.objects.new('sun', ld)).rotation_euler = [math.radians(a) for a in (50, 0, -38)]
me.materials[0] = M_CLAY
if dob:
    dob.hide_render = True
sc.cycles.samples = 32
sc.cycles.use_denoising = True
sc.render.use_freestyle = True
sc.render.line_thickness_mode = 'ABSOLUTE'
sc.render.line_thickness = 1.0
fs = bpy.context.view_layer.freestyle_settings
ls = fs.linesets[0] if len(fs.linesets) else fs.linesets.new('facets')
ls.select_by_visibility = True
ls.select_by_edge_types = True
ls.select_silhouette = ls.select_border = True
ls.select_crease = False
ls.select_edge_mark = True
if ls.linestyle is None:
    ls.linestyle = bpy.data.linestyles.new('edges')
ls.linestyle.color = (0.75, 0.0, 0.45)
ls.linestyle.thickness = 1.0
for tag in ('front', 'l40', 'l90', 'back'):
    kit.aim(cam, render_mid, YAWS[tag], C.PITCH, render_span, fov=C.FOV)
    kit.render(os.path.join(d, 'renders', 'clay-' + tag + '.png'))
