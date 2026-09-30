# Their own hair and Eric's stubble, as separate clean meshes.
#
# The hair keeps the original's shape (its big chunky masses are what the character looks like): the hair triangles are
# taken off the original head into their own mesh, welded, stray bits dropped, and given real thickness (Solidify, so
# the inside is closed and has its own darker colour). No texture comes along: each face gets one flat colour, the
# hair colour or its accent (Mio's teal locks, the darker underside of Eric's hair), read once from the texture.
# The stubble patch is lifted just off the new chin with a Shrinkwrap, so it never fights with the skin.
import json
import os

import bmesh
import bpy
import numpy as np

import common as C
import reference as R

COLOURS = {
    'eric': {'hair': '#b89478', 'hair-shade': '#6f5443', 'stubble': '#8a7160'},
    'mio': {'hair': '#1d2d5c', 'hair-shade': '#15204a', 'hair-accent': '#2fb8c8', 'stubble': None},
}


def texture_class(body, mesh):
    """Per original polygon: 'hair', 'hair-shade' or 'hair-accent', from its texels (Mio: palette first)."""
    img = bpy.data.images.load(os.path.join(C.ROOT, C.TEXTURE[body]))
    w, h = img.size
    px = np.array(img.pixels[:]).reshape(h, w, 4)[:, :, :3]
    uv = mesh.data.uv_layers[0].data
    faces = json.load(open(os.path.join(C.ROOT, C.MIO_FACES)))['faces'] if body == 'mio' else None
    teal = lambda c: c[1] > 0.3 and c[1] > c[0] + 0.15   # noqa: E731
    out = {}
    for p in mesh.data.polygons:
        if faces is not None and faces[p.index] is not None:
            samples = [np.array(faces[p.index]) / 255]
        else:
            uvs = [uv[li].uv for li in p.loop_indices][:3]
            samples = []
            for a in np.linspace(0.08, 0.84, 5):
                for bb in np.linspace(0.08, 0.84 - a, 3):
                    u = uvs[0][0] * (1 - a - bb) + uvs[1][0] * a + uvs[2][0] * bb
                    v = uvs[0][1] * (1 - a - bb) + uvs[1][1] * a + uvs[2][1] * bb
                    samples.append(px[min(h - 1, int(v * h)), min(w - 1, int(u * w))])
        if body == 'mio':
            # a triangle is a teal lock only when most of it is teal (a small painted streak isn't enough)
            out[p.index] = 'hair-accent' if sum(teal(c) for c in samples) >= 0.6 * len(samples) else 'hair'
        else:
            r, g, b = np.median(np.array(samples), axis=0)
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
            out[p.index] = 'hair' if lum > 0.42 else 'hair-shade'
    return out


def material(name, hexcol):
    m = bpy.data.materials.get(name) or C.flat_material(name, C.hex_rgba(hexcol))
    return m


def extract(body, original, polys, name, classes, colours, thickness):
    obj = R.copy_polys(original, polys, name)
    me = obj.data
    # classes by the original polygon numbers, carried as a face attribute before anything is renumbered
    order = sorted(polys)
    kinds = ['hair', 'hair-shade', 'hair-accent', 'stubble']
    at = me.attributes.new('kind', 'INT', 'FACE')
    for i, p in enumerate(me.polygons):
        at.data[i].value = kinds.index(classes.get(order[i], 'stubble'))
    me.materials.clear()
    mats = {k: material(f'{body}-{k}', colours[k]) for k in kinds if colours.get(k)}
    slots = {}
    for k, m in mats.items():
        slots[k] = len(me.materials)
        me.materials.append(m)
    for i, p in enumerate(me.polygons):
        p.material_index = slots.get(kinds[at.data[i].value], 0)
    while me.uv_layers:
        me.uv_layers.remove(me.uv_layers[0])
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005 * C.height(original))
    # drop small separate bits (collar edges and flecks the head weights picked up)
    bm.faces.ensure_lookup_table()
    seen, islands = set(), []
    for f in bm.faces:
        if f in seen:
            continue
        stack, isl = [f], []
        seen.add(f)
        while stack:
            g = stack.pop()
            isl.append(g)
            for e in g.edges:
                for n in e.link_faces:
                    if n not in seen:
                        seen.add(n)
                        stack.append(n)
        islands.append(isl)
    biggest = max(len(i) for i in islands)
    small = [f for isl in islands if len(isl) < 3 for f in isl]
    bmesh.ops.delete(bm, geom=small, context='FACES')
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = False
    return obj


def solidify(obj, thickness, inside_colour):
    """Real thickness inward, rims closed, the inside in its own (darker) material."""
    me = obj.data
    inner = material(obj.name + '-inside', inside_colour)
    me.materials.append(inner)
    mod = obj.modifiers.new('thickness', 'SOLIDIFY')
    mod.thickness = thickness
    mod.offset = -1
    mod.use_rim = True
    mod.use_even_offset = False
    mod.material_offset = len(me.materials) - 1
    mod.material_offset_rim = len(me.materials) - 1
    return mod


def stubble(body, body_obj, H):
    """A thin shell over the lower face of the new head (its own mesh), lifted just off the skin with a Shrinkwrap,
    wearing the stubble picture that face.py lifted off the original's chin (clear everywhere else)."""
    info = json.load(open(os.path.join(C.OUT, f'{body}-face.json')))
    src = body_obj.data
    parts = body_obj['parts']
    keep = [p.index for p in src.polygons
            if parts[p.index] == 'head' and p.center.y < -0.05 * H and p.center.z < 0.63 * H]
    me = src.copy()
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    ks = set(keep)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in ks], context='FACES')
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(f'{body}-stubble', me)
    bpy.context.scene.collection.objects.link(obj)
    obj.vertex_groups.clear()
    me.materials.clear()
    mat = C.flat_material(f'{body}-stubble', C.hex_rgba('#8a7160'))
    nt = mat.node_tree
    img = nt.nodes.new('ShaderNodeTexImage')
    img.image = bpy.data.images.load(os.path.join(C.OUT, f'{body}-stubble.png'))
    img.extension = 'CLIP'
    bsdf = nt.nodes['Principled BSDF']
    nt.links.new(img.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(img.outputs['Alpha'], bsdf.inputs['Alpha'])
    mat.blend_method = 'CLIP' if hasattr(mat, 'blend_method') else None
    me.materials.append(mat)
    uv = me.uv_layers[0]
    x0, z0, span = info['x0'], info['z0'], info['span']
    for p in me.polygons:
        for li, vi in zip(p.loop_indices, p.vertices):
            co = me.vertices[vi].co
            uv.data[li].uv = ((co.x - x0) / span, (co.z - z0) / span)
    sw = obj.modifiers.new('off-the-skin', 'SHRINKWRAP')
    sw.target = body_obj
    sw.wrap_method = 'NEAREST_SURFACEPOINT'
    sw.wrap_mode = 'OUTSIDE_SURFACE'
    sw.offset = 0.003 * H
    return obj


def build(body, original, head_obj, arm):
    H = C.height(original)
    col = COLOURS[body]
    classes = texture_class(body, original)
    polys = R.hair_polys(body, original)
    if body == 'mio':
        # the collar pieces of her hood carry head weights too; they sit below the chin
        W = original.matrix_world
        polys = [i for i in polys if (W @ original.data.polygons[i].center).z / H > 0.5]
    hair = extract(body, original, polys, f'{body}-hair', classes, col, 0.012 * H)
    solidify(hair, 0.012 * H, col['hair-shade'])
    out = [hair]
    if os.path.exists(os.path.join(C.OUT, f'{body}-stubble.png')):
        out.append(stubble(body, head_obj, H))
    for o in out:
        g = o.vertex_groups.new(name=C.rig_names(body)['Head'])
        g.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
        o.parent = arm
        o.matrix_parent_inverse = arm.matrix_world.inverted()
        mod = o.modifiers.new('rig', 'ARMATURE')
        mod.object = arm
    return out
